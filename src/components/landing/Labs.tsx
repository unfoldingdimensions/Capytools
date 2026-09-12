"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { LABS, type LabCategory } from "@/lib/capytools/landing";
import { gridColumns } from "@/lib/capytools/suite";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { SectionRule } from "@/components/landing/SectionRule";
import { ArrowUpRight } from "@/components/landing/icons";
import { TransitionLink } from "@/components/TransitionLink";

type Filter = "all" | LabCategory;

/**
 * The Labs catalog: five tool cards with All / Browser / Desktop filter
 * pills. Filtered-out cards leave the accessibility tree with the display;
 * shown cards replay their entrance with a 45ms stagger (remounting via key).
 */
export function Labs() {
  const [filter, setFilter] = useState<Filter>("all");

  const shown = LABS.tools.filter(
    (tool) => filter === "all" || tool.cat === filter,
  );

  return (
    <section className="lp-section lp-labs" id="labs">
      <div className="lp-container">
        <SectionRule roman={LABS.roman} meta={LABS.meta} />

        <div className="lp-labs-head">
          <ScrollReveal>
            <span className="lp-label">
              {LABS.label} <span className="lp-ix">{LABS.ix}</span>
            </span>
            <h2>
              {LABS.headline.map((seg, i) =>
                seg.em ? <em key={i}>{seg.text}</em> : <span key={i}>{seg.text}</span>,
              )}
              <span className="lp-dot">.</span>
            </h2>
          </ScrollReveal>

          <ScrollReveal direction="right">
            <div className="lp-pills" role="group" aria-label="Filter tools">
              {LABS.pills.map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  className={`lp-pill${filter === pill.id ? " is-active" : ""}`}
                  aria-pressed={filter === pill.id}
                  onClick={() => setFilter(pill.id)}
                >
                  {pill.label}
                  <span className="lp-pill-count">{pill.count}</span>
                </button>
              ))}
            </div>
          </ScrollReveal>
        </div>

        <div className="lp-labs-meta">
          <span className="lp-ring" aria-hidden="true">
            {LABS.residence.ring}
          </span>
          <div className="lp-meta-text">
            <b>{LABS.residence.title}</b>
            <span>
              {LABS.residence.sub.map((line, i) => (
                <span key={i} style={{ display: "block" }}>
                  {line}
                </span>
              ))}
            </span>
          </div>
        </div>

        <div
          className="lp-labs-grid"
          // Column count follows the suite's size, never the active filter — a
          // filtered view must not resize the cards that remain.
          style={{ "--lp-lab-cols": gridColumns(LABS.tools.length) } as CSSProperties}
        >
          {shown.map((tool, i) => (
            <ScrollReveal
              key={`${filter}-${tool.name}`}
              delay={Math.min(i, 5) * 0.045}
            >
              <article className="lp-lab">
                <div className="lp-lab-img">
                  <span className="lp-lab-badge">{tool.badge}</span>
                  <Image
                    src={tool.plate.src}
                    alt=""
                    aria-hidden="true"
                    width={tool.plate.width}
                    height={tool.plate.height}
                    sizes="(max-width: 880px) 100vw, (max-width: 1080px) 30vw, 18vw"
                  />
                </div>
                <div className="lp-lab-num-row">
                  <span>{tool.no}</span>
                  <span>{tool.year}</span>
                </div>
                <h4>{tool.name}</h4>
                <p>{tool.blurb}</p>
                <TransitionLink
                  href={tool.href}
                  className="lp-arrow-mark"
                  aria-label={`Open ${tool.name}`}
                >
                  <ArrowUpRight />
                </TransitionLink>
              </article>
            </ScrollReveal>
          ))}
        </div>

        <div className="lp-labs-foot">
          <div className="lp-progress" aria-hidden="true">
            {LABS.tools.map((tool) => (
              <span key={tool.name} className="lp-on" />
            ))}
          </div>
          {/* Distributed CTA: a visitor convinced by the catalog acts here,
              not at the bottom of the page. */}
          <div className="lp-labs-foot-right">
            <span className="lp-meta">{LABS.foot}</span>
            <TransitionLink
              href="/capywrapped"
              className="lp-btn lp-btn-primary lp-btn-sm"
            >
              Open the suite
              <ArrowUpRight />
            </TransitionLink>
          </div>
        </div>
      </div>
    </section>
  );
}
