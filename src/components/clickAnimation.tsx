// ClickAnimation.tsx
"use client";
import { motion, AnimatePresence } from "framer-motion";
import React, { useState } from "react";

interface ClickAnimationProps {
  children: React.ReactNode;
}

const ClickAnimation: React.FC<ClickAnimationProps> = ({ children }) => {
  const [circlePosition, setCirclePosition] = useState<{ x: number; y: number } | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCirclePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    // Remove the circle after animation
    setTimeout(() => {
      setCirclePosition(null);
    }, 500); // Animation duration
  };

  return (
    <div
      onClick={handleClick}
      style={{ position: "relative", overflow: "hidden", display: "inline-block" }}
    >
      {children}
      <AnimatePresence>
        {circlePosition && (
          <motion.div
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: circlePosition.y,
              left: circlePosition.x,
              width: 50,
              height: 50,
              borderRadius: "50%",
              backgroundColor: "rgba(0, 0, 0, 0.2)",
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClickAnimation;
