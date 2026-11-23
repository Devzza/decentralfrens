"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#22ff66", "#0fbf4a", "#37ff8c", "#0a7d2f"];

function cellSize() {
  const w = window.innerWidth;
  if (w < 480) return 14;
  if (w < 900) return 18;
  if (w < 1600) return 24;
  return 30;
}

export default function BinaryCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    function resize() {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cell = cellSize();

      ctx.fillStyle = "#020b04";
      ctx.fillRect(0, 0, w, h);

      ctx.font = `bold ${cell * 0.78}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let x = cell / 2; x < w; x += cell) {
        for (let y = cell / 2; y < h; y += cell) {
          const r = Math.random();
          let ch;
          if (r < 0.48) ch = "0";
          else if (r < 0.96) ch = "1";
          else ch = " ";
          ctx.fillStyle = COLORS[(Math.random() * COLORS.length) | 0];
          ctx.fillText(ch, x, y);
        }
      }
    }

    let timer = null;
    function schedule() {
      timer = setTimeout(() => {
        draw();
        schedule();
      }, 260);
    }

    function onResize() {
      resize();
      draw();
    }

    resize();
    draw();
    schedule();
    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="binary" aria-hidden="true" />;
}
