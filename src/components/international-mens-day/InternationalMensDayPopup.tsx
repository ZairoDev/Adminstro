"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { useAuthStore } from "@/AuthStore";

const OBSERVANCE_MONTH = 10;
const OBSERVANCE_DAY = 19;

type ConfettiPiece = {
  left: string;
  delay: string;
  duration: string;
  color: string;
  width: number;
  height: number;
  drift: string;
  radius: string;
};

const CONFETTI: ConfettiPiece[] = [
  { left: "4%", delay: "0s", duration: "4.6s", color: "#facc15", width: 10, height: 16, drift: "40px", radius: "2px" },
  { left: "10%", delay: "0.6s", duration: "5.2s", color: "#38bdf8", width: 8, height: 8, drift: "-30px", radius: "999px" },
  { left: "16%", delay: "1.2s", duration: "4.1s", color: "#fb7185", width: 12, height: 8, drift: "24px", radius: "2px" },
  { left: "22%", delay: "0.2s", duration: "5.6s", color: "#34d399", width: 7, height: 14, drift: "-18px", radius: "2px" },
  { left: "29%", delay: "1.8s", duration: "4.8s", color: "#ffffff", width: 8, height: 8, drift: "36px", radius: "999px" },
  { left: "35%", delay: "0.4s", duration: "5s", color: "#fb923c", width: 11, height: 7, drift: "-42px", radius: "2px" },
  { left: "42%", delay: "1.4s", duration: "4.4s", color: "#818cf8", width: 9, height: 14, drift: "20px", radius: "2px" },
  { left: "48%", delay: "0.8s", duration: "5.4s", color: "#facc15", width: 8, height: 8, drift: "-26px", radius: "999px" },
  { left: "54%", delay: "2s", duration: "4.2s", color: "#38bdf8", width: 14, height: 6, drift: "32px", radius: "2px" },
  { left: "61%", delay: "0.3s", duration: "5.1s", color: "#fb7185", width: 8, height: 12, drift: "-16px", radius: "2px" },
  { left: "67%", delay: "1.1s", duration: "4.7s", color: "#34d399", width: 9, height: 9, drift: "28px", radius: "999px" },
  { left: "73%", delay: "1.7s", duration: "5.3s", color: "#ffffff", width: 6, height: 16, drift: "-34px", radius: "2px" },
  { left: "79%", delay: "0.5s", duration: "4.5s", color: "#fb923c", width: 10, height: 10, drift: "18px", radius: "999px" },
  { left: "85%", delay: "1.5s", duration: "5.5s", color: "#818cf8", width: 12, height: 7, drift: "-22px", radius: "2px" },
  { left: "91%", delay: "0.9s", duration: "4.3s", color: "#facc15", width: 7, height: 13, drift: "30px", radius: "2px" },
  { left: "96%", delay: "2.1s", duration: "5s", color: "#38bdf8", width: 8, height: 8, drift: "-12px", radius: "999px" },
  { left: "7%", delay: "2.4s", duration: "4.9s", color: "#fb7185", width: 9, height: 6, drift: "22px", radius: "2px" },
  { left: "19%", delay: "2.8s", duration: "5.2s", color: "#34d399", width: 6, height: 12, drift: "-28px", radius: "2px" },
  { left: "33%", delay: "2.2s", duration: "4.6s", color: "#ffffff", width: 11, height: 6, drift: "16px", radius: "2px" },
  { left: "51%", delay: "2.6s", duration: "5.4s", color: "#fb923c", width: 8, height: 14, drift: "-20px", radius: "2px" },
  { left: "64%", delay: "3s", duration: "4.4s", color: "#facc15", width: 8, height: 8, drift: "26px", radius: "999px" },
  { left: "82%", delay: "2.5s", duration: "5.1s", color: "#38bdf8", width: 13, height: 6, drift: "-24px", radius: "2px" },
];

const DOTS = ["#facc15", "#38bdf8", "#fb7185", "#34d399", "#fb923c", "#818cf8"];

function storageKey(year: number): string {
  return `adminstro-international-mens-day-${year}-v3`;
}

function isObservanceDay(date: Date): boolean {
  return (
    date.getMonth() === OBSERVANCE_MONTH && date.getDate() === OBSERVANCE_DAY
  );
}

function markSeen(year: number): void {
  try {
    window.localStorage.setItem(storageKey(year), "seen");
  } catch {
    // Private mode can block storage. The popup still closes for this view.
  }
}

function alreadySeen(year: number): boolean {
  try {
    return window.localStorage.getItem(storageKey(year)) === "seen";
  } catch {
    return false;
  }
}

export function InternationalMensDayPopup() {
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const yearRef = useRef<number>(new Date().getFullYear());
  const token = useAuthStore((state) => state.token);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!token?.id) return;

    const today = new Date();
    if (!isObservanceDay(today)) return;

    const year = today.getFullYear();
    yearRef.current = year;
    if (alreadySeen(year)) return;

    setVisible(true);
    const timer = window.setTimeout(() => markSeen(year), 0);
    return () => window.clearTimeout(timer);
  }, [token?.id]);

  useEffect(() => {
    if (!visible) return;

    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        markSeen(yearRef.current);
        setVisible(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [visible]);

  if (!visible) return null;

  const dismiss = () => {
    markSeen(yearRef.current);
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 sm:p-6">
      <style>{`
        @keyframes imd-pop {
          0% { opacity: 0; transform: translateY(36px) scale(0.86); }
          55% { opacity: 1; transform: translateY(-8px) scale(1.04); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes imd-fall {
          0% { transform: translate3d(0, -18vh, 0) rotate(0deg); opacity: 0; }
          12% { opacity: 1; }
          100% { transform: translate3d(var(--drift), 115vh, 0) rotate(540deg); opacity: 0.85; }
        }
        @keyframes imd-float {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(12px, -18px, 0) scale(1.08); }
        }
        @keyframes imd-shimmer {
          0% { transform: translateX(-130%); }
          100% { transform: translateX(280%); }
        }
        @keyframes imd-glow {
          0%, 100% { transform: scale(1); opacity: 0.55; }
          50% { transform: scale(1.12); opacity: 1; }
        }
        @keyframes imd-dot {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        .imd-pop { animation: imd-pop 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .imd-fall { animation: imd-fall var(--duration) linear var(--delay) infinite; }
        .imd-float { animation: imd-float 7s ease-in-out infinite; }
        .imd-shimmer { animation: imd-shimmer 2.6s ease-in-out infinite; }
        .imd-glow { animation: imd-glow 2.4s ease-in-out infinite; }
        .imd-dot { animation: imd-dot 1.15s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .imd-pop, .imd-fall, .imd-float, .imd-shimmer, .imd-glow, .imd-dot {
            animation: none !important;
          }
          .imd-pop { opacity: 1; }
        }
      `}</style>

      <div
        className="absolute inset-0 bg-[#0b1d4d]/80"
        aria-hidden="true"
      />
      <div
        className="imd-float absolute left-[8%] top-[12%] h-40 w-40 rounded-full bg-[#facc15]/40 blur-2xl"
        aria-hidden="true"
      />
      <div
        className="imd-float absolute bottom-[10%] right-[8%] h-48 w-48 rounded-full bg-[#fb7185]/35 blur-2xl"
        style={{ animationDelay: "-2s" }}
        aria-hidden="true"
      />
      <div
        className="imd-float absolute right-[18%] top-[8%] h-32 w-32 rounded-full bg-[#38bdf8]/40 blur-2xl"
        style={{ animationDelay: "-4s" }}
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {CONFETTI.map((piece) => (
          <span
            key={`${piece.left}-${piece.delay}-${piece.color}`}
            className="imd-fall absolute top-0 block"
            style={{
              left: piece.left,
              width: piece.width,
              height: piece.height,
              backgroundColor: piece.color,
              borderRadius: piece.radius,
              ["--drift" as string]: piece.drift,
              ["--delay" as string]: piece.delay,
              ["--duration" as string]: piece.duration,
            }}
          />
        ))}
      </div>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="imd-pop relative z-10 w-full max-w-[520px] overflow-hidden rounded-[28px] bg-white text-[#14213d] shadow-[0_30px_80px_rgba(15,40,120,0.45)]"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={dismiss}
          aria-label="Close International Men's Day message"
          className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#1d4ed8] shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <div
          className="relative overflow-hidden pb-8 pl-6 pr-16 pt-8 text-white sm:pl-8 sm:pr-16"
          style={{
            background:
              "radial-gradient(circle at 12% 18%, rgba(250,204,21,0.95), transparent 32%), radial-gradient(circle at 90% 8%, rgba(251,113,133,0.9), transparent 28%), radial-gradient(circle at 78% 88%, rgba(52,211,153,0.75), transparent 30%), linear-gradient(145deg, #1d4ed8 0%, #2563eb 48%, #0284c7 100%)",
          }}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent imd-shimmer" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#fde68a]">
            19 November
          </p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/90">A great day for</p>
              <p
                className="imd-glow mt-1 inline-block text-7xl font-extrabold leading-none tracking-tight"
                style={{ textShadow: "0 8px 24px rgba(15, 23, 42, 0.28)" }}
              >
                the men
              </p>
            </div>
            <p className="rounded-2xl bg-white/15 px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.18em] text-[#fde68a] backdrop-blur-sm">
              Today
              <span className="mt-1 block text-3xl font-extrabold tracking-normal text-white">
                19
              </span>
            </p>
          </div>
        </div>

        <div className="relative px-6 pb-8 pt-6 sm:px-8">
          <h2
            id={titleId}
            className="text-[1.7rem] font-extrabold leading-[1.1] tracking-tight text-[#1d4ed8] sm:text-4xl"
          >
            Happy International
            <br />
            Men&apos;s Day
          </h2>
          <div className="mt-4 flex gap-2" aria-hidden="true">
            {DOTS.map((color, index) => (
              <span
                key={color}
                className="imd-dot h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: color,
                  animationDelay: `${index * 0.12}s`,
                }}
              />
            ))}
          </div>
          <p
            id={descriptionId}
            className="mt-4 text-[15px] leading-7 text-[#334155]"
          >
            To every man on this team — thank you for the work you carry and
            the people you look after. Have a great day. It&apos;s yours.
          </p>
        </div>
      </div>
    </div>
  );
}
