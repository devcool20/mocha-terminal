import { useState, type MouseEvent } from "react";
import { ArrowRight, Coffee } from "./icons";

type LandingProps = {
  onOpen: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export default function Landing({ onOpen }: LandingProps) {
 const [direction,setDirection]=useState("Long");
 const [previewOpen,setPreviewOpen]=useState(false);
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
              <div className="interactive-preview">
                <div className="preview-market"><img src="/brand/nvda.svg" alt="" /> NVDA <span>SCENARIO PREVIEW</span></div>
                <div className="preview-quote">$186.42 <small>+2.34%</small></div>
                <svg viewBox="0 0 500 220" aria-label="Animated illustrative NVDA price chart"><path d="M0 190 L25 183 L40 188 L65 164 L85 170 L110 145 L135 152 L160 119 L180 130 L205 103 L230 111 L255 84 L280 99 L310 60 L340 73 L370 38 L405 46 L440 19 L470 29 L500 10" fill="none" stroke="#86b797" strokeWidth="2" className="preview-price-path" /></svg>
                <div className="preview-trade"><div className="side-toggle"><button className={direction === "Long" ? "long-active" : ""} onClick={()=>setDirection("Long")}>Long</button><button className={direction === "Short" ? "short-active" : ""} onClick={()=>setDirection("Short")}>Short</button></div><button className="primary" onClick={()=>setPreviewOpen(!previewOpen)}>{previewOpen ? "Close preview position" : `Preview ${direction.toLowerCase()}`}</button></div>
                <p className="preview-feedback" role="status">{previewOpen ? `${direction} preview · ₹10,000 margin · 5× · simulated` : "Try a direction, then preview a paper position."}</p>
              </div>
            </div>
            <figcaption>
              <span>THE PRACTICE DESK</span>
              <span>NVDA · SCENARIO REPLAY</span>
            </figcaption>
          </figure>
        </section>

      </main>
    </div>
  );
}
