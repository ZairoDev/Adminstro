// import { motion } from "framer-motion";
// import React from "react";

// const Loader = () => {
//   // Define animation variants for the popping effect
//   const dotVariants = {
//     pop: {
//       scale: [1, 1.5, 1], // Pop: scale up and back to normal
//       transition: {
//         duration: 0.5, // each pop lasts 0.5 seconds
//         repeat: Infinity, // repeat the animation indefinitely
//       },
//     },
//   };

//   return (
//     <div className="flex space-x-2">
//       <motion.span
//         className="h-2 w-2 bg-primary rounded-full"
//         variants={dotVariants}
//         initial={{ scale: 1 }}
//         animate="pop"
//         style={{ animationDelay: "0s" }} // no delay for the first dot
//       />
//       <motion.span
//         className="h-2 w-2 bg-primary rounded-full"
//         variants={dotVariants}
//         initial={{ scale: 1 }}
//         animate="pop"
//         style={{ animationDelay: "0.2s" }} // 0.2s delay for the second dot
//       />
//       <motion.span
//         className="h-2 w-2 bg-primary rounded-full"
//         variants={dotVariants}
//         initial={{ scale: 1 }}
//         animate="pop"
//         style={{ animationDelay: "0.4s" }} // 0.4s delay for the third dot
//       />
//       <motion.span
//         className="h-2 w-2 bg-primary rounded-full"
//         variants={dotVariants}
//         initial={{ scale: 1 }}
//         animate="pop"
//         style={{ animationDelay: "0.6s" }} // 0.6s delay for the fourth dot
//       />
//     </div>
//   );
// };

// export default Loader;

import React from "react";

const Loader = () => {
  return (
    <>
      <div className="loading">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
    </>
  );
};

export default Loader;
