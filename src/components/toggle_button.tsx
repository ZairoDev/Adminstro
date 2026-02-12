import { cn } from "@/lib/utils";

type ToggleButtonProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

export const ToggleButton: React.FC<ToggleButtonProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors",
        value ? "bg-primary" : "bg-input",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-300",
          value ? "translate-x-5" : "translate-x-1",
        )}
      />
    </button>
  );
};
