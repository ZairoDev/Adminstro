import { LoaderCircle } from "lucide-react";
import React from "react";

const Loader = () => {
  return (
    <>
      <LoaderCircle size={18} className="animate-spin text-primary " />
    </>
  );
};

export default Loader;
