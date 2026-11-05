"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function DauTruongGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [p1Hp, setP1Hp] = useState(100);
  const [p1Ki, setP1Ki] = useState(50);
  const [p2Hp, setP2Hp] = useState(100);
  const [p2Ki, setP2Ki] = useState(50);
  const [winner, setWinner] = useState<string | null>(null);

  // Lưu trạng thái nút bấm cảm ứng trên điện thoại
  const touchState = useRef({
    left: false,
    right: false,
    jump: false,
    punch: false,
    charge: false,
    kame: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set kích thước canvas chuẩn
    canvas.width = 800;
    canvas.height = 400;

    // Trạng thái Player 1 (Goku - Vàng/Cam)
    const p1 = {
      x: 100,
      y: 280,
      width: 40,
      height: 70,
      vx: 0,
      vy: 0,
      hp: 100,
      ki: 50,
      color: "#f59e0b",
      isGrounded: true,
      attacking: false,
      kameBeam: false,
    };

    // Trạng thái Player 2 (Vegeta Bot / P2 - Xanh/Tím)
    const p2 = {
      x: 660,
      y: 280,
      width: 40,
      height: 70,
      vx: 0,
      vy: 0,
      hp: 100,
      ki: 50,
      color: "#8b5cf6",
      isGrounded: true,
      attacking: false,
      kameBeam: false,
    };

    const keys: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    let animationFrameId: number;

    const gameLoop = () => {
      // 1. Xử lý Input P1 (Bàn phím + Touch ĐT)
      const moveLeft = keys["a"] || touchState.current.left;
      const moveRight = keys["d"] || touchState.current.right;
      const jump = keys["w"] || touchState.current.jump;
      const punch = keys["j"] || touchState.current.punch;
      const charge = keys["k"] || touchState.current.charge;
      const kame = keys["l"] || touchState.current.kame;

      // Di chuyển P1
      if (moveLeft) p1.vx = -4;
      else if (moveRight) p1.vx = 4;
      else p1.vx = 0;

      if (jump && p1.isGrounded) {
        p1.vy = -12;
        p1.isGrounded = false;
      }

      // Tích Ki P1
      if (charge && p1.ki < 100) {
        p1.ki = Math.min(100, p1.ki + 0.5);
      }

      // Đấm P1
      if (punch && !p1.attacking) {
        p1.attacking = true;
        setTimeout(() => (p1.attacking = false), 200);
        // Trúng đòn P2
        if (Math.abs(p1.x - p2.x) < 60 && Math.abs(p1.y - p2.y) < 40) {
          p2.hp = Math.max(0, p2.hp - 8);
        }
      }

      // Kamehameha P1
      if (kame && p1.ki >= 30 && !p1.kameBeam) {
        p1.ki -= 30;
        p1.kameBeam = true;
        setTimeout(() => (p1.kameBeam = false), 600);
        if (p2.x > p1.x && Math.abs(p1.y - p2.y) < 50) {
          p2.hp = Math.max(0, p2.hp - 25);
        }
      }

      // 2. Bot AI đơn giản điều khiển P2
      if (p2.hp > 0) {
        if (p2.x - p1.x > 80) p2.vx = -2.5;
        else if (p2.x - p1.x < -80) p2.vx = 2.5;
        else p2.vx = 0;

        // Bot tự tấn công
        if (Math.abs(p2.x - p1.x) <= 65 && Math.random() < 0.03) {
          p1.hp = Math.max(0, p1.hp - 5);
        }
        if (p2.ki < 100) p2.ki += 0.2;
      }

      // Trọng lực & Vật lý
      p1.vy += 0.6;
      p1.x += p1.vx;
      p1.y += p1.vy;
      if (p1.y >= 280) {
        p1.y = 280;
        p1.vy = 0;
        p1.isGrounded = true;
      }
      p1.x = Math.max(20, Math.min(740, p1.x));

      p2.vy += 0.6;
      p2.x += p2.vx;
      p2.y += p2.vy;
      if (p2.y >= 280) {
        p2.y = 280;
        p2.vy = 0;
        p2.isGrounded = true;
      }
      p2.x = Math.max(20, Math.min(740, p2.x));

      // Cập nhật State HP/Ki hiển thị
      setP1Hp(Math.round(p1.hp));
      setP1Ki(Math.round(p1.ki));
      setP2Hp(Math.round(p2.hp));
      setP2Ki(Math.round(p2.ki));

      if (p2.hp <= 0) setWinner("PLAYER 1 THẮNG (GOKU)!");
      else if (p1.hp <= 0) setWinner("PLAYER 2 THẮNG (VEGETA)!");

      // 3. VẼ GIAO DIỆN GAME (CANVAS)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Mặt đất Cyber
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 350, canvas.width, 50);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 350);
      ctx.lineTo(canvas.width, 350);
      ctx.stroke();

      // Vẽ Player 1 (Goku)
      ctx.fillStyle = p1.color;
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = p1.ki > 50 ? 20 : 5;
      ctx.fillRect(p1.x, p1.y, p1.width, p1.height);

      // Hiệu ứng Đấm P1
      if (p1.attacking) {
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(p1.x + 40, p1.y + 20, 25, 15);
      }

      // Hiệu ứng Chưởng Kamehameha P1
      if (p1.kameBeam) {
        ctx.fillStyle = "#38bdf8";
        ctx.shadowColor = "#0284c7";
        ctx.shadowBlur = 30;
        ctx.fillRect(p1.x + 40, p1.y + 15, canvas.width - p1.x, 30);
      }

      // Vẽ Player 2 (Vegeta)
      ctx.fillStyle = p2.color;
      ctx.shadowColor = "#8b5cf6";
      ctx.shadowBlur = 10;
      ctx.fillRect(p2.x, p2.y, p2.width, p2.height);

      if (p1.hp > 0 && p2.hp > 0) {
        animationFrameId = requestAnimationFrame(gameLoop);
      }
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleTouch = (btn: string, active: boolean) => {
    (touchState.current as any)[btn] = active;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4 selection:bg-amber-500">
      
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-4">
        <Link href="/" className="bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold px-4 py-2 rounded-xl text-sm border border-amber-500/30">
          ⬅ Trở về Trang Chủ
        </Link>
        <h1 className="text-xl sm:text-2xl font-black text-amber-400 tracking-wider">
          ⚔️ ĐẤU TRƯỜNG SIÊU NHẪN 1V1
        </h1>
      </div>

      {/* Thanh Máu & Ki (HUD) */}
      <div className="w-full max-w-4xl bg-slate-900/80 border border-slate-800 p-4 rounded-2xl mb-4 grid grid-cols-2 gap-6 shadow-lg">
        {/* P1 Stats */}
        <div>
          <div className="flex justify-between text-xs font-bold text-amber-400 mb-1">
            <span>P1: GOKU</span>
            <span>HP: {p1Hp}%</span>
          </div>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden mb-2">
            <div className="bg-emerald-500 h-full transition-all duration-100" style={{ width: `${p1Hp}%` }}></div>
          </div>
          <div className="flex justify-between text-[10px] text-cyan-400 mb-1">
            <span>KI (NĂNG LƯỢNG)</span>
            <span>{p1Ki}/100</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-cyan-400 h-full transition-all duration-100" style={{ width: `${p1Ki}%` }}></div>
          </div>
        </div>

        {/* P2 Stats */}
        <div>
          <div className="flex justify-between text-xs font-bold text-purple-400 mb-1">
            <span>P2: VEGETA (BOT)</span>
            <span>HP: {p2Hp}%</span>
          </div>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden mb-2">
            <div className="bg-emerald-500 h-full transition-all duration-100" style={{ width: `${p2Hp}%` }}></div>
          </div>
          <div className="flex justify-between text-[10px] text-purple-300 mb-1">
            <span>KI</span>
            <span>{p2Ki}/100</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full transition-all duration-100" style={{ width: `${p2Ki}%` }}></div>
          </div>
        </div>
      </div>

      {/* Khung Màn Hình Game Canvas */}
      <div className="relative w-full max-w-4xl bg-slate-900 border-2 border-amber-500/40 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(245,158,11,0.2)]">
        <canvas ref={canvasRef} className="w-full h-auto aspect-[2/1] block" />

        {winner && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center">
            <h2 className="text-3xl sm:text-4xl font-black text-amber-400 mb-4 animate-bounce">
              {winner}
            </h2>
            <button
              onClick={() => window.location.reload()}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-6 py-3 rounded-xl shadow-lg transition"
            >
              Chơi Lại Trận Khác 🔄
            </button>
          </div>
        )}
      </div>

      {/* Hướng dẫn phím bấm PC */}
      <div className="hidden sm:flex gap-4 text-xs text-slate-400 mt-3 font-medium">
        <span><b className="text-amber-400">A/D:</b> Di chuyển</span>
        <span><b className="text-amber-400">W:</b> Nhảy</span>
        <span><b className="text-amber-400">J:</b> Đấm</span>
        <span><b className="text-amber-400">K:</b> Tích Ki</span>
        <span><b className="text-amber-400">L:</b> Kamehameha (-30 Ki)</span>
      </div>

      {/* 📱 NUT BẤM CẢM ỨNG DÀNH CHO ĐIỆN THOẠI */}
      <div className="sm:hidden w-full max-w-4xl grid grid-cols-2 gap-4 mt-4 select-none">
        {/* Nút di chuyển bên trái */}
        <div className="flex gap-2">
          <button
            onTouchStart={() => handleTouch("left", true)}
            onTouchEnd={() => handleTouch("left", false)}
            className="flex-1 bg-slate-800 active:bg-amber-500 text-white font-black py-4 rounded-xl border border-slate-700 text-xl"
          >
            ◀
          </button>
          <button
            onTouchStart={() => handleTouch("right", true)}
            onTouchEnd={() => handleTouch("right", false)}
            className="flex-1 bg-slate-800 active:bg-amber-500 text-white font-black py-4 rounded-xl border border-slate-700 text-xl"
          >
            ▶
          </button>
          <button
            onTouchStart={() => handleTouch("jump", true)}
            onTouchEnd={() => handleTouch("jump", false)}
            className="flex-1 bg-slate-800 active:bg-amber-500 text-white font-black py-4 rounded-xl border border-slate-700 text-xl"
          >
            ▲
          </button>
        </div>

        {/* Nút chiêu thức bên phải */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onTouchStart={() => handleTouch("punch", true)}
            onTouchEnd={() => handleTouch("punch", false)}
            className="bg-red-600/80 active:bg-red-500 text-white font-bold py-3 rounded-xl text-xs"
          >
            🥊 Đấm
          </button>
          <button
            onTouchStart={() => handleTouch("charge", true)}
            onTouchEnd={() => handleTouch("charge", false)}
            className="bg-cyan-600/80 active:bg-cyan-500 text-white font-bold py-3 rounded-xl text-xs"
          >
            ⚡ Ki
          </button>
          <button
            onTouchStart={() => handleTouch("kame", true)}
            onTouchEnd={() => handleTouch("kame", false)}
            className="bg-amber-500 active:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-xs"
          >
            💥 Kame
          </button>
        </div>
      </div>

    </div>
  );
}