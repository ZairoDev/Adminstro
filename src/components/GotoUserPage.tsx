"use client";
import React, { useState } from "react";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const GotoUserPage = () => {
  const [isActive, setIsActive] = useState(false);

  const handleMouseDown = () => {
    setIsActive(true);
  };

  const handleMouseUp = () => {
    setIsActive(false);
  };

  return (
    <Link
      className={`inline-flex items-center mt-2 justify-between gap-x-2 transition-transform duration-150 ${
        isActive ? "transform -translate-x-1" : ""
      }`}
      href={"/dashboard/user"}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <ArrowLeft size={18} />
    </Link>
  );
};

export default GotoUserPage;
