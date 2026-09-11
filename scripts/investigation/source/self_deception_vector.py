#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy>=1.26"]
# ///
"""Self-deception concept direction from the cached transcript embeddings.

Idea: the embeddings cluster by topic, so plain similarity to the flag-and-
rationalize moments (msgs 129/139) mostly finds PyPI-registration mechanics.
Instead, build a "concept direction": the centroid of the chunks containing
the self-deception arc MINUS the centroid of the late-transcript registration
grind (pure mechanics, no ontology reflection). Projecting every Assistant
thinking chunk onto this direction ranks self-deception vibes first and pure
mechanics last — no API calls needed, everything comes from the cached npz.

Writes analysis/misalignment-reasoning/self-deception-scores.json:
  { "<message index>": {"score": <max chunk projection>,
                        "chunk": "<best chunk text, first 420 chars>"}, ... }
"""

import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CACHE = (ROOT.parent.parent / "investigations" / "scripts"
                 / "transcript_semantic_index.npz")
DEFAULT_OUT = ROOT / "analysis/misalignment-reasoning/self-deception-scores.json"

# Chunks (message index, offset) carrying the flag-then-rationalize sentences.
ANCHORS = [(129, 624), (139, 942), (139, 1843)]
# Messages late in the transcript that are captcha/registration mechanics with
# no sim-vs-real or okayness reflection.
GRIND = {1415, 1532, 1535, 1555, 1567, 1576, 1579, 1633, 1637, 1710,
         1762, 1768, 1835, 1889, 1905}


def main():
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    bundle = np.load(args.cache, allow_pickle=False)
    meta = json.loads(str(bundle["meta"]))
    E = np.asarray(bundle["embeddings"], dtype=np.float32)
    chunks = meta["chunks"]

    thinking = [i for i, c in enumerate(chunks)
                if c["role"] == "Assistant" and c["type"] == "TextMessage"
                and c["field"] == "content"]
    anchor_pos = [i for i, c in enumerate(chunks)
                  if (c["index"], c["offset"]) in ANCHORS]
    grind_pos = [i for i in thinking if chunks[i]["index"] in GRIND]
    if len(anchor_pos) != len(ANCHORS) or not grind_pos:
        raise SystemExit("cache does not contain the expected chunks; "
                         "anchors/grind set may be stale")

    direction = E[anchor_pos].mean(axis=0) - E[grind_pos].mean(axis=0)
    direction /= np.linalg.norm(direction) + 1e-9

    projections = E[thinking] @ direction
    scores = {}
    for pos, proj in zip(thinking, projections):
        c = chunks[pos]
        best = scores.get(c["index"])
        if best is None or proj > best["score"]:
            scores[c["index"]] = {
                "score": round(float(proj), 4),
                "chunk_offset": c["offset"],
                "chunk": " ".join(c["text"].split())[:420],
            }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps({
        "method": {"anchors": ANCHORS, "grind_messages": sorted(GRIND),
                   "cache": str(args.cache.resolve())},
        "scores": {str(k): v for k, v in scores.items()},
    }, ensure_ascii=False, indent=2) + "\n")
    top = sorted(scores.items(), key=lambda kv: -kv[1]["score"])[:15]
    print(f"wrote {args.out} ({len(scores)} messages); top 15:")
    for idx, s in top:
        print(f"  {idx:>5}  {s['score']:+.3f}  {s['chunk'][:80]}")


if __name__ == "__main__":
    main()
