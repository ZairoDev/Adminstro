// components/FadeInBlur.tsx
"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface FadeInBlurProps {
  children: ReactNode;
}

const FadeInBlur: React.FC<FadeInBlurProps> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
      whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      viewport={{ once: true, amount: 0.5 }}
    >
      {children}
    </motion.div>
  );
};

export default FadeInBlur;
