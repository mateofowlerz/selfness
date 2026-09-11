#!/usr/bin/env python3
"""Exercise a local Next production build; all searches use existing vectors.

Start with: env -u OPENAI_API_KEY pnpm start --hostname 127.0.0.1 --port 3048
"""
import argparse
import json
import urllib.error
import urllib.request

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--url", default="http://127.0.0.1:3048")
args = parser.parse_args()
assert args.url.startswith(("http://127.0.0.1:", "http://localhost:")), "Local testing only"


def request(path, body=None, headers=None):
    req = urllib.request.Request(args.url + path, data=None if body is None else json.dumps(body).encode(), headers={"Content-Type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()


for path in ["/", "/anthropic-cybersecurity-investigation", "/investigation/search", "/investigation/semantic", "/investigation/episodes", "/investigation/transcript", "/investigation/source/transcript.jsonl"]:
    status, body = request(path)
    assert status == 200, (path, status)
    if path == "/":
        assert b'/anthropic-cybersecurity-investigation' in body, "Homepage investigation link"
for name in ["search", "segments", "episodes"]:
    assert request("/api/investigation/" + name)[0] == 200, name
for index in [0, 82, 129, 2144]:
    status, body = request("/api/investigation/message?index=" + str(index))
    assert status == 200, (index, status)
    assert json.loads(body)["message"]["index"] == index, index
assert request("/api/investigation/message?index=1")[0] == 404, "Redacted message"
assert request("/api/investigation/message?index=nope")[0] == 400, "Invalid message number"
assert request("/api/investigation/vectors")[0] == 404, "Vectors are server-only"
for body, expected in [({"query": ""}, 400), ({"query": "abc", "k": 51}, 400), ({"message": 139, "query": "abc"}, 400), ({"message": 1}, 404), ({"query": "test no key"}, 503)]:
    actual, payload = request("/api/investigation/semantic", body)
    assert actual == expected, (body, actual, payload)
assert request("/api/investigation/semantic", {"message": 139}, {"Origin": "https://unrelated.example"})[0] == 403, "Cross-origin request"
for index in [139, 835, 2137]:
    status, raw = request("/api/investigation/semantic", {"message": index, "k": 5}, {"Origin": args.url})
    assert status == 200, (index, status, raw)
    payload = json.loads(raw)
    assert len(payload["results"]) == 5, index
    print("Cached semantic search", index, [(hit["index"], hit["score"]) for hit in payload["results"][:2]])
print("PASS: production pages, homepage listing, archive endpoints, message IDs, validation, origin rejection, no-key state, and cached semantic results.")
