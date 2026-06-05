import * as React from "react";

type Props = React.SVGProps<SVGSVGElement> & { title?: string };

const baseStroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function Sparkle({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M12 2c.6 4.4 1.6 5.4 6 6-4.4.6-5.4 1.6-6 6-.6-4.4-1.6-5.4-6-6 4.4-.6 5.4-1.6 6-6Z"
        fill="currentColor"
      />
      <path
        d="M19 14c.3 2 .7 2.4 2.5 2.7-1.8.3-2.2.7-2.5 2.7-.3-2-.7-2.4-2.5-2.7 1.8-.3 2.2-.7 2.5-2.7Z"
        fill="currentColor"
        opacity={0.8}
      />
    </svg>
  );
}

export function Squiggle({
  className,
  ...props
}: Props & { color?: string }) {
  return (
    <svg
      viewBox="0 0 120 14"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
      {...props}
    >
      <path
        d="M2 9 Q 15 -1, 28 9 T 54 9 T 80 9 T 118 6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function DoodleShield({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 64 72"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke}>
        <path d="M32 4 C 18 8, 8 8, 4 10 C 4 36, 12 56, 32 68 C 52 56, 60 36, 60 10 C 56 8, 46 8, 32 4 Z" />
        <path d="M22 34 L 30 42 L 44 26" />
      </g>
    </svg>
  );
}

export function DoodleLock({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 64 72"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke}>
        <rect x="10" y="28" width="44" height="36" rx="6" />
        <path d="M18 28 V 20 a14 14 0 0 1 28 0 V 28" />
        <circle cx="32" cy="44" r="4" fill="currentColor" />
        <path d="M32 48 V 56" />
      </g>
    </svg>
  );
}

export function DoodleKey({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 72 32"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke}>
        <circle cx="14" cy="16" r="10" />
        <circle cx="14" cy="16" r="3" fill="currentColor" stroke="none" />
        <path d="M24 16 H 66" />
        <path d="M58 16 V 24" />
        <path d="M50 16 V 22" />
      </g>
    </svg>
  );
}

export function DoodleCheck({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke}>
        <path d="M5 17 L 13 25 L 27 8" strokeWidth={3} />
      </g>
    </svg>
  );
}

export function DoodleCross({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke}>
        <path d="M7 7 L 25 25" strokeWidth={3} />
        <path d="M25 7 L 7 25" strokeWidth={3} />
      </g>
    </svg>
  );
}

export function DoodleArrow({
  className,
  ...props
}: Props & { direction?: "right" | "down" | "left" | "up" }) {
  return (
    <svg
      viewBox="0 0 60 40"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke}>
        <path d="M4 32 C 16 10, 36 10, 54 14" strokeWidth={3} />
        <path d="M44 6 L 56 14 L 46 24" strokeWidth={3} />
      </g>
    </svg>
  );
}

export function DoodleStar({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M16 3 L 19 12 L 28 13 L 21 19 L 24 28 L 16 23 L 8 28 L 11 19 L 4 13 L 13 12 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DoodleFork({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke} strokeWidth={2.4}>
        <circle cx="8" cy="6" r="2.4" fill="currentColor" />
        <circle cx="8" cy="26" r="2.4" fill="currentColor" />
        <circle cx="24" cy="16" r="2.4" fill="currentColor" />
        <path d="M8 8 V 24" />
        <path d="M8 16 H 16 a 6 6 0 0 0 6 -6 V 14" />
      </g>
    </svg>
  );
}

export function DoodleMagnifier({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke}>
        <circle cx="20" cy="20" r="14" />
        <path d="M30 30 L 42 42" strokeWidth={3} />
      </g>
    </svg>
  );
}

export function DoodleBug({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke}>
        <ellipse cx="32" cy="38" rx="14" ry="16" />
        <path d="M32 22 V 56" />
        <path d="M22 16 L 18 8" />
        <path d="M42 16 L 46 8" />
        <path d="M14 28 L 4 26" />
        <path d="M50 28 L 60 26" />
        <path d="M14 38 L 4 40" />
        <path d="M50 38 L 60 40" />
        <circle cx="26" cy="14" r="2.4" fill="currentColor" />
        <circle cx="38" cy="14" r="2.4" fill="currentColor" />
      </g>
    </svg>
  );
}

export function DoodleBook({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 64 56"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke}>
        <path d="M4 10 C 14 4, 24 4, 32 10 C 40 4, 50 4, 60 10 V 50 C 50 44, 40 44, 32 50 C 24 44, 14 44, 4 50 Z" />
        <path d="M32 10 V 50" />
        <path d="M12 18 H 26" />
        <path d="M38 18 H 52" />
        <path d="M12 26 H 26" />
        <path d="M38 26 H 52" />
      </g>
    </svg>
  );
}

export function DoodleWrench({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke}>
        <path d="M40 8 a10 10 0 0 0 -10 14 L 8 44 a4 4 0 0 0 6 6 L 36 28 a10 10 0 0 0 14 -10 a8 8 0 0 1 -10 4 l4 -6 l -6 -2 l4 -6 a8 8 0 0 1 -2 0 Z" />
      </g>
    </svg>
  );
}

export function DoodleWorkflow({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke}>
        <rect x="6" y="8" width="20" height="14" rx="3" />
        <rect x="38" y="8" width="20" height="14" rx="3" />
        <rect x="22" y="42" width="20" height="14" rx="3" />
        <path d="M16 22 V 32 H 32 V 42" />
        <path d="M48 22 V 32 H 32" />
      </g>
    </svg>
  );
}

export function DoodleList({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke}>
        <path d="M14 18 H 54" />
        <path d="M14 32 H 54" />
        <path d="M14 46 H 54" />
        <circle cx="6" cy="18" r="2" fill="currentColor" />
        <circle cx="6" cy="32" r="2" fill="currentColor" />
        <circle cx="6" cy="46" r="2" fill="currentColor" />
      </g>
    </svg>
  );
}

export function DoodleGithub({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M12 2a10 10 0 0 0-3.16 19.5c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.36-1.34-3.36-1.34-.46-1.16-1.12-1.46-1.12-1.46-.92-.62.07-.6.07-.6 1.02.07 1.55 1.05 1.55 1.05.9 1.55 2.36 1.1 2.94.84.09-.66.35-1.1.64-1.36-2.22-.25-4.56-1.11-4.56-4.94 0-1.1.39-2 1.03-2.7-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.9-1.3 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.7 0 3.84-2.35 4.69-4.58 4.93.36.31.68.92.68 1.86v2.76c0 .26.18.58.69.48A10 10 0 0 0 12 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function DoodleExternal({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke}>
        <path d="M9 5 H 6 a2 2 0 0 0 -2 2 v 12 a2 2 0 0 0 2 2 h 12 a2 2 0 0 0 2 -2 v -3" />
        <path d="M14 4 H 20 V 10" />
        <path d="M19 5 L 11 13" />
      </g>
    </svg>
  );
}

export function DoodleLoader({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke}>
        <path d="M32 8 a24 24 0 1 1 -22 14" />
        <path d="M10 14 L 8 24 L 18 22" />
      </g>
    </svg>
  );
}

export function DoodleAlert({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke}>
        <path d="M32 6 L 60 56 H 4 Z" />
        <path d="M32 22 V 38" strokeWidth={3} />
        <circle cx="32" cy="46" r="2.4" fill="currentColor" />
      </g>
    </svg>
  );
}

export function DoodleDownload({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke}>
        <path d="M24 6 V 30" strokeWidth={3} />
        <path d="M14 22 L 24 32 L 34 22" strokeWidth={3} />
        <path d="M8 38 V 42 H 40 V 38" />
      </g>
    </svg>
  );
}

export function DoodleCopy({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke}>
        <rect x="8" y="8" width="26" height="30" rx="3" />
        <path d="M14 14 H 28 V 32 H 14 Z" />
        <path d="M20 22 H 40 V 42 H 20 Z" />
      </g>
    </svg>
  );
}

export function DoodleRefresh({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke}>
        <path d="M40 18 a16 16 0 1 0 4 14" />
        <path d="M40 6 V 18 H 28" />
      </g>
    </svg>
  );
}

export function DoodleFile({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 48 56"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke}>
        <path d="M6 4 H 30 L 42 16 V 52 H 6 Z" />
        <path d="M30 4 V 16 H 42" />
        <path d="M14 26 H 34" />
        <path d="M14 34 H 34" />
        <path d="M14 42 H 26" />
      </g>
    </svg>
  );
}

export function DoodlePin({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g {...baseStroke}>
        <path d="M12 2 C 7 2, 4 5, 4 9 c 0 6, 8 13, 8 13 s 8 -7, 8 -13 c 0 -4 -3 -7 -8 -7 Z" />
        <circle cx="12" cy="9" r="2.4" fill="currentColor" />
      </g>
    </svg>
  );
}
