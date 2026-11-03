import { type MouseEvent } from "react";
import TerminalPreview from "./TerminalPreview";
import { ArrowRight, Coffee } from "./icons";

type LandingProps = {
  onOpen: (event: MouseEvent<HTMLAnchorElement>) => void;
};

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
            <div className="preview-image-wrap"><TerminalPreview /></div>
            <figcaption>
              <span>THE PRACTICE DESK</span>
              <span>INTERACTIVE PREVIEW · EXAMPLE DATA</span>
            </figcaption>
          </figure>
        </section>

      </main>
    </div>
  );
}
