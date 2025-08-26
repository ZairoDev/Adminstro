"use client";

import { useState } from "react";

type EditableCellProps = {
  value: string;
  onSave: (val: string) => void;
  maxWidth?: string;
};

export const EditableCell = ({
  value,
  onSave,
  maxWidth = "120px",
}: EditableCellProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const handleSave = () => {
    setEditing(false);
    if (draft !== value) {
      onSave(draft);
    }
  };

  return (
    <div
      style={{ maxWidth }}
      className="cursor-pointer"
      onClick={() => !editing && setEditing(true)}
    >
      {editing ? (
        <input
          type="text"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") {
              setDraft(value);
              setEditing(false);
            }
          }}
          className="w-full border rounded px-1 text-sm focus:outline-none focus:ring-1 bg-slate-400 focus:ring-blue-500"
        />
      ) : (
        <span className="truncate block">{value}</span>
      )}
    </div>
  );
};
