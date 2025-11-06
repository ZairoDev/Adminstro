"use client"

import type React from "react"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { RotateCcw, Check } from "lucide-react"

interface SignaturePadProps {
  onSignatureCapture: (signatureUrl: string) => void
  onCancel?: () => void
  existingSignature?: string
}

export function SignaturePad({ onSignatureCapture, onCancel, existingSignature }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas size
    const rect = canvas.parentElement?.getBoundingClientRect()
    if (rect) {
      canvas.width = rect.width
      canvas.height = 300
    }

    // Set canvas background to white
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = "#000"
      ctx.lineWidth = 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
    }
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsDrawing(true)
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    let x: number, y: number

    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    let x: number, y: number

    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }

    ctx.lineTo(x, y)
    ctx.stroke()
    setIsEmpty(false)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
  }

  const handleCapture = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const signatureUrl = canvas.toDataURL("image/png")
    onSignatureCapture(signatureUrl)
  }

  return (
    <div className="space-y-3">
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full cursor-crosshair touch-none"
        />
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
  )
}
