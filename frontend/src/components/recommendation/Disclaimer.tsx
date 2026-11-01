import React from "react";
import { Info } from "lucide-react";
import { DISCLAIMER, FOOTNOTES } from "./recommendationMock";

export function Disclaimer() {
  return (
    <section className="card-surface mt-6 p-6 bg-card">
      <div className="space-y-1.5 text-xs text-muted-foreground">
        {FOOTNOTES.map((f) => (
          <p key={f}>{f}</p>
        ))}
      </div>
      <div className="mt-5 flex gap-3 border-t border-border pt-5">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div>
          <h4 className="label-caps mb-1.5">Disclaimer</h4>
          <p className="max-w-5xl text-xs leading-relaxed text-muted-foreground">{DISCLAIMER}</p>
        </div>
      </div>
    </section>
  );
}
