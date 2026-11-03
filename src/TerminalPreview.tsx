import { useState } from "react";
import { Range } from "./Range";
const markets = [
  { symbol: "NVDA", price: 186.42 },
  { symbol: "TSLA", price: 428.75 },
  { symbol: "AAPL", price: 271.49 },
  { symbol: "META", price: 642.85 },
];
export default function TerminalPreview() {
  const [market, setMarket] = useState(0),
    [side, setSide] = useState(1),
    [leverage, setLeverage] = useState(5),
    [move, setMove] = useState(0);
  const asset = markets[market],
    delta = [3.5, -2.8, 0.4][move];
  const points = Array.from({ length: 55 }, (_, i) => ({
    x: i * 6.1,
    y: 150 - i * delta * 0.54 - Math.sin(i * 0.8) * 5 - Math.sin(i * 1.9) * 3,
  }));
  const path = points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  return (
    <div className="mini-terminal">
      <div className="mini-heading">
        <img src="/brand/mocha-wordmark.svg" alt="Mochatrade" />
        <span>Practice Lab preview</span>
        <small>EXAMPLE DATA</small>
      </div>
      <div className="mini-balance">
        <span>
          Virtual equity <b>₹1,00,000</b>
        </span>
        <span>
          Margin <b>₹10,000</b>
        </span>
        <span>
          Isolated <b>{leverage}×</b>
        </span>
      </div>
      <div className="mini-workspace">
        <div className="mini-markets">
          <span>MARKETS</span>
          {markets.map((a, i) => (
            <button
              key={a.symbol}
              aria-pressed={market === i}
              onClick={() => setMarket(i)}
            >
              <img src={`/brand/${a.symbol.toLowerCase()}.svg`} alt="" />
              {a.symbol}
            </button>
          ))}
        </div>
        <div className="mini-chart">
          <div className="mini-price">
            {asset.symbol}
            <b>${asset.price.toFixed(2)}</b>
            <small>US stock perpetual</small>
          </div>
          <svg
            viewBox="0 0 340 200"
            role="img"
            aria-label={`${asset.symbol} illustrative price path`}
          >
            <defs>
              <linearGradient id="mini-area" x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#8cb893" stopOpacity=".16" />
                <stop offset="1" stopColor="#8cb893" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[40, 80, 120, 160].map((y) => (
              <path key={y} d={`M0 ${y}H340`} stroke="#292623" />
            ))}
            <path d={`${path} L330 200H0Z`} fill="url(#mini-area)" />
            <path
              key={`${market}-${move}`}
              className="mini-trace"
              d={path}
              fill="none"
              stroke={delta > 0 ? "#8cb893" : "#d28a6c"}
              strokeWidth="1.5"
            />
            <path d="M0 150H340" stroke="#b37d58" strokeDasharray="3 3" />
            <text x="4" y="145" fill="#c69a7c" fontSize="8">
              ENTRY
            </text>
          </svg>
          <div className="mini-scenarios">
            {["Steady rise", "Pullback", "Sideways"].map((title, i) => (
              <button
                key={title}
                aria-pressed={move === i}
                onClick={() => setMove(i)}
              >
                {title}
              </button>
            ))}
          </div>
        </div>
        <div className="mini-ticket">
          <strong>Trade preview</strong>
          <div className="mini-sides">
            <button aria-pressed={side === 1} onClick={() => setSide(1)}>
              Long
            </button>
            <button aria-pressed={side === -1} onClick={() => setSide(-1)}>
              Short
            </button>
          </div>
          <label>
            Leverage <b>{leverage}×</b>
            <Range
              aria-label="Preview leverage"
              min="1"
              max="20"
              value={leverage}
              onChange={(e) => setLeverage(+e.target.value)}
            />
          </label>
          <dl>
            <dt>Position value</dt>
            <dd>₹{(10000 * leverage).toLocaleString("en-IN")}</dd>
            <dt>Opening fee</dt>
            <dd>₹{(5 * leverage).toFixed(2)}</dd>
            <dt>Price move</dt>
            <dd>
              {delta > 0 ? "+" : ""}
              {delta}%
            </dd>
          </dl>
          <span className="mini-result-label">Illustrative gross P&amp;L</span>
          <b className={delta * side >= 0 ? "positive" : "negative"}>
            {" "}
            {delta * side >= 0 ? "+" : "−"}₹
            {Math.abs((10000 * leverage * delta) / 100).toLocaleString("en-IN")}
          </b>
          <small>Before fees &amp; funding</small>
        </div>
      </div>
      <div className="mini-note">
        Try a market, direction, slider or scenario. Open the lab to place paper
        orders.
      </div>
    </div>
  );
}
