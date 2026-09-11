export type Scope = "both" | "thinking" | "visible";
export type Span = { start: number; end: number; group?: string; pattern?: string; thinking: boolean };
export type Message = {
  index: number;
  source_line: number;
  role: string;
  type: string;
  timestamp?: string;
  content?: unknown;
  tool_call?: unknown;
  tool_call_raw?: unknown;
  tool_result?: unknown;
  sections?: Span[];
  spans?: Span[];
};
export type SearchData = {
  definitions: {
    groups: Record<string, { weight: number; description: string; patterns: string[] }>;
    cooccurrence_bonus: [string, string, number][];
  };
  scopes: Record<Scope, { index: number; groups: string[]; excerpts: Record<string, string> }[]>;
  summaries: Record<string, string>;
  wobble: Record<string, { score: number; chunk: string }>;
};
export type Ranked = {
  index: number;
  score: number;
  groups: string[];
  excerpt: string;
  summary: string;
  wobble: number | null;
};
export type Chunk = {
  index: number;
  source_line: number;
  role: string;
  type: string;
  field: string;
  offset: number;
  field_line: number;
  text: string;
};
export type SemanticIndex = { model: string; dimensions: number; source_sha256: string; chunks: Chunk[] };
export type SemanticHit = Chunk & { score: number };
export type Episode = {
  ep: number;
  idx_first: number;
  idx_last: number;
  ts_start: string;
  thinking: string;
  visible: string;
  wobble: number | null;
  groups: string[];
  note?: string;
  artifacts: Record<string, string[]>;
  tools: { idx: number; name: string; call_preview: string; result_preview: string }[];
};
export type Segment = {
  id: number;
  ep_start: number;
  ep_end: number;
  msg_first: number;
  msg_last: number;
  minutes: number;
  n_episodes: number;
  wobble_mean: number;
  label: { name: string; summary: string[] | string; handoff: string; milestone_messages: number[] };
};
