import Markdown from "react-markdown";

const noteComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <span className="block">{children}</span>,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} className="text-primary underline hover:text-primary-dark">
      {children}
    </a>
  ),
};

export function NoteBody({ text }: { text: string }) {
  return <Markdown components={noteComponents}>{text}</Markdown>;
}

export default function Sidenote({ id, text }: { id: string; text: string }) {
  return (
    <>
      <sup className="text-[0.7em] leading-none">
        <a href={`#fn-${id}`} className="text-(--muted) no-underline hover:text-primary-dark">
          [{id}]
        </a>
      </sup>
      <span className="hidden xl:float-right xl:clear-right xl:-mr-[17rem] xl:mb-6 xl:block xl:w-60 xl:text-sm xl:leading-snug xl:text-(--muted)">
        <span className="relative block pl-5 [&_span.block+span.block]:mt-2">
          <span className="absolute top-0 left-0">{id}.</span>
          <NoteBody text={text} />
        </span>
      </span>
    </>
  );
}
