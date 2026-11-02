import { useEffect, useRef, type ReactNode } from "react";
export function PositionRow({
  pnl,
  displayValue,
  active,
  children,
}: {
  pnl: number;
  displayValue: number;
  active: boolean;
  children: ReactNode;
}) {
  const row = useRef<HTMLTableRowElement>(null),
    previous = useRef(displayValue);
  const tone = !active
    ? "pending"
    : pnl > 0
      ? "profit"
      : pnl < 0
        ? "loss"
        : "flat";
  useEffect(() => {
    const changed = previous.current !== displayValue;
    previous.current = displayValue;
    if (
      !changed ||
      !active ||
      !row.current ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const rgb =
      tone === "profit"
        ? "112,179,135"
        : tone === "loss"
          ? "211,125,82"
          : "169,161,151";
    const flash = row.current.animate(
      [
        { backgroundColor: `rgba(${rgb},.20)` },
        { backgroundColor: `rgba(${rgb},.055)` },
      ],
      { duration: 620, easing: "cubic-bezier(.16,1,.3,1)" },
    );
    return () => flash.cancel();
  }, [displayValue, active, tone]);
  return (
    <tr
      ref={row}
      className={`position-row position-${tone}`}
      data-pnl-state={tone}
    >
      {children}
    </tr>
  );
}
