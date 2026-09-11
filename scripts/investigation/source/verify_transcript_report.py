#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Independently rescan a saved regex report and verify completeness and excerpts."""

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re


def check(condition, message):
    if not condition:
        raise ValueError(message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path)
    args = parser.parse_args()
    report = json.loads(args.report.read_text())
    audit, settings = report["audit"], report["search"]
    raw = Path(audit["source"]).read_bytes()
    check(hashlib.sha256(raw).hexdigest() == audit["sha256"], "Source hash changed")
    patterns = {k: re.compile(v, re.I | re.M) for k, v in settings["patterns"].items()}
    expected, observed = Counter(), Counter()
    values, records = {}, {}
    excluded = Counter()
    for line_number, line in enumerate(raw.decode("utf-8").splitlines(), 1):
        row = json.loads(line)
        if row.get("record") != "message":
            excluded[row.get("record", "unknown")] += 1
            continue
        idx = row["index"]
        check(idx not in records, "Duplicate message index")
        records[idx] = (line_number, row["role"], row["type"])
        if settings["roles"] and row["role"] not in settings["roles"]:
            continue
        stack = [(k, row[k]) for k in ("content", "tool_call", "tool_call_raw", "tool_result") if k in row]
        while stack:
            field, value = stack.pop()
            if isinstance(value, dict):
                stack.extend((f"{field}.{k}", v) for k, v in value.items())
            elif isinstance(value, list):
                stack.extend((f"{field}[{i}]", v) for i, v in enumerate(value))
            elif isinstance(value, str):
                if settings["field_regex"] and not re.search(settings["field_regex"], field):
                    continue
                values[idx, field] = value
                for name, regex in patterns.items():
                    for match in regex.finditer(value):
                        expected[idx, field, name, *match.span()] += 1
    check(len(records) == audit["message_count"], "Incorrect message count")
    check(dict(excluded) == audit["excluded_records"], "Incorrect excluded-record count")
    for hit in report["hits"]:
        idx, field = hit["index"], hit["field"]
        observed[idx, field, hit["pattern"], hit["start"], hit["end"]] += 1
        check(records[idx] == (hit["source_line"], hit["role"], hit["type"]), "Incorrect provenance")
        value = values[idx, field]
        check(value[hit["start"]:hit["end"]] == hit["match"], "Incorrect matched text")
        lo = max(0, hit["start"] - settings["context_characters"])
        hi = min(len(value), hit["end"] + settings["context_characters"])
        check((lo, hi) == (hit["excerpt_start"], hit["excerpt_end"]), "Incorrect context bounds")
        check(value[lo:hi] == hit["excerpt"], "Incorrect context excerpt")
        check(value.count("\n", 0, hit["start"]) + 1 == hit["field_line"], "Incorrect field line")
    check(expected == observed, "Missing, extra, or duplicated regex matches")
    for name in patterns:
        matches = [key for key in expected if key[2] == name]
        check(report["summary"][name] == {
            "occurrences": sum(expected[key] for key in matches),
            "unique_messages": len({key[0] for key in matches}),
        }, "Incorrect summary")
    print(f"PASS: {len(records)} messages; {sum(expected.values())} matches; source hash, completeness, provenance, excerpts and summaries verified.")


if __name__ == "__main__":
    main()
