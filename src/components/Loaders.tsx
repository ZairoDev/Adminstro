import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const GlitchyLoader = ({
  text,
  className,
}: {
  text: string;
  className?: string;
}) => {
  return (
    <div className=" relative ">
      <motion.span
        animate={{
          textShadow: ["-4px -4px 3px #FF0000", "4px 4px 3px #008080"],
        }}
        transition={{
          duration: 0.1,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className={cn(className)}
      >
        {text}
      </motion.span>

      <motion.span
        animate={{
          skew: [0, -40, 0],
          scaleX: [1, 2, 1],
        }}
        transition={{
          duration: 0.02,
          repeat: Infinity,
          repeatType: "loop",
          repeatDelay: 2,
        }}
        className={cn(" absolute inset-0", className)}
      >
        {text}
      </motion.span>
    </div>
  );
};

export const InfinityLoader = ({
  strokeColor,
  className,
}: {
  strokeColor?: string;
  className?: string;
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "icon icon-tabler icons-tabler-outline icon-tabler-infinity ",
        className
      )}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <motion.path
        d="M9.828 9.172a4 4 0 1 0 0 5.656a10 10 0 0 0 2.172 -2.828a10 10 0 0 1 2.172 -2.828a4 4 0 1 1 0 5.656a10 10 0 0 1 -2.172 -2.828a10 10 0 0 0 -2.172 -2.828"
        animate={{
          pathLength: [0, 1, 0],
          color: strokeColor,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
    </svg>
  );
};
