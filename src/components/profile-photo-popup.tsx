"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

const OPEN_MS = 280;
const CLOSE_MS = 180;
const OPEN_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const CLOSE_EASE = "cubic-bezier(0.4, 0, 1, 1)";

type Phase = "closed" | "opening" | "open" | "closing";

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ProfilePhotoPopupProps {
  src: string;
  alt: string;
  className?: string;
}

function previewSize(): number {
  return Math.min(360, window.innerWidth - 48, window.innerHeight - 140);
}

function targetBox(): Box {
  const size = previewSize();
  const captionSpace = 40;
  return {
    top: (window.innerHeight - size - captionSpace) / 2,
    left: (window.innerWidth - size) / 2,
    width: size,
    height: size,
  };
}

function readBox(el: HTMLElement): Box {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

export function ProfilePhotoPopup({ src, alt, className }: ProfilePhotoPopupProps) {
  const titleId = useId();
  const thumbRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const closeFnRef = useRef<() => void>(() => undefined);
  const reducedMotionRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("closed");
  const [origin, setOrigin] = useState<Box | null>(null);
  const [target, setTarget] = useState<Box | null>(null);
  const [mounted, setMounted] = useState(false);

  const isVisible = phase !== "closed";
  const isExpanded = phase === "open";

  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = media.matches;
    const onChange = () => {
      reducedMotionRef.current = media.matches;
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const open = useCallback(() => {
    const thumb = thumbRef.current;
    if (!thumb || phase !== "closed") return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    setOrigin(readBox(thumb));
    setTarget(targetBox());
    setPhase(reducedMotionRef.current ? "open" : "opening");
  }, [phase]);

  const close = useCallback(() => {
    if (phase !== "open" && phase !== "opening") return;
    const thumb = thumbRef.current;
    if (thumb) setOrigin(readBox(thumb));
    setPhase("closing");
  }, [phase]);

  closeFnRef.current = close;

  useEffect(() => {
    if (phase !== "opening") return;
    if (reducedMotionRef.current) {
      setPhase("open");
      return;
    }
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase("open"));
    });
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  useEffect(() => {
    if (phase !== "closing") return;
    const delay = reducedMotionRef.current ? 150 : CLOSE_MS;
    const timeout = window.setTimeout(() => {
      setPhase("closed");
      restoreFocusRef.current?.focus();
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (!isVisible) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeFnRef.current();
      }
    };

    const onResize = () => {
      setTarget(targetBox());
      const thumb = thumbRef.current;
      if (thumb) setOrigin(readBox(thumb));
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [isVisible]);

  const invert =
    origin && target
      ? {
          x: origin.left - target.left,
          y: origin.top - target.top,
          scale: origin.width / target.width,
        }
      : { x: 0, y: 0, scale: 1 };

  const useMotion = !reducedMotionRef.current;
  const isClosing = phase === "closing";
  const duration = isClosing ? CLOSE_MS : OPEN_MS;
  const easing = isClosing ? CLOSE_EASE : OPEN_EASE;
  const motion = useMotion
    ? `opacity ${duration}ms ${easing}`
    : "opacity 150ms ease";
  const photoMotion =
    useMotion && phase !== "opening"
      ? `transform ${duration}ms ${easing}, border-radius ${duration}ms ${easing}`
      : "none";

  return (
    <>
      <button
        ref={thumbRef}
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-expanded={isVisible}
        aria-label={`View ${alt}'s profile photo`}
        className={cn(
          "group relative shrink-0 cursor-pointer overflow-hidden outline-none touch-manipulation",
          "transition-transform duration-200 ease-out",
          "hover:scale-[1.04] hover:brightness-110",
          "active:scale-[0.96]",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
          className
        )}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="56px"
          className={cn("object-cover", isVisible && "invisible")}
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/30 motion-reduce:transition-none">
          <ZoomIn className="h-4 w-4 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none" />
        </span>
      </button>

      {mounted && isVisible && origin && target
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="fixed inset-0 z-[80]"
            >
              <button
                type="button"
                aria-label="Close profile photo"
                onClick={close}
                className="absolute inset-0 cursor-pointer bg-black/55 backdrop-blur-md"
                style={{
                  opacity: isExpanded ? 1 : 0,
                  transition: motion,
                }}
              />

              <div
                className="pointer-events-none absolute overflow-hidden bg-muted shadow-2xl"
                style={{
                  top: target.top,
                  left: target.left,
                  width: target.width,
                  height: target.height,
                  borderRadius: isExpanded ? 24 : 16,
                  transform: isExpanded
                    ? "translate3d(0,0,0) scale(1)"
                    : `translate3d(${invert.x}px, ${invert.y}px, 0) scale(${invert.scale})`,
                  transformOrigin: "top left",
                  transition: photoMotion,
                  willChange: phase === "opening" || phase === "closing" ? "transform" : undefined,
                }}
              >
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>

              <p
                id={titleId}
                className="pointer-events-none absolute left-1/2 max-w-[min(360px,calc(100vw-48px))] truncate text-center text-sm font-medium text-white"
                style={{
                  top: target.top + target.height + 14,
                  transform: "translateX(-50%)",
                  opacity: isExpanded ? 1 : 0,
                  transition: motion,
                }}
              >
                {alt}
              </p>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                aria-label="Close profile photo"
                className="absolute right-4 top-4 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                style={{
                  opacity: isExpanded ? 1 : 0,
                  transition: motion,
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
