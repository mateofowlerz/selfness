import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import BreakawayMark from "../components/BreakawayMark";
import { getWritingBySlug } from "../lib/writings";

export const alt = "An essay by Mateo Fowler";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ImageResponse uses Satori's `tw` prop to render Tailwind utilities.
function Box({ className, children }: { className: string; children?: ReactNode }) {
  return <div tw={className}>{children}</div>;
}

export default async function BlogImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const writing = getWritingBySlug(slug);
  if (!writing || writing.hidden) notFound();
  const isStartupsEssay = slug === "startups-vs-labs";

  const font = await readFile(join(process.cwd(), "public/fonts/PublicSans-Medium-OG.ttf"));
  const titleSize =
    writing.title.length > 80 ? "text-[52px]" : writing.title.length > 45 ? "text-[64px]" : "text-[78px]";
  const date = writing.date
    ? new Date(`${writing.date}T12:00:00Z`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "An essay by Mateo Fowler";

  return new ImageResponse(
    <Box className="flex h-full w-full flex-col bg-[#faf9f7] p-[48px] text-[#1a1a1a]">
      <Box className="flex h-[48px] w-full items-start justify-between border-b border-[#d7d2cc]">
        <Box className="flex items-center text-[24px]">
          <Box className="mr-[12px] flex h-[14px] w-[14px] rounded-full bg-[#d42a60]" />
          Mateo Fowler
        </Box>
      </Box>
      <Box className="flex flex-1 items-center justify-between">
        {isStartupsEssay ? (
          <Box className="flex w-[580px] flex-col text-[100px] leading-[1.02] tracking-[-5px]">
            <Box className="flex">Startups</Box>
            <Box className="flex items-center">
              <Box className="mr-[22px] flex text-[46px] tracking-[-2px] text-[#d42a60]">vs</Box>
              Labs
            </Box>
          </Box>
        ) : (
          <Box className="flex w-[690px] flex-col pr-[36px]">
            <Box className={`flex ${titleSize} leading-[1.06] tracking-[-4px]`}>{writing.title}</Box>
          </Box>
        )}
        {isStartupsEssay ? (
          <BreakawayMark />
        ) : (
          <Box className="relative flex h-[340px] w-[340px] items-center justify-center overflow-hidden bg-[#d42a60]">
            <svg width="340" height="340" viewBox="0 0 340 340" fill="none" aria-hidden="true">
              <path d="M0 170H340M170 0V340" stroke="#faf9f7" strokeOpacity="0.25" />
              <circle cx="170" cy="170" r="140" stroke="#faf9f7" strokeOpacity="0.4" />
              {Array.from({ length: 12 }, (_, index) => (
                <ellipse
                  key={`orbit-${index * 15}`}
                  cx="170"
                  cy="170"
                  rx="62"
                  ry="140"
                  transform={`rotate(${index * 15} 170 170)`}
                  stroke="#faf9f7"
                  strokeWidth="1.2"
                  strokeOpacity="0.8"
                />
              ))}
              <circle cx="170" cy="170" r="7" fill="#faf9f7" />
            </svg>
          </Box>
        )}
      </Box>
      <Box className="flex h-[38px] items-end justify-between border-t border-[#d7d2cc] text-[17px] text-[#6b6b6b]">
        <Box className="flex">{date}</Box>
        <Box className="flex items-center text-[#a82250]">
          Read the essay
          <Box className="ml-[10px] flex">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 19 19 5M5 5h14v14" stroke="#a82250" strokeWidth="1.5" />
            </svg>
          </Box>
        </Box>
      </Box>
    </Box>,
    { ...size, fonts: [{ name: "Public Sans", data: font, style: "normal", weight: 500 }] },
  );
}
