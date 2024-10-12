import React, { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react"; // You can use any icon library
import { Button } from "../ui/button";

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  return (
    <div>
      {isVisible && (
        <Button
          onClick={scrollToTop}
          className="fixed lg:bottom-8 px-2 py-1 lg:right-8 right-3 bottom-14 z-50 p-3 "
        >
          <ArrowUp size={18} />
        </Button>
      )}
    </div>
  );
};

export default ScrollToTopButton;
