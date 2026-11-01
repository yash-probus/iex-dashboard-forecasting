import React from "react";

export function EmptyState() {
  return (
    <div className="card-surface flex min-h-[560px] flex-col items-center justify-center p-10 text-center bg-card">
      <svg viewBox="0 0 320 160" className="mb-8 w-full max-w-sm" aria-hidden>
        <defs>
          <linearGradient id="es-line" x1="0" x2="1">
            <stop offset="0" stopColor="var(--teal, #14B8A6)" />
            <stop offset="1" stopColor="var(--primary, #7C3AED)" />
          </linearGradient>
          <linearGradient id="es-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--primary, #7C3AED)" stopOpacity="0.15" />
            <stop offset="1" stopColor="var(--primary, #7C3AED)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 9 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={i * 40}
            x2={i * 40}
            y1="0"
            y2="160"
            stroke="var(--border, #E2E8F0)"
            strokeWidth="1"
          />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1="0"
            x2="320"
            y1={i * 40}
            y2={i * 40}
            stroke="var(--border, #E2E8F0)"
            strokeWidth="1"
          />
        ))}
        <path
          d="M0 110 C40 100 60 70 100 78 S160 120 200 90 S260 30 320 44 L320 160 L0 160Z"
          fill="url(#es-fill)"
        />
        <path
          d="M0 110 C40 100 60 70 100 78 S160 120 200 90 S260 30 320 44"
          fill="none"
          stroke="url(#es-line)"
          strokeWidth="2"
        />
        <line
          x1="0"
          x2="320"
          y1="64"
          y2="64"
          stroke="var(--muted-foreground, #64748B)"
          strokeDasharray="4 4"
          strokeOpacity="0.5"
        />
        <circle cx="200" cy="90" r="4" fill="var(--card, #FFFFFF)" stroke="var(--primary, #7C3AED)" strokeWidth="2" />
      </svg>
      <h3 className="text-base font-semibold text-foreground">Your recommendation will appear here</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Fill in the consumer profile, tariff window and IEX price, then press{" "}
        <kbd className="rounded border border-border bg-muted px-1.5 font-mono text-[11px] text-foreground">
          Enter
        </kbd>{" "}
        to compare landed costs.
      </p>
    </div>
  );
}
