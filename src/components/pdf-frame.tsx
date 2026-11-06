"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type PdfViewport = { width: number; height: number };

type PdfPageProxy = {
  getViewport: (params: { scale: number }) => PdfViewport;
  render: (params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
  }) => { promise: Promise<void> };
};

type PdfDocumentProxy = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
  destroy: () => Promise<void>;
};

type PdfLoadingTask = {
  promise: Promise<PdfDocumentProxy>;
  destroy: () => void;
};

function isSafariBrowser(): boolean {
  const agent = navigator.userAgent;
  return /safari/i.test(agent) && !/chrome|chromium|android|crios|fxios|edg\//i.test(agent);
}

function loadPdfJs() {
  return import("pdfjs-dist/build/pdf");
}

export function PdfFrame({
  src,
  title,
  className,
  style,
}: {
  src?: string | null;
  title: string;
  className?: string;
  style?: CSSProperties;
}) {
  const clean = (src ?? "").split("#")[0];
  const [safari, setSafari] = useState(false);

  useEffect(() => {
    setSafari(isSafariBrowser());
  }, []);

  if (!clean) return null;

  const blob = clean.startsWith("blob:") || clean.startsWith("data:");
  if (safari && blob) {
    return <CanvasPdf src={clean} title={title} className={className} style={style} />;
  }
  if (safari) {
    return <PortaledPdf src={clean} title={title} className={className} style={style} />;
  }
  return <iframe src={clean} title={title} className={cn("border-0", className)} style={style} />;
}

function PortaledPdf({
  src,
  title,
  className,
  style,
}: {
  src: string;
  title: string;
  className?: string;
  style?: CSSProperties;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    let frame = 0;
    const update = () => {
      const rect = slot.getBoundingClientRect();
      setBox((current) => {
        if (
          current &&
          Math.abs(current.top - rect.top) < 0.5 &&
          Math.abs(current.left - rect.left) < 0.5 &&
          Math.abs(current.width - rect.width) < 0.5 &&
          Math.abs(current.height - rect.height) < 0.5
        ) {
          return current;
        }
        return {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };
      });
      frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <div ref={slotRef} className={cn("border-0", className)} style={style} />
      {box && box.width > 0 && box.height > 0
        ? createPortal(
            <iframe
              src={src}
              title={title}
              style={{
                position: "fixed",
                top: box.top,
                left: box.left,
                width: box.width,
                height: box.height,
                border: 0,
                zIndex: 60,
                background: "#fff",
              }}
            />,
            document.body
          )
        : null}
    </>
  );
}

function CanvasPdf({
  src,
  title,
  className,
  style,
}: {
  src: string;
  title: string;
  className?: string;
  style?: CSSProperties;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let task: PdfLoadingTask | null = null;
    host.replaceChildren();
    setStatus("loading");

    const render = async () => {
      try {
        const pdfjs = await loadPdfJs();
        const bytes = new Uint8Array(await (await fetch(src)).arrayBuffer());
        task = pdfjs.getDocument({ data: bytes, disableWorker: true });
        const pdf = await task.promise;
        if (cancelled) {
          await pdf.destroy();
          return;
        }
        const width = Math.max(host.clientWidth, 320);
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          if (cancelled) break;
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: width / base.width });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) continue;
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          canvas.style.background = "#fff";
          host.appendChild(canvas);
          await page.render({ canvasContext: context, viewport }).promise;
        }
        await pdf.destroy();
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    void render();
    return () => {
      cancelled = true;
      task?.destroy();
    };
  }, [src]);

  return (
    <div className={cn("overflow-auto bg-neutral-100", className)} style={style} aria-label={title}>
      <div ref={hostRef} />
      {status === "loading" ? (
        <p className="p-4 text-sm text-neutral-600">Loading document…</p>
      ) : null}
      {status === "error" ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-4 text-center text-sm">
          <p>This preview could not be shown.</p>
          <a href={src} target="_blank" rel="noreferrer" className="underline">
            Open the PDF
          </a>
        </div>
      ) : null}
    </div>
  );
}
