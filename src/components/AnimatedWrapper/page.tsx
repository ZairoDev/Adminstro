import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedStatsWrapperProps {
  children: ReactNode;
  direction: "left" | "right";
  monthKey: string;
}

export function AnimatedStatsWrapper({
  children,
  direction,
  monthKey,
}: AnimatedStatsWrapperProps) {
  const variants = {
    enter: (direction: "left" | "right") => ({
      x: direction === "left" ? -1000 : 1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: "left" | "right") => ({
      x: direction === "left" ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={monthKey}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: "spring", stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}