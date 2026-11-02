import { useState } from "react";
import { aggregate, exampleBook, type Book } from "./book";
import type { Mode, Symbol } from "./engine";
export function OrderBook({
  symbol,
  mode,
  price,
  step,
  book,
  now,
  onPrice,
}: {
  symbol: Symbol;
  mode: Mode;
  price: number;
  step: number;
  book?: Book;
  now: number;
  onPrice: (price: number) => void;
}) {
  const [group, setGroup] = useState(0.01);
  const data = mode === "scenario" ? exampleBook(symbol, price, step) : book;
  const age = data ? now - data.receivedAt : Infinity;
  const stale = mode === "live" && age > 15000;
  const bids = aggregate(data?.bids ?? [], group, "bid"),
    asks = aggregate(data?.asks ?? [], group, "ask");
  const bidTotal = bids.at(-1)?.total ?? 0,
    askTotal = asks.at(-1)?.total ?? 0,
    total = bidTotal + askTotal;
  const balance = total ? (bidTotal / total) * 100 : 50;
  const spread =
    data?.asks[0] && data?.bids[0]
      ? data.asks[0].price - data.bids[0].price
      : null;
  const max = Math.max(bidTotal, askTotal, 1);
  const fmt = (v: number) =>
    v.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    });
  const rows = (levels: ReturnType<typeof aggregate>, side: "bid" | "ask") => (
    <div className={`book-levels ${side}`}>
      {levels.length ? (
        levels.map((l) => (
          <button
            key={l.price}
            className="book-row"
            disabled={mode === "live" && age > 60000}
            onClick={() => onPrice(l.price)}
            title={`Set limit price to $${l.price.toFixed(2)}; size is share-equivalent`}
            aria-label={`${l.price.toFixed(2)} ${fmt(l.size)} ${fmt(l.total)}; set ${side} limit price`}
          >
            <span
              className="book-depth"
              style={{ transform: `scaleX(${l.total / max})` }}
            />
            <span className="book-price">{l.price.toFixed(2)}</span>
            <span>{fmt(l.size)}</span>
            <span>{fmt(l.total)}</span>
          </button>
        ))
      ) : (
        <div className="book-empty">
          {data ? "No resting orders" : "Waiting for depth…"}
        </div>
      )}
    </div>
  );
  return (
    <aside className="order-book" aria-label={`${symbol} order book`}>
      <div className="book-heading">
        <h3>Order book</h3>
        <span className={`book-state ${stale ? "stale" : ""}`}>
          {mode === "scenario"
            ? "SIMULATED"
            : !data
              ? "CONNECTING"
              : stale
                ? "STALE"
                : "LIVE · XYZ"}
        </span>
      </div>
      <div className="book-tools">
        <span>Price (USD)</span>
        <label>
          <span className="sr-only">Price grouping</span>
          <select
            aria-label="Order book price grouping"
            value={group}
            onChange={(e) => setGroup(+e.target.value)}
          >
            {[0.01, 0.1, 1].map((v) => (
              <option key={v} value={v}>
                {v.toFixed(v === 0.01 ? 2 : 1)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="book-columns">
        <span>Price</span>
        <span>Size</span>
        <span>Total</span>
      </div>
      {rows([...asks].reverse(), "ask")}
      <div className="book-spread">
        <strong>
          {data?.bids[0] && data?.asks[0]
            ? ((data.bids[0].price + data.asks[0].price) / 2).toFixed(2)
            : "—"}
        </strong>
        <span>Spread {spread !== null ? `$${spread.toFixed(3)}` : "—"}</span>
      </div>
      {rows(bids, "bid")}
      <div
        className="book-balance"
        title="Share of displayed resting size across these levels. Liquidity can be withdrawn; this is not a market sentiment forecast."
      >
        <div>
          <span className="positive">
            Bid {total ? balance.toFixed(0) : "—"}%
          </span>
          <span className="negative">
            Ask {total ? (100 - balance).toFixed(0) : "—"}%
          </span>
        </div>
        <div className="book-balance-track">
          <span style={{ width: `${balance}%` }} />
        </div>
        <small>
          {!data
            ? "Waiting for snapshot"
            : stale
              ? "Depth is stale · awaiting feed"
              : "Displayed liquidity · click a price"}
        </small>
      </div>
    </aside>
  );
}
