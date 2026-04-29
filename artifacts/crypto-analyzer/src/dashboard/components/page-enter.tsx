import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Shared page-entrance wrapper. Slides + fades children in on mount; key
 * prop on the parent (route key) re-runs the animation on navigation so
 * each page change feels intentional rather than abrupt.
 */
export function PageEnter({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered enter — children of this wrapper animate in one after another.
 * Pair with PageEnterItem on each direct child.
 */
export function PageEnterStagger({ children, gap = 0.06 }: { children: ReactNode; gap?: number }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: gap } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function PageEnterItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 14 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}
