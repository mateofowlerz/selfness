"use client";
import { useEffect, useState } from "react";
import { buttonClass, inputClass, MessageDetail, SourceLink } from "../shared";
export default function Transcript() {
  const [index, setIndex] = useState(82);
  const [entry, setEntry] = useState("82");
  const [error, setError] = useState("");
  useEffect(() => {
    const update = () => {
      const match = window.location.hash.match(/^#m(\d+)$/);
      const n = match ? Number(match[1]) : 82;
      setIndex(n);
      setEntry(String(n));
    };
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return (
    <>
      <h1 className="mb-3">Read the source.</h1>
      <p className="mb-6 text-muted">
        The released transcript, with its original message numbers. Thinking and tool output are preserved as text.
      </p>
      <details className="mb-6 text-sm text-muted">
        <summary className="min-h-11 cursor-pointer py-3">What is missing from this release?</summary>
        <p>
          Messages 1–81 and everything after 2145 were withheld by the publisher. Some messages and sensitive values
          within the release are also redacted. Message 0 is the system message. Missing material cannot be
          reconstructed from this archive.
        </p>
      </details>
      <form
        className="mb-6 flex items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!/^\d+$/.test(entry)) {
            setError("Enter an original message number.");
            return;
          }
          setError("");
          setIndex(Number(entry));
          window.location.hash = `m${Number(entry)}`;
        }}
      >
        <label className="flex-1 text-sm">
          Jump to message
          <input
            className={`${inputClass} mt-2`}
            type="text"
            inputMode="numeric"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
          />
        </label>
        <button className={buttonClass} type="submit">
          Go →
        </button>
      </form>
      {error ? (
        <p role="alert" className="mb-4 text-primary">
          {error}
        </p>
      ) : null}
      <p className="mb-8 flex flex-wrap gap-3 text-xs text-muted">
        Key passages:{" "}
        {[99, 101, 129, 139, 835, 1102, 2137, 2144].map((n) => (
          <SourceLink key={n} index={n} />
        ))}
      </p>
      <div id={`m${index}`} className="scroll-mt-8">
        <MessageDetail key={index} index={index} autoScroll />
      </div>
    </>
  );
}
