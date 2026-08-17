"use client";

import { animate, m, useMotionValue, useTransform } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMotionSafe } from "@/components/motion/useMotionSafe";
import { Odometer } from "@/components/motion/Odometer";
import { CURRENCIES } from "@/lib/ledger/types";
import { money, toWords } from "@/lib/ledger/money";

/**
 * Signature animation B. CLAUDE.md §5.
 *
 * Value crossing a border. The path draws ahead of a token travelling it; on
 * arrival the destination balance rolls and a row stamps into the ledger strip
 * below. One cycle is seven seconds with a long pause, so it reads as
 * deliberate rather than frantic — money should not look like a loading
 * spinner.
 *
 * The token's position is computed with `getPointAtLength` and applied as a
 * transform, so nothing here animates geometry. CLAUDE.md §5.6.
 */

// Trimmed to the arc's actual extent. The earlier box carried about sixty
// pixels of empty ruled paper above and below the curve, which read as the
// figure failing to fill its column rather than as breathing room.
const ARC = "M 62 196 C 166 104, 318 48, 448 76";
const CYCLE_SECONDS = 7;
const TRANSFER = money(500_00, "GBP");
const OPENING = 1_250_00;

interface Posting {
  readonly id: number;
  readonly reference: string;
}

export function MoneyInFlight() {
  const motionSafe = useMotionSafe();
  const pathRef = useRef<SVGPathElement>(null);
  const progress = useMotionValue(0);
  const previous = useRef(0);

  const [arrivals, setArrivals] = useState(0);

  useEffect(() => {
    if (!motionSafe.enabled) {
      // Reduced motion: park the token at the destination and stop. The
      // settled figures are derived during render below rather than pushed
      // into state from here.
      progress.set(1);
      return;
    }

    const controls = animate(progress, [0, 0, 1, 1], {
      duration: CYCLE_SECONDS,
      times: [0, 0.1, 0.52, 1],
      ease: ["linear", [0.33, 0, 0.15, 1], "linear"],
      repeat: Number.POSITIVE_INFINITY,
    });

    const unsubscribe = progress.on("change", (value) => {
      // Rising edge at the far end of the arc: the money has landed.
      if (previous.current < 0.995 && value >= 0.995) {
        setArrivals((count) => count + 1);
      }
      previous.current = value;
    });

    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [motionSafe.enabled, progress]);

  // Read the path on each frame rather than caching its length in state: the
  // transform closure would otherwise capture the length from the render before
  // the ref was attached, and the token would sit at the origin forever.
  const point = (value: number, axis: "x" | "y") => {
    const path = pathRef.current;
    if (path === null) return 0;
    const at = path.getPointAtLength(value * path.getTotalLength());
    return axis === "x" ? at.x : at.y;
  };

  const tokenX = useTransform(progress, (value) => point(value, "x"));
  const tokenY = useTransform(progress, (value) => point(value, "y"));
  const tokenOpacity = useTransform(progress, [0, 0.08, 0.95, 1], [0, 1, 1, 0]);
  const drawn = useTransform(progress, [0, 0.52, 1], [0, 1, 1]);

  // Under reduced motion the animation never runs, so the settled state is
  // derived rather than accumulated.
  const settledArrivals = motionSafe.enabled ? arrivals : 1;

  // The strip is derived from the arrival count rather than kept in its own
  // state. Two pieces of state saying the same thing is how the ledger strip
  // ends up disagreeing with the balance above it.
  const rows: readonly Posting[] = useMemo(() => {
    const list: Posting[] = [];
    for (let id = settledArrivals; id > 0 && list.length < 2; id -= 1) {
      list.push({ id, reference: `TRF/LOS-LON-${String(id).padStart(4, "0")}` });
    }
    return list;
  }, [settledArrivals]);

  const balance = money(OPENING + settledArrivals * TRANSFER.amount, "GBP");

  return (
    <figure className="w-full">
      <svg
        viewBox="0 0 520 240"
        className="w-full"
        role="img"
        aria-label="A transfer of five hundred pounds travelling from Lagos to London, posting to the ledger on arrival."
      >
        {/* Ruled ground, like a ledger page */}
        <g aria-hidden="true" stroke="var(--color-rule)" strokeWidth="1">
          {[40, 84, 128, 172, 216].map((y) => (
            <line key={y} x1="0" y1={y} x2="520" y2={y} opacity="0.45" />
          ))}
        </g>

        {/* The route, unlit */}
        <path
          ref={pathRef}
          d={ARC}
          fill="none"
          stroke="var(--color-rule)"
          strokeWidth="1.5"
          strokeDasharray="3 5"
          aria-hidden="true"
        />

        {/* The route, drawing in ahead of the token */}
        <m.path
          d={ARC}
          fill="none"
          stroke="var(--color-signal)"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{ pathLength: drawn }}
          aria-hidden="true"
        />

        <Node x={62} y={196} label="Lagos" sublabel="NGN wallet" />
        <Node x={448} y={76} label="London" sublabel="GBP wallet" align="end" />

        {/* The value in flight */}
        <m.g style={{ x: tokenX, y: tokenY, opacity: tokenOpacity }} aria-hidden="true">
          <circle r="15" fill="var(--color-paper-raised)" stroke="var(--color-signal)" strokeWidth="1.5" />
          <circle r="4" fill="var(--color-signal)" />
        </m.g>
      </svg>

      <figcaption className="mt-4 border border-rule bg-paper-raised">
        <div className="flex items-baseline justify-between gap-4 border-b border-rule px-4 py-3">
          <span className="label text-ink-faint">London balance</span>
          <span className="text-display-m text-ink">
            <Odometer
              value={balance.amount}
              decimals={CURRENCIES.GBP.exponent}
              prefix={CURRENCIES.GBP.symbol}
              label={toWords(balance)}
              duration={1.1}
            />
          </span>
        </div>

        <table className="w-full text-body-s">
          <caption className="sr-only">
            The most recent transfers posted to the ledger by this animation.
          </caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Reference</th>
              <th scope="col">Status</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-2.5 text-ink-faint">
                  Awaiting settlement…
                </td>
              </tr>
            ) : (
              rows.map((posting, index) => (
                <m.tr
                  key={posting.id}
                  initial={{ opacity: 0, ...motionSafe.transform({ scaleY: 0.94, y: 6 }) }}
                  animate={{
                    opacity: index === 0 ? 1 : 0.55,
                    ...motionSafe.transform({ scaleY: 1, y: 0 }),
                  }}
                  transition={motionSafe.moneySpring}
                  style={{ transformOrigin: "top" }}
                  className="border-b border-rule/60 last:border-b-0"
                >
                  <td className="tnum px-4 py-2 text-ink-soft">{posting.reference}</td>
                  <td className="label px-2 py-2 text-credit">posted</td>
                  <td className="tnum px-4 py-2 text-right text-credit">
                    +£500.00
                  </td>
                </m.tr>
              ))
            )}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}

function Node({
  x,
  y,
  label,
  sublabel,
  align = "start",
}: {
  x: number;
  y: number;
  label: string;
  sublabel: string;
  align?: "start" | "end";
}) {
  return (
    <g aria-hidden="true">
      <circle cx={x} cy={y} r="6" fill="var(--color-ink)" />
      <circle cx={x} cy={y} r="13" fill="none" stroke="var(--color-rule)" strokeWidth="1" />
      <text
        x={align === "end" ? x - 24 : x + 24}
        y={y - 2}
        textAnchor={align === "end" ? "end" : "start"}
        className="fill-[var(--color-ink)] font-[family-name:var(--font-display)]"
        fontSize="17"
      >
        {label}
      </text>
      <text
        x={align === "end" ? x - 24 : x + 24}
        y={y + 15}
        textAnchor={align === "end" ? "end" : "start"}
        className="fill-[var(--color-ink-faint)] font-[family-name:var(--font-mono)]"
        fontSize="10"
        letterSpacing="0.08em"
      >
        {sublabel.toUpperCase()}
      </text>
    </g>
  );
}
