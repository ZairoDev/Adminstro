import type { ReactNode } from "react";

type MarkProps = {
  className?: string;
  children: ReactNode;
};

function Mark({ className, children }: MarkProps) {
  return (
    <span className={className ?? "inline-flex h-5 w-5 shrink-0"} aria-hidden>
      {children}
    </span>
  );
}

export function LinkedInMark() {
  return (
    <Mark>
      <svg viewBox="0 0 24 24" className="h-5 w-5">
        <path
          fill="#0A66C2"
          d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.73V1.73C24 .77 23.21 0 22.23 0z"
        />
      </svg>
    </Mark>
  );
}

export function GitHubMark() {
  return (
    <Mark>
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-foreground">
        <path
          fill="currentColor"
          d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.53-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.63 1.58.24 2.75.12 3.04.74.8 1.18 1.82 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .3.21.66.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"
        />
      </svg>
    </Mark>
  );
}

export function PortfolioMark() {
  return (
    <Mark>
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-foreground">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          d="M3 12h18M12 3c2.4 2.6 3.6 5.7 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.7-3.6-9s1.2-6.4 3.6-9z"
        />
      </svg>
    </Mark>
  );
}

export function InstagramMark() {
  return (
    <Mark>
      <svg viewBox="0 0 24 24" className="h-5 w-5">
        <defs>
          <radialGradient id="ig-mark" cx="30%" cy="110%" r="120%">
            <stop offset="0%" stopColor="#FEDA75" />
            <stop offset="35%" stopColor="#FA7E1E" />
            <stop offset="60%" stopColor="#D62976" />
            <stop offset="100%" stopColor="#4F5BD5" />
          </radialGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-mark)" />
        <rect x="7" y="7" width="10" height="10" rx="3" fill="none" stroke="#fff" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="2.4" fill="none" stroke="#fff" strokeWidth="1.6" />
        <circle cx="16.4" cy="7.6" r="0.9" fill="#fff" />
      </svg>
    </Mark>
  );
}

export function XMark() {
  return (
    <Mark>
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-foreground">
        <path
          fill="currentColor"
          d="M14.7 10.3 22.4 1.5h-1.8l-6.7 7.6L8.6 1.5H2.2l8.1 11.5L2.2 22.5h1.8l7.1-8.1 5.7 8.1h6.4l-8.5-12.2zm-2.5 2.8-.8-1.2-6.6-9.3h2.8l5.3 7.5.8 1.2 6.9 9.8h-2.8l-5.6-8z"
        />
      </svg>
    </Mark>
  );
}
