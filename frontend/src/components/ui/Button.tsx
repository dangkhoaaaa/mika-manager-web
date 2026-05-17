import clsx from "clsx";

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50",
        variant === "primary" &&
          "bg-accent-muted hover:bg-accent text-white shadow-glow",
        variant === "ghost" &&
          "bg-white/5 hover:bg-white/10 text-zinc-300 border border-surface-border",
        variant === "danger" && "bg-red-500/20 hover:bg-red-500/30 text-red-300",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
