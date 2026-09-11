#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Find messages where the Assistant reasons about whether its own actions
might be misaligned.

Offline regex search over the transcript's Assistant TextMessage records;
never executes transcript contents. Only message records are read.

Signal groups (see misalignment_patterns.json) cover: real-vs-simulated
deliberation, acceptability evaluation of its own action, self-justification
via "intended path", and explicit policy/ethics vocabulary. A message's score
is the sum of weights of groups it matches, plus co-occurrence bonuses for
group pairs whose joint presence is characteristic (e.g. asking "sim or real?"
right next to "NOT okay").

Usage:
  misalignment_search.py report [--scope thinking|visible|both] [--min-score N]
  misalignment_search.py show INDEX... [--neighbors N]
"""

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import sys

SCRIPT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PATTERNS = Path(__file__).with_name("misalignment_patterns.json")

SOURCE_CANDIDATES = [
    SCRIPT_ROOT / "data/anthropic-mythos-5-incident/transcript.jsonl",
    # This worktree carries no data directory; fall back to the primary
    # checkout it was branched from.
    SCRIPT_ROOT.parent.parent / "investigations" / "data"
    / "anthropic-mythos-5-incident" / "transcript.jsonl",
]

THINKING_RE = re.compile(r"<thinking>(.*?)</thinking>", re.IGNORECASE | re.DOTALL)


def default_source():
    for candidate in SOURCE_CANDIDATES:
        if candidate.is_file():
            return candidate
    sys.exit(
        "Transcript not found in any default location; pass --source.\n"
        + "\n".join(f"  tried: {c}" for c in SOURCE_CANDIDATES)
    )


def load_messages(path):
    raw = path.read_bytes()
    messages, excluded = [], Counter()
    for line_number, line in enumerate(raw.decode("utf-8").splitlines(), 1):
        row = json.loads(line)
        if row.get("record") != "message":
            excluded[row.get("record", "unknown")] += 1
            continue
        messages.append({**row, "source_line": line_number})
    audit = {
        "source": str(path.resolve()),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "message_count": len(messages),
        "excluded_records": dict(excluded),
    }
    return messages, audit


def segments(content):
    """Split message content into (scope, text) chunks: thinking vs visible."""
    parts = []
    pos = 0
    for block in THINKING_RE.finditer(content):
        if block.start() > pos:
            parts.append(("visible", content[pos:block.start()]))
        parts.append(("thinking", block.group(1)))
        pos = block.end()
    if pos < len(content):
        parts.append(("visible", content[pos:]))
    return parts


def compile_groups(defs):
    flags = re.IGNORECASE | re.MULTILINE | re.DOTALL
    return {
        name: {
            "weight": group["weight"],
            "description": group.get("description", ""),
            "patterns": [re.compile(p, flags) for p in group["patterns"]],
        }
        for name, group in defs["groups"].items()
    }


def score_messages(messages, groups, bonuses, scope, radius):
    ranked = []
    for message in messages:
        if message["role"] != "Assistant" or message["type"] != "TextMessage":
            continue
        content = str(message.get("content", ""))
        hits = []
        for seg_scope, text in segments(content):
            if scope != "both" and seg_scope != scope:
                continue
            for group_name, group in groups.items():
                for pattern in group["patterns"]:
                    for match in pattern.finditer(text):
                        s, e = match.span()
                        lo, hi = max(0, s - radius), min(len(text), e + radius)
                        hits.append({
                            "group": group_name,
                            "scope": seg_scope,
                            "pattern": pattern.pattern,
                            "match": match.group(),
                            "offset_in_segment": s,
                            "excerpt": text[lo:hi],
                        })
        if not hits:
            continue
        matched_groups = {h["group"] for h in hits}
        score = sum(groups[g]["weight"] for g in matched_groups)
        applied = []
        for a, b, bonus in bonuses:
            if a in matched_groups and b in matched_groups:
                score += bonus
                applied.append([a, b, bonus])
        ranked.append({
            "index": message["index"],
            "source_line": message["source_line"],
            "timestamp": message.get("timestamp"),
            "score": score,
            "matched_groups": sorted(matched_groups),
            "bonuses_applied": applied,
            "hits": hits,
        })
    ranked.sort(key=lambda r: (-r["score"], r["index"]))
    return ranked


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source", type=Path, default=None,
                        help="transcript.jsonl path; default: shared checkout copy")
    parser.add_argument("--patterns", type=Path, default=DEFAULT_PATTERNS)
    sub = parser.add_subparsers(dest="command", required=True)

    rep = sub.add_parser("report", help="ranked messages, highest score first")
    rep.add_argument("--scope", choices=["thinking", "visible", "both"], default="both",
                     help="which part of each Assistant message to search (default: both)")
    rep.add_argument("--min-score", type=int, default=4,
                     help="only print/report messages at or above this score (default: 4)")
    rep.add_argument("--context", type=int, default=200,
                     help="characters on each side of each match in excerpts (default: 200)")
    rep.add_argument("--top", type=int, default=25, help="console rows (default: 25)")
    rep.add_argument("--output", type=Path, help="write full JSON report here")

    show = sub.add_parser("show", help="print full text of messages by index")
    show.add_argument("indices", type=int, nargs="+")
    show.add_argument("--neighbors", type=int, default=0)

    args = parser.parse_args()
    if getattr(args, "context", None) is not None and args.context < 0:
        parser.error("--context must be nonnegative")
    if getattr(args, "neighbors", 0) < 0:
        parser.error("--neighbors must be nonnegative")

    source = args.source or default_source()
    defs = json.loads(args.patterns.read_text())
    messages, audit = load_messages(source)

    if args.command == "show":
        by_index = {m["index"]: m for m in messages}
        missing = set(args.indices) - by_index.keys()
        if missing:
            parser.error(f"message indices absent: {sorted(missing)}")
        order = [m["index"] for m in messages]
        selected = set()
        for pos, idx in enumerate(order):
            if idx in args.indices:
                lo = max(0, pos - args.neighbors)
                hi = min(len(order), pos + args.neighbors + 1)
                selected.update(order[lo:hi])
        for pos, message in enumerate(messages):
            if message["index"] not in selected:
                continue
            print(f'\n=== message {message["index"]} | {message["role"]}/{message["type"]}'
                  f' | {message.get("timestamp")} ===')
            print(message.get("content", ""))
        return

    groups = compile_groups(defs)
    bonuses = [tuple(b) for b in defs.get("cooccurrence_bonus", [])]
    ranked = score_messages(messages, groups, bonuses, args.scope, args.context)

    report = {
        "audit": audit,
        "search": {
            "patterns_file": str(args.patterns.resolve()),
            "weights": {n: g["weight"] for n, g in groups.items()},
            "cooccurrence_bonus": bonuses,
            "scope": args.scope,
            "min_score": args.min_score,
            "semantics": ("Regex search over Assistant/TextMessage records only; score is the "
                          "sum of weights of distinct matched groups plus co-occurrence bonuses. "
                          "ToolMessage content (tool_call/tool_result) is never searched."),
        },
        "group_occurrences": {
            name: len({r["index"] for r in ranked if name in r["matched_groups"]})
            for name in groups
        },
        "candidate_count": len(ranked),
        "messages_at_or_above_min_score": sum(r["score"] >= args.min_score for r in ranked),
        "ranked": ranked,
    }
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        print(f"wrote {args.output.resolve()}")

    shown = 0
    for r in ranked:
        if r["score"] < args.min_score:
            continue
        shown += 1
        if shown > args.top:
            continue
        best = max(r["hits"], key=lambda h: groups[h["group"]]["weight"])
        excerpt = re.sub(r"\s+", " ", best["excerpt"]).strip()
        groups_s = ", ".join(r["matched_groups"])
        print(f'\n#{shown}  idx {r["index"]:>5}  score {r["score"]:<3} {r["timestamp"]}')
        print(f'    groups: {groups_s}')
        if r["bonuses_applied"]:
            print(f'    bonus:  {"; ".join(f"{a}+{b}=+{n}" for a, b, n in r["bonuses_applied"])}')
        print(f'    [{best["group"]} @ {best["scope"]}] {excerpt[:420]}')
    print(f"\ncandidates: {len(ranked)} | score >= {args.min_score}: "
          f"{report['messages_at_or_above_min_score']}"
          + (f" | ({shown - args.top} more not shown)" if shown > args.top else ""))


if __name__ == "__main__":
    main()
