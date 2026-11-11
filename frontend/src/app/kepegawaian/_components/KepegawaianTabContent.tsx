"use client";

import type { ReactNode, ComponentPropsWithoutRef } from "react";
import { motion, useIsPresent, useReducedMotion } from "framer-motion";

/** Match Inbox Surat Tugas panel motion; keep drafts in the mounted parent. */
export function KepegawaianTabContent({ children, className, panelProps }: {
  children: ReactNode;
  className?: string;
  panelProps?: Pick<ComponentPropsWithoutRef<"div">, "role" | "id" | "aria-labelledby">;
}) {
  const reducedMotion = useReducedMotion();
  const isPresent = useIsPresent();

  return (
    <motion.div
      {...panelProps}
      inert={!isPresent}
      initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : -8 }}
      transition={{ duration: reducedMotion ? 0 : 0.16, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
