"use client";
import React from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const GotoUserPage = () => {
  return (
    <Link
      className="inline-flex items-center mt-2 justify-between gap-x-2"
      href={"/dashboard/user"}
    >
      <ArrowLeft size={18} />
    </Link>
  );
};

export default GotoUserPage;
