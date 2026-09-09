/** A small rocket leaves a central body's orbit: independence from the labs. */
export default function BreakawayMark({ animated = false }: { animated?: boolean }) {
  return (
    <svg width="460" height="400" viewBox="0 0 460 400" fill="none" aria-hidden="true">
      <path d="M25 246H410M183 40V389" stroke="#d7d2cc" strokeWidth="1" strokeDasharray="3 7" />
      <g transform="rotate(-32 183 246)">
        <ellipse cx="183" cy="246" rx="151" ry="116" stroke="#1a1a1a" strokeWidth="1.2" opacity="0.22" />
        <ellipse cx="183" cy="246" rx="123" ry="91" stroke="#1a1a1a" strokeWidth="1.2" opacity="0.38" />
        <ellipse cx="183" cy="246" rx="95" ry="66" stroke="#1a1a1a" strokeWidth="1.2" opacity="0.6" />
        <ellipse cx="183" cy="246" rx="69" ry="42" stroke="#1a1a1a" strokeWidth="1.2" />
      </g>
      <circle cx="183" cy="246" r="36" fill="#1a1a1a" />
      <circle cx="183" cy="246" r="5" fill="#faf9f7" />
      <path
        data-breakaway-trail=""
        d="M92 301C194 375 303 258 348 116"
        pathLength="1"
        strokeDasharray={animated ? 1 : undefined}
        className={animated ? "motion-safe:[stroke-dashoffset:1]" : undefined}
        stroke="#faf9f7"
        strokeWidth="12"
      />
      <path
        data-breakaway-trail=""
        d="M92 301C194 375 303 258 348 116"
        pathLength="1"
        strokeDasharray={animated ? 1 : undefined}
        className={animated ? "motion-safe:[stroke-dashoffset:1]" : undefined}
        stroke="#d42a60"
        strokeWidth="3"
      />
      <path
        data-breakaway-ticks=""
        className={animated ? "motion-safe:opacity-0" : undefined}
        d="m89 305 7-10M111 317l5-11M135 324l2-12"
        stroke="#d42a60"
        strokeWidth="2"
      />
      <g
        data-breakaway-rocket=""
        className={animated ? "motion-safe:opacity-0" : undefined}
        transform="translate(360 82) rotate(20)"
      >
        <path d="M0-70C8-53 10-40 10-23V18H-10V-23C-10-40-8-53 0-70Z" fill="#d42a60" />
        <path d="M-10-2-21 20l11-4M10-2l11 22-11-4" fill="#d42a60" />
        <path d="M0-47V5" stroke="#faf9f7" strokeWidth="1.8" />
        <path d="M-7 23H7M0 30v21" stroke="#d42a60" strokeWidth="2.2" />
      </g>
      <circle cx="278" cy="183" r="4" fill="#d42a60" />
      <path d="M410 157v16M402 165h16M289 48v10M284 53h10" stroke="#d42a60" strokeWidth="1.5" />
    </svg>
  );
}
