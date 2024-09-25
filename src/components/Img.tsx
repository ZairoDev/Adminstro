import React from "react";
import { LazyLoadImage } from 'react-lazy-load-image-component';
import "react-lazy-load-image-component/src/effects/blur.css";

const Img = ({ src, className, alt }: { src: string; className?: string, alt?: string }) => {
  return (
    <LazyLoadImage
      className={className || ""}
      effect="blur"
      src={src}
			alt={alt}
    />
  );
};

export default Img;
