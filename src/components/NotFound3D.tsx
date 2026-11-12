"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DIGITS = ["4", "0", "4"] as const;
const EXTRUDE_LAYERS = 14;
const ACCENT = "#3B82F6";
const ACCENT_DEEP = "#1D4ED8";
const ACCENT_SHADOW = "#0B1F44";

function DigitBlock({
  digit,
  index,
  tiltX,
  tiltY,
  reduceMotion,
}: {
  digit: string;
  index: number;
  tiltX: number;
  tiltY: number;
  reduceMotion: boolean;
}) {
  const depth = index === 1 ? 1.06 : 1;
  const floatY = reduceMotion ? 0 : index === 1 ? -10 : index === 0 ? 6 : 4;

  return (
    <motion.div
      className="relative"
      style={{ perspective: 900, transformStyle: "preserve-3d" }}
      initial={reduceMotion ? false : { opacity: 0, z: -80, rotateX: 28 }}
      animate={
        reduceMotion
          ? { opacity: 1, y: 0 }
          : {
              opacity: 1,
              y: [floatY, floatY - 12, floatY],
              rotateX: tiltX * (index === 1 ? 0.7 : 1),
              rotateY: tiltY * (index === 1 ? 0.7 : 1) + (index - 1) * 8,
              scale: depth,
            }
      }
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              opacity: { duration: 0.5, delay: index * 0.12 },
              y: {
                duration: 3.2 + index * 0.35,
                repeat: Infinity,
                ease: "easeInOut",
              },
              rotateX: { type: "spring", stiffness: 80, damping: 18 },
              rotateY: { type: "spring", stiffness: 80, damping: 18 },
              scale: { type: "spring", stiffness: 120, damping: 16 },
            }
      }
    >
      <div className="not-found-digit" aria-hidden="true">
        <span
          className="not-found-digit__face relative z-10 block text-[clamp(5.5rem,18vw,10.5rem)] font-extrabold leading-none tracking-tight"
          style={{ color: ACCENT }}
        >
          {digit}
        </span>
        {Array.from({ length: EXTRUDE_LAYERS }).map((_, layer) => (
          <span
            key={layer}
            className="not-found-digit__extrude absolute left-0 top-0 block text-[clamp(5.5rem,18vw,10.5rem)] font-extrabold leading-none tracking-tight"
            style={{
              transform: `translateZ(${-(layer + 1) * 2.5}px)`,
              color: `color-mix(in srgb, ${ACCENT_DEEP} ${Math.max(12, 78 - layer * 4.5)}%, ${ACCENT_SHADOW})`,
            }}
          >
            {digit}
          </span>
        ))}
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[52%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-[40%] blur-2xl"
          style={{
            backgroundColor: "rgba(59, 130, 246, 0.35)",
            transform: "translate(-50%, -50%) translateZ(-36px)",
          }}
        />
      </div>
    </motion.div>
  );
}

export default function NotFound3D() {
  const reduceMotion = useReducedMotion() ?? false;
  const sceneRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (reduceMotion || !sceneRef.current) return;
      const rect = sceneRef.current.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      setTilt({ x: py * -18, y: px * 22 });
    },
    [reduceMotion]
  );

  const onPointerLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    document.title = "404 · Adminstro Portal";
  }, []);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-16 text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(37,99,235,0.10),_transparent_50%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
        <motion.p
          className="mb-6 text-xs font-semibold uppercase tracking-[0.28em] text-foreground"
          initial={reduceMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          Adminstro
        </motion.p>

        <div
          ref={sceneRef}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          className={cn(
            "mb-10 flex items-end justify-center gap-2 sm:gap-4",
            "perspective-1000 touch-none"
          )}
          style={{ transformStyle: "preserve-3d" }}
          role="img"
          aria-label="Error 404"
        >
          {DIGITS.map((digit, index) => (
            <DigitBlock
              key={`${digit}-${index}`}
              digit={digit}
              index={index}
              tiltX={tilt.x}
              tiltY={tilt.y}
              reduceMotion={reduceMotion}
            />
          ))}
        </div>

        <motion.h1
          className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          Page not found
        </motion.h1>
        <motion.p
          className="mb-8 max-w-md text-sm text-muted-foreground sm:text-base"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          This route drifted off the map. Head back to the dashboard and keep
          building.
        </motion.p>

        <motion.div
          className="flex flex-wrap items-center justify-center gap-3"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          <Button
            asChild
            size="lg"
            className="bg-[#3B82F6] text-white hover:bg-[#2563EB]"
          >
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Sign in
            </Link>
          </Button>
        </motion.div>
      </div>
    </main>
  );
}
