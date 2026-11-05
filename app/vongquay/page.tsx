"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const REWARDS = [
  { label: "🥤 Nước Suối", type: "water", weight: 6, color: "#06b6d4" },
  { label: "💀 Yamcha", type: "empty", weight: 15, color: "#ef4444" },
  { label: "💵 1.000đ", type: "money", value: 1000, weight: 10, color: "#eab308" },
  { label: "🍩 Majin Buu", type: "empty", weight: 18, color: "#f97316" },
  { label: "🎟️ +1 Lượt", type: "spin", value: 1, weight: 10, color: "#a855f7" },
  { label: "🌌 Zeno", type: "empty", weight: 17, color: "#64748b" },
  { label: "🫘 Lọc Thận", type: "special", weight: 4, color: "#22c55e" },
  { label: "🚀 Tàu Pảy Pảy", type: "empty", weight: 20, color: "#ec4899" },
];

export default function VongQuayPage() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [luckySpins, setLuckySpins] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResultModal, setSpinResultModal] = useState<string | null>(null);
  const [lastIndex, setLastIndex] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef<number>(0);

  const totalWeight = REWARDS.reduce((sum, r) => sum + r.weight, 0);

  let currentAngle = 0;
  const sectors = REWARDS.map((r) => {
    const angleSize = (r.weight / totalWeight) * 360;
    const sector = {
      ...r,
      start: currentAngle,
      end: currentAngle + angleSize,
      middle: currentAngle + angleSize / 2,
    };
    currentAngle += angleSize;
    return sector;
  });

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = 250, cy = 250, radius = 245;
    ctx.clearRect(0, 0, 500, 500);

    sectors.forEach((sector) => {
      const start = (sector.start * Math.PI) / 180;
      const end = (sector.end * Math.PI) / 180;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();

      ctx.fillStyle = sector.color;
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((sector.middle * Math.PI) / 180);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 17px Arial";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 4;
      ctx.fillText(sector.label, 205, 0);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fillStyle = "#f59e0b";
    ctx.fill();
  };

  useEffect(() => {
    // Đảm bảo canvas render ngay khi component mount
    const timer = setTimeout(() => {
      drawWheel();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setPoints(data.points || 0);
          setLuckySpins(data.luckySpins !== undefined ? data.luckySpins : 3);
        }
      }
      setLoading(false);
      setTimeout(drawWheel, 100);
    });
    return () => unsubscribe();
  }, []);

  const spinWheel = async () => {
    if (isSpinning) return;
    
    // Kiểm tra gắt gao: Không có lượt thì nhịn!
    if (luckySpins <= 0) {
      alert("⚡ Hết lượt quay rồi ní ơi! Không có lượt thì nhịn nhé, hãy ghé Shop mua thêm lượt!");
      return;
    }

    setIsSpinning(true);
    setSpinResultModal(null);

    const newSpins = luckySpins - 1;
    setLuckySpins(newSpins);
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid), { luckySpins: newSpins }, { merge: true });
      } catch (e) {
        console.error(e);
      }
    }

    let targetIndex = 0;
    let attempts = 0;
    do {
      const randWeight = Math.random() * totalWeight;
      let accumulated = 0;
      for (let i = 0; i < sectors.length; i++) {
        accumulated += REWARDS[i].weight;
        if (randWeight <= accumulated) {
          targetIndex = i;
          break;
        }
      }
      attempts++;
      if (targetIndex !== lastIndex || attempts > 3) break;
    } while (true);

    setLastIndex(targetIndex);

    const winningSector = sectors[targetIndex];
    const targetMiddleAngle = (winningSector.start + winningSector.end) / 2;
    const desiredDegree = 270 - targetMiddleAngle;

    const currentNormalized = rotationRef.current % 360;
    const extraOffset = (desiredDegree - currentNormalized + 360) % 360;
    rotationRef.current += 360 * 8 + extraOffset;

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.transform = `rotate(${rotationRef.current}deg)`;
    }

    setTimeout(async () => {
      setIsSpinning(false);
      const prize = REWARDS[targetIndex];
      let msg = `🎉 Chúc mừng ní trúng: ${prize.label}`;

      if (prize.type === "spin") {
        const updatedSpins = newSpins + (prize.value || 1);
        setLuckySpins(updatedSpins);
        if (user) {
          await setDoc(doc(db, "users", user.uid), { luckySpins: updatedSpins }, { merge: true });
        }
        msg = `🔥 QUÁ ĐỈNH! Ultra Instinct kích hoạt, trúng ngay +1 Lượt Quay Miễn Phí!`;
      } else if (prize.type === "money") {
        msg = `💰 Rồng Thần ban phước! Ní nhận ngay phần thưởng ${prize.label}! Chụp màn hình báo Admin ngay!`;
      } else if (prize.type === "special") {
        msg = `🫘 Ní trúng 1 Chai Lọc Thận thần dược! Uống xong trẻ lại 10 tuổi, gánh tạ siêu mượt!`;
      } else if (prize.type === "water") {
        msg = `🥤 Khát nước quá hả ní? Trúng ngay 1 Chai Nước Suối mát lạnh từ Đấu Trường!`;
      } else {
        const trollQuotes = [
          "💀 Yamcha nằm đất! Ki của ní chưa đủ tầm nhận quà rồi, quay lại tu luyện đi!",
          "🍩 Bị Majin Buu biến thành kẹo sô-cô-la nuốt chửng mất tiêu phần thưởng!",
          "🌌 Zeno-sama vừa ngứa tay xoá sổ ô quà của ní khỏi đa vũ trụ!",
          "🚀 Tàu Pảy Pảy phóng qua cướp mất phần thưởng rồi, cay chưa ní!"
        ];
        msg = trollQuotes[Math.floor(Math.random() * trollQuotes.length)];
      }

      setSpinResultModal(msg);
    }, 4100);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-purple-400 font-black animate-pulse">
        ĐANG TẢI VÒNG QUAY NGỌC RỒNG...
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-white font-sans select-none p-4 sm:p-8 space-y-8">
        <div className="max-w-4xl mx-auto flex justify-between items-center bg-slate-900/90 border border-purple-500/40 px-6 py-4 rounded-2xl shadow-xl backdrop-blur-md">
          <Link href="/" className="text-xs font-bold text-slate-400 hover:text-amber-400 transition">
            ← Quay lại Trang Chủ
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-amber-500/40">
              <span>⚡</span>
              <span className="font-black text-amber-400">{points.toLocaleString()} PTS</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-purple-500/40">
              <span>🎟️</span>
              <span className="font-black text-purple-300">{luckySpins} Lượt Quay</span>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto bg-gradient-to-br from-slate-900 via-purple-950/40 to-slate-900 border-2 border-purple-500/50 rounded-3xl p-6 sm:p-10 shadow-2xl text-center space-y-6">
          <div className="space-y-2">
            <div className="inline-block px-4 py-1 bg-purple-500/20 border border-purple-400/40 rounded-full text-xs font-bold text-purple-300 uppercase tracking-widest">
              ✨ Vòng Quay Sức Mạnh Vũ Trụ
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-400 to-amber-400">
              🎡 VÒNG QUAY NGỌC RỒNG MAY MẮN
            </h1>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Quay ngay để rinh quà xịn (Nước suối, Tiền mặt, 1 Chai Lọc Thận), né các ô Yamcha và Majin Buu nhé!
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-10">
            {/* Vòng quay Canvas mượt mà, hiển thị chuẩn 100% */}
            <div className="relative w-[340px] h-[340px] sm:w-[400px] sm:h-[400px] flex items-center justify-center">
              <div className="absolute -top-3 z-30 text-3xl animate-bounce drop-shadow-[0_2px_8px_rgba(255,255,255,0.8)]">🔻</div>
              <canvas
                ref={canvasRef}
                width={500}
                height={500}
                className="w-full h-full rounded-full border-8 border-amber-400 shadow-[0_0_40px_rgba(168,85,247,0.6)]"
                style={{
                  transition: isSpinning ? "transform 4s cubic-bezier(0.15, 0.85, 0.15, 1)" : "none",
                }}
              />
              <div className="absolute z-20 w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border-4 border-slate-950 shadow-2xl flex items-center justify-center text-2xl font-black">
                🐉
              </div>
            </div>

            <div className="bg-slate-950/90 border border-purple-500/40 rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 text-center shadow-2xl">
              <div className="flex justify-between items-center bg-purple-950/60 border border-purple-500/30 px-4 py-3 rounded-2xl">
                <span className="text-xs font-bold text-purple-300">Lượt Quay Có Sẵn:</span>
                <span className="text-xl font-black text-amber-400">{luckySpins} 🎟️</span>
              </div>

              <button
                onClick={spinWheel}
                disabled={isSpinning || luckySpins <= 0}
                className={`w-full py-4 rounded-2xl font-black text-base uppercase tracking-wider transition shadow-lg cursor-pointer ${
                  isSpinning || luckySpins <= 0
                    ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                    : "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 hover:brightness-110 text-slate-950 shadow-amber-500/30 active:scale-95 animate-pulse"
                }`}
              >
                {isSpinning ? "🌀 ĐANG KÊU GỌI RỒNG THẦN..." : luckySpins <= 0 ? "🔒 HẾT LƯỢT QUAY (NHỊN)" : "🎰 QUAY NGAY (1 LƯỢT)"}
              </button>

              <Link
                href="/shop"
                className="block w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition shadow"
              >
                🛍️ Ghé Shop Mua Thêm Lượt Quay
              </Link>
            </div>
          </div>

          {spinResultModal && (
            <div className="bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-pink-500/20 border-2 border-amber-400/80 rounded-2xl p-4 text-center animate-bounce shadow-2xl max-w-md mx-auto">
              <div className="text-base font-black text-amber-300">✨ KẾT QUẢ VÒNG QUAY VŨ TRỤ ✨</div>
              <div className="text-sm font-bold text-white mt-1">{spinResultModal}</div>
              <button
                onClick={() => setSpinResultModal(null)}
                className="mt-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-1.5 rounded-xl transition cursor-pointer"
              >
                Đã rõ, chiến tiếp!
              </button>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}