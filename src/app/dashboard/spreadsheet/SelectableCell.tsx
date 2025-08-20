import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
export function SelectableCell({
  data,
  value,
  save,
  maxWidth
}:{data:string[],value:string,save:Function,maxWidth?:string}) {
  const [editing,setEditing] = useState(false);
  const [draft,setDraft] = useState(value);
  return (
    <div
      className={`truncate cursor-pointer inline-block`}
      style={{ maxWidth }}
      onClick={() => !editing && setEditing(true)}
    >
      {editing ? (
        <select
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            save(draft);
          }}
        >
          {data.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{value}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="whitespace-pre-wrap">{value}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}