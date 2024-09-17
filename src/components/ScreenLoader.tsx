import { Loader } from "lucide-react";
import React from "react";

const ScreenLoader = () => {
  return (
    <div>
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center justify-center">
            <div className="loader border-t-4 border-blue-500 rounded-full w-10 h-10 animate-spin"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenLoader;
