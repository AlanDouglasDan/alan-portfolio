"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionSafe } from "@/components/motion/useMotionSafe";
import type { Architecture, DiagramEdge, DiagramNode } from "@/content/work/types";

/**
 * Signature animation D. CLAUDE.md §5.
 *
 * The diagram is pinned while its annotations scroll past, and the paths draw
 * and nodes light in step with scroll position — the reader assembles the
 * architecture by scrolling through it.
 *
 * GSAP drives the SVG attributes directly rather than through React state.
 * A scrubbed timeline updates on every scroll frame, and routing that through
 * `setState` would re-render the whole subtree sixty times a second for no
 * reason. This is the one place in the project where GSAP earns its weight;
 * everything else uses Motion.
 */

const VIEW_W = 1000;
const VIEW_H = 620;
const NODE_W = 168;
const NODE_H = 54;

const NODE_STYLE: Record<DiagramNode["kind"], { fill: string; stroke: string }> = {
  client: { fill: "var(--color-paper-raised)", stroke: "var(--color-rule)" },
  service: { fill: "var(--color-paper-raised)", stroke: "var(--color-ink-faint)" },
  store: { fill: "var(--color-paper-sunk)", stroke: "var(--color-rule)" },
  external: { fill: "var(--color-pending-wash)", stroke: "var(--color-pending)" },
  ledger: { fill: "var(--color-credit-wash)", stroke: "var(--color-credit)" },
};

export interface SystemDiagramProps {
  architecture: Architecture;
}

export function SystemDiagram({ architecture }: SystemDiagramProps) {
  const motionSafe = useMotionSafe();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reduced motion means no scroll-scrubbing at all. CLAUDE.md §5.5 — the
    // static render below already shows every node and edge lit.
    if (!motionSafe.enabled) return;
    const root = rootRef.current;
    if (root === null) return;

    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      gsap.set("[data-node]", { opacity: 0.25 });
      gsap.set("[data-edge]", { strokeDashoffset: 1, opacity: 0.9 });
      gsap.set("[data-step]", { opacity: 0.35 });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top top+=80",
          end: "bottom bottom",
          scrub: 1,
        },
      });

      architecture.steps.forEach((step, index) => {
        const at = index;
        if (step.nodes.length > 0) {
          timeline.to(
            step.nodes.map((id) => `[data-node="${id}"]`).join(","),
            { opacity: 1, duration: 0.6, ease: "power2.out" },
            at,
          );
        }
        if (step.edges.length > 0) {
          timeline.to(
            step.edges.map((id) => `[data-edge="${id}"]`).join(","),
            { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" },
            at,
          );
        }
        timeline.to(
          `[data-step="${index}"]`,
          { opacity: 1, duration: 0.4 },
          at,
        );
        if (index > 0) {
          timeline.to(
            `[data-step="${index - 1}"]`,
            { opacity: 0.35, duration: 0.4 },
            at,
          );
        }
      });
    }, root);

    return () => context.revert();
  }, [architecture, motionSafe.enabled]);

  const nodeById = new Map(architecture.nodes.map((node) => [node.id, node]));

  return (
    <div ref={rootRef} className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full rounded-sm border border-rule bg-paper-raised"
          role="img"
          aria-label={architecture.caption}
        >
          <g>
            {architecture.edges.map((edge) => {
              const from = nodeById.get(edge.from);
              const to = nodeById.get(edge.to);
              if (from === undefined || to === undefined) return null;
              return (
                <path
                  key={`${edge.from}->${edge.to}`}
                  data-edge={`${edge.from}->${edge.to}`}
                  d={edgePath(from, to, edge.bow ?? 0)}
                  fill="none"
                  stroke="var(--color-signal)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={1}
                />
              );
            })}
          </g>

          <g>
            {architecture.nodes.map((node) => {
              const cx = (node.x / 100) * VIEW_W;
              const cy = (node.y / 100) * VIEW_H;
              const style = NODE_STYLE[node.kind];

              return (
                <g key={node.id} data-node={node.id}>
                  <rect
                    x={cx - NODE_W / 2}
                    y={cy - NODE_H / 2}
                    width={NODE_W}
                    height={NODE_H}
                    rx={3}
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1"
                  />
                  <text
                    x={cx}
                    y={node.sublabel ? cy - 2 : cy + 5}
                    textAnchor="middle"
                    fontSize="15"
                    className="fill-[var(--color-ink)] font-[family-name:var(--font-sans)]"
                  >
                    {node.label}
                  </text>
                  {node.sublabel ? (
                    <text
                      x={cx}
                      y={cy + 15}
                      textAnchor="middle"
                      fontSize="10"
                      letterSpacing="0.06em"
                      className="fill-[var(--color-ink-faint)] font-[family-name:var(--font-mono)]"
                    >
                      {node.sublabel.toUpperCase()}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
        </svg>

        <p className="mt-3 text-body-s text-ink-faint">{architecture.caption}</p>
      </div>

      <ol className="space-y-16 lg:space-y-40 lg:py-16">
        {architecture.steps.map((step, index) => (
          <li key={step.title} data-step={index}>
            <p className="label mb-3 text-ink-faint">
              {String(index + 1).padStart(2, "0")} / {String(architecture.steps.length).padStart(2, "0")}
            </p>
            <h3 className="font-display text-display-m text-ink">{step.title}</h3>
            <p className="prose-measure mt-3 text-body text-ink-soft">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * A quadratic curve between two node centres, bowed perpendicular to the line
 * so parallel edges do not overlap into a single stroke.
 */
function edgePath(from: DiagramNode, to: DiagramNode, bow: number): string {
  const x1 = (from.x / 100) * VIEW_W;
  const y1 = (from.y / 100) * VIEW_H;
  const x2 = (to.x / 100) * VIEW_W;
  const y2 = (to.y / 100) * VIEW_H;

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;

  // Perpendicular unit vector, scaled by the bow.
  const offsetX = (-dy / length) * bow * 4;
  const offsetY = (dx / length) * bow * 4;

  return `M ${x1} ${y1} Q ${midX + offsetX} ${midY + offsetY} ${x2} ${y2}`;
}

export type { DiagramEdge };
