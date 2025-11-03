"use client"

import { Copy } from "lucide-react"
import { useState } from "react"

type EditableCopyCellProps = {
  value: string | null | undefined
  onSave: (newValue: string) => void
  maxWidth?: string
}

export function EditableCopyCell({
  value,
  onSave,
  maxWidth = "160px", // increased default width
}: EditableCopyCellProps) {
  const safeValue = value ?? "" // fallback to empty string
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(safeValue)

  const handleCopy = async () => {
    if (!isEditing && safeValue.trim() !== "") {
      await navigator.clipboard.writeText(safeValue)
    }
  }

  const handleSave = () => {
    const trimmed = draft.trim()
    if (trimmed !== safeValue) {
      onSave(trimmed)
    }
    setIsEditing(false)
  }

  return (
    <div
      style={{ maxWidth }}
      className="flex items-center gap-2 w-full cursor-pointer"
      onClick={(e) => {
        e.stopPropagation()
        handleCopy()
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        setIsEditing(true)
      }}
    >
      {isEditing ? (
        <input
          type="text"
          className="border rounded px-2 py-1 w-full text-sm"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") {
              setDraft(safeValue)
              setIsEditing(false)
            }
          }}
        />
      ) : (
        <div
          className={`truncate text-sm w-full px-1 py-1 ${
            safeValue ? "text-muted-foreground" : "text-gray-400 italic"
          }`}
          title={safeValue || "Click to edit"}
        >
          {safeValue ? <Copy size={16} /> : "Edit"}
        </div>
      )}
    </div>
  )
}
