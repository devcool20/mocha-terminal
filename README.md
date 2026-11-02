# Mocha Terminal · Practice Lab

An independent, Mocha-inspired paper trading lab for US stock perpetuals. No accounts, real money, wallet connection or execution credentials are needed.

## Run

```sh
npm ci
npm run dev
```

Open http://localhost:5173 for the welcome page; its single action opens the terminal at `/terminal`. Node 22+ is recommended (built with Node 24). `npm test` runs the financial engine tests; `npm run build` checks TypeScript and generates the deployable `dist/` directory. `npm run preview` serves that production build on port 4173. The repository includes Vercel and Netlify rewrites so direct visits to `/terminal` work.

## Deploy

This is a static Vite app; it has no server-side secrets or database. From the project folder, the fastest deployment is:

```sh
npx vercel --prod
```

On first run, Vercel asks you to sign in and link or create a project. Keep the detected Vite build settings (`npm run build`, output `dist`). It then prints the production URL. Run `npx vercel` for a preview deployment or `npx vercel --prod` for later production updates. To deploy automatically on every push, connect a Git repository in the Vercel dashboard; this local folder does not currently have a Git repository initialized.

The checked-in `vercel.json` keeps `/terminal` working on refresh. For Netlify, import the repository with build command `npm run build` and publish directory `dist`; `public/_redirects` includes its equivalent route fallback. A plain static host can publish the contents of `dist/` if it supports SPA fallback for `/terminal`. The root welcome page works without a backend. Live reference prices need the browser to reach Hyperliquid over HTTPS/WebSocket; scenarios work without that feed. Saved portfolios live in each browser and are not shared across devices.

## Try a complete flow

1. Select **Steady rise**. Set margin and leverage, optionally add TP/SL, then open a paper position.
2. Press play; pause or change the replay speed. Market prices, position P&L and account equity follow the scenario clock.
3. Close 50%, then the remainder. Open History and share the closed result as a square or portrait PNG.
4. Try **NVDA sell-off** with its 20× draft to see forced square-off. **48h funding** covers 48 simulated hours with hourly funding.
5. Switch to **Live reference** for independent virtual funds using public Hyperliquid xyz quotes. Return to Scenarios to resume that wallet.

The `/` shortcut focuses market search. Currency switching changes displayed amounts, not the underlying balance. Setups and portfolios persist locally; Reset only clears the active wallet. A new scenario requires confirmation when the scenario wallet contains activity. Saved drafts survive wallet resets.

## Model and data provenance

- Sources: [Mocha site](https://mochatrade.com/), [conversion](https://mochatrade.com/support/currency-conversion-and-settlement), [fees](https://mochatrade.com/support/mochatrade-trading-fees-and-funding-rates-explained), [liquidation explanation](https://mochatrade.com/support/what-is-liquidation-square-off-and-when-does-it-happen), and [Hyperliquid API](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api). Researched November 2, 2026. Mocha can change its product rules.
- Live data explicitly maps NVDA, TSLA, AAPL and META to `xyz:<symbol>`. These are reference venue prices, not verified Mocha execution prices. One WebSocket manages active-asset contexts, with REST metadata snapshots and candle history. The feed starts when needed; a live wallet with open exposure continues updating while another mode is viewed.
- Each wallet starts with ₹1,00,000 at the documented fixed ₹90/USD conversion. Internal amounts are USD equivalents; decimal arithmetic is used for trade sizing and P&L. Scenario prices are generated fixtures, not historical prices; their maximum leverage is 20×. Live limits use venue metadata, capped at 50×.
- Notional = posted margin × leverage. Quantity = notional ÷ entry. Gross P&L = quantity × (exit − entry), with sign reversed for shorts. Opening fees are deducted from free cash separately. Pending limit orders reserve margin plus the modeled maker fee.
- Market and immediately crossing limit entries charge 0.05%; resting limit entries charge 0.02%. Closing fees are 0.05%. A limit crosses at its price or better; this demo fills it completely at the next model quote. There is no depth, queue, partial order fill or slippage simulation.
- Liquidation solves `margin + gross P&L − funding = quantity × price × (0.005 + 0.0005)`. The **0.5% maintenance margin is illustrative**, not Mocha's actual published rule. A gap can skip the threshold. Returns are floored at zero collateral; no extra liquidation penalty is modeled. Opening fees remain paid separately.
- Funding is hourly in the reference/scenario model. Positive rates charge longs and credit shorts. Open positions use the opening funding rate, marked at the evaluation quote for each elapsed interval; missed intervals are evaluated on the next quote, not reconstructed from historical rates. Outcome projections assume an unchanged rate and notional. Mocha's actual funding intervals can vary by symbol.
- Automatic exits check liquidation before stop-loss and take-profit. Attached exits apply to the remaining position after a partial close. Duplicate or older ticks are ignored. Scenario replay advances market state only while playing; refreshing restores the wallet but pauses playback.
- New live orders and manual live closes require a quote at most 60 seconds old. Quotes are marked stale at 15 seconds. Reconnection backs off to 30 seconds and refreshes snapshots. Data errors never silently substitute a scenario quote into a live execution.
- Persisted state is schema validated. Corrupt state recovers to a fresh wallet with a notice; blocked/full storage leaves the in-memory session usable with a warning. Exported images and shared links carry simulated-result labeling. Setup links contain draft parameters only, never portfolio state.

## Structure

### Order book and motion

The chart includes a collapsible six-level-per-side order book. Live mode subscribes to the selected `xyz:<symbol>` L2 snapshot stream through the existing market WebSocket, with REST snapshots for initialization/recovery. Switching symbols unsubscribes the previous depth stream. Older, crossed or malformed snapshots are ignored; empty sides and stale data have explicit states. Scenario depth is deterministic and labelled simulated. Grouping rounds bids down and asks up, and cumulative totals and the balance bar use the displayed levels. This is a resting-liquidity indicator, not a sentiment forecast. Clicking a row sets a draft limit price; it never submits an order. Paper execution continues to use the documented simulation model rather than matching against this reference book.

Motion adapts Mocha's hero button construction: a conic border light, inset face highlight, warm layered surface, passing sheen and pressed base. Selected mode and direction controls use the same material at a smaller scale. Scenario traces draw and animate a runner along the actual modeled path; both sliders retain native keyboard behavior with animated fill light and tactile thumbs. Reduced-motion preferences disable the continuous effects. No animation changes the pricing or calculation clocks.

`src/engine.ts` is the pure financial/order model. `src/store.ts` manages isolated, persisted sessions and recovery. `src/data.ts` owns public market data and scenario clocks. The chart, dialogs, animation features and PNG renderer are separate modules; heavy UI features load in separate chunks. Fonts are self-hosted. The UI targets laptop and desktop browsers (1120px minimum workspace width), with reduced motion and keyboard focus. Typography uses the exact Geist and Geist Mono files from Mocha, and the official wordmark. Custom SVG glyphs and scenario traces replace the initial generic icon/card treatment.

TradingView Lightweight Charts is Apache-2.0 licensed; its built-in logo and the explicit creator link remain visible. Font licenses are included with their Fontsource packages. This app is an independent concept and does not claim affiliation with Mochatrade.

## Verification

The reproducible audit command is:

```sh
npm run build
npm run preview
npx lighthouse http://localhost:4173 --preset=desktop --chrome-flags="--headless --no-sandbox" --only-categories=performance,accessibility --output=json --output-path=artifacts/lighthouse-desktop.json
```

The latest desktop welcome-page screenshot is `artifacts/welcome-1440.jpg`. Lighthouse is a lab measurement, not a real-user performance guarantee. There is no telemetry, backend, service worker or offline installation; scenarios remain usable after a loaded page loses its network connection.

Desktop redesign: exact fonts and wordmark sourced from https://mochatrade.com/ on November 2, 2026. Company marks use Simple Icons (CC0); interactive controls and scenario traces are implemented as native code and SVG. The interface is designed for desktop browsers.
