"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Check } from "lucide-react";

interface SignaturePadProps {
  onSignatureCapture: (signatureUrl: string) => void;
  onCancel?: () => void;
  existingSignature?: string;
}

const PAD_HEIGHT = 300;

export function SignaturePad({ onSignatureCapture }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const sizedRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const prepare = () => {
      const rect = parent.getBoundingClientRect();
      if (rect.width < 40 || sizedRef.current) return;
      sizedRef.current = true;
      const width = rect.width;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(PAD_HEIGHT * ratio);
      canvas.style.width = "100%";
      canvas.style.height = `${PAD_HEIGHT}px`;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, PAD_HEIGHT);
      context.strokeStyle = "#111111";
      context.lineWidth = 2;
      context.lineCap = "round";
      context.lineJoin = "round";
    };

    prepare();
    const observer = new ResizeObserver(() => {
      prepare();
    });
    observer.observe(parent);

    const pointFrom = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const start = (event: PointerEvent) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      canvas.setPointerCapture(event.pointerId);
      drawingRef.current = true;
      const context = canvas.getContext("2d");
      if (!context) return;
      const point = pointFrom(event);
      context.beginPath();
      context.moveTo(point.x, point.y);
    };

    const move = (event: PointerEvent) => {
      if (!drawingRef.current) return;
      event.preventDefault();
      const context = canvas.getContext("2d");
      if (!context) return;
      const point = pointFrom(event);
      context.lineTo(point.x, point.y);
      context.stroke();
      setIsEmpty(false);
    };

    const stop = (event: PointerEvent) => {
      drawingRef.current = false;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move, { passive: false });
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);

    return () => {
      observer.disconnect();
      canvas.removeEventListener("pointerdown", start);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", stop);
      canvas.removeEventListener("pointercancel", stop);
    };
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ratio = window.devicePixelRatio || 1;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    context.strokeStyle = "#111111";
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    setIsEmpty(true);
  };

  const handleCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSignatureCapture(canvas.toDataURL("image/png"));
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border-2 border-gray-300 bg-white dark:border-gray-600">
        <canvas ref={canvasRef} className="w-full cursor-crosshair touch-none" />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={clearCanvas} className="flex-1 gap-2 bg-transparent">
          <RotateCcw className="w-4 h-4" />
          Clear
        </Button>
        <Button
          type="button"
          onClick={handleCapture}
          disabled={isEmpty}
          className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Check className="w-4 h-4" />
          Capture Signature
        </Button>
      </div>
    </div>
  );
}
