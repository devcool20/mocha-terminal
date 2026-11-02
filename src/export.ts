import { FX, type LedgerEvent } from "./engine";
export async function exportCard(event: LedgerEvent, portrait: boolean) {
  await document.fonts.ready;
  await document.fonts.load('24px "Geist Mono"');
  const wordmark = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () =>
      reject(
        new Error(
          "Brand asset could not load. Check your connection and retry.",
        ),
      );
    im.src = "/brand/mocha-wordmark.svg";
  });
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = portrait ? 1440 : 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not create an image.");
  const h = canvas.height;
  ctx.fillStyle = "#0b0908";
  ctx.fillRect(0, 0, 1080, h);
  ctx.drawImage(wordmark, 72, 64, 214, 42);
  ctx.font = "18px Geist";
  ctx.textAlign = "right";
  ctx.fillStyle = "#b0aaa3";
  ctx.fillText("Practice Lab", 1008, 91);
  ctx.textAlign = "left";
  const rule = (y: number) => {
    ctx.strokeStyle = "#36302a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(72, y);
    ctx.lineTo(1008, y);
    ctx.stroke();
  };
  rule(145);
  ctx.fillStyle = "#b0aaa3";
  ctx.font = "24px Geist";
  ctx.fillText(
    event.kind === "Scenario preview"
      ? "Hypothetical outcome"
      : "Paper trade result",
    72,
    portrait ? 290 : 245,
  );
  ctx.fillStyle = "#eeeae5";
  ctx.font = "500 42px Geist";
  ctx.fillText(event.symbol, 72, portrait ? 370 : 325);
  ctx.font = "22px Geist";
  ctx.fillStyle = "#b0aaa3";
  ctx.fillText(
    `${event.side.toUpperCase()}  /  ${event.leverage}×  /  ISOLATED`,
    72,
    portrait ? 417 : 372,
  );
  ctx.fillStyle = event.pnl >= 0 ? "#7cb48e" : "#d28b75";
  ctx.font = '84px "Geist Mono"';
  ctx.fillText(
    `${event.pnl >= 0 ? "+" : "−"}₹${Math.abs(event.pnl * FX).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    72,
    portrait ? 595 : 540,
  );
  ctx.font = '24px "Geist Mono"';
  ctx.fillText(
    `${event.pnl >= 0 ? "+" : ""}${((event.pnl / event.margin) * 100).toFixed(2)}%`,
    72,
    portrait ? 650 : 595,
  );
  ctx.font = "20px Geist";
  ctx.fillStyle = "#b0aaa3";
  ctx.fillText("net return on margin", 260, portrait ? 650 : 595);
  const row = (label: string, value: string, y: number) => {
    ctx.font = "22px Geist";
    ctx.fillStyle = "#a59d94";
    ctx.fillText(label, 72, y);
    ctx.font = '22px "Geist Mono"';
    ctx.fillStyle = "#e0d8ce";
    ctx.textAlign = "right";
    ctx.fillText(value, 1008, y);
    ctx.textAlign = "left";
  };
  rule(h - 365);
  row(
    "Entry / exit",
    `$${event.entry.toFixed(2)}  /  $${event.price.toFixed(2)}`,
    h - 308,
  );
  row(
    "Fees + funding",
    `₹${((event.fee + event.funding) * FX).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
    h - 255,
  );
  row(
    "Margin",
    `₹${(event.margin * FX).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
    h - 202,
  );
  rule(h - 157);
  ctx.fillStyle = "#c47c54";
  ctx.font = '18px "Geist Mono"';
  ctx.fillText("SIMULATED RESULT · VIRTUAL FUNDS", 72, h - 103);
  ctx.fillStyle = "#a49b91";
  ctx.font = "17px Geist";
  ctx.fillText(
    "Modeled fees & funding · ₹90/USD · Independent concept demo",
    72,
    h - 65,
  );
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b
          ? resolve(b)
          : reject(new Error("Image export failed. Try another browser.")),
      "image/png",
    ),
  );
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `mocha-practice-${event.symbol}-${portrait ? "portrait" : "square"}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
