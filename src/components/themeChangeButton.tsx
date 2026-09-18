"use client";

import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState, type MouseEvent } from "react";

import { cn } from "@/lib/utils";

const STYLE_ID = "theme-transition-styles";

type ViewTransitionLike = {
  finished: Promise<void>;
};

function updateTransitionStyles(css: string): void {
  if (typeof window === "undefined") return;

  let styleElement = document.getElementById(STYLE_ID) as HTMLStyleElement | null;

  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = STYLE_ID;
    document.head.appendChild(styleElement);
  }

  styleElement.textContent = css;
}

function createCircleRevealCss(xPercent: number, yPercent: number): string {
  return `
    ::view-transition-group(root) {
      animation-duration: 2s !important;
      animation-timing-function: ease-in-out;
    }

    ::view-transition-new(root) {
      animation: theme-reveal-light 2s ease-in-out both;
    }

    ::view-transition-old(root),
    .dark::view-transition-old(root) {
      animation: none;
      z-index: -1;
    }

    .dark::view-transition-new(root) {
      animation: theme-reveal-dark 2s ease-in-out both;
    }

    @keyframes theme-reveal-dark {
      from {
        clip-path: circle(0% at ${xPercent}% ${yPercent}%);
      }
      to {
        clip-path: circle(150% at ${xPercent}% ${yPercent}%);
      }
    }

    @keyframes theme-reveal-light {
      from {
        clip-path: circle(0% at ${xPercent}% ${yPercent}%);
      }
      to {
        clip-path: circle(150% at ${xPercent}% ${yPercent}%);
      }
    }
  `;
}

function canUseViewTransition(): boolean {
  if (typeof document === "undefined") return false;
  if (typeof document.startViewTransition !== "function") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function startThemeTransition(update: () => void): void {
  if (!canUseViewTransition()) {
    update();
    return;
  }

  try {
    const transition = document.startViewTransition(update) as ViewTransitionLike;
    void transition.finished.finally(() => {
      document.getElementById(STYLE_ID)?.remove();
    });
  } catch {
    document.getElementById(STYLE_ID)?.remove();
    update();
  }
}

export function ModeToggle({ className = "" }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(resolvedTheme === "dark");
  }, [resolvedTheme]);

  const toggleTheme = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const nextIsDark = !isDark;
      setIsDark(nextIsDark);

      const switchTheme = () => {
        setTheme(nextIsDark ? "dark" : "light");
      };

      if (!canUseViewTransition()) {
        switchTheme();
        return;
      }

      const xPercent = (event.clientX / window.innerWidth) * 100;
      const yPercent = (event.clientY / window.innerHeight) * 100;
      updateTransitionStyles(createCircleRevealCss(xPercent, yPercent));
      startThemeTransition(switchTheme);
    },
    [isDark, setTheme],
  );

  return (
    <button
      type="button"
      className={cn(
        "size-7 shrink-0 cursor-pointer rounded-full bg-black p-0 transition-transform duration-300",
        "active:scale-95 focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="sr-only">Toggle theme</span>
      <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
        <motion.g
          animate={{ rotate: isDark ? -180 : 0 }}
          transition={{ ease: "easeInOut", duration: 2 }}
        >
          <path
            d="M120 67.5C149.25 67.5 172.5 90.75 172.5 120C172.5 149.25 149.25 172.5 120 172.5"
            fill="white"
          />
          <path
            d="M120 67.5C90.75 67.5 67.5 90.75 67.5 120C67.5 149.25 90.75 172.5 120 172.5"
            fill="black"
          />
        </motion.g>
        <motion.path
          animate={{ rotate: isDark ? 180 : 0 }}
          transition={{ ease: "easeInOut", duration: 2 }}
          d="M120 3.75C55.5 3.75 3.75 55.5 3.75 120C3.75 184.5 55.5 236.25 120 236.25C184.5 236.25 236.25 184.5 236.25 120C236.25 55.5 184.5 3.75 120 3.75ZM120 214.5V172.5C90.75 172.5 67.5 149.25 67.5 120C67.5 90.75 90.75 67.5 120 67.5V25.5C172.5 25.5 214.5 67.5 214.5 120C214.5 172.5 172.5 214.5 120 214.5Z"
          fill="white"
        />
      </svg>
    </button>
  );
}
