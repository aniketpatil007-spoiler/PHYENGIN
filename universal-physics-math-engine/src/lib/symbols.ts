import type { ShapeId } from "../data/equipment";

/** Draw a schematic symbol centred in the box (x,y,w,h). */
export function drawSymbol(
  ctx: CanvasRenderingContext2D,
  shape: ShapeId,
  x: number, y: number, w: number, h: number,
  color: string,
  t = 0
) {
  const cx = x + w / 2, cy = y + h / 2;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const R = Math.min(w, h) * 0.34;
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  };
  const circle = (ccx: number, ccy: number, r: number, fill = false) => {
    ctx.beginPath(); ctx.arc(ccx, ccy, r, 0, Math.PI * 2);
    fill ? ctx.fill() : ctx.stroke();
  };
  const poly = (pts: [number, number][], close = true, fill = false) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    if (close) ctx.closePath();
    fill ? ctx.fill() : ctx.stroke();
  };

  switch (shape) {
    /* ----------------------------- thermo ----------------------------- */
    case "boiler": {
      ctx.strokeRect(cx - R, cy - R * 0.85, R * 2, R * 1.7);
      for (let i = 0; i < 3; i++) {
        const fx = cx - R * 0.55 + i * R * 0.55;
        ctx.beginPath();
        ctx.moveTo(fx, cy + R * 0.6);
        ctx.quadraticCurveTo(fx + 6 + Math.sin(t * 3 + i) * 2, cy, fx, cy - R * 0.5);
        ctx.stroke();
      }
      break;
    }
    case "turbine": {
      poly([[cx - R, cy - R * 0.5], [cx + R, cy - R], [cx + R, cy + R], [cx - R, cy + R * 0.5]]);
      line(cx - R, cy, cx + R, cy);
      for (let i = -1; i <= 1; i++) line(cx + i * R * 0.45, cy - R * 0.55, cx + i * R * 0.45, cy + R * 0.55);
      break;
    }
    case "pump": {
      circle(cx, cy, R);
      const a = t * 4;
      for (let i = 0; i < 3; i++) {
        const ang = a + (i * Math.PI * 2) / 3;
        line(cx, cy, cx + Math.cos(ang) * R * 0.8, cy + Math.sin(ang) * R * 0.8);
      }
      break;
    }
    case "condenser": {
      ctx.strokeRect(cx - R, cy - R * 0.7, R * 2, R * 1.4);
      ctx.beginPath();
      for (let i = 0; i <= 28; i++) {
        const px = cx - R * 0.8 + (i / 28) * R * 1.6;
        const py = cy + Math.sin(i * 0.9) * R * 0.35;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
      break;
    }
    case "hx": {
      ctx.strokeRect(cx - R, cy - R * 0.75, R * 2, R * 1.5);
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const px = cx - R + (i / 30) * R * 2;
        const py = cy + (i % 2 === 0 ? -R * 0.4 : R * 0.4);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
      break;
    }
    case "compressor": {
      poly([[cx - R, cy - R], [cx + R, cy - R * 0.45], [cx + R, cy + R * 0.45], [cx - R, cy + R]]);
      line(cx - R, cy, cx + R, cy);
      break;
    }
    case "nozzle": {
      poly([[cx - R, cy - R * 0.75], [cx, cy - R * 0.22], [cx + R, cy - R * 0.8], [cx + R, cy + R * 0.8], [cx, cy + R * 0.22], [cx - R, cy + R * 0.75]]);
      break;
    }
    case "valve": {
      poly([[cx - R, cy - R * 0.7], [cx, cy], [cx - R, cy + R * 0.7]]);
      poly([[cx + R, cy - R * 0.7], [cx, cy], [cx + R, cy + R * 0.7]]);
      line(cx, cy, cx, cy - R);
      line(cx - R * 0.4, cy - R, cx + R * 0.4, cy - R);
      break;
    }
    case "carnot": {
      circle(cx, cy, R);
      line(cx - R, cy, cx + R, cy);
      ctx.font = `${Math.round(R * 0.8)}px 'JetBrains Mono', monospace`;
      ctx.fillText("η", cx - R * 0.22, cy - R * 0.2);
      break;
    }

    /* ----------------------------- aero ------------------------------- */
    case "wing": {
      ctx.beginPath();
      ctx.moveTo(cx - R * 1.1, cy + R * 0.25);
      ctx.bezierCurveTo(cx - R * 0.4, cy - R * 0.85, cx + R * 0.6, cy - R * 0.55, cx + R * 1.1, cy + R * 0.1);
      ctx.bezierCurveTo(cx + R * 0.5, cy + R * 0.42, cx - R * 0.4, cy + R * 0.6, cx - R * 1.1, cy + R * 0.25);
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      line(cx - R * 1.3, cy - R * 0.5, cx + R * 1.2, cy - R * 0.72);
      ctx.globalAlpha = 1;
      break;
    }
    case "jet": {
      ctx.strokeRect(cx - R, cy - R * 0.6, R * 1.6, R * 1.2);
      poly([[cx + R * 0.6, cy - R * 0.6], [cx + R * 1.15, cy - R * 0.85], [cx + R * 1.15, cy + R * 0.85], [cx + R * 0.6, cy + R * 0.6]]);
      for (let i = 0; i < 3; i++) line(cx - R + i * R * 0.5, cy - R * 0.5, cx - R + i * R * 0.5, cy + R * 0.5);
      break;
    }
    case "rocket": {
      poly([[cx, cy - R * 1.05], [cx + R * 0.45, cy + R * 0.25], [cx - R * 0.45, cy + R * 0.25]]);
      poly([[cx - R * 0.45, cy + R * 0.25], [cx - R * 0.8, cy + R * 0.8], [cx - R * 0.15, cy + R * 0.55]]);
      poly([[cx + R * 0.45, cy + R * 0.25], [cx + R * 0.8, cy + R * 0.8], [cx + R * 0.15, cy + R * 0.55]]);
      ctx.globalAlpha = 0.6 + Math.sin(t * 9) * 0.25;
      poly([[cx - R * 0.22, cy + R * 0.55], [cx, cy + R * 1.05], [cx + R * 0.22, cy + R * 0.55]], true, true);
      ctx.globalAlpha = 1;
      break;
    }
    case "prop": {
      circle(cx, cy, R * 0.16, true);
      for (let i = 0; i < 3; i++) {
        const ang = t * 6 + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(ang) * R * 0.55, cy + Math.sin(ang) * R * 0.55, R * 0.5, R * 0.16, ang, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case "tank": {
      ctx.beginPath();
      ctx.roundRect(cx - R * 0.62, cy - R, R * 1.24, R * 2, R * 0.6);
      ctx.stroke();
      ctx.globalAlpha = 0.45;
      line(cx - R * 0.62, cy + R * 0.25, cx + R * 0.62, cy + R * 0.25);
      ctx.globalAlpha = 1;
      break;
    }
    case "shield": {
      ctx.beginPath();
      ctx.arc(cx, cy + R * 0.5, R, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy + R * 0.5, R + 5 + i * 5, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }

    /* -------------------------- electronics --------------------------- */
    case "resistor": {
      line(cx - R * 1.3, cy, cx - R * 0.75, cy);
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.75, cy);
      for (let i = 0; i < 6; i++) {
        ctx.lineTo(cx - R * 0.62 + i * R * 0.25, cy + (i % 2 === 0 ? -R * 0.5 : R * 0.5));
      }
      ctx.lineTo(cx + R * 0.75, cy);
      ctx.stroke();
      line(cx + R * 0.75, cy, cx + R * 1.3, cy);
      break;
    }
    case "capacitor": {
      line(cx - R * 1.2, cy, cx - R * 0.22, cy);
      line(cx + R * 0.22, cy, cx + R * 1.2, cy);
      ctx.lineWidth = 2.6;
      line(cx - R * 0.22, cy - R * 0.75, cx - R * 0.22, cy + R * 0.75);
      line(cx + R * 0.22, cy - R * 0.75, cx + R * 0.22, cy + R * 0.75);
      break;
    }
    case "inductor": {
      line(cx - R * 1.3, cy, cx - R * 0.8, cy);
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.arc(cx - R * 0.6 + i * R * 0.4, cy, R * 0.2, Math.PI, 0);
      }
      ctx.stroke();
      line(cx + R * 0.8, cy, cx + R * 1.3, cy);
      break;
    }
    case "diode": {
      line(cx - R * 1.2, cy, cx - R * 0.4, cy);
      poly([[cx - R * 0.4, cy - R * 0.6], [cx + R * 0.4, cy], [cx - R * 0.4, cy + R * 0.6]], true, true);
      ctx.lineWidth = 2.6;
      line(cx + R * 0.4, cy - R * 0.6, cx + R * 0.4, cy + R * 0.6);
      line(cx + R * 0.4, cy, cx + R * 1.2, cy);
      break;
    }
    case "bjt": {
      circle(cx, cy, R);
      line(cx - R * 0.9, cy, cx - R * 0.25, cy);
      line(cx - R * 0.25, cy - R * 0.6, cx - R * 0.25, cy + R * 0.6);
      line(cx - R * 0.25, cy - R * 0.3, cx + R * 0.6, cy - R * 0.75);
      line(cx - R * 0.25, cy + R * 0.3, cx + R * 0.6, cy + R * 0.75);
      poly([[cx + R * 0.28, cy + R * 0.42], [cx + R * 0.55, cy + R * 0.72], [cx + R * 0.2, cy + R * 0.7]], true, true);
      break;
    }
    case "mosfet":
    case "nmos":
    case "pmos": {
      line(cx - R, cy, cx - R * 0.45, cy);
      line(cx - R * 0.45, cy - R * 0.7, cx - R * 0.45, cy + R * 0.7);
      for (let i = -1; i <= 1; i++) line(cx - R * 0.18, cy + i * R * 0.42 - R * 0.14, cx - R * 0.18, cy + i * R * 0.42 + R * 0.14);
      line(cx - R * 0.18, cy - R * 0.56, cx + R * 0.7, cy - R * 0.56);
      line(cx + R * 0.7, cy - R * 0.56, cx + R * 0.7, cy - R);
      line(cx - R * 0.18, cy + R * 0.56, cx + R * 0.7, cy + R * 0.56);
      line(cx + R * 0.7, cy + R * 0.56, cx + R * 0.7, cy + R);
      line(cx - R * 0.18, cy, cx + R * 0.7, cy);
      if (shape === "pmos") circle(cx - R * 0.62, cy, R * 0.15);
      if (shape === "nmos") poly([[cx + R * 0.1, cy - R * 0.14], [cx + R * 0.34, cy], [cx + R * 0.1, cy + R * 0.14]], true, true);
      break;
    }
    case "opamp": {
      poly([[cx - R * 0.8, cy - R], [cx + R, cy], [cx - R * 0.8, cy + R]]);
      ctx.font = `${Math.round(R * 0.55)}px 'JetBrains Mono', monospace`;
      ctx.fillText("−", cx - R * 0.6, cy - R * 0.32);
      ctx.fillText("+", cx - R * 0.62, cy + R * 0.62);
      line(cx - R * 1.25, cy - R * 0.5, cx - R * 0.8, cy - R * 0.5);
      line(cx - R * 1.25, cy + R * 0.5, cx - R * 0.8, cy + R * 0.5);
      line(cx + R, cy, cx + R * 1.3, cy);
      break;
    }
    case "battery": {
      line(cx - R * 1.2, cy, cx - R * 0.35, cy);
      ctx.lineWidth = 2.8;
      line(cx - R * 0.35, cy - R * 0.8, cx - R * 0.35, cy + R * 0.8);
      ctx.lineWidth = 2;
      line(cx - R * 0.02, cy - R * 0.4, cx - R * 0.02, cy + R * 0.4);
      ctx.lineWidth = 2.8;
      line(cx + R * 0.32, cy - R * 0.8, cx + R * 0.32, cy + R * 0.8);
      ctx.lineWidth = 2;
      line(cx + R * 0.32, cy, cx + R * 1.2, cy);
      break;
    }

    /* --------------------------- mechanical --------------------------- */
    case "spring": {
      line(cx - R * 1.3, cy, cx - R * 0.85, cy);
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.85, cy);
      const coils = 7;
      for (let i = 0; i <= coils * 2; i++) {
        ctx.lineTo(cx - R * 0.85 + (i * R * 1.7) / (coils * 2), cy + (i % 2 === 0 ? 0 : i % 4 === 1 ? -R * 0.6 : R * 0.6));
      }
      ctx.lineTo(cx + R * 0.85, cy);
      ctx.stroke();
      line(cx + R * 0.85, cy, cx + R * 1.3, cy);
      break;
    }
    case "damper": {
      line(cx - R * 1.3, cy, cx - R * 0.35, cy);
      ctx.strokeRect(cx - R * 0.35, cy - R * 0.6, R * 0.9, R * 1.2);
      ctx.fillRect(cx - R * 0.1, cy - R * 0.55, R * 0.2, R * 1.1);
      line(cx + R * 0.1, cy, cx + R * 1.3, cy);
      break;
    }
    case "mass": {
      ctx.strokeRect(cx - R * 0.85, cy - R * 0.7, R * 1.7, R * 1.4);
      ctx.globalAlpha = 0.35;
      ctx.fillRect(cx - R * 0.85, cy - R * 0.7, R * 1.7, R * 1.4);
      ctx.globalAlpha = 1;
      ctx.font = `${Math.round(R * 0.6)}px 'JetBrains Mono', monospace`;
      ctx.fillText("m", cx - R * 0.2, cy + R * 0.2);
      break;
    }
    case "gear": {
      const teeth = 10;
      ctx.beginPath();
      for (let i = 0; i < teeth * 2; i++) {
        const ang = t * 1.4 + (i * Math.PI) / teeth;
        const rr = i % 2 === 0 ? R : R * 0.76;
        const px = cx + Math.cos(ang) * rr, py = cy + Math.sin(ang) * rr;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.stroke();
      circle(cx, cy, R * 0.3);
      break;
    }
    case "pulley": {
      circle(cx, cy - R * 0.2, R * 0.6);
      circle(cx, cy - R * 0.2, R * 0.14, true);
      line(cx - R * 0.6, cy - R * 0.2, cx - R * 0.6, cy + R);
      line(cx + R * 0.6, cy - R * 0.2, cx + R * 0.6, cy + R);
      line(cx - R * 0.85, cy - R * 0.85, cx + R * 0.85, cy - R * 0.85);
      break;
    }
    case "beam": {
      ctx.fillRect(cx - R * 1.15, cy - R * 0.85, R * 0.22, R * 1.7);
      ctx.strokeRect(cx - R * 0.93, cy - R * 0.22, R * 2.05, R * 0.44);
      line(cx + R * 1.05, cy + R * 0.22, cx + R * 1.05, cy + R * 0.85);
      poly([[cx + R * 0.85, cy + R * 0.85], [cx + R * 1.25, cy + R * 0.85], [cx + R * 1.05, cy + R * 0.6]], true, true);
      break;
    }
    case "shaft": {
      ctx.beginPath();
      ctx.roundRect(cx - R * 1.15, cy - R * 0.3, R * 2.3, R * 0.6, R * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + R * 0.7, cy, R * 0.62, -0.9, 2.1);
      ctx.stroke();
      poly([[cx + R * 0.95, cy + R * 0.5], [cx + R * 1.2, cy + R * 0.62], [cx + R * 0.98, cy + R * 0.82]], true, true);
      break;
    }

    /* ------------------------------ vlsi ------------------------------ */
    case "inverter": {
      poly([[cx - R * 0.8, cy - R * 0.85], [cx + R * 0.7, cy], [cx - R * 0.8, cy + R * 0.85]]);
      circle(cx + R * 0.88, cy, R * 0.18);
      line(cx - R * 1.25, cy, cx - R * 0.8, cy);
      line(cx + R * 1.06, cy, cx + R * 1.3, cy);
      break;
    }
    case "nand": {
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.8, cy - R * 0.85);
      ctx.lineTo(cx, cy - R * 0.85);
      ctx.arc(cx, cy, R * 0.85, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(cx - R * 0.8, cy + R * 0.85);
      ctx.closePath(); ctx.stroke();
      circle(cx + R * 1.03, cy, R * 0.18);
      line(cx - R * 1.25, cy - R * 0.42, cx - R * 0.8, cy - R * 0.42);
      line(cx - R * 1.25, cy + R * 0.42, cx - R * 0.8, cy + R * 0.42);
      line(cx + R * 1.21, cy, cx + R * 1.4, cy);
      break;
    }
    case "dff": {
      ctx.strokeRect(cx - R * 0.75, cy - R * 0.9, R * 1.5, R * 1.8);
      ctx.font = `${Math.round(R * 0.42)}px 'JetBrains Mono', monospace`;
      ctx.fillText("D", cx - R * 0.6, cy - R * 0.32);
      ctx.fillText("Q", cx + R * 0.24, cy - R * 0.32);
      poly([[cx - R * 0.75, cy + R * 0.2], [cx - R * 0.5, cy + R * 0.45], [cx - R * 0.75, cy + R * 0.7]], false);
      line(cx - R * 1.15, cy - R * 0.45, cx - R * 0.75, cy - R * 0.45);
      line(cx + R * 0.75, cy - R * 0.45, cx + R * 1.15, cy - R * 0.45);
      break;
    }
    case "wire": {
      line(cx - R * 1.3, cy, cx + R * 1.3, cy);
      for (let i = 0; i < 3; i++) {
        const wx = cx - R * 0.7 + i * R * 0.7;
        line(wx, cy, wx, cy + R * 0.55);
        line(wx - R * 0.18, cy + R * 0.55, wx + R * 0.18, cy + R * 0.55);
        line(wx - R * 0.11, cy + R * 0.72, wx + R * 0.11, cy + R * 0.72);
      }
      break;
    }
    case "sram": {
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++)
          ctx.strokeRect(cx - R * 0.9 + c * R * 0.62, cy - R * 0.9 + r * R * 0.62, R * 0.5, R * 0.5);
      break;
    }
    default: {
      ctx.beginPath();
      ctx.roundRect(cx - R, cy - R * 0.7, R * 2, R * 1.4, 6);
      ctx.stroke();
    }
  }
  ctx.restore();
}
