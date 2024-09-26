// FadeIn.tsx
import { motion } from "framer-motion";
import React, { ReactNode } from "react";

interface AnimationProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
}

const Animation: React.FC<AnimationProps> = ({
  children,
  delay = 0.2,
  duration = 0.9,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration }}
    >
      {children}
    </motion.div>
  );
};

export default Animation;
