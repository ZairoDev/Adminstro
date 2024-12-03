import { useEffect, useState } from "react";
import Masonry from "react-masonry-css";
import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import React from "react";

interface ImageCardProps {
  src: string;
  alt: string;
}

const ImageCard = ({ src, alt }: ImageCardProps) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden  mb-4">
        <div className="w-full h-40 relative">
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        </div>
      </Card>
    </motion.div>
  );
};

export default ImageCard;
