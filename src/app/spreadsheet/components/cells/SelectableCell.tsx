"use client"

import { useEffect, useMemo, useState } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Option = { label: string; value: string } | string

function resolveOptionValue(val: string, data: Option[]): string {
  if (!val) return val
  const lower = val.toLowerCase()
  for (const item of data) {
    if (typeof item === "string") {
      if (item.toLowerCase() === lower) return item
    } else if (item.value.toLowerCase() === lower) {
      return item.value
    }
  }
  return val
}

export function SelectableCell({
  data,
  value,
  save,
  maxWidth,
}: {
  data: Option[]
  value: string
  save: (val: string) => void
  maxWidth?: string
}) {
  const canonicalValue = useMemo(
    () => resolveOptionValue(value, data),
    [value, data],
  )
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(canonicalValue)

  useEffect(() => {
    setDraft(resolveOptionValue(value, data))
  }, [value, data])

  const getLabel = (val: string) => {
    const resolved = resolveOptionValue(val, data)
    const found = data.find((item) =>
      typeof item === "string"
        ? item.toLowerCase() === resolved.toLowerCase()
        : item.value.toLowerCase() === resolved.toLowerCase(),
    )
    if (!found) return resolved
    return typeof found === "string" ? found : found.label
  }

  return (
    <div
      className="w-full h-full flex items-center cursor-pointer"
      style={{ maxWidth }}
      onClick={(e) => {
        e.stopPropagation()
        if (!editing) setEditing(true)
      }}
    >
      {editing ? (
        <Select
          key={`${canonicalValue}-edit`}
          defaultValue={canonicalValue || undefined}
          onValueChange={(val) => {
            setDraft(val)
            save(val)
            setEditing(false)
          }}
        >
          <SelectTrigger className="w-full text-md border rounded-md p-1">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {data.map((item) =>
              typeof item === "string" ? (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ) : (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={`text-md border truncate rounded-md w-full  p-1 block ${
                  canonicalValue ? "text-foreground" : "text-muted-foreground italic"
                }`}
              >
                {canonicalValue ? getLabel(canonicalValue) : "Click"}
              </span>
            </TooltipTrigger>
            {canonicalValue && (
              <TooltipContent>
                <p className="whitespace-pre-wrap">{getLabel(canonicalValue)}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
