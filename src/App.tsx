import { PositionRow } from "./PositionRow";
import { OrderBook } from "./OrderBook";
import { Range } from "./Range";
import {
  useEffect,
  lazy,
  Suspense,
  useRef,
  useState,
  type ReactNode,
} from "react";
const LazyModal = lazy(() => import("./Modal"));
import { createPortal } from "react-dom";
import { AnimatePresence, m } from "motion/react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Coffee,
  Copy,
  Download,
  ExternalLink,
  Globe2,
  Maximize2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Share2,
  ShieldCheck,
  Star,
  TrendingUp,
  X,
  Zap,
  WifiOff,
  ChevronLeft,
} from "./icons";
import {
  assets,
  cancel,
  close,
  FX,
  gross,
  metrics,
  newSession,
  scenarios,
  submit,
  tradeSchema,
  validateTrade,
  type LedgerEvent,
  type Mode,
  type Symbol,
  type TradeInput,
} from "./engine";
import { scenarioQuote, scenarioTime, useMarkets, useScenario } from "./data";
import { useStore, storageRecovered } from "./store";
import { ScenarioTrace } from "./ScenarioTrace";
const Chart = lazy(() => import("./Chart").then((m) => ({ default: m.Chart })));

function Tip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const trigger = useRef<HTMLButtonElement>(null);
  const show = () => {
    const r = trigger.current?.getBoundingClientRect();
    if (!r) return;
    setPosition({
      top: Math.min(innerHeight - 120, r.bottom + 8),
      left: Math.max(12, Math.min(innerWidth - 252, r.right - 240)),
    });
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const hide = () => setOpen(false);
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [open]);
  return (
    <>
      <button
        ref={trigger}
        className="help"
        type="button"
        aria-label={text}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        onFocus={show}
        onBlur={() => setOpen(false)}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        <CircleHelp size={12} />
      </button>
      {open &&
        createPortal(
          <div
            role="tooltip"
            className="tooltip"
            style={{
              position: "fixed",
              ...position,
              width: 240,
              pointerEvents: "none",
            }}
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}
function Modal(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return props.open ? (
    <Suspense fallback={<div className="modal-overlay" />}>
      <LazyModal {...props} />
    </Suspense>
  ) : null;
}
const money = (value: number, currency: "INR" | "USD", digits = 2) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value * (currency === "INR" ? FX : 1));
const price = (v: number) =>
  v > 0 && Number.isFinite(v)
    ? v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "—";
export default function App() {
  const [railOpen, setRailOpen] = useState(true);
  const state = useStore(),
    {
      mode,
      symbol,
      currency,
      sessions,
      step,
      playing,
      speed,
      scenario,
      favorites,
    } = state;
  const session = sessions[mode];
  const market = useMarkets();
  const selected = assets.find((a) => a.symbol === symbol)!;
  const activeScenario = useScenario();
  const [side, setSide] = useState<"long" | "short">("long"),
    [margin, setMargin] = useState("10000"),
    [leverage, setLeverage] = useState(5),
    [orderType, setOrderType] = useState<"market" | "limit">("market"),
    [limit, setLimit] = useState(""),
    [tp, setTp] = useState(""),
    [sl, setSl] = useState(""),
    [bracket, setBracket] = useState(false),
    [holding, setHolding] = useState(24),
    [outcome, setOutcome] = useState(2.4);
  const [search, setSearch] = useState(""),
    [onlyFav, setOnlyFav] = useState(false),
    [tab, setTab] = useState("positions"),
    [interval, setIntervalValue] = useState("1m"),
    [risk, setRisk] = useState(true),
    [bookOpen, setBookOpen] = useState(true),
    [scenarioOpen, setScenarioOpen] = useState(true),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [modal, setModal] = useState<
      null | "share" | "assumptions" | "reset" | "saved"
    >(null),
    [shared, setShared] = useState<LedgerEvent | null>(null),
    [exporting, setExporting] = useState(false),
    [fullscreen, setFullscreen] = useState(false),
    [pendingScenario, setPendingScenario] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const quote =
    mode === "scenario"
      ? scenarioQuote(symbol, step, scenario)
      : market.quotes[symbol];
  const mark = quote?.price ?? 0;
  const age = quote ? Math.max(0, (market.now - quote.time) / 1000) : Infinity;
  const stale = mode === "live" && age > 15;
  const unavailable = mode === "live" && (!quote || age > 60);
  const max = quote?.maxLeverage ?? 20;
  const entry =
    orderType === "limit" &&
    Number(limit) > 0 &&
    (side === "long" ? mark > Number(limit) : mark < Number(limit))
      ? Number(limit)
      : mark;
  const input: TradeInput = {
    symbol,
    side,
    margin: Number(margin) / (currency === "INR" ? FX : 1),
    leverage,
    type: orderType,
    ...(orderType === "limit" ? { limit: Number(limit) } : {}),
    ...(bracket && tp ? { tp: Number(tp) } : {}),
    ...(bracket && sl ? { sl: Number(sl) } : {}),
  };
  const valid = tradeSchema.safeParse(input).success;
  const estimate = metrics(
    {
      ...input,
      margin: valid ? input.margin : 0,
      type:
        orderType === "limit" &&
        (side === "long" ? mark <= entry : mark >= entry)
          ? "market"
          : orderType,
    },
    entry,
    entry * (1 + outcome / 100),
  );
  const funding =
    ((estimate.notional * (quote?.fundingRate ?? 0.0001) * holding) /
      (quote?.fundingInterval ?? 3600000)) *
    3600000 *
    (side === "long" ? 1 : -1);
  const net = estimate.net - funding;
  const unreachable =
    entry > 0 &&
    (side === "long"
      ? entry * (1 + outcome / 100) <= estimate.liquidation
      : entry * (1 + outcome / 100) >= estimate.liquidation);
  const validation = validateTrade(input, mark, session.cash, max);
  const now = mode === "scenario" ? scenarioTime(step, scenario) : market.now;
  const chartPosition = session.positions.find((p) => p.symbol === symbol);
  const [draftRisk, setDraftRisk] = useState(false);
  const shownPosition = !draftRisk ? chartPosition : undefined;
  const posPrice = (s: Symbol) =>
    mode === "scenario"
      ? scenarioQuote(s, step, scenario).price
      : (market.quotes[s]?.price ?? assets.find((a) => a.symbol === s)!.price);
  const unrealized = session.positions.reduce(
    (v, p) => v + gross(p, posPrice(p.symbol)) - p.funding,
    0,
  );
  const reserved = session.orders.reduce((v, o) => v + o.reserve, 0);
  const equity =
    session.cash +
    session.positions.reduce((v, p) => v + p.margin, 0) +
    reserved +
    unrealized;
  const realized = session.events
    .filter((e) => e.kind !== "Opened")
    .reduce((v, e) => v + e.pnl, 0);
  const notify = (text: string) => {
    setNotice(text);
    setError("");
  };
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    setLeverage((l) => Math.min(l, max));
  }, [max]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    try {
      const value = new URLSearchParams(location.hash.slice(1)).get("setup");
      if (value) {
        const parsed = tradeSchema.safeParse(JSON.parse(atob(value)));
        if (parsed.success) {
          const d = parsed.data;
          state.set({ symbol: d.symbol });
          setSide(d.side);
          setMargin(String(d.margin * FX));
          state.set({ currency: "INR" });
          setLeverage(d.leverage);
          setOrderType(d.type);
          setLimit(d.limit ? String(d.limit) : "");
          setTp(d.tp ? String(d.tp) : "");
          setSl(d.sl ? String(d.sl) : "");
          setBracket(!!(d.tp || d.sl));
          notify(
            "Shared setup loaded. Review it before opening a paper trade.",
          );
        } else
          setError("This shared setup is invalid. Your session was preserved.");
      }
    } catch {
      setError(
        "This setup link could not be read. Your session was preserved.",
      );
    }
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    if (storageRecovered)
      notify(
        "Saved data could not be restored. A fresh practice wallet is ready.",
      );
    const warn = () =>
      setError(
        "Device storage is full or unavailable. This session works, but changes may not survive a refresh.",
      );
    window.addEventListener("mocha-storage-warning", warn);
    return () => window.removeEventListener("mocha-storage-warning", warn);
  }, []);
  const loadScenario = (id: string) => {
    const sc = scenarios.find((s) => s.id === id)!;
    state.set({
      mode: "scenario",
      symbol: sc.symbol,
      scenario: id,
      step: 0,
      playing: false,
      sessions: { ...useStore.getState().sessions, scenario: newSession() },
    });
    setSide(sc.side);
    setLeverage(sc.leverage);
    setMargin(currency === "INR" ? "10000" : String((10000 / FX).toFixed(2)));
    setOrderType("market");
    setBracket(false);
    setTp("");
    setSl("");
    setHolding(id === "funding" ? 48 : 24);
    setOutcome(sc.end * 100);
    setPendingScenario(null);
    notify(`${sc.title} loaded. Open your paper trade, then press play.`);
  };
  const chooseScenario = (id: string) => {
    if (
      session.positions.length ||
      session.orders.length ||
      session.events.length
    ) {
      setPendingScenario(id);
    } else loadScenario(id);
  };
  const changeCurrency = () => {
    const next = currency === "INR" ? "USD" : "INR";
    setMargin(
      String((Number(margin) * (next === "INR" ? FX : 1 / FX)).toFixed(2)),
    );
    state.set({ currency: next });
  };
  const place = () => {
    setError("");
    if (unavailable) {
      setError(
        "The live quote is unavailable or older than 60 seconds. Try a scenario.",
      );
      return;
    }
    if (validation) {
      setError(validation);
      return;
    }
    try {
      state.update((s) => submit(s, input, quote!, now));
      setTab(orderType === "limit" ? "orders" : "positions");
      notify(
        `${symbol} paper ${side} ${orderType === "limit" ? "order submitted" : "position opened"}.`,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const toggleFavorite = (s: Symbol) =>
    state.set({
      favorites: favorites.includes(s)
        ? favorites.filter((v) => v !== s)
        : [...favorites, s],
    });
  const makeLink = () =>
    `${location.origin}${location.pathname}#setup=${encodeURIComponent(btoa(JSON.stringify(input)))}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(makeLink());
      notify("Setup link copied. No portfolio data is included.");
    } catch {
      setError(
        "Clipboard unavailable. Copy the setup URL from the share dialog.",
      );
    }
  };
  const save = () => {
    if (validation) {
      setError(validation);
      return;
    }
    const value = JSON.stringify(input);
    state.set({
      saved: [value, ...state.saved.filter((s) => s !== value)].slice(0, 12),
    });
    notify("Setup saved on this device.");
  };
  const openShare = (e?: LedgerEvent) => {
    if (!e && unreachable) {
      setError(
        "This exit is beyond the liquidation level. Choose a reachable outcome, or share a closed trade from History.",
      );
      return;
    }
    if (!e && validation) {
      setError(validation);
      return;
    }
    setShared(
      e ?? {
        id: "preview",
        time: now,
        symbol,
        side,
        kind: "Scenario preview",
        price: entry * (1 + outcome / 100),
        quantity: estimate.quantity,
        pnl: net,
        fee: estimate.openFee + estimate.closeFee,
        funding,
        margin: input.margin,
        entry,
        leverage,
      },
    );
    setModal("share");
  };
  const download = async (portrait: boolean) => {
    if (!shared) return;
    setExporting(true);
    try {
      const { exportCard } = await import("./export");
      await exportCard(shared, portrait);
      notify("Your simulated result card was downloaded.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(false);
    }
  };
  const visibleAssets = assets.filter(
    (a) =>
      (a.symbol.toLowerCase().includes(search.toLowerCase()) ||
        a.name.toLowerCase().includes(search.toLowerCase())) &&
      (!onlyFav || favorites.includes(a.symbol)),
  );
  return (
    <>
      <div className="app-shell">
        <header className="topbar">
          <a
            className="brand"
            href="https://mochatrade.com/"
            target="_blank"
            rel="noreferrer"
          >
            <img
              src="/brand/mocha-wordmark.svg"
              alt="Mochatrade"
              width="142"
              height="28"
            />
          </a>
          <nav aria-label="Main navigation">
            <h1 className="nav-active">Practice Lab</h1>
            <a href="https://mochatrade.com/" target="_blank" rel="noreferrer">
              Markets
            </a>
            <a
              href="https://mochatrade.com/learn"
              target="_blank"
              rel="noreferrer"
            >
              Learn
            </a>
          </nav>
          <div className="top-actions">
            <span className="practice-label">
              <span className="dot amber" />
              Paper account
            </span>
            <button className="nav-action" onClick={() => setModal("saved")}>
              Saved setups{" "}
              {state.saved.length > 0 && (
                <span className="count">{state.saved.length}</span>
              )}
            </button>
            <button
              className="nav-action"
              onClick={() => setModal("assumptions")}
            >
              Model & fees
            </button>
            <button
              className="currency-button"
              onClick={changeCurrency}
              aria-label={`Display currency ${currency}. Switch currency`}
            >
              {currency === "INR" ? "₹ INR" : "$ USD"}
              <ChevronDown size={12} />
            </button>
          </div>
        </header>
        <main>
          <section className="account-strip" aria-label="Practice account">
<button className="rail-toggle" aria-label={railOpen ? "Collapse watchlist" : "Expand watchlist"} aria-expanded={railOpen} onClick={() => setRailOpen(!railOpen)}>{railOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />} Markets</button>
            <div className="mode-switch">
              <button
                className={mode === "scenario" ? "active" : ""}
                onClick={() => state.set({ mode: "scenario", playing: false })}
              >
                <Zap size={13} />
                Scenarios
              </button>
              <button
                className={mode === "live" ? "active" : ""}
                onClick={() => state.set({ mode: "live", playing: false })}
              >
                <Globe2 size={13} />
                Live reference
              </button>
            </div>
            <div className="account-value">
              <span>
                Virtual equity
                <Tip text="Available funds + reserved margin + open position equity. Each mode has a separate wallet." />
              </span>
              <strong>{money(equity, currency)}</strong>
            </div>
            <div className="account-value">
              <span>Available margin</span>
              <strong>{money(session.cash, currency)}</strong>
            </div>
            <div className="account-value return">
              <span>Realised P&L</span>
              <strong className={realized >= 0 ? "positive" : "negative"}>
                {realized >= 0 ? "+" : ""}
                {money(realized, currency)}
              </strong>
            </div>
            <button
              className="icon-button reset-button"
              title="Reset current practice wallet"
              aria-label="Reset current practice wallet"
              onClick={() => setModal("reset")}
            >
              <RotateCcw size={15} />
            </button>
          </section>
          <div className={`terminal ${fullscreen ? "terminal-expanded" : ""} ${railOpen ? "" : "rail-collapsed"}`}>
            <aside className="market-rail">
              <div className="rail-title">
                <h2>Watchlist</h2>
                <button
                  className={`icon-button ${onlyFav ? "accent" : ""}`}
                  aria-label={
                    onlyFav ? "Show all markets" : "Show favourites only"
                  }
                  onClick={() => setOnlyFav(!onlyFav)}
                >
                  <Star size={14} fill={onlyFav ? "currentColor" : "none"} />
                </button>
              </div>
              <label className="search">
                <Search size={14} />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find a market"
                  aria-label="Search markets"
                />
                <kbd>/</kbd>
              </label>
              <div className="rail-section">
                US STOCK PERPS <span>4</span>
              </div>
              <div className="asset-list">
                {visibleAssets.map((a) => {
                  const q =
                    mode === "scenario"
                      ? scenarioQuote(a.symbol, step, scenario)
                      : market.quotes[a.symbol];
                  const delta = q ? (q.price / a.price - 1) * 100 : 0;
                  return (
                    <div
                      className={`asset-row ${symbol === a.symbol ? "selected" : ""}`}
                      key={a.symbol}
                    >
                      <button
                        className="asset-select"
                        onClick={() => {
                          state.set({ symbol: a.symbol });
                          setLimit("");
                          setTp("");
                          setSl("");
                          setError("");
                        }}
                      >
                        <span className="asset-logo">
                          <img
                            src={`/brand/${a.symbol.toLowerCase()}.svg`}
                            alt=""
                            width="20"
                            height="20"
                          />
                        </span>
                        <span className="asset-identity">
                          <strong>
                            {a.symbol}
                            <small>{a.name}</small>
                          </strong>
                        </span>
                        <span className="asset-price">
                          {q ? "$" + price(q.price) : "—"}
                          <small
                            className={delta >= 0 ? "positive" : "negative"}
                          >
                            {mode === "scenario"
                              ? `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}%`
                              : "Reference"}
                          </small>
                        </span>
                      </button>
                      <button
                        className={`fav ${favorites.includes(a.symbol) ? "is-fav" : ""}`}
                        onClick={() => toggleFavorite(a.symbol)}
                        aria-label={`${favorites.includes(a.symbol) ? "Unfavourite" : "Favourite"} ${a.symbol}`}
                      >
                        <Star
                          size={11}
                          fill={
                            favorites.includes(a.symbol)
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    </div>
                  );
                })}
                {!visibleAssets.length && (
                  <div className="rail-empty">
                    No matching markets.
                    <button
                      onClick={() => {
                        setSearch("");
                        setOnlyFav(false);
                      }}
                    >
                      Show all four
                    </button>
                  </div>
                )}
              </div>
              <dl className="market-details">
                <div>
                  <dt>Settlement</dt>
                  <dd>INR</dd>
                </div>
                <div>
                  <dt>Conversion</dt>
                  <dd>₹90 / $1</dd>
                </div>
                <div>
                  <dt>Margin</dt>
                  <dd>Isolated</dd>
                </div>
              </dl>
            </aside>
            <section className="chart-section" aria-label="Market chart">
              <div className="market-header">
                <span className="asset-logo big">
                  <img
                    src={`/brand/${symbol.toLowerCase()}.svg`}
                    alt=""
                    width="27"
                    height="27"
                  />
                </span>
                <div className="market-name">
                  <h2>
                    {symbol}
                    <span>PERP</span>
                  </h2>
                  <small>{selected.name} / US Dollar</small>
                </div>
                <div className="current-price">
                  <strong>${price(mark)}</strong>
                  <small
                    className={
                      mode === "scenario"
                        ? mark >= selected.price
                          ? "positive"
                          : "negative"
                        : "muted"
                    }
                  >
                    {mode === "scenario"
                      ? `${(mark / selected.price - 1) * 100 >= 0 ? "+" : ""}${((mark / selected.price - 1) * 100).toFixed(2)}% this scenario`
                      : "Hyperliquid reference"}
                  </small>
                </div>
                <div className="market-stat">
                  <span>
                    Funding / 1h
                    <Tip text="Positive funding: longs pay shorts. Live rates can change; scenario projections assume a constant rate." />
                  </span>
                  <strong>
                    {((quote?.fundingRate ?? 0.0001) * 100).toFixed(4)}%
                  </strong>
                </div>
                <div className="market-stat max-stat">
                  <span>Max. leverage</span>
                  <strong>{max}×</strong>
                </div>
              </div>
              <div className="chart-toolbar">
                <div className="timeframes">
                  {["1m", "5m", "15m", "1h"].map((t) => (
                    <button
                      key={t}
                      className={interval === t ? "active" : ""}
                      onClick={() => setIntervalValue(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <span className="toolbar-divider" />
                <button
                  aria-label="Toggle risk overlays"
                  aria-pressed={risk}
                  className={`text-button risk-toggle ${risk ? "accent" : ""}`}
                  onClick={() => setRisk(!risk)}
                >
                  <ShieldCheck size={13} />
                  <span>Risk overlays</span>
                </button>
                <div className="chart-toolbar-right">
                  <button
                    className={`book-toggle ${bookOpen ? "active" : ""}`}
                    aria-pressed={bookOpen}
                    onClick={() => setBookOpen(!bookOpen)}
                  >
                    Order book
                  </button>
                  <span className="data-badge">
                    <span
                      className={`dot ${unavailable ? "red" : stale ? "amber" : ""}`}
                    />
                    {mode === "scenario"
                      ? "EXAMPLE DATA"
                      : unavailable
                        ? "FEED UNAVAILABLE"
                        : stale
                          ? "STALE QUOTE"
                          : "LIVE REFERENCE"}
                  </span>
                  <button
                    className="icon-button"
                    aria-label={
                      fullscreen
                        ? "Exit expanded chart"
                        : "Expand chart workspace"
                    }
                    onClick={() => setFullscreen(!fullscreen)}
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>
              </div>
              <div className="chart-label">
                <span>
                  {symbol} · {interval} ·{" "}
                  {mode === "scenario" ? "Scenario replay" : "Hyperliquid xyz"}
                </span>
                <span className="muted">
                  USD · {shownPosition ? "POSITION RISK" : "NEW TRADE PREVIEW"}
                  {chartPosition && (
                    <button
                      className="risk-source"
                      onClick={() => setDraftRisk(!draftRisk)}
                    >
                      {draftRisk ? "View position" : "Preview draft"}
                    </button>
                  )}
                </span>
              </div>
              <div className={`chart-stage ${bookOpen ? "with-book" : ""}`}>
                <Suspense
                  fallback={
                    <div className="chart-canvas chart-loading">
                      Preparing your chart…
                    </div>
                  }
                >
                  <Chart
                    mark={mark}
                    symbol={symbol}
                    mode={mode}
                    scenario={scenario}
                    step={step}
                    interval={interval}
                    entry={shownPosition?.entry ?? entry}
                    liquidation={
                      shownPosition
                        ? metrics(
                            shownPosition,
                            shownPosition.entry,
                            mark,
                            shownPosition.funding,
                          ).liquidation
                        : estimate.liquidation
                    }
                    tp={
                      shownPosition?.tp ??
                      (bracket && Number(tp) > 0 ? Number(tp) : undefined)
                    }
                    sl={
                      shownPosition?.sl ??
                      (bracket && Number(sl) > 0 ? Number(sl) : undefined)
                    }
                    side={shownPosition?.side ?? side}
                    showRisk={risk}
                    onPrice={(v) =>
                      setOutcome(
                        Math.max(-99, Math.min(100, (v / entry - 1) * 100)),
                      )
                    }
                  />
                </Suspense>
                {bookOpen && (
                  <OrderBook
                    symbol={symbol}
                    mode={mode}
                    price={mark}
                    step={step}
                    book={market.books[symbol]}
                    now={market.now}
                    onPrice={(price) => {
                      setOrderType("limit");
                      setLimit(price.toFixed(2));
                      setError("");
                      notify(
                        "Limit price selected from the order book. Review before submitting.",
                      );
                    }}
                  />
                )}
              </div>
              <div className="chart-footer">
                <span>
                  {mode === "scenario" ? (
                    <>
                      Illustrative price path · <span>not historical data</span>
                    </>
                  ) : (
                    <>
                      {quote?.source ?? "Connecting to Hyperliquid"} ·{" "}
                      {quote ? `${Math.floor(age)}s ago` : "awaiting quote"}
                    </>
                  )}
                </span>
                <a
                  href="https://www.tradingview.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Charts by TradingView <ArrowUpRight size={10} />
                </a>
              </div>
              <div className="scenario-desk">
                <button
                  className="scenario-heading"
                  onClick={() => setScenarioOpen(!scenarioOpen)}
                  aria-expanded={scenarioOpen}
                >
                  <span>
                    <Zap size={14} />
                    Scenario tape
                  </span>
                  <ChevronDown
                    size={15}
                    className={scenarioOpen ? "" : "rotate"}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {scenarioOpen && (
                    <m.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="scenario-body"
                    >
                      <div className="scenario-presets">
                        {scenarios.map((sc, i) => (
                          <button
                            key={sc.id}
                            className={
                              mode === "scenario" && scenario === sc.id
                                ? "chosen"
                                : ""
                            }
                            onClick={() => chooseScenario(sc.id)}
                          >
                            <ScenarioTrace id={sc.id} />
                            <strong>{sc.title}</strong>
                            <small>{sc.subtitle}</small>
                            {mode === "scenario" && scenario === sc.id && (
                              <span className="chosen-dot" />
                            )}
                          </button>
                        ))}
                      </div>
                      {mode === "scenario" && (
                        <div className="replay">
                          <button
                            className="play-button"
                            aria-label={
                              playing ? "Pause scenario" : "Play scenario"
                            }
                            onClick={() => {
                              if (step >= 120) {
                                notify(
                                  "Replay finished. Reset this scenario to run it again.",
                                );
                                return;
                              }
                              state.set({ playing: !playing });
                            }}
                            disabled={step >= 120}
                          >
                            {playing ? (
                              <Pause size={13} fill="currentColor" />
                            ) : (
                              <Play size={13} fill="currentColor" />
                            )}
                          </button>
                          <div className="replay-track">
                            <span style={{ width: `${(step / 120) * 100}%` }} />
                          </div>
                          <span className="replay-time">
                            {Math.floor(
                              (step / 120) * (scenario === "funding" ? 48 : 60),
                            )}
                            {scenario === "funding" ? "h" : "m"} /{" "}
                            {scenario === "funding" ? "48h" : "1h"}
                          </span>
                          <button
                            className="speed-button"
                            onClick={() =>
                              state.set({
                                speed: speed === 1 ? 2 : speed === 2 ? 4 : 1,
                              })
                            }
                            aria-label={`Replay speed ${speed} times. Change speed`}
                          >
                            {speed}×
                          </button>
                          <button
                            className="icon-button"
                            aria-label="Restart scenario"
                            onClick={() => chooseScenario(scenario)}
                          >
                            <RotateCcw size={13} />
                          </button>
                        </div>
                      )}
                      <p className="scenario-description">
                        {mode === "scenario"
                          ? activeScenario.description
                          : "Live reference mode uses public venue quotes. Choose a scenario to explore a repeatable price path."}
                      </p>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
              <section className="outcome-bar">
                <div className="outcome-title">
                  <div>
                    <h2>Outcome calculator</h2>
                    <p>Estimated exit, fees and funding</p>
                  </div>
                </div>
                <div className="outcome-control">
                  <label htmlFor="outcome">
                    Price change{" "}
                    <strong>
                      {outcome >= 0 ? "+" : ""}
                      {outcome.toFixed(1)}%
                    </strong>
                  </label>
                  <Range
                    id="outcome"
                    type="range"
                    min="-10"
                    max="10"
                    step="0.1"
                    value={Math.max(-10, Math.min(10, outcome))}
                    onChange={(e) => setOutcome(+e.target.value)}
                  />
                </div>
                <div className="holding">
                  <label htmlFor="holding">Hold for</label>
                  <select
                    id="holding"
                    value={holding}
                    onChange={(e) => setHolding(+e.target.value)}
                  >
                    <option value={1}>1 hour</option>
                    <option value={24}>24 hours</option>
                    <option value={48}>48 hours</option>
                    <option value={168}>7 days</option>
                  </select>
                </div>
                <div className="outcome-result">
                  <span>
                    Estimated net P&L
                    <Tip text="Hypothetical exit, constant funding, taker closing fee. If the path crosses liquidation first, this outcome may not be reachable." />
                  </span>
                  <strong className={net >= 0 ? "positive" : "negative"}>
                    {unreachable
                      ? "Would liquidate"
                      : (net >= 0 ? "+" : "") + money(net, currency)}
                  </strong>
                  <small>
                    {money(funding, currency)} estimated funding · {holding}h
                  </small>
                </div>
                <button
                  className="icon-button share-outcome"
                  aria-label="Share hypothetical outcome"
                  disabled={!valid}
                  onClick={() => openShare()}
                >
                  <Share2 size={17} />
                </button>
              </section>
            </section>
            <aside
              className="trade-ticket"
              aria-label="Configure a paper trade"
            >
              <div className="ticket-heading">
                <h2>Order ticket</h2>
                <span>
                  ISOLATED
                  <Tip text="Each position uses its own margin. The demo caps position losses at posted margin; fees are accounted for separately." />
                </span>
              </div>
              <div className="side-toggle">
                <button
                  className={side === "long" ? "long-active" : ""}
                  onClick={() => {
                    setSide("long");
                    setTp("");
                    setSl("");
                  }}
                >
                  <ArrowUpRight size={15} />
                  Long
                </button>
                <button
                  className={side === "short" ? "short-active" : ""}
                  onClick={() => {
                    setSide("short");
                    setTp("");
                    setSl("");
                  }}
                >
                  <ArrowDownLeft size={15} />
                  Short
                </button>
              </div>
              <div className="order-tabs">
                {(["market", "limit"] as const).map((t) => (
                  <button
                    key={t}
                    className={orderType === t ? "active" : ""}
                    onClick={() => {
                      setOrderType(t);
                      if (t === "limit" && !limit) setLimit(mark.toFixed(2));
                    }}
                  >
                    {t === "market" ? "Market" : "Limit"}
                  </button>
                ))}
                <Tip text="Market fills use the current model quote. GTC limits wait until crossed; there are no partial fills or queue simulation." />
              </div>
              {orderType === "limit" && (
                <label className="field-label">
                  Limit price <span>USD · GTC</span>
                  <div className="input-box">
                    <span>$</span>
                    <input
                      value={limit}
                      onChange={(e) => setLimit(e.target.value)}
                      inputMode="decimal"
                      aria-label="Limit price in USD"
                    />
                  </div>
                </label>
              )}
              <label className="field-label">
                Margin{" "}
                <span>
                  {currency}{" "}
                  <Tip text="Your isolated collateral. The opening fee is paid separately from available virtual funds." />
                </span>
                <div className="input-box margin-input">
                  <span>{currency === "INR" ? "₹" : "$"}</span>
                  <input
                    inputMode="decimal"
                    value={margin}
                    onChange={(e) => {
                      setMargin(e.target.value);
                      setError("");
                    }}
                    aria-label={`Margin in ${currency}`}
                  />
                  <small>{currency}</small>
                </div>
              </label>
              <div className="margin-presets">
                {[5000, 10000, 25000].map((v) => (
                  <button
                    key={v}
                    onClick={() =>
                      setMargin(
                        currency === "INR" ? String(v) : (v / FX).toFixed(2),
                      )
                    }
                  >
                    {currency === "INR"
                      ? `₹${v / 1000}k`
                      : `$${(v / FX).toFixed(0)}`}
                  </button>
                ))}
                <button
                  onClick={() =>
                    setMargin(
                      (
                        (session.cash / (1 + leverage * 0.0005)) *
                        (currency === "INR" ? FX : 1) *
                        0.999
                      ).toFixed(2),
                    )
                  }
                >
                  Max
                </button>
              </div>
              <div className="leverage-label">
                <label htmlFor="leverage">Leverage</label>
                <strong>
                  {leverage}
                  <span>×</span>
                </strong>
              </div>
              <Range
                id="leverage"
                type="range"
                min={1}
                max={max}
                step={1}
                value={leverage}
                onChange={(e) => setLeverage(+e.target.value)}
                className="leverage-slider"
                style={
                  {
                    "--progress": `${((leverage - 1) / (max - 1)) * 100}%`,
                  } as React.CSSProperties
                }
              />
              <div className="leverage-ticks">
                {[1, 5, 10, max]
                  .filter((v, i, a) => a.indexOf(v) === i && v <= max)
                  .map((v) => (
                    <button key={v} onClick={() => setLeverage(v)}>
                      {v}×
                    </button>
                  ))}
              </div>
              <div className="buying-power">
                <span>Position value</span>
                <strong>{money(estimate.notional, currency)}</strong>
              </div>
              <label className="bracket-toggle">
                <input
                  type="checkbox"
                  checked={bracket}
                  onChange={(e) => setBracket(e.target.checked)}
                />
                <span>Take profit / Stop loss</span>
                <Tip text="Triggered exits fill at the next model quote, which may be worse than the trigger. Liquidation is evaluated first." />
              </label>
              {bracket && (
                <div className="bracket-fields">
                  <label>
                    Take profit ($)
                    <input
                      aria-label="Take profit in USD"
                      placeholder={(
                        entry * (side === "long" ? 1.05 : 0.95)
                      ).toFixed(2)}
                      value={tp}
                      onChange={(e) => setTp(e.target.value)}
                      inputMode="decimal"
                    />
                  </label>
                  <label>
                    Stop loss ($)
                    <input
                      aria-label="Stop loss in USD"
                      placeholder={(
                        entry * (side === "long" ? 0.98 : 1.02)
                      ).toFixed(2)}
                      value={sl}
                      onChange={(e) => setSl(e.target.value)}
                      inputMode="decimal"
                    />
                  </label>
                </div>
              )}
              <div className="trade-summary">
                <div>
                  <span>Entry price</span>
                  <strong>${price(entry)}</strong>
                </div>
                <div>
                  <span>
                    Est. liquidation
                    <Tip text="Illustrative 0.5% maintenance margin plus closing fee. Not Mocha’s published execution model. Funding can move this threshold." />
                  </span>
                  <strong className="liquidation">
                    ${price(estimate.liquidation)}
                  </strong>
                </div>
                <div>
                  <span>
                    Opening fee
                    <Tip text="Market/taking orders: 0.05%. Resting limit fills: 0.02%. Immediately crossing limits are treated as takers." />
                  </span>
                  <strong>{money(estimate.openFee, currency)}</strong>
                </div>
                <div>
                  <span>Margin buffer</span>
                  <strong>
                    {entry > 0
                      ? (
                          (Math.abs(entry - estimate.liquidation) / entry) *
                          100
                        ).toFixed(2)
                      : "—"}
                    %
                  </strong>
                </div>
              </div>
              <div className={`risk-note ${leverage >= 15 ? "higher" : ""}`}>
                <ShieldCheck size={14} />
                <span>
                  {leverage >= 15
                    ? "High leverage · narrow liquidation buffer"
                    : "Opening fee is charged separately."}
                </span>
              </div>
              <button
                className={`primary trade-submit ${side === "short" ? "short" : ""}`}
                onClick={place}
                disabled={unavailable}
              >
                {side === "long" ? (
                  <ArrowUpRight size={16} />
                ) : (
                  <ArrowDownLeft size={16} />
                )}
                Open paper {side}
                <ArrowRight size={15} />
              </button>
              <p className="ticket-disclaimer">
                Simulated execution · No real funds
              </p>
              <div className="ticket-secondary">
                <button className="text-button" onClick={save}>
                  <Bookmark size={13} />
                  Save setup
                </button>
                <button
                  className="text-button"
                  disabled={!valid}
                  onClick={() => openShare()}
                >
                  <Share2 size={13} />
                  Share
                </button>
              </div>
            </aside>
            <section className="ledger">
              <div className="ledger-top">
                <div className="ledger-tabs">
                  {[
                    ["positions", "Positions", session.positions.length],
                    ["orders", "Open orders", session.orders.length],
                    ["history", "History", session.events.length],
                  ].map(([id, label, count]) => (
                    <button
                      key={id}
                      className={tab === id ? "active" : ""}
                      onClick={() => setTab(String(id))}
                    >
                      {label}
                      <span>{count}</span>
                    </button>
                  ))}
                </div>
                <span className="ledger-caption">
                  <span className="dot amber" />
                  Paper account
                </span>
              </div>
              <div className="ledger-scroll">
                <table>
                  <thead>
                    <tr>
                      {[
                        "Market / side",
                        "Size",
                        "Entry",
                        "Mark / exit",
                        "Net P&L",
                        "Margin",
                        "Actions",
                      ].map((v) => (
                        <th key={v}>{v}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tab === "positions" &&
                      session.positions.map((p) => {
                        const px = posPrice(p.symbol),
                          pnl =
                            gross(p, px) -
                            p.funding -
                            p.openingFee -
                            p.quantity * px * 0.0005;
                        return (
                          <PositionRow
                            key={p.id}
                            pnl={pnl}
                            displayValue={Math.round(
                              pnl * (currency === "INR" ? FX : 1) * 100,
                            )}
                            active={
                              mode === "scenario" ||
                              !!(
                                market.quotes[p.symbol] &&
                                market.now - market.quotes[p.symbol]!.time <
                                  15000
                              )
                            }
                          >
                            <td>
                              <strong>{p.symbol}</strong>
                              <small
                                className={
                                  p.side === "long" ? "positive" : "negative"
                                }
                              >
                                {p.side.toUpperCase()} · {p.leverage}×
                              </small>
                            </td>
                            <td>
                              {p.quantity.toFixed(4)}
                              <small>shares equiv.</small>
                            </td>
                            <td>${price(p.entry)}</td>
                            <td>${price(px)}</td>
                            <td className={pnl >= 0 ? "positive" : "negative"}>
                              {pnl >= 0 ? "+" : ""}
                              {money(pnl, currency)}
                              <small>
                                {((pnl / p.margin) * 100).toFixed(2)}%
                              </small>
                            </td>
                            <td>
                              {money(p.margin, currency)}
                              <small>isolated</small>
                            </td>
                            <td>
                              <div className="row-actions">
                                <button
                                  disabled={
                                    mode === "live" &&
                                    (!market.quotes[p.symbol] ||
                                      market.now -
                                        market.quotes[p.symbol]!.time >
                                        60000)
                                  }
                                  onClick={() => {
                                    state.update((s) =>
                                      close(
                                        s,
                                        p.id,
                                        px,
                                        now,
                                        0.5,
                                        "Partial close",
                                      ),
                                    );
                                    notify(
                                      "Half the position closed. Attached exits protect the remaining half.",
                                    );
                                  }}
                                >
                                  Close 50%
                                </button>
                                <button
                                  disabled={
                                    mode === "live" &&
                                    (!market.quotes[p.symbol] ||
                                      market.now -
                                        market.quotes[p.symbol]!.time >
                                        60000)
                                  }
                                  onClick={() => {
                                    state.update((s) =>
                                      close(s, p.id, px, now),
                                    );
                                    notify(
                                      "Paper position closed. View the result in History.",
                                    );
                                  }}
                                >
                                  Close
                                </button>
                              </div>
                            </td>
                          </PositionRow>
                        );
                      })}
                    {tab === "orders" &&
                      session.orders.map((o) => (
                        <tr key={o.id}>
                          <td>
                            <strong>{o.symbol}</strong>
                            <small
                              className={
                                o.side === "long" ? "positive" : "negative"
                              }
                            >
                              {o.side.toUpperCase()} · GTC
                            </small>
                          </td>
                          <td>{metrics(o, o.limit!).quantity.toFixed(4)}</td>
                          <td>${price(o.limit!)}</td>
                          <td>${price(posPrice(o.symbol))}</td>
                          <td>Pending</td>
                          <td>
                            {money(o.reserve, currency)}
                            <small>reserved incl. fee</small>
                          </td>
                          <td>
                            <button
                              className="row-button"
                              onClick={() => {
                                state.update((s) => cancel(s, o.id));
                                notify(
                                  "Order cancelled. Reserved margin released.",
                                );
                              }}
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      ))}
                    {tab === "history" &&
                      session.events.map((e) => (
                        <tr key={e.id}>
                          <td>
                            <strong>{e.symbol}</strong>
                            <small>
                              {e.kind} · {e.side}
                            </small>
                          </td>
                          <td>{e.quantity.toFixed(4)}</td>
                          <td>${price(e.entry)}</td>
                          <td>${price(e.price)}</td>
                          <td className={e.pnl >= 0 ? "positive" : "negative"}>
                            {e.kind === "Opened" ? "—" : money(e.pnl, currency)}
                            <small>
                              {e.kind === "Opened"
                                ? `Fee ${money(e.fee, currency)}`
                                : `Fees ${money(e.fee, currency)}`}
                            </small>
                          </td>
                          <td>{money(e.margin, currency)}</td>
                          <td>
                            {e.kind !== "Opened" && (
                              <button
                                className="row-button"
                                onClick={() => openShare(e)}
                              >
                                <Share2 size={12} />
                                Share result
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {((tab === "positions" && !session.positions.length) ||
                  (tab === "orders" && !session.orders.length) ||
                  (tab === "history" && !session.events.length)) && (
                  <div className="empty-ledger">
                    <div>
                      <strong>
                        {tab === "positions"
                          ? "No open positions"
                          : tab === "orders"
                            ? "No pending orders"
                            : "No trade history"}
                      </strong>
                      <p>
                        {tab === "positions"
                          ? "Choose a market and submit a paper order to start."
                          : tab === "orders"
                            ? "Unfilled limit orders appear here until filled or cancelled."
                            : "Completed trades and execution costs will appear here."}
                      </p>
                    </div>
                    {tab === "positions" && (
                      <button
                        className="text-button accent"
                        onClick={() =>
                          document
                            .querySelector(".trade-ticket")
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            })
                        }
                      >
                        Build a trade <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          {unreachable && (
            <p className="outcome-warning">
              This exit is beyond the estimated liquidation level. The position
              would normally close earlier; the preview is hypothetical.
            </p>
          )}
          <footer className="app-footer">
            <span>
              <span
                className={`dot ${mode === "live" && (unavailable || stale) ? "amber" : ""}`}
              />
              {mode === "scenario" ? "Scenario engine ready" : market.status}{" "}
              <span className="footer-divider">/</span> ₹90 = $1 fixed display
              conversion
            </span>
            <span>
              Independent concept{" "}
              <a
                href="https://mochatrade.com/"
                target="_blank"
                rel="noreferrer"
              >
                mochatrade.com <ArrowUpRight size={11} />
              </a>
            </span>
          </footer>
          <div className="concept-note">
            Independent concept demo. Prices, fills and liquidation estimates
            are educational models. No real funds or orders.
          </div>
        </main>
        <AnimatePresence>
          {notice && (
            <m.div
              role="status"
              className="toast"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <Check size={16} />
              {notice}
              <button
                onClick={() => setNotice("")}
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </m.div>
          )}
        </AnimatePresence>
        {error && (
          <div role="alert" className="error-toast">
            <CircleHelp size={16} />
            {error}
            <button onClick={() => setError("")} aria-label="Dismiss error">
              <X size={14} />
            </button>
          </div>
        )}
        <Modal
          open={modal === "assumptions"}
          onOpenChange={() => setModal(null)}
          title="Model & fees"
          description="Practice Lab is an independent concept inspired by Mochatrade. All balances and executions are simulated."
        >
          <div className="assumption-list">
            <div>
              <ShieldCheck />
              <section>
                <h3>Isolated, virtual margin</h3>
                <p>
                  Each mode starts with ₹1,00,000. Margin is reserved per trade.
                  Opening fees are paid separately; modeled position losses are
                  capped at posted collateral.
                </p>
              </section>
            </div>
            <div>
              <Settings2 />
              <section>
                <h3>Execution assumptions</h3>
                <p>
                  Illustrative maintenance margin: 0.5%. Market fees: 0.05% per
                  side. Resting limit entry: 0.02%. Exits: 0.05%. Liquidation
                  includes a closing fee; no extra liquidation penalty is
                  modeled. These are not Mocha’s exact liquidation rules.
                </p>
              </section>
            </div>
            <div>
              <Globe2 />
              <section>
                <h3>Reference data</h3>
                <p>
                  Live mode uses Hyperliquid xyz US-stock perpetual quotes, not
                  verified Mocha prices. Scenario paths are generated examples,
                  not historical prices. Funding is hourly in this demo;
                  projections hold the current rate constant.
                </p>
              </section>
            </div>
            <div>
              <Coffee />
              <section>
                <h3>Currency conversion</h3>
                <p>
                  ₹90/USD is the fixed conversion documented by Mocha. Switching
                  currency only changes the display. Prices on the chart remain
                  in USD.
                </p>
              </section>
            </div>
          </div>
          <div className="modal-links">
            <a
              href="https://mochatrade.com/support"
              target="_blank"
              rel="noreferrer"
            >
              Mocha support <ArrowUpRight size={13} />
            </a>
            <a
              href="https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api"
              target="_blank"
              rel="noreferrer"
            >
              Data source <ArrowUpRight size={13} />
            </a>
          </div>
        </Modal>
        <Modal
          open={modal === "reset" || pendingScenario !== null}
          onOpenChange={() => {
            setModal(null);
            setPendingScenario(null);
          }}
          title={
            pendingScenario
              ? "Start a fresh scenario?"
              : "Reset this practice account?"
          }
          description={`This clears ${pendingScenario ? "the scenario" : mode} positions, pending orders and history, and restores ₹1,00,000. Your other mode and saved setups are preserved.`}
        >
          <div className="modal-buttons">
            <button
              className="quiet-button"
              onClick={() => {
                setModal(null);
                setPendingScenario(null);
              }}
            >
              Keep practising
            </button>
            <button
              className="primary"
              onClick={() => {
                if (pendingScenario) loadScenario(pendingScenario);
                else {
                  state.reset();
                  notify("Practice account reset. A fresh start.");
                }
                setModal(null);
              }}
            >
              Reset & {pendingScenario ? "load example" : "start fresh"}
            </button>
          </div>
        </Modal>
        <Modal
          open={modal === "saved"}
          onOpenChange={() => setModal(null)}
          title="Your saved setups"
          description="Trade parameters saved on this device. Load a setup to review it before submitting."
        >
          <div className="saved-list">
            {state.saved.length ? (
              state.saved.map((raw, i) => {
                let d: TradeInput;
                try {
                  d = tradeSchema.parse(JSON.parse(raw));
                } catch {
                  return null;
                }
                return (
                  <div key={raw}>
                    <Bookmark size={18} />
                    <span>
                      <strong>
                        {d.symbol} · {d.side} · {d.leverage}×
                      </strong>
                      <small>
                        {money(d.margin, currency)} margin · {d.type}
                      </small>
                    </span>
                    <button
                      className="quiet-button"
                      onClick={() => {
                        state.set({ symbol: d.symbol });
                        setSide(d.side);
                        setLeverage(d.leverage);
                        setMargin(
                          (d.margin * (currency === "INR" ? FX : 1)).toFixed(2),
                        );
                        setOrderType(d.type);
                        setLimit(d.limit ? String(d.limit) : "");
                        setBracket(!!(d.tp || d.sl));
                        setTp(d.tp ? String(d.tp) : "");
                        setSl(d.sl ? String(d.sl) : "");
                        setModal(null);
                        notify("Saved setup loaded for review.");
                      }}
                    >
                      Load
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Delete saved ${d.symbol} setup`}
                      onClick={() =>
                        state.set({
                          saved: state.saved.filter((_, n) => n !== i),
                        })
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="saved-empty">
                <Bookmark size={28} />
                <p>Build a trade, then choose “Save setup” to keep it here.</p>
              </div>
            )}
          </div>
        </Modal>
        <Modal
          open={modal === "share"}
          onOpenChange={() => setModal(null)}
          title="Export paper trade"
          description="PNG exports include fees, funding and a simulated-result label."
        >
          {shared && (
            <>
              <div className="share-card">
                <div className="share-brand">
                  <img
                    src="/brand/mocha-wordmark.svg"
                    alt="Mochatrade"
                    width="128"
                    height="25"
                  />
                  <small>PRACTICE LAB</small>
                </div>
                <p>
                  {shared.kind === "Scenario preview"
                    ? "Hypothetical outcome"
                    : "Paper trade result"}
                </p>
                <span className="share-market">
                  {shared.symbol} / {shared.side.toUpperCase()} /{" "}
                  {shared.leverage}×
                </span>
                <strong className={shared.pnl >= 0 ? "positive" : "negative"}>
                  {shared.pnl >= 0 ? "+" : ""}
                  {money(shared.pnl, currency)}
                </strong>
                <span className="share-return">
                  {((shared.pnl / shared.margin) * 100).toFixed(2)}% net return
                  on margin
                </span>
                <div className="share-details">
                  <span>ENTRY ${price(shared.entry)}</span>
                  <ArrowRight size={13} />
                  <span>EXIT ${price(shared.price)}</span>
                </div>
                <div className="share-watermark">
                  SIMULATED RESULT · VIRTUAL FUNDS
                  <br />
                  <small>
                    Includes modeled fees & funding · ₹90/USD · Independent
                    concept
                  </small>
                </div>
              </div>
              <div className="export-buttons">
                <button
                  className="primary"
                  disabled={exporting}
                  onClick={() => download(false)}
                >
                  <Download size={15} />
                  {exporting ? "Rendering…" : "Square PNG"}
                </button>
                <button
                  className="quiet-button"
                  disabled={exporting}
                  onClick={() => download(true)}
                >
                  <Download size={15} />
                  Portrait PNG
                </button>
                <button className="quiet-button" onClick={copy}>
                  <Copy size={15} />
                  Copy setup
                </button>
              </div>
              <label className="share-link-label">
                Setup link
                <input
                  readOnly
                  value={makeLink()}
                  onFocus={(e) => e.target.select()}
                />
              </label>
            </>
          )}
        </Modal>
      </div>
    </>
  );
}
