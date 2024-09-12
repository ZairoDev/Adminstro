import { Loader } from "lucide-react";
import React from "react";

const ScreenLoader = () => {
  return (
    <div>
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center justify-center">
            <Loader className="animate-spin text-background text-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenLoader;
