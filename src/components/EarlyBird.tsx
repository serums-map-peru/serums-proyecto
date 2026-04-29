"use client";

import * as React from "react";
import { ArrowRight, Sparkles } from "lucide-react";

export function EarlyBird({ title, subtitle }: { title: string; subtitle: string }) {
  const [email, setEmail] = React.useState("");

  return (
    <section id="early" className="py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-brand p-8 text-white shadow-glow sm:p-12">
          <div className="pointer-events-none absolute inset-0 opacity-50 animate-glow-pulse bg-[radial-gradient(700px_circle_at_20%_20%,rgba(255,255,255,0.35),transparent_60%)]" />
          <div className="pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-white/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-[420px] w-[420px] rounded-full bg-white/15 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white/90">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Early Bird
              </div>
              <h2 className="mt-5 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h2>
              <p className="mt-4 max-w-xl text-base font-medium leading-relaxed text-white/85">{subtitle}</p>
            </div>

            <form
              className="rounded-3xl glass-dark p-6 shadow-[0_30px_90px_-55px_rgba(0,0,0,0.55)]"
              onSubmit={(e) => {
                e.preventDefault();
                const clean = email.trim();
                if (!clean) return;
                console.log("[EarlyBird]", { email: clean });
                setEmail("");
              }}
            >
              <label className="text-sm font-semibold text-white/90" htmlFor="early-email">
                Email
              </label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  id="early-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="h-12 flex-1 rounded-2xl glass px-4 text-sm font-semibold text-foreground placeholder:text-foreground/50 outline-none focus:ring-2 focus:ring-white/70"
                />
                <button
                  type="submit"
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-extrabold text-foreground shadow-soft transition-transform hover:scale-[1.02]"
                >
                  <span className="text-gradient-brand">Unirme</span>
                  <ArrowRight className="h-4 w-4 text-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-3 text-xs font-semibold text-white/70">Sin backend todavía. Solo UI + console.log.</div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

