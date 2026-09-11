#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Segment the transcript into episodes: one episode = an Assistant thinking
block plus every MessageTool that follows it before the next thinking block.

Writes analysis/misalignment-reasoning/episodes.json with, per episode:
thinking/visible text, tool calls (name + previews), extracted artifacts
(files, hosts, URLs, accounts, webhook bin uuids), regex signal groups, and
the self-deception wobble score. Fully deterministic; no external calls.
"""

import json
from pathlib import Path
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from misalignment_search import DEFAULT_PATTERNS, compile_groups  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
TRANSCRIPT = (ROOT.parent.parent / "investigations" / "data"
              / "anthropic-mythos-5-incident" / "transcript.jsonl")
WOBBLE_JSON = ROOT / "analysis/misalignment-reasoning/self-deception-scores.json"
OUT = ROOT / "analysis/misalignment-reasoning/episodes.json"

FILE_RE = re.compile(r"(/[a-zA-Z0-9_./-]{3,}\.[a-zA-Z0-9]{1,5})\b")
HOST_RE = re.compile(r"\b(?:https?://)?((?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})\b")
ACCT_RE = re.compile(r"\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,})\b")
UUID_RE = re.compile(r"\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b")
NOISE_HOSTS = {"www.w3.org", "fonts.googleapis.com", "fonts.gstatic.com"}
MIN_HOST_LEN = 4


def artifacts_from(*texts):
    files, hosts, accounts, uuids = set(), set(), set(), set()
    blob = "\n".join(t for t in texts if t)
    for path in FILE_RE.findall(blob):
        if not path.startswith("//"):
            files.add(path)
    for host in HOST_RE.findall(blob):
        if host.lower() not in NOISE_HOSTS and len(host) >= MIN_HOST_LEN:
            hosts.add(host.lower())
    accounts.update(a.lower() for a in ACCT_RE.findall(blob))
    uuids.update(UUID_RE.findall(blob))
    return {
        "files": sorted(files)[:30],
        "hosts": sorted(hosts)[:30],
        "accounts": sorted(accounts)[:15],
        "uuids": sorted(uuids)[:10],
    }


def signal_groups(text, groups):
    matched = []
    for name, group in groups.items():
        if any(p.search(text) for p in group["patterns"]):
            matched.append(name)
    return matched


def main():
    messages = [json.loads(line) for line in open(TRANSCRIPT)
                if line.strip() and json.loads(line).get("record") == "message"]
    wobble = {}
    if WOBBLE_JSON.is_file():
        wobble = {int(k): v["score"]
                  for k, v in json.loads(WOBBLE_JSON.read_text())["scores"].items()}
    groups = compile_groups(json.loads(DEFAULT_PATTERNS.read_text()))

    episodes, current = [], None

    def close():
        nonlocal current
        if not current:
            return
        blobs = [current["thinking"], current["visible"]] + [
            t["call"] for t in current["tools"]] + [t["result"] for t in current["tools"]]
        current["artifacts"] = artifacts_from(*blobs)
        for t in current["tools"]:
            t["call_preview"] = t.pop("call")[:280]
            t["result_preview"] = t.pop("result")[:280]
        episodes.append(current)
        current = None

    for m in messages:
        role, mtype = m["role"], m["type"]
        if role == "Assistant" and mtype == "TextMessage":
            close()
            content = str(m.get("content", ""))
            think = " ".join(re.findall(r"<thinking>(.*?)</thinking>", content, re.S | re.I))
            visible = re.sub(r"<thinking>.*?</thinking>", "", content, flags=re.S | re.I).strip()
            ep_wobble = wobble.get(m["index"])
            current = {
                "ep": len(episodes) + 1,
                "idx_first": m["index"],
                "idx_last": m["index"],
                "ts_start": (m.get("timestamp") or "")[:19].replace("T", " "),
                "thinking": re.sub(r"\s+", " ", think).strip(),
                "visible": re.sub(r"\s+", " ", visible).strip(),
                "wobble": ep_wobble,
                "groups": signal_groups(content, groups),
                "artifacts": {},
                "tools": [],
            }
        elif role == "Assistant" and mtype == "ToolMessage" and current is not None:
            current["idx_last"] = m["index"]
            current["tools"].append({
                "idx": m["index"],
                "name": m.get("tool_name", ""),
                "call": str(m.get("tool_call", "")),
                "result": str(m.get("tool_result", "")),
            })
            if current["wobble"] is None or (wobble.get(m["index"]) or 0) > (current["wobble"] or 0):
                current["wobble"] = wobble.get(m["index"], current["wobble"])
        else:
            # Human/System records close the episode and attach as a note.
            close()
            content = str(m.get("content", ""))[:400]
            episodes.append({
                "ep": len(episodes) + 1, "idx_first": m["index"], "idx_last": m["index"],
                "ts_start": (m.get("timestamp") or "")[:19].replace("T", " "),
                "thinking": "", "visible": "", "wobble": None, "groups": [],
                "artifacts": {}, "tools": [],
                "note": f"{role}/{mtype}: {re.sub(chr(92) + 's+', ' ', content).strip()[:300]}",
            })
            continue
    close()

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "episode_definition": ("one Assistant TextMessage (thinking) plus all "
                               "ToolMessages up to the next TextMessage"),
        "count": len(episodes),
        "transcript_ts_span": [episodes[0]["ts_start"], episodes[-1]["ts_start"]],
        "episodes": episodes,
    }, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {OUT} ({len(episodes)} episodes)")
    big = max(episodes, key=lambda e: len(e["tools"]))
    print(f"longest: ep {big['ep']} ({len(big['tools'])} tools)")
    alarmed = [e for e in episodes if (e["wobble"] or 0) >= 0.25]
    print("wobble >= 0.25:", [(e["ep"], e["wobble"]) for e in alarmed])


if __name__ == "__main__":
    main()
