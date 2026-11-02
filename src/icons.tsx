import type { SVGProps } from "react";
type Props = SVGProps<SVGSVGElement> & { size?: number };
const glyph = (path: string) => (props: Props) => {
  const { size = 16, ...rest } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={path} />
    </svg>
  );
};
export const Search = glyph(
  "M10.7 10.7 14 14M12 7A5 5 0 1 1 2 7a5 5 0 0 1 10 0",
);
export const ArrowRight = glyph("M2 8h12M9 3l5 5-5 5");
export const ArrowUpRight = glyph("M3 13 13 3M4 3h9v9");
export const ArrowDownLeft = glyph("M13 3 3 13M3 4v9h9");
export const ChevronDown = glyph("M4 6l4 4 4-4");
export const ChevronRight = glyph("M6 4l4 4-4 4");
export const ChevronLeft = glyph("M10 4 6 8l4 4");
export const Plus = glyph("M8 3v10M3 8h10");
export const X = glyph("m4 4 8 8M12 4l-8 8");
export const Check = glyph("m3 8 3.5 3.5L13 4");
export const Bookmark = glyph("M4 2.5h8v11L8 11l-4 2.5z");
export const Star = glyph(
  "m8 2 1.8 3.8 4.2.6-3 3 .7 4.2L8 11.7l-3.7 1.9.7-4.2-3-3 4.2-.6z",
);
export const Share2 = glyph("M8 10V2m-3 3 3-3 3 3M3 8v6h10V8");
export const Download = glyph("M8 2v8m-3-3 3 3 3-3M3 11v3h10v-3");
export const Copy = glyph("M6 6h8v8H6zM10 3V2H2v8h1");
export const RotateCcw = glyph("M3 5a5.5 5.5 0 1 1-1 5M2 2v4h4");
export const Play = glyph("m5 3 7 5-7 5z");
export const Pause = glyph("M5 3v10M11 3v10");
export const Maximize2 = glyph("M2 6V2h4m4 0h4v4M2 10v4h4m4 0h4v-4");
export const CircleHelp = glyph(
  "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12M6.5 6a1.5 1.5 0 1 1 2.2 1.3c-.7.4-.7.9-.7 1.4M8 11h.01",
);
export const ExternalLink = glyph("M9 2h5v5m0-5L7 9M6 3H2v11h11v-4");
export const Settings2 = glyph("M2 5h12M2 11h12M6 3v4m5 2v4");
export const ShieldCheck = glyph(
  "M8 1.5 14 4v4c0 3-3 5-6 6.5C5 13 2 11 2 8V4zM5 8l2 2 4-4",
);
export const Globe2 = glyph(
  "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12M2 8h12M8 2c-4 4-4 8 0 12M8 2c4 4 4 8 0 12",
);
export const Zap = glyph("m9 1-6 8h5l-1 6 6-8H8z");
export const TrendingUp = glyph("m2 12 4-5 3 2 5-6m-4 0h4v4");
export const WifiOff = glyph(
  "m2 2 12 12M2 6c1.5-1 3-1.5 5-1.5M5 9c1-.6 2-.8 3-.8m0 4h.01M10 4.8c1.5.2 2.8.8 4 1.5",
);
export const Coffee = (props: Props) => (
  <svg
    width={props.size ?? 16}
    height={props.size ?? 16}
    viewBox="0 0 16 16"
    aria-hidden="true"
  >
    <image href="/brand/mocha-mark.svg" width="16" height="16" />
  </svg>
);
