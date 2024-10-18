import React from "react";

const ScreenLoader = () => {
  return (
    <div className="z-50">
      <div className="fixed inset-0 bg-black opacity-10 flex items-center justify-center ">
        <div className="bg-background rounded-lg p-6">
          <div className="flex items-center justify-center">
            <div className="loader border-t-4 border-primary rounded-full w-10 h-10 animate-spin"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenLoader;
