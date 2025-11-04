"use client"

import { useState, useEffect, useRef } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type EditableCellProps = {
  value: string
  onSave: (newValue: string) => void
  maxWidth?: string
  disableDigits?: boolean
  type?: "text" | "date"
}

export function EditableCell({ maxWidth = "150px", value, disableDigits, onSave, type = "text" }: EditableCellProps) {
  const [draft, setDraft] = useState(value)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // keep draft in sync if parent updates value externally
  useEffect(() => {
    setDraft(value)
  }, [value])

  const handleSave = () => {
    setIsFocused(false)
    // prevent saving unchanged values
    if (draft !== value) {
      onSave(draft.trim()) // trim spaces before saving
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value
    if (disableDigits) {
      newValue = newValue.replace(/\d/g, "") // remove digits if not allowed
    }
    setDraft(newValue)
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  return (
    <div
      className="inline-block cursor-text w-full"
      style={{ maxWidth, minWidth: "80px" }}
      onClick={() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }}
    >
      {type === "date" ? (
        <input
          ref={inputRef}
          type="date"
          value={draft || ""}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              handleSave()
              inputRef.current?.blur()
            }
            if (e.key === "Escape") {
              setDraft(value)
              setIsFocused(false)
              inputRef.current?.blur()
            }
          }}
          className={`w-full border bg-background text-foreground px-1 text-sm rounded outline-none transition-all ${
            isFocused ? "border-ring ring-2 ring-ring" : "border-transparent hover:border-input"
          }`}
        />
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <input
                ref={inputRef}
                type="text"
                value={draft}
                placeholder="-"
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleSave()
                    inputRef.current?.blur()
                  }
                  if (e.key === "Escape") {
                    setDraft(value)
                    setIsFocused(false)
                    inputRef.current?.blur()
                  }
                }}
                className={`w-full border bg-background text-foreground placeholder:text-muted-foreground px-1 text-sm rounded outline-none transition-all truncate ${
                  isFocused ? "border-ring ring-2 ring-ring" : "border-transparent hover:border-input"
                }`}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="whitespace-pre-wrap">
                {value || "No value"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
