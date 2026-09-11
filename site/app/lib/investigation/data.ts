import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

const directory = path.join(process.cwd(), "data/investigation");
const cache = new Map<string, Promise<unknown>>();
export function readDataset<T>(name: "messages" | "search" | "episodes" | "segments" | "semantic"): Promise<T> {
  let value = cache.get(name);
  if (!value) {
    value = readFile(path.join(directory, `${name}.json`), "utf8")
      .then(JSON.parse)
      .catch((error) => {
        cache.delete(name);
        throw error;
      });
    cache.set(name, value);
  }
  return value as Promise<T>;
}
let vectors: Promise<Float32Array> | undefined;
export function readVectors() {
  vectors ??= readFile(path.join(directory, "vectors.f32"))
    .then((b) => {
      const result = new Float32Array(b.length / 4);
      for (let i = 0; i < result.length; i++) result[i] = b.readFloatLE(i * 4);
      return result;
    })
    .catch((error) => {
      vectors = undefined;
      throw error;
    });
  return vectors;
}
