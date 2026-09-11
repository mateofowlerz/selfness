#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Offline regex search of message records; never executes transcript contents."""

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "data/anthropic-mythos-5-incident/transcript.jsonl"
DEFAULT_PATTERNS = Path(__file__).with_name("environment_patterns.json")


def load_messages(path):
    raw = path.read_bytes()
    messages, excluded = [], Counter()
    for line_number, line in enumerate(raw.decode("utf-8").splitlines(), 1):
        row = json.loads(line)
        if row.get("record") != "message":
            excluded[row.get("record", "unknown")] += 1
            continue
        messages.append({**row, "source_line": line_number})
    indices = [m["index"] for m in messages]
    if indices != sorted(set(indices)):
        raise ValueError("Expected unique, increasing message indices")
    return messages, {
        "source": str(path.resolve()),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "message_count": len(messages),
        "excluded_records": dict(excluded),
        "index_gaps": [[a + 1, b - 1] for a, b in zip(indices, indices[1:]) if b > a + 1],
        "first_index": indices[0] if indices else None,
        "last_index": indices[-1] if indices else None,
    }


def strings(value, path):
    """Yield each decoded string independently, preserving its JSON field path."""
    if isinstance(value, str):
        yield path, value
    elif isinstance(value, dict):
        for key, item in value.items():
            yield from strings(item, f"{path}.{key}")
    elif isinstance(value, list):
        for i, item in enumerate(value):
            yield from strings(item, f"{path}[{i}]")


def fields(message):
    for name in ("content", "tool_call", "tool_call_raw", "tool_result"):
        if name in message:
            yield from strings(message[name], name)


def search(messages, patterns, radius, roles, field_regex):
    for message in messages:
        if roles and message["role"] not in roles:
            continue
        for field, value in fields(message):
            if field_regex and not field_regex.search(field):
                continue
            for name, pattern in patterns.items():
                for match in pattern.finditer(value):
                    start, end = match.span()
                    lo, hi = max(0, start - radius), min(len(value), end + radius)
                    yield {
                        "pattern": name,
                        "index": message["index"],
                        "source_line": message["source_line"],
                        "role": message["role"],
                        "type": message["type"],
                        "field": field,
                        "start": start,
                        "end": end,
                        "field_line": value.count("\n", 0, start) + 1,
                        "match": match.group(),
                        "excerpt_start": lo,
                        "excerpt_end": hi,
                        "excerpt": value[lo:hi],
                    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--patterns", type=Path, default=DEFAULT_PATTERNS)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("inventory")
    sub.add_parser("patterns")
    find = sub.add_parser("search")
    find.add_argument("--group", action="append", help="Repeat to select named regexes; default: all")
    find.add_argument("--regex", help="Custom Python regex, replacing named patterns")
    find.add_argument("--role", action="append")
    find.add_argument("--field", help="Regex over JSON field paths, e.g. ^tool_result$")
    find.add_argument("--context", type=int, default=250, help="Characters on each side of each match")
    find.add_argument("--output", type=Path, help="JSON report; default: stdout")
    show = sub.add_parser("show")
    show.add_argument("indices", type=int, nargs="+")
    show.add_argument("--neighbors", type=int, default=0, help="Available records before and after")
    args = parser.parse_args()
    definitions = json.loads(args.patterns.read_text())
    if args.command == "patterns":
        print(json.dumps(definitions, indent=2))
        return
    messages, audit = load_messages(args.source)
    if args.command == "inventory":
        audit["roles_and_types"] = dict(Counter(f'{m["role"]}/{m["type"]}' for m in messages))
        print(json.dumps(audit, indent=2))
        return
    if args.command == "show":
        if args.neighbors < 0:
            parser.error("--neighbors must be nonnegative")
        missing = set(args.indices) - {m["index"] for m in messages}
        if missing:
            parser.error(f"Requested message indices absent: {sorted(missing)}")
        selected = set()
        for pos, message in enumerate(messages):
            if message["index"] in args.indices:
                selected.update(range(max(0, pos - args.neighbors), min(len(messages), pos + args.neighbors + 1)))
        for pos in sorted(selected):
            message = messages[pos]
            print(f'\n=== message {message["index"]} | JSONL line {message["source_line"]} | {message["role"]}/{message["type"]} ===')
            for field, value in fields(message):
                print(f"\n--- {field} ---\n{value}")
        return
    if args.context < 0:
        parser.error("--context must be nonnegative")
    names = args.group or list(definitions)
    if not args.regex and set(names) - definitions.keys():
        parser.error("Unknown group; use the patterns command to list names")
    selected = {"custom": args.regex} if args.regex else {name: definitions[name] for name in names}
    try:
        compiled = {name: re.compile(pattern, re.IGNORECASE | re.MULTILINE) for name, pattern in selected.items()}
        field_regex = re.compile(args.field) if args.field else None
    except re.error as exc:
        parser.error(str(exc))
    hits = list(search(messages, compiled, args.context, args.role, field_regex))
    report = {
        "audit": audit,
        "search": {"patterns": selected, "flags": ["IGNORECASE", "MULTILINE"], "roles": args.role,
                   "field_regex": args.field, "context_characters": args.context,
                   "semantics": "All non-overlapping matches per regex per decoded string field; no cross-field matching; no result cap."},
        "summary": {
            name: {"occurrences": sum(h["pattern"] == name for h in hits),
                   "unique_messages": len({h["index"] for h in hits if h["pattern"] == name})}
            for name in selected
        },
        "hits": hits,
    }
    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.write_text(rendered)
        print(json.dumps({"output": str(args.output.resolve()), "summary": report["summary"]}, indent=2))
    else:
        sys.stdout.write(rendered)


if __name__ == "__main__":
    main()
