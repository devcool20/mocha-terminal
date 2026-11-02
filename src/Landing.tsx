import type { MouseEvent } from "react";
import { ArrowRight, Coffee } from "./icons";

type LandingProps = {
  onOpen: (event: MouseEvent<HTMLAnchorElement>) => void;
};

const capabilities = [
  {
    title: "Read the setup",
    copy: "See margin, leverage, fees, funding, and estimated liquidation before you place a paper order.",
  },
  {
    title: "Work through a market",
    copy: "Use NVDA, TSLA, AAPL, or META. Follow public reference quotes or replay four repeatable scenarios.",
  },
  {
    title: "Manage the whole position",
    copy: "Place market or limit orders, add exits, close in parts, then review or export the simulated result.",
  },
];

export default function Landing({ onOpen }: LandingProps) {
  return (
    <div className="welcome-page">
      <main className="welcome-main">
        <section className="welcome-hero" aria-labelledby="welcome-title">
          <div className="welcome-copy">
            <div className="welcome-mark"><Coffee size={17} /><span>MOCHA · PRACTICE LAB</span></div>
            <h1 id="welcome-title">Understand the trade<br />before you place it.</h1>
            <p className="welcome-intro">
              A paper-trading desk for US-stock perpetuals. Work through entries,
              exits, funding, and downside with <strong>₹1,00,000 in virtual funds.</strong>
            </p>
            <a className="primary welcome-launch" href="/terminal" onClick={onOpen}>
              <span>Open the Practice Lab</span><ArrowRight size={15} />
            </a>
            <div className="welcome-assurance">
              <span className="assurance-symbol">₹</span>
              <span>No account or real funds. Your practice stays in this browser.</span>
            </div>
          </div>

          <figure className="welcome-preview">
            <div className="preview-chrome">
              <span className="preview-light" /><span className="preview-light" /><span className="preview-light" />
              <span className="preview-address">mochatrade.com / practice-lab</span>
              <span className="preview-mode">SIMULATED</span>
            </div>
            <div className="preview-image-wrap">
              <img
                src="/brand/terminal-preview.jpg"
                alt="Practice Lab terminal showing US stock markets, chart, scenario replays, and a paper order ticket"
                fetchPriority="high"
              />
            </div>
            <figcaption>
              <span>THE PRACTICE DESK</span>
              <span>NVDA · SCENARIO REPLAY</span>
            </figcaption>
          </figure>
        </section>

        <section className="welcome-capabilities" aria-label="Practice Lab features">
          {capabilities.map((capability, index) => (
            <article className="capability" key={capability.title}>
              <span className="capability-index">0{index + 1}</span>
              <div>
                <h2>{capability.title}</h2>
                <p>{capability.copy}</p>
              </div>
            </article>
          ))}
        </section>

        <footer className="welcome-footer">
          <span>Reference quotes are informational; simulated orders never reach a venue.</span>
          <span>Built as an independent Mocha concept demo.</span>
        </footer>
      </main>
    </div>
  );
}
