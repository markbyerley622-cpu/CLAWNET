"use client";

import { useEffect, useRef } from "react";

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Matrix characters - mix of katakana, numbers, and symbols
    const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%^&*(){}[]<>?/\\|";
    const charArray = chars.split("");

    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);

    // Array to track y position of each column
    const drops: number[] = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100; // Start above screen at random positions
    }

    // Animation
    const draw = () => {
      // Semi-transparent black to create fade effect (darker for orange)
      ctx.fillStyle = "rgba(10, 8, 5, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#ff6b00";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Random character
        const char = charArray[Math.floor(Math.random() * charArray.length)];

        // Calculate position
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Vary the brightness - brighter at the head (ORANGE theme)
        const brightness = Math.random();
        if (brightness > 0.95) {
          ctx.fillStyle = "#ffaa00"; // Bright yellow-orange head
        } else if (brightness > 0.8) {
          ctx.fillStyle = "#ff6b00"; // Bright orange
        } else {
          ctx.fillStyle = `rgba(255, 107, 0, ${0.3 + Math.random() * 0.3})`; // Dimmer orange
        }

        ctx.fillText(char, x, y);

        // Reset drop to top with random delay when it goes off screen
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        // Move drop down
        drops[i] += 0.5 + Math.random() * 0.5;
      }
    };

    const interval = setInterval(draw, 50);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[1] pointer-events-none opacity-30"
      style={{ background: "transparent" }}
    />
  );
}
