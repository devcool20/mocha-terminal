import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { assets, scenarioPrice, type Symbol, type Side } from "./engine";
import { START, scenarioTime, useCandles } from "./data";
interface Props {
  symbol: Symbol;
  mode: "scenario" | "live";
  scenario: string;
  step: number;
  interval: string;
  entry: number;
  liquidation: number;
  tp?: number;
  sl?: number;
  side: Side;
  showRisk: boolean;
  mark: number;
  onPrice: (price: number) => void;
}
export function Chart(p: Props) {
  const el = useRef<HTMLDivElement>(null),
    chart = useRef<IChartApi | null>(null),
    candles = useRef<ISeriesApi<"Candlestick"> | null>(null),
    projection = useRef<ISeriesApi<"Line"> | null>(null);
  const [band, setBand] = useState({ top: 0, height: 0 });
  const [offscreen, setOffscreen] = useState(false);
  const callback = useRef(p.onPrice);
  callback.current = p.onPrice;
  const live = useCandles(p.symbol, p.interval, p.mode === "live");
  useEffect(() => {
    if (!el.current) return;
    const c = createChart(el.current, {
      autoSize: false,
      width: el.current.clientWidth,
      height: el.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9a9691",
        fontFamily: "Geist Mono",
        fontSize: 10,
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: "#26231f" },
        horzLines: { color: "#26231f" },
      },
      rightPriceScale: {
        borderColor: "#302b26",
        scaleMargins: { top: 0.17, bottom: 0.14 },
      },
      timeScale: {
        borderColor: "#302b26",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
      },
      crosshair: {
        vertLine: { color: "#71665b", labelBackgroundColor: "#45382c" },
        horzLine: { color: "#71665b", labelBackgroundColor: "#45382c" },
      },
    });
    chart.current = c;
    candles.current = c.addSeries(CandlestickSeries, {
      upColor: "#57a477",
      downColor: "#c9795b",
      borderVisible: false,
      wickUpColor: "#57a477",
      wickDownColor: "#c9795b",
      priceLineColor: "#d3835d",
      lastValueVisible: true,
    });
    projection.current = c.addSeries(LineSeries, {
      color: "#bf9c76",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    c.subscribeClick((e) => {
      if (e.point && candles.current) {
        const price = candles.current.coordinateToPrice(e.point.y);
        if (price && price > 0) callback.current(price);
      }
    });
    const resize = new ResizeObserver(() => {
      if (
        chart.current === c &&
        el.current &&
        el.current.clientWidth > 0 &&
        el.current.clientHeight > 0
      ) {
        c.resize(el.current.clientWidth, el.current.clientHeight);
        c.timeScale().fitContent();
      }
    });
    resize.observe(el.current);
    return () => {
      resize.disconnect();
      chart.current = null;
      candles.current = null;
      projection.current = null;
      c.remove();
    };
  }, []);
  useEffect(() => {
    const s = candles.current,
      c = chart.current;
    if (!s || !c) return;
    const base = assets.find((a) => a.symbol === p.symbol)!.price;
    const ms =
      p.interval === "1m"
        ? 60
        : p.interval === "5m"
          ? 300
          : p.interval === "15m"
            ? 900
            : 3600;
    if (p.mode === "live") {
      s.setData(
        (live.data ?? []).map((v) => ({ ...v, time: v.time as UTCTimestamp })),
      );
      projection.current?.setData([]);
    } else {
      const history = Array.from({ length: 110 }, (_, i) => {
        const trend = (i - 109) * 0.00032;
        const wave = Math.sin(i * 0.17) * 0.003 + Math.cos(i * 0.49) * 0.0018;
        const close = base * (1 + trend + wave),
          open =
            base *
            (1 +
              trend +
              Math.sin((i - 1) * 0.17) * 0.003 +
              Math.cos((i - 1) * 0.49) * 0.0018);
        return {
          time: (START / 1000 + (i - 110) * ms) as UTCTimestamp,
          open,
          close,
          high:
            Math.max(open, close) +
            base * (0.0008 + Math.abs(Math.sin(i)) * 0.0006),
          low:
            Math.min(open, close) -
            base * (0.0008 + Math.abs(Math.cos(i)) * 0.0007),
        };
      });
      history[109].close = base;
      const path = Array.from({ length: p.step + 1 }, (_, i) => {
        const close = scenarioPrice(p.symbol, i, p.scenario),
          open = i ? scenarioPrice(p.symbol, i - 1, p.scenario) : base;
        return {
          time: (scenarioTime(i, p.scenario) / 1000) as UTCTimestamp,
          open,
          close,
          high: Math.max(open, close) + base * 0.0005,
          low: Math.min(open, close) - base * 0.0005,
        };
      });
      const grouped = new Map<number, (typeof history)[number]>();
      for (const bar of [...history, ...path]) {
        const time = Math.floor(Number(bar.time) / ms) * ms;
        const previous = grouped.get(time);
        grouped.set(
          time,
          previous
            ? {
                ...previous,
                high: Math.max(previous.high, bar.high),
                low: Math.min(previous.low, bar.low),
                close: bar.close,
              }
            : { ...bar, time: time as UTCTimestamp },
        );
      }
      s.setData([...grouped.values()]);
      projection.current?.setData(
        Array.from({ length: 121 - p.step }, (_, i) => ({
          time: (scenarioTime(i + p.step, p.scenario) / 1000) as UTCTimestamp,
          value: scenarioPrice(p.symbol, i + p.step, p.scenario),
        })),
      );
    }
    c.timeScale().fitContent();
  }, [p.symbol, p.mode, p.step, p.scenario, p.interval, live.data]);
  const liveBar = useRef<{
    time: UTCTimestamp;
    open: number;
    high: number;
    low: number;
    close: number;
  } | null>(null);
  useEffect(() => {
    liveBar.current = null;
  }, [p.symbol, p.interval, p.mode]);
  useEffect(() => {
    const s = candles.current;
    if (!s || p.mode !== "live" || !live.data?.length || !(p.mark > 0)) return;
    const ms =
      p.interval === "1m"
        ? 60
        : p.interval === "5m"
          ? 300
          : p.interval === "15m"
            ? 900
            : 3600;
    const time = (Math.floor(Date.now() / 1000 / ms) * ms) as UTCTimestamp;
    const last = live.data[live.data.length - 1];
    const old =
      liveBar.current?.time === time
        ? liveBar.current
        : last.time === time
          ? { ...last, time }
          : null;
    const bar = {
      time,
      open: old?.open ?? p.mark,
      high: Math.max(old?.high ?? p.mark, p.mark),
      low: Math.min(old?.low ?? p.mark, p.mark),
      close: p.mark,
    };
    liveBar.current = bar;
    s.update(bar);
  }, [p.mark, p.mode, p.interval, p.symbol, live.data]);
  useEffect(() => {
    const s = candles.current;
    if (!s) return;
    const lines = [
      {
        price: p.entry,
        color: "#bd795b",
        title: "ENTRY",
        lineStyle: LineStyle.Dashed,
      },
      {
        price: p.liquidation,
        color: "#c57569",
        title: "EST. LIQUIDATION",
        lineStyle: LineStyle.Dashed,
      },
      ...(p.tp
        ? [
            {
              price: p.tp,
              color: "#57a477",
              title: "TAKE PROFIT",
              lineStyle: LineStyle.Dashed,
            },
          ]
        : []),
      ...(p.sl
        ? [
            {
              price: p.sl,
              color: "#d6aa6c",
              title: "STOP LOSS",
              lineStyle: LineStyle.Dashed,
            },
          ]
        : []),
    ]
      .filter((v) => v.price > 0 && (p.showRisk || v.title === "ENTRY"))
      .map((v) =>
        s.createPriceLine({
          ...v,
          lineWidth: 1,
          axisLabelVisible: true,
          lineVisible: true,
        }),
      );
    const update = () => {
      if (!chart.current || candles.current !== s) return;
      const a = s.priceToCoordinate(p.entry),
        b = s.priceToCoordinate(p.liquidation);
      if (a !== null && b !== null) {
        setOffscreen(b < 0 || b > 340);
        setBand({
          top: Math.max(0, Math.min(a, b)),
          height: Math.min(500, Math.abs(a - b)),
        });
      }
    };
    const id = setTimeout(update, 80);
    chart.current?.timeScale().subscribeVisibleLogicalRangeChange(update);
    return () => {
      clearTimeout(id);
      lines.forEach((l) => {
        try {
          s.removePriceLine(l);
        } catch {
          /* chart was replaced */
        }
      });
      chart.current?.timeScale().unsubscribeVisibleLogicalRangeChange(update);
    };
  }, [
    p.entry,
    p.liquidation,
    p.tp,
    p.sl,
    p.showRisk,
    p.step,
    p.mode,
    p.symbol,
  ]);
  return (
    <div className="chart-canvas">
      <div ref={el} className="chart-mount" />
      {p.showRisk && (
        <div
          className="risk-band"
          style={{ top: band.top, height: band.height }}
        />
      )}
      {p.mode === "live" && !live.data?.length && (
        <div className="chart-message">
          {live.isError
            ? "Chart history unavailable. Reference quotes may still update."
            : "Loading reference candles…"}
        </div>
      )}
      {p.showRisk && offscreen && (
        <span className="offscreen-risk">
          {p.side === "long" ? "↓" : "↑"} Est. liquidation $
          {p.liquidation.toFixed(2)} · outside view
        </span>
      )}
      <span className="chart-hint">Click chart to explore an exit price</span>
    </div>
  );
}
