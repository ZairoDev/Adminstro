import React from "react";

const CardSkeleton = () => {
  return (
    <>
      <div className="w-full">
        <div className="border rounded-lg sm:max-w-sm w-full h-full">
          <div className="relative">
            <div className="rounded-t-lg h-56 w-full object-cover bg-gray-300 animate-pulse"></div>
          </div>
          <div className="flex p-2 justify-between items-center">
            <div>
              <div className="h-3 bg-gray-300 rounded-md w-14 animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-300 rounded-md w-8 mb-2 animate-pulse"></div>
            </div>
            <div>
              <div>
                <div className="h-2 bg-gray-300 rounded-md w-14 opacity-55 line-clamp-1  animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CardSkeleton;
