import type { CSSProperties, InputHTMLAttributes } from "react";
export function Range({
  style,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const min = Number(props.min ?? 0),
    max = Number(props.max ?? 100),
    value = Number(props.value ?? min);
  const pct =
    max > min
      ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
      : 0;
  return (
    <div
      className="range-shell"
      style={{ ...style, "--progress": `${pct}%` } as CSSProperties}
    >
      <span className="range-fill" aria-hidden="true" />
      <input {...props} type="range" className={`range-control ${className}`} />
    </div>
  );
}
