import { readDataset } from "@/app/lib/investigation/data";
import type { Message } from "@/app/lib/investigation/types";

export const runtime = "nodejs";
const headers = { "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" };
export async function GET(request: Request, { params }: { params: Promise<{ dataset: string }> }) {
  const { dataset } = await params;
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
