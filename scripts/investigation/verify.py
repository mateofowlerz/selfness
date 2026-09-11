#!/usr/bin/env python3
"""Offline parity fixtures from the original Python ranking implementation."""
import argparse
import hashlib
import itertools
import json
from pathlib import Path
import sys

import numpy as np

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent / "source"))
import misalignment_ui as ui

parser = argparse.ArgumentParser()
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
data = ROOT / "site/data/investigation"
manifest = json.loads((data / "manifest.json").read_text())
for name, expected in manifest["outputs"].items():
    assert hashlib.sha256((data / name).read_bytes()).hexdigest() == expected, name
raw = ROOT / "site/public/investigation/source/transcript.jsonl"
assert hashlib.sha256(raw.read_bytes()).hexdigest() == manifest["source_sha256"]
ui.MESSAGES, _ = ui.load_messages(raw)
copied = json.loads((data / "messages.json").read_text())
assert len(copied) == len(ui.MESSAGES) == 2064
for original, exported in zip(ui.MESSAGES, copied):
    assert all(exported[k] == v for k, v in original.items()), original["index"]
search = json.loads((data / "search.json").read_text())
ui.GROUPS = ui.compile_groups(search["definitions"])
ui.BONUSES = search["definitions"]["cooccurrence_bonus"]
ui.SUMMARIES = search["summaries"]
ui.WOBBLE = {int(k): v for k, v in search["wobble"].items()}
cases = []
subsets = [list(ui.GROUPS), ["self_justification_via_intent", "sim_vs_real_deliberation"], ["flag_then_rationalize"], []]
for scope, minimum, selected, wobble in itertools.product(["both", "thinking", "visible"], [0, 4, 8], subsets, [False, True]):
    rows = ui.ranked_payload(scope, minimum, set(selected), 0.25 if wobble else None)
    cases.append({"scope": scope, "minimum": minimum, "selected": selected, "wobble": wobble, "expected": [{"index": r["index"], "score": r["score"], "groups": r["matched_groups"], "excerpt": r["best_excerpt"], "summary": r["summary"], "wobble": r["wobble"]} for r in rows]})
meta = json.loads((data / "semantic.json").read_text())
matrix = np.fromfile(data / "vectors.f32", dtype="<f4").reshape(-1, meta["dimensions"])
cosines = []
for row in [0, 129, 139, 2000, len(matrix) - 1]:
    query = matrix[row].astype(np.float64)
    scores = matrix.astype(np.float64) @ (query / np.linalg.norm(query))
    order = np.argsort(-scores, kind="stable")[:50]
    cosines.append({"vector": query.tolist(), "expected": [{"index": int(i), "score": float(scores[i])} for i in order]})
args.output.write_text(json.dumps({"cases": cases, "cosines": cosines}))
print(f"Archive hashes and all 2064 messages verified; {len(cases)} regex cases and {len(cosines)} cosine fixtures written.")
