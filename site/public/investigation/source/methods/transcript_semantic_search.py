#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["openai>=1.50", "numpy>=1.26"]
# ///
"""Semantic ("vibes") search over message records; never executes transcript contents.

Embeds transcript chunks with the OpenAI embeddings API (text-embedding-3-large)
and ranks them against a free-text query by cosine similarity. Embeddings are
cached on disk; the cache auto-invalidates when the source or model changes.

Requires OPENAI_API_KEY in the environment. NOTE: chunk text is sent to the
OpenAI API — it leaves your machine. Full rebuild is ~1M tokens (~$0.13).
"""

import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import sys

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "data/anthropic-mythos-5-incident/transcript.jsonl"
DEFAULT_CACHE = Path(__file__).with_name("transcript_semantic_index.npz")
DEFAULT_MODEL = "text-embedding-3-large"

CHUNK_SIZE = 1100  # characters, roughly 200-250 words
CHUNK_OVERLAP = 150
MIN_CHUNK = 40  # strings shorter than this are skipped as retrieval units
BATCH_SIZE = 256  # inputs per call; sized to stay under low-tier TPM caps


def load_messages(path):
    raw = path.read_bytes()
    messages, excluded = [], Counter()
    for line_number, line in enumerate(raw.decode("utf-8").splitlines(), 1):
        row = json.loads(line)
        if row.get("record") != "message":
            excluded[row.get("record", "unknown")] += 1
            continue
        messages.append({**row, "source_line": line_number})
    return messages, hashlib.sha256(raw).hexdigest()


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


def split_text(text, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """Sliding windows of ~size characters, breaking on newlines when possible."""
    if len(text) <= size:
        yield 0, text
        return
    start = 0
    while True:
        end = min(len(text), start + size)
        if end < len(text):
            newline = text.rfind("\n", start + size // 2, end)
            if newline > start:
                end = newline + 1
        yield start, text[start:end]
        if end >= len(text):
            return
        start = end - overlap


def build_chunks(messages):
    chunks = []
    for message in messages:
        for field, value in fields(message):
            if len(value) < MIN_CHUNK:
                continue
            for offset, piece in split_text(value):
                chunks.append({
                    "index": message["index"],
                    "source_line": message["source_line"],
                    "role": message["role"],
                    "type": message["type"],
                    "field": field,
                    "offset": offset,
                    "field_line": value.count("\n", 0, offset) + 1,
                    "text": piece,
                })
    return chunks


def embed(model_name, texts):
    # Deferred imports: keeps --help and cache validation free of API-key checks.
    import time

    from openai import OpenAI, RateLimitError

    if not os.environ.get("OPENAI_API_KEY"):
        raise SystemExit(
            "OPENAI_API_KEY is not set. Export it in your shell (do NOT paste it "
            "into the chat), then rerun."
        )
    client = OpenAI()
    vectors, total_tokens = [], 0
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        for attempt in range(1, 31):
            try:
                resp = client.embeddings.create(model=model_name, input=batch)
                break
            except RateLimitError as exc:
                if attempt == 30:
                    raise
                headers = getattr(exc.response, "headers", {}) or {}
                wait = float(headers.get("retry-after") or 45)
                print(f"  rate limited; waiting {wait:.0f}s (attempt {attempt})",
                      file=sys.stderr)
                time.sleep(wait)
        vectors.extend(item.embedding for item in resp.data)
        total_tokens += resp.usage.total_tokens
        print(f"  embedded {min(i + BATCH_SIZE, len(texts))}/{len(texts)} chunks",
              file=sys.stderr)
    matrix = np.array(vectors, dtype=np.float32)
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return matrix / norms, total_tokens


def cmd_build(args):
    messages, digest = load_messages(args.source)
    chunks = build_chunks(messages)
    if args.dry_run:
        print(json.dumps({"messages": len(messages), "chunks": len(chunks)}, indent=2))
        return
    print(f"Embedding {len(chunks)} chunks from {len(messages)} messages "
          f"({args.model}) ...", file=sys.stderr)
    matrix, tokens = embed(args.model, [c["text"] for c in chunks])
    args.cache.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        args.cache,
        embeddings=matrix,
        meta=json.dumps({
            "source": str(args.source.resolve()),
            "source_sha256": digest,
            "model": args.model,
            "chunk_size": CHUNK_SIZE,
            "chunk_overlap": CHUNK_OVERLAP,
            "chunks": chunks,
        }),
    )
    cost = tokens * 0.13 / 1_000_000  # text-embedding-3-large list price
    print(f"Wrote {args.cache} ({matrix.shape[0]} x {matrix.shape[1]}); "
          f"{tokens} tokens, ~${cost:.4f}", file=sys.stderr)


def load_cache(path, source, model):
    messages, digest = load_messages(source)
    bundle = np.load(path, allow_pickle=False)
    meta = json.loads(str(bundle["meta"]))
    if meta["source_sha256"] != digest or meta["model"] != model \
            or meta["chunk_size"] != CHUNK_SIZE or meta["chunk_overlap"] != CHUNK_OVERLAP:
        raise SystemExit(
            f"Cache is stale (source or model changed); rebuild with:\n"
            f"  uv run {Path(__file__).name} build"
        )
    return meta, np.asarray(bundle["embeddings"], dtype=np.float32)


def cmd_search(args):
    meta, matrix = load_cache(args.cache, args.source, args.model)
    query, tokens = embed(args.model, [args.query])
    scores = matrix @ query[0]
    order = np.argsort(-scores)[:args.limit]
    results = []
    for pos in order:
        chunk = dict(meta["chunks"][int(pos)])
        if args.role and chunk["role"] not in args.role:
            continue
        results.append({**chunk, "score": round(float(scores[pos]), 4)})
    if args.json:
        out = {"query": args.query, "model": args.model, "results": results}
        sys.stdout.write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
        return
    for rank, hit in enumerate(results, 1):
        print(f"\n=== #{rank} | score {hit['score']} | message {hit['index']} "
              f"| JSONL line {hit['source_line']} | {hit['role']}/{hit['type']} "
              f"| {hit['field']} (offset {hit['offset']}, line {hit['field_line']}) ===")
        print(hit["text"])
    print(f"\n({len(results)} results for {args.query!r}; "
          f"{len(meta['chunks'])} chunks in index)", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--cache", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    sub = parser.add_subparsers(dest="command", required=True)
    build = sub.add_parser("build", help="(Re)build the embedding cache (calls the API)")
    build.add_argument("--dry-run", action="store_true", help="Chunk stats only, no API calls")
    build.set_defaults(func=cmd_build)
    search = sub.add_parser("search", help="Semantic search over cached chunks (calls the API)")
    search.add_argument("query")
    search.add_argument("-k", "--limit", type=int, default=10)
    search.add_argument("--role", action="append")
    search.add_argument("--json", action="store_true")
    search.set_defaults(func=cmd_search)
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
