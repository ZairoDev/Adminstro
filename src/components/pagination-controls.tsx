
"use client"
import { cn } from "@/lib/utils"

type Props = {
  currentPage: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  isLoading?: boolean
}

function getPageNumbers(current: number, totalPages: number) {
  const pages: (number | "...")[] = []
  const maxButtons = 7

  if (totalPages <= maxButtons) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
    return pages
  }

  const left = Math.max(1, current - 2)
  const right = Math.min(totalPages, current + 2)

  if (left > 1) {
    pages.push(1)
    if (left > 2) pages.push("...")
  }

  for (let i = left; i <= right; i++) pages.push(i)

  if (right < totalPages) {
    if (right < totalPages - 1) pages.push("...")
    pages.push(totalPages)
  }

  return pages
}

export default function PaginationControls({ currentPage, total, pageSize, onPageChange, isLoading }: Props) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / Math.max(1, pageSize)))
  const pages = getPageNumbers(currentPage, totalPages)

  const go = (p: number) => {
    if (p < 1 || p > totalPages || p === currentPage || isLoading) return
    onPageChange(p)
  }

  return (
    <nav aria-label="Pagination" className="flex items-center gap-2">
      <button
        type="button"
        aria-label="First page"
        onClick={() => go(1)}
        disabled={currentPage === 1 || isLoading}
        className={cn(
          "px-2 py-1 rounded border bg-background text-foreground text-sm",
          (currentPage === 1 || isLoading) && "opacity-50 cursor-not-allowed",
        )}
      >
        {"<<"}
      </button>
      <button
        type="button"
        aria-label="Previous page"
        onClick={() => go(currentPage - 1)}
        disabled={currentPage === 1 || isLoading}
        className={cn(
          "px-2 py-1 rounded border bg-background text-foreground text-sm",
          (currentPage === 1 || isLoading) && "opacity-50 cursor-not-allowed",
        )}
      >
        {"<"}
      </button>

      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`${p}-${idx}`} className="px-2 text-sm text-muted-foreground">
            ...
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === currentPage ? "page" : undefined}
            onClick={() => go(p)}
            className={cn(
              "px-3 py-1 rounded border text-sm",
              p === currentPage
                ? "bg-foreground text-background"
                : "bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label="Next page"
        onClick={() => go(currentPage + 1)}
        disabled={currentPage === totalPages || isLoading}
        className={cn(
          "px-2 py-1 rounded border bg-background text-foreground text-sm",
          (currentPage === totalPages || isLoading) && "opacity-50 cursor-not-allowed",
        )}
      >
        {">"}
      </button>
      <button
        type="button"
        aria-label="Last page"
        onClick={() => go(totalPages)}
        disabled={currentPage === totalPages || isLoading}
        className={cn(
          "px-2 py-1 rounded border bg-background text-foreground text-sm",
          (currentPage === totalPages || isLoading) && "opacity-50 cursor-not-allowed",
        )}
      >
        {">>"}
      </button>
    </nav>
  )
}
