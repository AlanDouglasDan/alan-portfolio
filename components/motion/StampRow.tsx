"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";
import { useMotionSafe } from "./useMotionSafe";

/**
 * Signature animation C. CLAUDE.md §5.
 *
 * A ledger row entering the journal. Slight vertical compression settling on a
 * spring, so it reads as a stamp hitting paper rather than a list item fading
 * in. Used for every journal row on the site.
 */
export interface StampRowProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function StampRow({ children, className = "", delay = 0 }: StampRowProps) {
  const motionSafe = useMotionSafe();

  return (
    <m.tr
      className={className}
      initial={{
        opacity: 0,
        ...motionSafe.transform({ scaleY: 0.94, y: 6 }),
      }}
      animate={{ opacity: 1, ...motionSafe.transform({ scaleY: 1, y: 0 }) }}
      transition={{ ...motionSafe.moneySpring, delay: motionSafe.enabled ? delay : 0 }}
      style={{ transformOrigin: "top" }}
    >
      {children}
    </m.tr>
  );
}
