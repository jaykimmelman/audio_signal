import { ReactNode } from "react";

export function Panel({
  title,
  children,
  right,
  className = "",
  translucent = false,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
  translucent?: boolean;
}) {
  const bg = translucent
    ? "bg-panel/85 backdrop-blur-md"
    : "bg-panel";
  return (
    <div className={`${bg} border border-line rounded h-full flex flex-col min-h-0 ${className}`}>
      <div className="h-9 shrink-0 border-b border-line px-3 flex items-center justify-between font-mono text-[11px] tracking-widest uppercase text-muted">
        <span>{title}</span>
        {right}
      </div>
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </div>
  );
}
