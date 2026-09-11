import type { Metadata } from "next";

const cards = {
  episodes: {
    title: "Timeline of Mythos adventure through the internet",
    description: "Follow Mythos 5 through the released transcript, one episode and original message at a time.",
    alt: "Mythos on the internet — a black globe with a red path connecting its stops",
  },
  search: {
    title: "Regex & tags — Mythos 5",
    description: "Explore patterns in the released Mythos 5 transcript by tag, phrase, or original message number.",
    alt: "Follow the reasoning — a magnifying glass finding a red passage among black text strips",
  },
  semantic: {
    title: "Semantic search — Mythos 5",
    description: "Search the released Mythos 5 transcript by meaning and find the original passages behind an idea.",
    alt: "Search by meaning — a constellation of black nodes connected to a red node",
  },
  transcript: {
    title: "Original transcript — Mythos 5",
    description: "Read the released Mythos 5 messages with original numbering, thinking, tool calls, and results.",
    alt: "Read the source — a folded black transcript with a red highlight",
  },
};

export function investigationMetadata(tool: keyof typeof cards): Metadata {
  const card = cards[tool];
  const images = [
    { url: `/og/investigation-${tool}-v1.png`, width: 1200, height: 630, alt: card.alt, type: "image/png" },
  ];
  return {
    title: card.title,
    description: card.description,
    alternates: { canonical: `/investigation/${tool}` },
    openGraph: {
      title: card.title,
      description: card.description,
      url: `/investigation/${tool}`,
      type: "website",
      siteName: "Mateo Fowler",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: card.title,
      description: card.description,
      creator: "@mateofowlerz",
      images,
    },
  };
}
