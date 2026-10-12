import React from "react";

const DeepLoader = () => {
  return (
    <div>
      <div className="fixed inset-0 bg-black  flex items-center justify-center z-50">
        <div className="bg-background rounded-lg p-6">
          <div className="flex items-center justify-center">
            <div className="loader border-t-4 border-primary rounded-full w-10 h-10 animate-spin"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeepLoader;
