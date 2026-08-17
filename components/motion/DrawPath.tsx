"use client";

import { m } from "motion/react";
import { useMotionSafe } from "./useMotionSafe";

/**
 * An SVG path that draws itself in via stroke-dashoffset.
 *
 * Only `stroke-dashoffset` is animated, which the compositor handles without a
 * layout pass. CLAUDE.md §5.6 rules out animating geometry.
 */
export interface DrawPathProps {
  d: string;
  className?: string;
  stroke?: string;
  strokeWidth?: number;
  delay?: number;
  duration?: number;
  /** Draw once when scrolled into view, rather than on mount. */
  onView?: boolean;
  strokeDasharray?: string;
}

export function DrawPath({
  d,
  className = "",
  stroke = "currentColor",
  strokeWidth = 1,
  delay = 0,
  duration = 1.2,
  onView = true,
  strokeDasharray,
}: DrawPathProps) {
  const motionSafe = useMotionSafe();

  if (!motionSafe.enabled) {
    return (
      <path
        d={d}
        className={className}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        {...(strokeDasharray ? { strokeDasharray } : {})}
      />
    );
  }

  const animation = {
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: {
      pathLength: { duration, delay, ease: [0.16, 1, 0.3, 1] as const },
      opacity: { duration: 0.2, delay },
    },
  };

  return (
    <m.path
      d={d}
      className={className}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill="none"
      {...(strokeDasharray ? { strokeDasharray } : {})}
      initial={animation.initial}
      {...(onView
        ? { whileInView: animation.animate, viewport: { once: true, margin: "-10%" } }
        : { animate: animation.animate })}
      transition={animation.transition}
    />
  );
}
