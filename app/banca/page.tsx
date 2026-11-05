"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

interface Fish {
  id: number;
  type: 'small' | 'medium' | 'large' | 'boss' | 'rare';
  name: string;
  icon: string;
  x: number;
  y: number;
  speed: number;
  hp: number;
  maxHp: number;
  reward: number;
  size: number;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  bet: number;
}

const BET_LEVELS = [1, 10, 20, 50, 100, 1000];

const FISH_TYPES = [
  { type: 'small', name: 'Cá Vàng', icon: '🐠', hp: 2, reward: 5, size: 40, speed: 2 },
  { type: 'small', name: 'Cá Hề', icon: '🐟', hp: 3, reward: 8, size: 45, speed: 2.2 },
  { type: 'medium', name: 'Cá Mập Con', icon: '🐬', hp: 10, reward: 25, size: 65, speed: 1.5 },
  { type: 'large', name: 'Rùa Biển', icon: '🐢', hp: 25, reward: 60, size: 80, speed: 1 },
  { type: 'boss', name: 'Cá Mập Bự', icon: '🦈', hp: 60, reward: 150, size: 110, speed: 0.8 },
  { type: 'rare', name: 'Cá Voi Vàng (Jackpot)', icon: '🐳', hp: 120, reward: 400, size: 140, speed: 0.6 },
];

export default function BanCaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(1000);
  const [screen, setScreen] = useState<'lobby' | 'game'>('lobby');
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [activeRoom, setActiveRoom] = useState<string>('PHÒNG CHUNG #888');
  const [seatIndex, setSeatIndex] = useState<number>(0);

  // Game Settings
  const [currentBet, setCurrentBet] = useState<number>(10);
  const [isBigGun, setIsBigGun] = useState<boolean>(false);
  const [jackpot, setJackpot] = useState<number>(258900);

  // Gameplay entities
  const [fishes, setFishes] = useState<Fish[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [effects, setEffects] = useState<{ id: number; text: string; x: number; y: number; color: string }[]>([]);
  const [cannonAngle, setCannonAngle] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setPoints(userSnap.data().points || 1000);
          }
        } catch (err) {
          console.error("Lỗi lấy điểm user:", err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const updatePoints = async (newPts: number) => {
    setPoints(newPts);
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { points: newPts });
    } catch (err) {
      console.error("Lỗi cập nhật điểm:", err);
    }
  };

  // Khởi động phòng chơi
  const handleQuickJoin = () => {
    if (points < currentBet) {
      alert("Bạn không đủ điểm để tham gia bắn cá!");
      return;
    }
    setActiveRoom("PHÒNG CHUNG #888");
    setSeatIndex(Math.floor(Math.random() * 4));
    setScreen('game');
  };

  const handleJoinCustomRoom = () => {
    if (!roomCodeInput || roomCodeInput.length < 4) {
      alert("Vui lòng nhập mã phòng hợp lệ!");
      return;
    }
    setActiveRoom(`PHÒNG RIÊNG #${roomCodeInput.toUpperCase()}`);
    setSeatIndex(1);
    setScreen('game');
  };

  // Vòng lặp sinh cá & di chuyển cá (Animation bơi lội sinh động)
  useEffect(() => {
    if (screen !== 'game') return;

    // Sinh cá định kỳ
    const spawnInterval = setInterval(() => {
      setFishes(prev => {
        if (prev.length > 12) return prev; // Giới hạn số lượng cá
        const template = FISH_TYPES[Math.floor(Math.random() * FISH_TYPES.length)];
        const newFish: Fish = {
          id: Date.now() + Math.random(),
          type: template.type as any,
          name: template.name,
          icon: template.icon,
          x: -100,
          y: Math.random() * 450 + 50,
          speed: template.speed + Math.random() * 0.5,
          hp: template.hp,
          maxHp: template.hp,
          reward: template.reward,
          size: template.size
        };
        return [...prev, newFish];
      });
    }, 2500);

    // Game Loop (Cập nhật vị trí cá và đạn)
    const gameLoop = setInterval(() => {
      // 1. Di chuyển cá
      setFishes(prev => prev.map(f => {
        let nextX = f.x + f.speed;
        if (nextX > 900) {
          return { ...f, x: -100, y: Math.random() * 450 + 50 }; // Quay vòng bơi lại từ đầu
        }
        return { ...f, x: nextX };
      }));

      // 2. Di chuyển đạn & Kiểm tra va chạm
      setBullets(prevBullets => {
        const nextBullets: Bullet[] = [];
        prevBullets.forEach(b => {
          const dx = b.targetX - b.x;
          const dy = b.targetY - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 15) {
            // Đạn đã tới đích -> Gây sát thương cá xung quanh (Sát thương lan)
            triggerExplosion(b.targetX, b.targetY, b.damage, b.bet);
          } else {
            const nx = b.x + (dx / dist) * b.speed;
            const ny = b.y + (dy / dist) * b.speed;
            nextBullets.push({ ...b, x: nx, y: ny });
          }
        });
        return nextBullets;
      });

      // Tăng nhẹ Jackpot theo thời gian thực
      setJp(prev => prev + 1);

    }, 50);

    return () => {
      clearInterval(spawnInterval);
      clearInterval(gameLoop);
    };
  }, [screen]);

  const setJp = setJackpot;

  // Xử lý bắn súng
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (points < currentBet) {
      alert("Bạn đã hết điểm cược!");
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Trừ điểm cược đạn
    updatePoints(points - currentBet);

    // Tính góc súng hướng về điểm bắn
    const gunX = rect.width / 2;
    const gunY = rect.height - 40;
    const angle = Math.atan2(clickY - gunY, clickX - gunX) * (180 / Math.PI);
    setCannonAngle(angle + 90);

    // Tạo viên đạn bay tới mục tiêu
    const newBullet: Bullet = {
      id: Date.now(),
      x: gunX,
      y: gunY,
      targetX: clickX,
      targetY: clickY,
      speed: 25,
      damage: currentBet * (isBigGun ? 1.5 : 1),
      bet: currentBet
    };

    setBullets(prev => [...prev, newBullet]);
  };

  // Hiệu ứng nổ và sát thương lan / Crit
  const triggerExplosion = (x: number, y: number, damage: number, bet: number) => {
    setFishes(prevFishes => {
      let fishHit = false;
      const updated = prevFishes.map(f => {
        // Kiểm tra bán kính sát thương lan (Cược càng to, bán kính lan càng lớn)
        const radius = 60 + bet * 0.1;
        const dist = Math.sqrt((f.x - x) * (f.x - x) + (f.y - y) * (f.y - y));

        if (dist <= radius) {
          fishHit = true;
          // Cơ hội chí mạng (Crit) x2 sát thương ngẫu nhiên 20%
          const isCrit = Math.random() < 0.2;
          const finalDmg = isCrit ? damage * 2 : damage;
          const newHp = f.hp - finalDmg;

          if (isCrit) {
            showFloatingText("💥 CRIT x2!", x, y, "#facc15");
          }

          if (newHp <= 0) {
            // Tiêu diệt cá thành công!
            const earned = f.reward * (bet / 10 > 1 ? bet / 10 : 1);
            updatePoints(points + earned);
            showFloatingText(`+${earned} PTS`, f.x, f.y, "#4ade80");

            // Nếu bắn trúng Cá Voi Vàng -> Nổ Hũ Jackpot!
            if (f.type === 'rare') {
              const bonusJp = jackpot;
              updatePoints(points + earned + bonusJp);
              showFloatingText(`🎉 NỔ HŨ JACKPOT: +${bonusJp} PTS!`, 400, 200, "#ec4899");
              setJackpot(50000); // Reset hũ
            }

            return null; // Cá chết biến mất
          }
          return { ...f, hp: newHp };
        }
        return f;
      }).filter(Boolean) as Fish[];

      return updated;
    });
  };

  const showFloatingText = (text: string, x: number, y: number, color: string) => {
    const id = Date.now() + Math.random();
    setEffects(prev => [...prev, { id, text, x, y, color }]);
    setTimeout(() => {
      setEffects(prev => prev.filter(e => e.id !== id));
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-2 sm:p-4 font-sans select-none">
      {/* Header thanh thông tin */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-3 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shadow-lg">
        <Link href="/" className="text-xs font-bold text-amber-400 hover:text-amber-300 transition flex items-center gap-1">
          ← Trang chủ
        </Link>
        <h1 className="text-base sm:text-lg font-black tracking-wider text-cyan-400 uppercase flex items-center gap-1">
          🦈 BẮN CÁ ĐẠI DƯƠNG VIP
        </h1>
        <div className="text-xs bg-slate-800 px-3 py-1.5 rounded-xl border border-amber-500/30 font-bold text-amber-400">
          🪙 {points.toLocaleString()} PTS
        </div>
      </header>

      {/* MÀN HÌNH LOBBY CHỌN PHÒNG */}
      {screen === 'lobby' && (
        <div className="w-full max-w-md flex flex-col gap-4 mt-6">
          <div className="bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-500/30 p-6 rounded-3xl text-center shadow-2xl backdrop-blur-md">
            <div className="text-4xl mb-2">🌊 🐠 🐋 🦈</div>
            <h2 className="text-xl font-black text-cyan-300 mb-1">SẢNH BẮN CÁ NHIỀU NGƯỜI</h2>
            <p className="text-xs text-slate-400 mb-6">Tự động ghép phòng hoặc tạo phòng riêng chiến cùng anh em!</p>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 mb-6 text-amber-300 text-xs font-bold animate-pulse">
              🎁 HŨ JACKPOT HIỆN TẠI: {jackpot.toLocaleString()} PTS 🪙
            </div>

            <button
              onClick={handleQuickJoin}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black rounded-2xl shadow-lg hover:brightness-110 transition cursor-pointer text-sm mb-4 uppercase tracking-wider"
            >
              ⚡ CHƠI NGAY (Ghép Phòng Tự Động)
            </button>

            <div className="flex gap-2 mt-2">
              <input
                type="text"
                placeholder="NHẬP MÃ PHÒNG (VD: 1234)"
                maxLength={6}
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-center tracking-widest font-mono text-white focus:outline-none focus:border-cyan-500 text-xs uppercase"
              />
              <button
                onClick={handleJoinCustomRoom}
                className="px-6 bg-slate-800 hover:bg-slate-700 font-bold text-xs rounded-2xl transition cursor-pointer border border-slate-700"
              >
                Vào Phòng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MÀN HÌNH GAME BẮN CÁ */}
      {screen === 'game' && (
        <div className="flex flex-col items-center w-full max-w-4xl">
          {/* Thông tin phòng & Jackpot */}
          <div className="w-full flex justify-between items-center bg-slate-900 px-4 py-2 rounded-t-2xl border border-slate-800 text-xs font-bold">
            <span className="text-cyan-400 flex items-center gap-1">
              🌊 {activeRoom} | Ghế #{seatIndex + 1}
            </span>
            <span className="text-pink-400 font-black animate-bounce">
              🎁 JACKPOT: {jackpot.toLocaleString()} PTS
            </span>
            <button
              onClick={() => setScreen('lobby')}
              className="bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/40 px-3 py-1 rounded-lg text-xs transition cursor-pointer"
            >
              Rời Phòng ✖
            </button>
          </div>

          {/* KHU VỰC ĐẠI DƯƠNG BẮN CÁ (Interactive Canvas/Div Arena) */}
          <div
            onClick={handleCanvasClick}
            className="relative w-full h-[480px] sm:h-[540px] bg-gradient-to-b from-blue-900 via-blue-950 to-slate-950 border-4 border-blue-800/80 rounded-b-3xl shadow-2xl overflow-hidden cursor-crosshair"
          >
            {/* Hiệu ứng bong bóng nước nền */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] animate-pulse" />

            {/* DANH SÁCH CÁ BƠI LỘI */}
            {fishes.map(f => (
              <div
                key={f.id}
                style={{ transform: `translate(${f.x}px, ${f.y}px)`, width: f.size, height: f.size }}
                className="absolute transition-transform duration-75 flex flex-col items-center justify-center group select-none pointer-events-none"
              >
                <div className="text-3xl sm:text-4xl drop-shadow-[0_10px_8px_rgba(0,0,0,0.8)] animate-bounce">
                  {f.icon}
                </div>
                {/* Thanh máu ẩn nhẹ, chỉ hiển thị khi cá bị tấn công dưới maxHp */}
                {f.hp < f.maxHp && (
                  <div className="w-10 bg-slate-800 h-1 rounded-full overflow-hidden border border-slate-700 mt-0.5">
                    <div
                      className="bg-emerald-400 h-full transition-all duration-200"
                      style={{ width: `${(f.hp / f.maxHp) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* ĐẠN BAY */}
            {bullets.map(b => (
              <div
                key={b.id}
                style={{ left: b.x, top: b.y }}
                className="absolute w-3 h-3 bg-yellow-300 rounded-full shadow-[0_0_10px_#facc15] pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
              />
            ))}

            {/* HIỆU ỨNG SÁT THƯƠNG / CRIT / TIỀN THƯỞNG */}
            {effects.map(eff => (
              <div
                key={eff.id}
                style={{ left: eff.x, top: eff.y, color: eff.color }}
                className="absolute font-black text-sm sm:text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] pointer-events-none animate-fade-up transform -translate-x-1/2 -translate-y-1/2"
              >
                {eff.text}
              </div>
            ))}

            {/* CẦN SÚNG CỦA NGƯỜI CHƠI Ở ĐÁY MÀN HÌNH */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex flex-col items-center pointer-events-none">
              <div
                style={{ transform: `rotate(${cannonAngle}deg)` }}
                className="text-4xl sm:text-5xl transition-transform duration-100 drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]"
              >
                {isBigGun ? '🚀' : '🔫'}
              </div>
              <div className="bg-slate-900/80 border border-cyan-500/50 px-3 py-0.5 rounded-full text-[10px] text-cyan-300 font-bold mt-1">
                Cược: {currentBet} PTS
              </div>
            </div>
          </div>

          {/* BẢNG ĐIỀU KHIỂN SÚNG & CẤP CƯỢC ĐẠN */}
          <div className="w-full bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-2xl mt-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
            {/* Chọn cấp cược đạn */}
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center sm:text-left">
                Chọn Cấp Cược Đạn (Sát thương lan rộng theo cược)
              </span>
              <div className="grid grid-cols-6 gap-1.5">
                {BET_LEVELS.map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setCurrentBet(lvl)}
                    className={`py-2 px-2 text-xs font-black rounded-xl border transition cursor-pointer ${
                      currentBet === lvl
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-md scale-105'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Nút Phóng to súng / Đổi súng VIP */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setIsBigGun(!isBigGun)}
                className={`py-3 px-5 rounded-xl font-black text-xs transition cursor-pointer border shadow-md flex items-center gap-1.5 ${
                  isBigGun
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 border-pink-400 text-white animate-pulse'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>{isBigGun ? '🚀 SÚNG VIP (Kích hoạt)' : '🔭 Phóng to Súng'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}