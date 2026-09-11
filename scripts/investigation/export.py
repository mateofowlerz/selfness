#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy>=1.26"]
# ///
"""Read-only import of investigation artifacts; no network calls or source writes.

Run from anywhere with --investigation and --analysis pointing at the original
checkouts. Only this Selfness checkout is written. The copied Python regex engine
is the authority for matches: Python character offsets become UTF-16 offsets for JS.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import sys

import numpy as np

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent / "source"))
import misalignment_ui as ui


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--investigation", type=Path, required=True)
    parser.add_argument("--analysis", type=Path, required=True)
    args = parser.parse_args()
    data = ROOT / "site/data/investigation"
    public = ROOT / "site/public/investigation/source"
    data.mkdir(parents=True, exist_ok=True)
    public.mkdir(parents=True, exist_ok=True)
    original = args.investigation / "data/anthropic-mythos-5-incident"
    analysis = args.analysis / "analysis/misalignment-reasoning"
    manifest = {"inputs": {}}

    def read(p):
        raw = p.read_bytes()
        manifest["inputs"][p.name] = hashlib.sha256(raw).hexdigest()
        return raw

    def write(name, value):
        (data / name).write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n")

    for name in ["transcript.jsonl", "README.md", "SOURCE.json", "SHA256SUMS"]:
        (public / name).write_bytes(read(original / name))
    shutil.copytree(ROOT / "scripts/investigation/source", public / "methods", dirs_exist_ok=True)
    raw = read(original / "transcript.jsonl")
    messages = [{**json.loads(line), "source_line": n} for n, line in enumerate(raw.decode().splitlines(), 1) if json.loads(line).get("record") == "message"]
    ui.MESSAGES = messages
    definitions = json.loads(read(ROOT / "scripts/investigation/source/misalignment_patterns.json"))
    ui.GROUPS = ui.compile_groups(definitions)
    ui.BONUSES = definitions["cooccurrence_bonus"]
    ui.SUMMARIES = json.loads(read(analysis / "summaries.json"))
    wobble = json.loads(read(analysis / "self-deception-scores.json"))
    ui.WOBBLE = {int(k): v for k, v in wobble["scores"].items()}
    scopes = {}
    for scope in ("both", "thinking", "visible"):
        rows = ui.score_messages(messages, ui.GROUPS, ui.BONUSES, scope, 200)
        scopes[scope] = [{"index": r["index"], "groups": r["matched_groups"], "excerpts": {g: next(h["excerpt"] for h in r["hits"] if h["group"] == g) for g in dict.fromkeys(h["group"] for h in r["hits"])}} for r in rows]
    write("search.json", {"definitions": definitions, "scopes": scopes, "summaries": ui.SUMMARIES, "wobble": wobble["scores"]})
    for m in messages:
        content = m.get("content", "")
        if isinstance(content, str) and m["role"] == "Assistant" and m["type"] == "TextMessage":
            sections, spans, _ = ui.message_payload(m, "both")
            for s in sections + spans:
                s["start"] = len(content[:s["start"]].encode("utf-16-le")) // 2
                s["end"] = len(content[:s["end"]].encode("utf-16-le")) // 2
            m["sections"], m["spans"] = sections, spans
    write("messages.json", messages)
    write("episodes.json", json.loads(read(analysis / "episodes.json")))
    write("segments.json", json.loads(read(analysis / "segments.json")))
    cache_path = args.investigation / "scripts/transcript_semantic_index.npz"
    read(cache_path)
    with np.load(cache_path, allow_pickle=False) as bundle:
        meta = json.loads(str(bundle["meta"]))
        matrix = np.asarray(bundle["embeddings"], dtype="<f4")
    assert meta["source_sha256"] == hashlib.sha256(raw).hexdigest(), "Stale embedding cache"
    assert matrix.shape[0] == len(meta["chunks"]) and np.isfinite(matrix).all()
    assert np.allclose(np.linalg.norm(matrix, axis=1), 1, atol=1e-5)
    meta.pop("source", None)
    meta["dimensions"] = matrix.shape[1]
    write("semantic.json", meta)
    (data / "vectors.f32").write_bytes(matrix.tobytes())
    manifest.update({"source_sha256": hashlib.sha256(raw).hexdigest(), "messages": len(messages), "chunks": matrix.shape[0], "dimensions": matrix.shape[1], "model": meta["model"], "outputs": {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(data.iterdir()) if p.name != "manifest.json"}})
    write("manifest.json", manifest)
    (public / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({k: v for k, v in manifest.items() if k not in ("inputs", "outputs")}, indent=2))


if __name__ == "__main__":
    main()
