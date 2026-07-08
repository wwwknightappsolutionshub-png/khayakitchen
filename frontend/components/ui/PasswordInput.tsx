import { forwardRef, useMemo, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

export interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { id: "number", label: "One number", test: (v) => /\d/.test(v) },
  { id: "symbol", label: "One special character", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function isStrongPassword(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  tooltip?: string;
  value?: string;
  showStrength?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, error, tooltip, id, value = "", showStrength = true, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const currentValue = typeof value === "string" ? value : "";

    const ruleResults = useMemo(
      () => PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(currentValue) })),
      [currentValue],
    );

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <div className="flex items-center gap-1.5">
            <label htmlFor={inputId} className="text-sm font-medium text-foreground">
              {label}
            </label>
            {tooltip ? <InfoTooltip label={label} text={tooltip} /> : null}
          </div>
        ) : null}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            autoComplete={props.autoComplete ?? "new-password"}
            value={value}
            className={cn(
              "h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 pr-10 text-sm text-foreground",
              "placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background",
              "disabled:opacity-50",
              error && "border-danger focus:ring-danger",
              className,
            )}
            {...props}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground"
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
        {showStrength && currentValue.length > 0 ? (
          <ul className="mt-1 space-y-1">
            {ruleResults.map((rule) => (
              <li
                key={rule.id}
                className={cn(
                  "text-xs",
                  rule.passed ? "text-emerald-400" : "text-zinc-500",
                )}
              >
                {rule.passed ? "✓" : "○"} {rule.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";
