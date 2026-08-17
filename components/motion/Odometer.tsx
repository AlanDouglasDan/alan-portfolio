"use client";

import { animate, m, useInView, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { useMotionSafe } from "./useMotionSafe";

/**
 * Signature animation A. CLAUDE.md §5.
 *
 * A real odometer, not a formatted number that gets re-rendered 60 times.
 * Each decimal place is its own column of digits sliding vertically, and each
 * column's position is `value / 10^place mod 10` — continuous, so the tens
 * column begins to roll exactly as the units column passes nine, the way a
 * mechanical counter carries.
 *
 * `value` is an integer. Money is passed in minor units with `decimals={2}`,
 * which keeps this component free of any money arithmetic. CLAUDE.md §10.
 */

const STRIP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

export interface OdometerProps {
  value: number;
  /** Where to place the decimal point. 2 for a currency in minor units. */
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Spoken form, since a column of sliding digits is meaningless to a reader. */
  label?: string;
  className?: string;
  /** Seconds. Money counts up more slowly than chrome. */
  duration?: number;
}

export function Odometer({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  label,
  className = "",
  duration = 1.4,
}: OdometerProps) {
  const motionSafe = useMotionSafe();
  const ref = useRef<HTMLSpanElement>(null);
  // No inset margin here, unlike the scroll reveals. A metric that is on
  // screen but has not counted up yet reads as a broken zero, and the hero
  // balance sits just low enough that a 10% inset left it showing £0,000.00
  // to anyone who had not scrolled.
  const inView = useInView(ref, { once: true });
  const animated = useMotionValue(0);

  useEffect(() => {
    if (!inView) return;
    if (!motionSafe.enabled) {
      // Reduced motion: snap to the final value. CLAUDE.md §5.5.
      animated.set(value);
      return;
    }
    const controls = animate(animated, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [inView, value, duration, animated, motionSafe.enabled]);

  const digitCount = Math.max(String(Math.floor(Math.abs(value))).length, decimals + 1);
  const places: number[] = [];
  for (let place = digitCount - 1; place >= 0; place -= 1) places.push(place);

  return (
    <span ref={ref} className={`tnum inline-flex items-baseline ${className}`}>
      <span aria-hidden="true" className="inline-flex items-center leading-none">
        {prefix ? <span>{prefix}</span> : null}
        {places.map((place) => (
          <span key={place} className="inline-flex items-center">
            <DigitColumn source={animated} place={place} />
            {place === decimals && decimals > 0 ? <span>.</span> : null}
            {place > decimals && (place - decimals) % 3 === 0 ? <span>,</span> : null}
          </span>
        ))}
        {suffix ? <span>{suffix}</span> : null}
      </span>
      <span className="sr-only">{label ?? `${prefix}${value}${suffix}`}</span>
    </span>
  );
}

interface DigitColumnProps {
  source: ReturnType<typeof useMotionValue<number>>;
  place: number;
}

/**
 * How far into its carry a column has to be before it starts to move.
 *
 * A geared odometer rolls every wheel continuously, so a real one showing 95
 * has its tens wheel sitting halfway between 9 and 0. That is faithful and it
 * is unreadable: the figure has to come to rest on something a reader can read.
 * Gating the carry to the last fraction of the lower column's travel keeps the
 * mechanical roll during the transition and a clean digit at rest.
 */
const CARRY_WINDOW = 0.15;

function DigitColumn({ source, place }: DigitColumnProps) {
  const divisor = 10 ** place;

  // The strip holds eleven cells (0-9 then 0 again) so the wrap from nine back
  // to zero slides forward rather than snapping backwards through the whole
  // column. Percentages here are relative to the strip's own height.
  const y = useTransform(source, (current) => {
    const scaled = current / divisor;
    const whole = Math.floor(scaled);
    const fraction = scaled - whole;
    const digit = ((whole % 10) + 10) % 10;

    // The units column tracks its fraction directly; higher columns only move
    // once the columns below them are about to wrap.
    const roll =
      place === 0
        ? fraction
        : fraction > 1 - CARRY_WINDOW
          ? (fraction - (1 - CARRY_WINDOW)) / CARRY_WINDOW
          : 0;

    return `${(-(digit + roll) / STRIP.length) * 100}%`;
  });

  return (
    <span className="inline-block h-[1em] overflow-hidden leading-none">
      <m.span className="flex flex-col leading-none" style={{ y }}>
        {STRIP.map((digit, index) => (
          <span key={`${digit}-${index}`} className="block h-[1em] leading-none">
            {digit}
          </span>
        ))}
      </m.span>
    </span>
  );
}
