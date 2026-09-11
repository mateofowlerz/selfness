#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy>=1.26"]
# ///
"""Time-constrained ("chapter") segmentation of the transcript episodes.

Each episode (an Assistant thinking block) gets the mean of its cached
content-chunk embeddings. Contiguity-constrained agglomerative merge: only
adjacent segments may merge, cost = 1 - cos(mean_i, mean_j), stopped at the
merge-cost elbow (target roughly 8-12 macro phases). Then per-segment stats:
rate-of-work, wobble, dominant tools/hosts/files, distinctive terms.

Writes analysis/misalignment-reasoning/segments.json (unlabeled; labels are
added by a separate agent pass). No API calls — cached embeddings only.
"""

from collections import Counter
import json
from pathlib import Path
import re

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
CACHE = (ROOT.parent.parent / "investigations" / "scripts"
         / "transcript_semantic_index.npz")
EPISODES = ROOT / "analysis/misalignment-reasoning/episodes.json"
OUT = ROOT / "analysis/misalignment-reasoning/segments.json"

K_MIN, K_MAX = 8, 14
STOPWORDS = set("""the a an and or of to in is it for on with at by from as be this that
i my me we you they he she its not no so if then but what how why can could should would
let's let me also just was were are been have has had do does did will about there here
when which who whom them us into out up down over under again once more most other some
any each few same such only very - — → ✓ + = --> """.split())


def episode_vectors(chunk_meta, E, ep_by_index):
    """Mean normalized embedding per episode (TextMessage content chunks)."""
    sums, counts = {}, Counter()
    for pos, c in enumerate(chunk_meta):
        if c["role"] != "Assistant" or c["type"] != "TextMessage" or c["field"] != "content":
            continue
        ep = ep_by_index.get(c["index"])
        if ep is None:
            continue
        sums[ep] = sums.get(ep, 0) + E[pos]
        counts[ep] += 1
    vectors = {}
    for ep, s in sums.items():
        v = s / counts[ep]
        vectors[ep] = v / (np.linalg.norm(v) + 1e-9)
    return vectors


def merge_cost(a, b):
    d = 1.0 - float(np.dot(a["vec"], b["vec"]))
    # ward-ish weighting so giant segments don't dominate
    return d * (a["n"] * b["n"]) / (a["n"] + b["n"])


def segment(vectors, ordered_eps):
    segs = [{"vec": vectors[ep].copy(), "eps": [ep], "n": 1} for ep in ordered_eps]
    merge_log = []
    while len(segs) > K_MIN:
        costs = [merge_cost(segs[i], segs[i + 1]) for i in range(len(segs) - 1)]
        i = int(np.argmin(costs))
        merge_log.append((len(segs), costs[i]))
        a, b = segs[i], segs[i + 1]
        vec = (a["vec"] * a["n"] + b["vec"] * b["n"]) / (a["n"] + b["n"])
        vec = vec / (np.linalg.norm(vec) + 1e-9)
        segs[i] = {"vec": vec, "eps": a["eps"] + b["eps"], "n": a["n"] + b["n"]}
        del segs[i + 1]
    # elbow: biggest jump in cheapest-merge cost as k decreases
    ks = [k for k, _ in merge_log]
    cs = [c for _, c in merge_log]
    best_k = None
    best_jump = -1
    for t in range(len(cs) - 1):
        if K_MIN <= ks[t + 1] <= K_MAX:
            jump = cs[t + 1] - cs[t]
            if jump > best_jump:
                best_jump, best_k = jump, ks[t + 1]
    # re-merge down to best_k... merge_log currently goes all the way to K_MIN;
    # rebuild by replaying from full segmentation again would be wasteful — the
    # merges are deterministic, so track states in a second pass:
    segs = [{"vec": vectors[ep].copy(), "eps": [ep], "n": 1} for ep in ordered_eps]
    while len(segs) > best_k:
        costs = [merge_cost(segs[i], segs[i + 1]) for i in range(len(segs) - 1)]
        i = int(np.argmin(costs))
        a, b = segs[i], segs[i + 1]
        vec = (a["vec"] * a["n"] + b["vec"] * b["n"]) / (a["n"] + b["n"])
        vec = vec / (np.linalg.norm(vec) + 1e-9)
        segs[i] = {"vec": vec, "eps": a["eps"] + b["eps"], "n": a["n"] + b["n"]}
        del segs[i + 1]
    return segs, best_k, merge_log


def distinctive_terms(episodes, seg_eps, all_texts):
    df = Counter()
    docs = {}
    for ep, text in all_texts.items():
        toks = [t for t in re.findall(r"[a-zA-Z][a-zA-Z0-9_.:/+-]{2,}", text.lower())
                if t not in STOPWORDS]
        docs[ep] = Counter(toks)
        for t in set(toks):
            df[t] += 1
    seg_tf = Counter()
    for ep in seg_eps:
        seg_tf.update(docs.get(ep, {}))
    n_docs = len(all_texts) or 1
    scored = [(t, c * np.log(1 + n_docs / (1 + df[t]))) for t, c in seg_tf.most_common(300)
              if not re.match(r"^[0-9a-f]{4,}$", t)]
    scored.sort(key=lambda kv: -kv[1])
    return [t for t, _ in scored[:12]]


def main():
    bundle = np.load(CACHE, allow_pickle=False)
    meta = json.loads(str(bundle["meta"]))
    E = np.asarray(bundle["embeddings"], dtype=np.float32)
    ep_data = json.loads(EPISODES.read_text())["episodes"]

    # TextMessage episodes get vectors keyed by their opening message index.
    ep_by_index = {e["idx_first"]: e["ep"] for e in ep_data if e["thinking"]}
    vectors = episode_vectors(meta["chunks"], E, ep_by_index)
    ordered = [e for e in ep_data if e["thinking"] and e["ep"] in vectors]
    segs, k, merge_log = segment({e["ep"]: vectors[e["ep"]] for e in ordered},
                                 [e["ep"] for e in ordered])

    texts = {e["ep"]: e["thinking"] for e in ordered}
    by_ep = {e["ep"]: e for e in ep_data}
    segments = []
    for i, s in enumerate(segs, 1):
        eps = s["eps"]
        first, last = by_ep[eps[0]], by_ep[eps[-1]]
        minutes = max(
            (np.datetime64(last["ts_start"].replace(" ", "T"))
             - np.datetime64(first["ts_start"].replace(" ", "T")))
            / np.timedelta64(1, "m"), 1.0)
        wobbles = [e["wobble"] for e in (by_ep[x] for x in eps) if e["wobble"] is not None]
        tools = Counter(t["name"] or "tool" for x in eps for t in by_ep[x]["tools"])
        hosts = Counter(h for x in eps for h in by_ep[x]["artifacts"]["hosts"])
        files = Counter(f for x in eps for f in by_ep[x]["artifacts"]["files"])
        groups = Counter(g for x in eps for g in by_ep[x]["groups"])
        peak_ep = max(eps, key=lambda x: (by_ep[x]["wobble"] or 0))
        segments.append({
            "id": i,
            "ep_start": eps[0], "ep_end": eps[-1],
            "msg_first": first["idx_first"], "msg_last": last["idx_last"],
            "ts_start": first["ts_start"], "ts_end": last["ts_start"],
            "minutes": round(minutes, 1),
            "n_episodes": len(eps),
            "eps_per_minute": round(len(eps) / minutes, 2),
            "wobble_mean": round(float(np.mean(wobbles)), 3) if wobbles else None,
            "wobble_max": max(wobbles) if wobbles else None,
            "peak_wobble_ep": peak_ep,
            "top_tools": tools.most_common(4),
            "top_hosts": hosts.most_common(6),
            "top_files": files.most_common(4),
            "signal_groups": groups.most_common(5),
            "distinctive_terms": distinctive_terms(None, eps, texts),
            "samples": {
                ep: re.sub(r"\s+", " ", by_ep[ep]["thinking"])[:600]
                for ep in [eps[0], peak_ep, max(eps, key=lambda x: len(by_ep[x]["thinking"]))]
            },
        })

    OUT.write_text(json.dumps({
        "method": {
            "vectors": "mean cached content-chunk embeddings per episode (text-embedding-3-large)",
            "merge": "contiguity-constrained agglomerative, ward-ish cost",
            "k": k,
            "k_range": [K_MIN, K_MAX],
        },
        "segments": segments,
    }, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {OUT} — {len(segments)} segments (elbow k={k})")
    for s in segments:
        print(f"  seg {s['id']:>2}  ep {s['ep_start']:>3}-{s['ep_end']:>3}  "
              f"{s['ts_start'][11:]} → {s['ts_end'][11:]}  {s['n_episodes']:>3} eps  "
              f"{s['minutes']:6.1f} min  wob {s['wobble_mean'] or '–'}  "
              f"{', '.join(s['distinctive_terms'][:6])}")


if __name__ == "__main__":
    main()
