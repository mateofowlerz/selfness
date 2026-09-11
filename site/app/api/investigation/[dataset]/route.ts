import { readDataset } from "@/app/lib/investigation/data";
import type { Episode, EpisodePreview, Message, Segment } from "@/app/lib/investigation/types";

export const runtime = "nodejs";
const headers = { "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" };
export async function GET(request: Request, { params }: { params: Promise<{ dataset: string }> }) {
  const { dataset } = await params;
  if (dataset === "episode" || dataset === "episode-messages" || dataset === "episode-previews") {
    const search = new URL(request.url).searchParams;
    if (dataset === "episode" || dataset === "episode-messages") {
      const raw = search.get("index");
      if (!raw || !/^\d+$/.test(raw))
        return Response.json({ error: "An episode number is required." }, { status: 400 });
      const { episodes } = await readDataset<{ episodes: Episode[] }>("episodes");
      const episode = episodes.find((ep) => ep.ep === Number(raw));
      if (!episode) return Response.json({ error: "This episode is not in the archive." }, { status: 404 });
      if (dataset === "episode-messages") {
        const source = await readDataset<Message[]>("messages");
        const messages = source
          .filter((m) => m.index >= episode.idx_first && m.index <= episode.idx_last && typeof m.content === "string")
          .map(({ index, role, content }) => ({ index, role, content }));
        return Response.json({ episode, messages }, { headers });
      }
      return Response.json({ episode }, { headers });
    }
    const [{ episodes }, { segments }] = await Promise.all([
      readDataset<{ episodes: Episode[] }>("episodes"),
      readDataset<{ segments: Segment[] }>("segments"),
    ]);
    const query = search.get("q") ?? "";
    const stage = search.get("stage") ?? "";
    const segment = segments.find((s) => s.id === Number(stage));
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const previews: EpisodePreview[] = episodes
      .filter((ep) => {
        if (segment && (ep.ep < segment.ep_start || ep.ep > segment.ep_end)) return false;
        if (!terms.length) return true;
        const text = [
          String(ep.ep),
          ep.thinking,
          ep.visible,
          ep.note ?? "",
          ...ep.groups.map((g) => g.replaceAll("_", " ")),
          ...ep.tools.map((t) => `${t.name} ${t.call_preview} ${t.result_preview}`),
          ...Object.values(ep.artifacts).flat(),
        ]
          .join(" ")
          .toLowerCase();
        return terms.every((term) => text.includes(term));
      })
      .map((ep) => {
        const text = (ep.note || ep.thinking || ep.visible || ep.tools[0]?.name || "Open episode")
          .replace(/\s+/g, " ")
          .trim();
        return {
          ep: ep.ep,
          idx_first: ep.idx_first,
          idx_last: ep.idx_last,
          ts_start: ep.ts_start,
          groups: ep.groups,
          preview: text.length > 220 ? `${text.slice(0, 220)}…` : text,
        };
      });
    return Response.json({ episodes: previews, query, stage }, { headers });
  }
  if (dataset === "message") {
    const raw = new URL(request.url).searchParams.get("index");
    if (!raw || !/^\d+$/.test(raw)) return Response.json({ error: "A message number is required." }, { status: 400 });
    const messages = await readDataset<Message[]>("messages");
    const position = messages.findIndex((m) => m.index === Number(raw));
    if (position < 0)
      return Response.json({ error: "This message is not in the released transcript." }, { status: 404 });
    return Response.json(
      {
        message: messages[position],
        previous: messages[position - 1]?.index ?? null,
        next: messages[position + 1]?.index ?? null,
      },
      { headers },
    );
  }
  if (dataset === "search" || dataset === "episodes" || dataset === "segments") {
    return Response.json(await readDataset(dataset), { headers });
  }
  return Response.json({ error: "Not found" }, { status: 404 });
}
