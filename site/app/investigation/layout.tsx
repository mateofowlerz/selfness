import type { Metadata } from "next";
import Link from "next/link";
import Navigation from "./navigation";

export const metadata: Metadata = {
  title: { template: "%s — Mateo Fowler", default: "Anthropic investigation — Mateo Fowler" },
  description:
    "Explore the released Mythos 5 transcript through tagged search, semantic search, and a sourced episode timeline.",
  robots: { index: false, follow: true },
};
export default function InvestigationLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-w-0 [&_button]:cursor-pointer [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-50 [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-primary">
      <Link
        href="/anthropic-cybersecurity-investigation"
        className="inline-flex min-h-11 items-center text-sm text-muted hover:text-primary"
      >
        ← Back to the investigation
      </Link>
      <p className="mt-6 mb-2 text-xs uppercase tracking-[0.16em] text-muted">Research companion · Mythos 5</p>
      <Navigation />
      {children}
      <footer className="mt-16 border-t border-muted/20 pt-6 text-xs text-muted">
        <p>
          One released transcript. Original numbering and redactions preserved. Tags, scores, and summaries are research
          aids, not proof of a model’s intent.
        </p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          <a className="underline hover:text-primary" href="/investigation/source/README.md">
            Publisher’s release notes
          </a>
          <a className="underline hover:text-primary" href="/investigation/source/transcript.jsonl">
            Source transcript (JSONL)
          </a>
          <a className="underline hover:text-primary" href="/investigation/source/manifest.json">
            Provenance & checksums
          </a>
        </p>
      </footer>
    </main>
  );
}
