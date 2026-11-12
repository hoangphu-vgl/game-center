"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

// --- CẤU HÌNH SUPABASE ---
const supabaseUrl = "https://iaejbvlibjfpdwuqfszp.supabase.co";
const supabaseKey = "sb_publishable_Bf1jY3-FAjFRij0LMn5FLQ_nLrw2MUE";
const supabase = createClient(supabaseUrl, supabaseKey, {
auth: {
persistSession: true,
autoRefreshToken: true,
detectSessionInUrl: true,
flowType: "pkce",
},
});

export default function ArenaCaPage() {
const \[isMounted, setIsMounted\] = useState(false);
const \[user, setUser\] = useState(null);
const \[score, setScore\] = useState(0);
const \[userAvatar, setUserAvatar\] = useState("/assets/avatar/xtra1.ico");
const \[fishInventory, setFishInventory\] = useState<any

\>(

);
const \[selectedFishIdx, setSelectedFishIdx\] = useState(0);

// Trạng thái trận đấu Auto Battle
const \[gameState, setGameState\] = useState<"lobby" | "scanning" | "fighting" | "result">("lobby");
const \[simSpeed, setSimSpeed\] = useState(1);
const \[winStreak, setWinStreak\] = useState(0);
const \[matchResult, setMatchResult\] = useState<{ won: boolean; text: string } | null>(null);

const canvasRef = useRef<HTMLCanvasElement | null>(null);
const containerRef = useRef<HTMLDivElement | null>(null);

// HUD state phản ứng real-time trên React
const \[hudState, setHudState\] = useState({
pName: "",
pRank: "D",
pWeight: 0,
pHp: 100,
pMaxHp: 100,
pKi: 20,
eName: "",
eRank: "D",
eWeight: 0,
eHp: 100,
eMaxHp: 100,
eKi: 20,
ultCutIn: { show: false, name: "", skill: "" }
});

const activeMatchRef = useRef(null);

// 1. Đồng bộ Profile, Balance & Kho cá từ Supabase
useEffect(() => {
setIsMounted(true);
async function fetchUserData(currentUser: any) {
if (!currentUser) return;
setUser(currentUser);

```
  const { data } = await supabase
    .from("profiles")
    .select("balance, avatar_url, inventory")
    .eq("id", currentUser.id)
    .single();

  if (data) {
    if (data.balance !== undefined) setScore(Number(data.balance));
    if (data.avatar_url) setUserAvatar(data.avatar_url);

    if (data.inventory && typeof data.inventory === "object") {
      const fishes = data.inventory.fish_inventory || [];
      setFishInventory(fishes);
    }
  }
}

supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) fetchUserData(session.user);
});

const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) fetchUserData(session.user);
});

return () => {
  authListener.subscription.unsubscribe();
};


```

}, 

);

// 2. Bắt đầu trận đấu PvE Auto-Battle
const startPvEMatch = () => {
if (fishInventory.length === 0) {
alert("Ní chưa có con cá nào trong kho cá! Hãy đi câu hoặc thả hồ nuôi trước nhé.");
return;
}

```
setGameState("scanning");
setTimeout(() => {
  setGameState("fighting");
  initCanvasBattle();
}, 1300);


```

};

const initCanvasBattle = () => {
const canvas = canvasRef.current;
if (!canvas) return;
const ctx = canvas.getContext("2d");
if (!ctx) return;

```
const rawPlayerFish = fishInventory[selectedFishIdx] || fishInventory[0];

// Xây dựng thông số chiến đấu chuẩn từ cấu trúc cơ sở dữ liệu cá của bạn
const pWeight = rawPlayerFish.weight || 25;
const pPower = rawPlayerFish.power || Math.max(20, Math.sqrt(pWeight) * 15);
const pDefense = rawPlayerFish.defense || Math.max(15, Math.sqrt(pWeight) * 12);
const pHpMax = rawPlayerFish.arenaHp || Math.max(200, pWeight * 20);

const playerFighter = {
  name: rawPlayerFish.vnName || "Cá Cưng",
  rank: rawPlayerFish.rank || "D",
  weight: pWeight,
  maxHp: pHpMax,
  hp: pHpMax,
  atk: pPower,
  def: pDefense,
  kiGain: 15,
  ki: 25,
  maxKi: 100,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  homeX: 0,
  homeY: 0,
  dir: 1,
  baseScale: Math.min(1.3, 0.7 + (pWeight / 500) * 0.4),
  currentScale: 1.0,
  bodyColor: "#f59e0b",
  bellyColor: "#fef9c3",
  finColor: "#ea580c",
  auraColor: "#facc15",
  auraCore: "#ffffff",
  filename: rawPlayerFish.filename,
  aiState: "CIRCLING",
  aiTimer: 1.0,
  powerBuff: 1.0,
  superSaiyan: false,
  swimPhase: Math.random() * Math.PI * 2,
  flashTimer: 0,
  speech: "Đã sẵn sàng chiến đấu!",
  speechTimer: 2.5
};

// Tạo đối thủ PvE ngẫu nhiên tương xứng cân nặng
const enemyWeight = +(pWeight * (0.8 + Math.random() * 0.5)).toFixed(1);
const enemyPower = Math.floor(pPower * (0.85 + Math.random() * 0.3));
const enemyHpMax = Math.floor(pHpMax * (0.85 + Math.random() * 0.3));
const enemyPoolFilenames = ["camaptrang.png", "caduoimata.png", "camapdaubua.png", "calochoangde.png", "cahuyetlong.png"];
const enemyFilename = enemyPoolFilenames[Math.floor(Math.random() * enemyPoolFilenames.length)];

const enemyFighter = {
  name: "Thủy Quái Hoang Dã",
  rank: ['S', 'A', 'B', 'C', 'D'][Math.floor(Math.random() * 5)],
  weight: enemyWeight,
  maxHp: enemyHpMax,
  hp: enemyHpMax,
  atk: enemyPower,
  def: Math.floor(pDefense * 0.9),
  kiGain: 14,
  ki: 20,
  maxKi: 100,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  homeX: 0,
  homeY: 0,
  dir: -1,
  baseScale: Math.min(1.3, 0.7 + (enemyWeight / 500) * 0.4),
  currentScale: 1.0,
  bodyColor: "#0ea5e9",
  bellyColor: "#f0f9ff",
  finColor: "#0369a1",
  auraColor: "#38bdf8",
  auraCore: "#ffffff",
  filename: enemyFilename,
  aiState: "CIRCLING",
  aiTimer: 1.2,
  powerBuff: 1.0,
  superSaiyan: false,
  swimPhase: Math.random() * Math.PI * 2,
  flashTimer: 0,
  speech: "Gầm... Nộp mạng đi!",
  speechTimer: 2.5
};

// Load ảnh cá thực tế từ kho dự án của bạn (/assets/cauca/...)
const pImg = new Image();
pImg.src = `/assets/cauca/${playerFighter.filename}`;
const eImg = new Image();
eImg.src = `/assets/cauca/${enemyFighter.filename}`;

let width = 800;
let height = 450;
let dpr = Math.min(window.devicePixelRatio || 1, 2);

const resizeCanvas = () => {
  if (!containerRef.current || !canvas) return;
  const rect = containerRef.current.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};
resizeCanvas();

// Môi trường & Hiệu ứng
let bubbles: any[] = [];
for (let i = 0; i < 25; i++) {
  bubbles.push({ x: Math.random() * width, y: Math.random() * height, r: 2 + Math.random() * 4, speed: 0.5 + Math.random() });
}

let particles: any[] = [];
let shockwaves: any[] = [];
let floatingTexts: any[] = [];
let glassCracks: any[] = [];
let activeUltVfx: any = null;
let clashState: any = null;
let shakeTime = 0;
let shakeIntensity = 0;
let hitStopTimer = 0;
let cameraZoom = 1.0;
let cutInTimer = 0;
let cutInData = { show: false, name: "", skill: "" };

const spawnParticles = (x: number, y: number, color: string, count = 15) => {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 150;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 2 + Math.random() * 4, color: Math.random() > 0.4 ? color : "#ffffff", life: 0.5, maxLife: 0.5 });
  }
};

const spawnShockwave = (x: number, y: number, color: string, maxR = 100) => {
  shockwaves.push({ x, y, r: 10, maxR, color, life: 0.4, maxLife: 0.4 });
};

const spawnFloatingText = (x: number, y: number, text: string, color = "#fff", size = 18) => {
  floatingTexts.push({ x, y, vy: -50, text, color, size, life: 0.9, maxLife: 0.9 });
};

const spawnGlassCrack = (x: number, y: number) => {
  const lines = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.random() * 0.3;
    lines.push({ x1: x, y1: y, x2: x + Math.cos(a) * 30, y2: y + Math.sin(a) * 30 });
  }
  glassCracks.push({ lines, alpha: 0.65 });
};

// AI Quyết định hành động
const decideAiAction = (attacker: any, defender: any) => {
  if (attacker.ki >= attacker.maxKi) {
    executeUltimate(attacker, defender);
    return;
  }
  if (attacker.ki < 60 && Math.random() < 0.45) {
    attacker.aiState = "CHARGING";
    attacker.aiTimer = 0.7;
    attacker.ki = Math.min(attacker.maxKi, attacker.ki + 30);
    attacker.powerBuff = Math.min(1.8, attacker.powerBuff + 0.3);
    spawnShockwave(attacker.x, attacker.y, attacker.auraColor, 80);
    spawnParticles(attacker.x, attacker.y, attacker.auraColor, 14);
    spawnFloatingText(attacker.x, attacker.y - 40, `🔥 GỒNG KI! (x${attacker.powerBuff.toFixed(1)})`, "#fde047", 14);
    return;
  }
  attacker.aiState = "DASH_ATTACK";
  attacker.aiTimer = 0.45;
  const dx = defender.x - attacker.x;
  const dy = defender.y - attacker.y;
  const dist = Math.hypot(dx, dy) || 1;
  const dashSpeed = 650;
  attacker.vx = (dx / dist) * dashSpeed;
  attacker.vy = (dy / dist) * dashSpeed;
  attacker.dir = dx >= 0 ? 1 : -1;
  spawnShockwave(attacker.x, attacker.y, attacker.auraColor, 60);
};

const executeUltimate = (attacker: any, defender: any) => {
  attacker.ki = 0;
  attacker.aiState = "CAST_ULTIMATE";
  attacker.aiTimer = 0.8;
  const dmg = Math.round(attacker.atk * 2.5 * attacker.powerBuff);
  attacker.powerBuff = 1.0;

  cutInData = { show: true, name: attacker.name, skill: "⚡ KAMEHAMEHA THỦY LONG!" };
  cutInTimer = 1.0;
  cameraZoom = 1.05;

  activeUltVfx = {
    type: "beam",
    x1: attacker.x + attacker.dir * 40,
    y1: attacker.y,
    x2: defender.x,
    y2: defender.y,
    color: attacker.auraColor,
    life: 0.7
  };

  applyDamage(attacker, defender, dmg, true);
  spawnGlassCrack(defender.x, defender.y);
};

const applyDamage = (attacker: any, defender: any, rawDmg: number, isCrit = false) => {
  const netDmg = Math.max(10, Math.round(rawDmg - defender.def * 0.4));
  defender.hp = Math.max(0, defender.hp - netDmg);
  defender.flashTimer = 0.15;
  defender.ki = Math.min(defender.maxKi, defender.ki + 12);
  attacker.ki = Math.min(defender.maxKi, defender.ki + 10);

  if (defender.aiState === "DASH_ATTACK") defender.aiState = "CIRCLING";
  defender.vx = (defender.x >= attacker.x ? 1 : -1) * 350;

  hitStopTimer = isCrit ? 0.06 : 0.035;
  shakeIntensity = isCrit ? 14 : 7;
  shakeTime = isCrit ? 0.3 : 0.18;

  const midX = (attacker.x + defender.x) / 2;
  const midY = (attacker.y + defender.y) / 2;
  spawnShockwave(midX, midY, isCrit ? "#facc15" : "#38bdf8", isCrit ? 140 : 90);
  spawnParticles(midX, midY, attacker.auraColor, isCrit ? 25 : 14);
  spawnFloatingText(defender.x, defender.y - 40, isCrit ? `💥 -${netDmg} CHÍ MẠNG!` : `-${netDmg}`, isCrit ? "#facc15" : "#ffffff", isCrit ? 20 : 16);

  if (defender.hp <= 0) {
    endMatch(attacker === playerFighter);
  }
};

const endMatch = async (playerWon: boolean) => {
  setGameState("result");
  setMatchResult({
    won: playerWon,
    text: playerWon ? `Cá ${playerFighter.name} đã giành chiến thắng thuyết phục!` : `Cá ${enemyFighter.name} quá mạnh, hãy bồi dưỡng thêm ở hồ!`
  });

  if (playerWon) {
    setWinStreak((prev) => prev + 1);
    const rewardXu = 5000;
    const newScore = score + rewardXu;
    setScore(newScore);
    if (user?.id) {
      await supabase.from("profiles").update({ balance: newScore }).eq("id", user.id);
    }
  } else {
    setWinStreak(0);
  }
};

let lastTime = 0;
const loop = (timestamp: number) => {
  if (!lastTime) lastTime = timestamp;
  const rawDt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  const dt = rawDt * simSpeed;

  if (hitStopTimer > 0) {
    hitStopTimer -= rawDt;
    activeMatchRef.current = requestAnimationFrame(loop);
    return;
  }

  if (shakeTime > 0) shakeTime = Math.max(0, shakeTime - rawDt);
  cameraZoom += (1.0 - cameraZoom) * 6 * rawDt;

  if (cutInTimer > 0) {
    cutInTimer -= rawDt;
    if (cutInTimer <= 0) cutInData.show = false;
  }

  // Cập nhật vị trí nhà
  playerFighter.homeX = width * 0.28;
  playerFighter.homeY = height * 0.55;
  enemyFighter.homeX = width * 0.72;
  enemyFighter.homeY = height * 0.55;

  // Cập nhật AI cho từng cá
  const updateFishAI = (fish: any, opp: any) => {
    fish.swimPhase += dt * (fish.aiState === "CHARGING" ? 16 : 6);
    if (fish.flashTimer > 0) fish.flashTimer = Math.max(0, fish.flashTimer - dt);
    fish.ki = Math.min(fish.maxKi, fish.ki + fish.kiGain * dt);

    fish.aiTimer -= dt;
    if (fish.aiTimer <= 0) {
      if (fish.aiState !== "CIRCLING") {
        fish.aiState = "CIRCLING";
        fish.aiTimer = 0.5 + Math.random() * 0.6;
      } else {
        decideAiAction(fish, opp);
      }
    }

    if (fish.aiState !== "DASH_ATTACK") {
      const targetX = fish.homeX + Math.cos(fish.swimPhase * 0.5) * 15;
      const targetY = fish.homeY + Math.sin(fish.swimPhase * 0.8) * 18;
      fish.vx += (targetX - fish.x) * 7 * dt;
      fish.vy += (targetY - fish.y) * 7 * dt;
      fish.vx *= 0.85;
      fish.vy *= 0.85;
      fish.dir = opp.x >= fish.x ? 1 : -1;
    }

    fish.x += fish.vx * dt;
    fish.y += fish.vy * dt;
  };

  if (gameState === "fighting") {
    updateFishAI(playerFighter, enemyFighter);
    updateFishAI(enemyFighter, playerFighter);

    // Va chạm húc nhau
    const dist = Math.hypot(playerFighter.x - enemyFighter.x, playerFighter.y - enemyFighter.y);
    if (dist < 70) {
      if (playerFighter.aiState === "DASH_ATTACK" && enemyFighter.aiState === "DASH_ATTACK") {
        const midX = (playerFighter.x + enemyFighter.x) / 2;
        const midY = (playerFighter.y + enemyFighter.y) / 2;
        playerFighter.x = midX - 30;
        enemyFighter.x = midX + 30;
        playerFighter.aiState = "CIRCLING";
        enemyFighter.aiState = "CIRCLING";
        spawnShockwave(midX, midY, "#ffffff", 150);
        spawnGlassCrack(midX, midY);
      } else if (playerFighter.aiState === "DASH_ATTACK") {
        playerFighter.aiState = "CIRCLING";
        const dmg = Math.round(playerFighter.atk * playerFighter.powerBuff);
        playerFighter.powerBuff = 1.0;
        applyDamage(playerFighter, enemyFighter, dmg, Math.random() < 0.25);
      } else if (enemyFighter.aiState === "DASH_ATTACK") {
        enemyFighter.aiState = "CIRCLING";
        const dmg = Math.round(enemyFighter.atk * enemyFighter.powerBuff);
        enemyFighter.powerBuff = 1.0;
        applyDamage(enemyFighter, playerFighter, dmg, Math.random() < 0.25);
      }
    }
  }

  // Cập nhật React HUD state định kỳ
  setHudState({
    pName: playerFighter.name,
    pRank: playerFighter.rank,
    pWeight: playerFighter.weight,
    pHp: playerFighter.hp,
    pMaxHp: playerFighter.maxHp,
    pKi: playerFighter.ki,
    eName: enemyFighter.name,
    eRank: enemyFighter.rank,
    eWeight: enemyFighter.weight,
    eHp: enemyFighter.hp,
    eMaxHp: enemyFighter.maxHp,
    eKi: enemyFighter.ki,
    ultCutIn: cutInData
  });

  // --- VẼ CANVAS ---
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  if (shakeTime > 0) {
    ctx.translate((Math.random() - 0.5) * shakeIntensity, (Math.random() - 0.5) * shakeIntensity);
  }

  // Nền nước biển sâu
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, "#0369a1");
  bgGrad.addColorStop(0.5, "#0c4a6e");
  bgGrad.addColorStop(1, "#020617");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Bong bóng
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1.2;
  for (const b of bubbles) {
    b.y -= b.speed;
    if (b.y < 0) b.y = height;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Vẽ cá chiến đấu
  const drawFish = (fish: any, imgObj: HTMLImageElement) => {
    ctx.save();
    ctx.translate(fish.x, fish.y);
    ctx.scale(fish.dir * fish.baseScale, fish.baseScale);
    if (fish.flashTimer > 0) ctx.filter = "brightness(2.2)";

    if (imgObj && imgObj.complete && imgObj.naturalWidth !== 0) {
      ctx.drawImage(imgObj, -50, -35, 100, 70);
    } else {
      ctx.fillStyle = fish.bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, 40, 25, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  drawFish(playerFighter, pImg);
  drawFish(enemyFighter, eImg);

  // Hiệu ứng sóng & hạt
  for (const sw of shockwaves) {
    sw.life -= dt;
    sw.r += 120 * dt;
    ctx.strokeStyle = sw.color;
    ctx.globalAlpha = Math.max(0, sw.life / sw.maxLife);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  for (const p of particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const ft of floatingTexts) {
    ft.life -= dt;
    ft.y += ft.vy * dt;
    ctx.font = `800 ${ft.size}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = ft.color;
    ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.globalAlpha = 1;
  }

  for (const c of glassCracks) {
    ctx.strokeStyle = `rgba(255,255,255,${c.alpha})`;
    ctx.lineWidth = 1.5;
    for (const l of c.lines) {
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
    }
  }

  ctx.restore();
  activeMatchRef.current = requestAnimationFrame(loop);
};

activeMatchRef.current = requestAnimationFrame(loop);

return () => {
  if (activeMatchRef.current) cancelAnimationFrame(activeMatchRef.current);
};


```

}, \[gameState, selectedFishIdx\]);

return (

```
  {/* TOP BAR / HEADER */}
  <div className="flex justify-between items-center z-50">
    <Link href="/caucamulti/hoca" className="bg-slate-900 border border-sky-500/40 text-sky-400 px-3 py-1.5 rounded-xl font-black text-xs shadow flex items-center gap-1">
      ← Quay Lại Hồ Cá
    </Link>
    <div className="bg-slate-900/90 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5">
      <img src={userAvatar} className="w-5 h-5 rounded-full border border-amber-400 object-cover" />
      <span className="text-yellow-300">{score.toLocaleString()}🪙</span>
    </div>
  </div>

  {/* LOBBY CHỌN CÁ ĐẤU */}
  {gameState === "lobby" && (
    <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-slate-900 border-2 border-cyan-500/60 p-6 rounded-3xl shadow-2xl text-center space-y-4">
        <h2 className="text-2xl font-black text-cyan-400 uppercase tracking-widest">⚔️ ĐẤU TRƯỜNG CHỌI CÁ (PVE)</h2>
        <p className="text-xs text-slate-300 font-bold">Chọn con cá cưng từ kho để đưa vào lôi đài tự động chiến đấu!</p>

        {fishInventory.length === 0 ? (
          <div className="text-rose-400 text-xs font-bold py-6">Kho cá trống! Hãy đi câu cá hoặc nuôi cá trước.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto p-1">
            {fishInventory.map((fish, idx) => (
              <div
                key={fish.id || idx}
                onClick={() => setSelectedFishIdx(idx)}
                className={`bg-slate-950 border-2 rounded-2xl p-3 flex flex-col items-center cursor-pointer transition ${
                  selectedFishIdx === idx ? "border-cyan-400 bg-cyan-950/30 scale-105" : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <img src={`/assets/cauca/${fish.filename}`} className="h-16 object-contain mb-2 drop-shadow" />
                <h4 className="text-[11px] font-black text-amber-300 truncate w-full">[{fish.rank || 'D'}] {fish.vnName}</h4>
                <p className="text-[10px] text-slate-400 font-bold">Nặng: {fish.weight} kg</p>
                <div className="flex gap-2 text-[9px] font-bold mt-1 text-slate-300">
                  <span className="text-rose-400">⚔️ {fish.power || 20}</span>
                  <span className="text-emerald-400">❤️ {fish.arenaHp || 200}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          disabled={fishInventory.length === 0}
          onClick={startPvEMatch}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-4 rounded-xl text-sm uppercase shadow-xl transition cursor-pointer"
        >
          🚀 BẮT ĐẦU QUÉT ĐỐI THỦ (AUTO PVE)
        </button>
      </div>
    </div>
  )}

  {/* MÀN HÌNH QUÉT RADAR PVE */}
  {gameState === "scanning" && (
    <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
      <div className="w-28 h-28 rounded-full border-2 border-cyan-400/60 flex items-center justify-center mb-4 bg-cyan-950/40 animate-pulse">
        <span className="text-4xl">📡</span>
      </div>
      <div className="font-black text-xl text-cyan-300 uppercase">Đang dò tìm thủy quái hoang dã...</div>
    </div>
  )}

  {/* HUD TRẬN ĐẤU (KHI ĐANG FIGHTING) */}
  {gameState === "fighting" && (
    <header className="w-full max-w-4xl mx-auto z-10 flex flex-col gap-1.5 bg-slate-900/85 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-2.5 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        {/* PLAYER HUD */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-1 mb-1">
            <span className="font-black text-sm text-amber-300 truncate">[{hudState.pRank}] {hudState.pName}</span>
            <span className="text-xs text-cyan-300">{hudState.pWeight} kg</span>
          </div>
          <div className="w-full h-3.5 bg-slate-800 rounded-full p-0.5 overflow-hidden relative border border-slate-700">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(hudState.pHp / hudState.pMaxHp) * 100}%` }}></div>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">{hudState.pHp} / {hudState.pMaxHp}</span>
          </div>
        </div>

        <div className="px-2 text-center">
          <span className="font-extrabold text-lg text-yellow-400 italic">VS</span>
          <div className="text-[9px] font-bold text-emerald-400">Chuỗi: {winStreak}🔥</div>
        </div>

        {/* ENEMY HUD */}
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-baseline justify-between gap-1 mb-1 flex-row-reverse">
            <span className="font-black text-sm text-cyan-300 truncate">[{hudState.eRank}] {hudState.eName}</span>
            <span className="text-xs text-amber-300">{hudState.eWeight} kg</span>
          </div>
          <div className="w-full h-3.5 bg-slate-800 rounded-full p-0.5 overflow-hidden relative border border-slate-700">
            <div className="h-full bg-rose-500 rounded-full transition-all ml-auto" style={{ width: `${(hudState.eHp / hudState.eMaxHp) * 100}%` }}></div>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">{hudState.eHp} / {hudState.eMaxHp}</span>
          </div>
        </div>
      </div>
    </header>
  )}

  {/* CANVAS CONTAINER */}
  <main ref={containerRef} className="relative flex-1 w-full max-w-4xl mx-auto my-2 rounded-2xl overflow-hidden border-2 border-cyan-400/40 shadow-xl bg-sky-950">
    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block"></canvas>

    {/* CULT-IN BANNER */}
    {hudState.ultCutIn.show && (
      <div className="absolute inset-x-0 top-1/4 flex items-center justify-center z-20 pointer-events-none">
        <div className="px-6 py-2 bg-amber-500/90 border-y-2 border-yellow-200 text-center transform -skew-x-12 shadow-2xl">
          <div className="text-[10px] font-black uppercase text-slate-950">{hudState.ultCutIn.name}</div>
          <div className="font-extrabold text-xl sm:text-2xl text-white drop-shadow">{hudState.ultCutIn.skill}</div>
        </div>
      </div>
    )}
  </main>

  {/* KẾT QUẢ TRẬN ĐẤU */}
  {gameState === "result" && matchResult && (
    <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
      <div className={`font-extrabold text-3xl sm:text-4xl italic mb-2 ${matchResult.won ? "text-yellow-400" : "text-rose-400"}`}>
        {matchResult.won ? "🏆 CHIẾN THẮNG (+5,000🪙)!" : "😵 THẤT BẠI!"}
      </div>
      <p className="text-xs text-slate-200 max-w-md mb-5">{matchResult.text}</p>
      <div className="flex gap-3">
        <button onClick={() => setGameState("lobby")} className="bg-emerald-500 text-slate-950 font-black px-6 py-3 rounded-xl text-xs uppercase shadow cursor-pointer">
          ⚔️ Đấu Trận Khác
        </button>
        <Link href="/caucamulti/hoca" className="bg-cyan-500 text-slate-950 font-black px-6 py-3 rounded-xl text-xs uppercase shadow cursor-pointer">
          🌊 Về Lại Hồ Cá
        </Link>
      </div>
    </div>
  )}

  {/* FOOTER ĐIỀU KHIỂN AUTO */}
  {gameState === "fighting" && (
    <footer className="w-full max-w-4xl mx-auto z-10 grid grid-cols-2 gap-2">
      <button
        onClick={() => setSimSpeed(simSpeed === 1 ? 2 : simSpeed === 2 ? 3 : 1)}
        className="bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950 font-black py-2.5 rounded-xl shadow text-xs uppercase cursor-pointer"
      >
        ⏩ Tốc Độ: {simSpeed}x
      </button>
      <button
        onClick={() => setGameState("lobby")}
        className="bg-gradient-to-b from-rose-500 to-red-700 text-white font-black py-2.5 rounded-xl shadow text-xs uppercase cursor-pointer"
      >
        🏳️ Đầu Hàng / Thoát
      </button>
    </footer>
  )}
</div>


```

);
}

```


```