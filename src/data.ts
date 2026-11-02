import { parseBook, type Book } from "./book";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  assets,
  scenarioPrice,
  scenarios,
  type Quote,
  type Symbol,
} from "./engine";
import { useStore } from "./store";
export const START = 1793577600000;
export const scenarioTime = (step: number, scenario: string) =>
  START + step * (scenario === "funding" ? 1440000 : 30000);
export const scenarioQuote = (
  symbol: Symbol,
  step: number,
  scenario: string,
): Quote => ({
  symbol,
  price: scenarioPrice(symbol, step, scenario),
  time: scenarioTime(step, scenario),
  source: "Scenario engine",
  maxLeverage: 20,
  fundingRate: scenario === "funding" ? 0.0003 : 0.0001,
  fundingInterval: 3600000,
});
export async function info(body: unknown) {
  const r = await fetch("https://api.hyperliquid.xyz/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw new Error(`Market data unavailable (${r.status})`);
  return r.json();
}
export function useMarkets() {
  const symbol = useStore((s) => s.symbol),
    bookEnabled = useStore((s) => s.mode === "live");
  const [books, setBooks] = useState<Partial<Record<Symbol, Book>>>({});
  const socket = useRef<WebSocket | null>(null),
    subscription = useRef<Symbol | null>(null),
    selection = useRef({ symbol, bookEnabled });
  selection.current = { symbol, bookEnabled };
  const acceptBook = (raw: unknown) => {
    const coin = (raw as { coin?: string })?.coin;
    const sym = coin?.replace("xyz:", "") as Symbol;
    if (!assets.some((a) => a.symbol === sym)) return;
    const book = parseBook(raw, sym);
    if (!book) return;
    setBooks((prev) =>
      (prev[sym]?.time ?? -1) >= book.time ? prev : { ...prev, [sym]: book },
    );
  };
  const depth = useQuery({
    queryKey: ["book", symbol],
    queryFn: () => info({ type: "l2Book", coin: `xyz:${symbol}` }),
    enabled: bookEnabled,
    refetchInterval: 30000,
    retry: 2,
  });
  useEffect(() => {
    if (depth.data) acceptBook(depth.data);
  }, [depth.data]);
  useEffect(() => {
    const ws = socket.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (subscription.current)
      ws.send(
        JSON.stringify({
          method: "unsubscribe",
          subscription: { type: "l2Book", coin: `xyz:${subscription.current}` },
        }),
      );
    subscription.current = null;
    if (bookEnabled) {
      ws.send(
        JSON.stringify({
          method: "subscribe",
          subscription: { type: "l2Book", coin: `xyz:${symbol}` },
        }),
      );
      subscription.current = symbol;
    }
  }, [symbol, bookEnabled]);
  const enabled = useStore(
    (s) =>
      s.mode === "live" ||
      s.sessions.live.positions.length > 0 ||
      s.sessions.live.orders.length > 0,
  );
  const [quotes, setQuotes] = useState<Partial<Record<Symbol, Quote>>>({});
  const [status, setStatus] = useState("Connecting");
  const [now, setNow] = useState(Date.now());
  const latest = useRef(quotes);
  latest.current = quotes;
  const snapshot = useQuery({
    queryKey: ["markets"],
    enabled,
    queryFn: () => info({ type: "metaAndAssetCtxs", dex: "xyz" }),
    refetchInterval: 30000,
    retry: 2,
  });
  useEffect(() => {
    const data = snapshot.data;
    if (!Array.isArray(data) || !data[0]?.universe) return;
    const next: Partial<Record<Symbol, Quote>> = {};
    data[0].universe.forEach(
      (a: { name: string; maxLeverage: number }, i: number) => {
        const symbol = a.name.replace("xyz:", "") as Symbol;
        if (!assets.some((v) => v.symbol === symbol)) return;
        const ctx = data[1]?.[i],
          price = Number(ctx?.markPx);
        if (!(price > 0)) return;
        next[symbol] = {
          symbol,
          price,
          time: Date.now(),
          source: `Hyperliquid · xyz:${symbol}`,
          maxLeverage: Math.min(50, a.maxLeverage),
          fundingRate: Number(ctx.funding) || 0,
          fundingInterval: 3600000,
        };
      },
    );
    setQuotes((p) => ({ ...p, ...next }));
    Object.values(next).forEach((q) => useStore.getState().quote(q, "live"));
  }, [snapshot.data]);
  useEffect(() => {
    if (!enabled) return;
    let ws: WebSocket | undefined,
      retry: ReturnType<typeof setTimeout>,
      closed = false,
      attempt = 0;
    const connect = () => {
      if (closed) return;
      setStatus(attempt ? "Reconnecting" : "Connecting");
      ws = new WebSocket("wss://api.hyperliquid.xyz/ws");
      socket.current = ws;
      ws.onopen = () => {
        attempt = 0;
        setStatus("Connected");
        snapshot.refetch();
        if (selection.current.bookEnabled) {
          const sym = selection.current.symbol;
          ws?.send(
            JSON.stringify({
              method: "subscribe",
              subscription: { type: "l2Book", coin: `xyz:${sym}` },
            }),
          );
          subscription.current = sym;
        }
        assets.forEach((a) =>
          ws?.send(
            JSON.stringify({
              method: "subscribe",
              subscription: { type: "activeAssetCtx", coin: `xyz:${a.symbol}` },
            }),
          ),
        );
      };
      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data);
          if (m.channel === "l2Book") {
            acceptBook(m.data);
            return;
          }
          if (m.channel !== "activeAssetCtx") return;
          const symbol = m.data.coin.replace("xyz:", "") as Symbol;
          if (!assets.some((a) => a.symbol === symbol)) return;
          const price = Number(m.data.ctx?.markPx);
          if (
            !(price > 0) ||
            Date.now() - (latest.current[symbol]?.time ?? 0) < 1000
          )
            return;
          const q: Quote = {
            symbol,
            price,
            time: Date.now(),
            source: `Hyperliquid · xyz:${symbol}`,
            maxLeverage: latest.current[symbol]?.maxLeverage ?? 20,
            fundingRate: Number(m.data.ctx.funding) || 0,
            fundingInterval: 3600000,
          };
          useStore.getState().quote(q, "live");
          setQuotes((prev) => ({ ...prev, [symbol]: q }));
        } catch {
          /* malformed network message is ignored */
        }
      };
      ws.onerror = () => ws?.close();
      ws.onclose = () => {
        if (closed) return;
        setStatus("Reconnecting");
        retry = setTimeout(connect, Math.min(30000, 1000 * 2 ** attempt++));
      };
    };
    connect();
    const clock = setInterval(() => setNow(Date.now()), 1000);
    const ping = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ method: "ping" }));
    }, 25000);
    return () => {
      closed = true;
      socket.current = null;
      subscription.current = null;
      clearTimeout(retry);
      clearInterval(clock);
      clearInterval(ping);
      ws?.close();
    };
  }, [enabled]);
  useEffect(() => {
    const timer = setInterval(() => {
      const s = useStore.getState();
      if (!s.playing || s.mode !== "scenario") return;
      if (s.step >= 120) {
        s.set({ playing: false });
        return;
      }
      const step = s.step + 1;
      s.set({ step });
      assets.forEach((a) =>
        s.quote(scenarioQuote(a.symbol, step, s.scenario), "scenario"),
      );
    }, 600 / useStore.getState().speed);
    return () => clearInterval(timer);
  }, [useStore((s) => s.speed)]);
  return {
    quotes,
    books,
    status: snapshot.isError && status !== "Connected" ? "Unavailable" : status,
    now,
  };
}
export function useCandles(symbol: Symbol, interval: string, enabled: boolean) {
  return useQuery({
    queryKey: ["candles", symbol, interval],
    queryFn: async () => {
      const ms =
        interval === "1m"
          ? 60000
          : interval === "5m"
            ? 300000
            : interval === "15m"
              ? 900000
              : 3600000;
      const end = Date.now();
      const data = await info({
        type: "candleSnapshot",
        req: {
          coin: `xyz:${symbol}`,
          interval,
          startTime: end - ms * 160,
          endTime: end,
        },
      });
      if (!Array.isArray(data)) throw new Error("No candle data");
      return data
        .map(
          (d: { t: number; o: string; h: string; l: string; c: string }) => ({
            time: Math.floor(d.t / 1000),
            open: +d.o,
            high: +d.h,
            low: +d.l,
            close: +d.c,
          }),
        )
        .filter((d) => d.open > 0 && d.close > 0)
        .sort((a, b) => a.time - b.time);
    },
    enabled,
    staleTime: 60000,
    retry: 1,
  });
}
export function useScenario() {
  const id = useStore((s) => s.scenario);
  return scenarios.find((v) => v.id === id) ?? scenarios[0];
}
