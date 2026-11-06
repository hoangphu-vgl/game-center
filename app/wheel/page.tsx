"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const WHEEL_REWARDS = [
  { label: "+500 PTS", type: "pts", val: 500 },
  { label: "+1.000 PTS", type: "pts", val: 1000 },
  { label: "+5.000 PTS", type: "pts", val: 5000 },
  { label: "+1 Lượt Quay", type: "spins", val: 1 },
  { label: "+20.000 PTS", type: "pts", val: 20000 },
  { label: "Mất Ki! (0 PTS)", type: "pts", val: 0 },
  { label: "+5 Lượt Quay", type: "spins", val: 5 },
  { label: "JACKPOT 100K PTS!", type: "pts", val: 100000 },
];

export default function WheelPage() {
  const [user, setUser] = useState<any>(null);
  const [points, setPoints] = useState<number>(0);
  const [luckySpins, setLuckySpins] = useState<number>(0);
  const [spinning, setSpinning] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("balance, lucky_spins")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setPoints(profile.balance || 0);
          setLuckySpins(profile.lucky_spins || 0);
        }
      }
      setLoading(false);
    }
    fetchUserData();
  }, []);

  const handleSpin = async () => {
    if (!user) return;
    if (luckySpins <= 0) {
      alert("⚡ Hết lượt quay rồi chiến binh! Hãy vào Shop Võ Đạo đổi thêm lượt hoặc Tụ Ki mỗi ngày nhé!");
      return;
    }
    if (spinning) return;

    setSpinning(true);
    setResultMessage(null);

    const remainingSpins = luckySpins - 1;
    const chosenReward = WHEEL_REWARDS[Math.floor(Math.random() * WHEEL_REWARDS.length)];

    setTimeout(async () => {
      let newPts = points;
      let newSpins = remainingSpins;

      if (chosenReward.type === "pts") {
        newPts += chosenReward.val;
      } else {
        newSpins += chosenReward.val;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ balance: newPts, lucky_spins: newSpins })
        .eq("id", user.id);

      if (!error) {
        setPoints(newPts);
        setLuckySpins(newSpins);
        setSpinning(false);
        setResultMessage(`🎁 TRÚNG: ${chosenReward.label}! Rồng Thần ban phúc cực mạnh! 🔥`);
      } else {
        setSpinning(false);
        alert("Lỗi vòng quay: " + error.message);
      }
    }, 1600);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-purple-400 font-black flex items-center justify-center animate-pulse">
        ĐANG KHỞI TẠO VÒNG QUAY RỒNG THẦN...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-3 sm:p-6 flex flex-col items-center select-none">
      {/* Top Bar chuyển tiếp */}
      <div className="w-full max-w-xl flex justify-between items-center mb-4">
        <Link href="/" className="text-xs sm:text-sm font-black text-amber-400 hover:underline">
          ← Về Cổng Game
        </Link>
        <div className="flex gap-2 items-center">
          <Link href="/shop" className="bg-emerald-600/80 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-xl text-[11px] font-black transition">
            🛒 Đổi Lượt
          </Link>
          <div className="bg-slate-900 border border-amber-500/40 px-3 py-1 rounded-xl text-xs font-black text-amber-400">
            ⚡ {points.toLocaleString()} PTS
          </div>
          <div className="bg-slate-900 border border-purple-500/40 px-3 py-1 rounded-xl text-xs font-black text-purple-300">
            🎟️ {luckySpins} Lượt
          </div>
        </div>
      </div>

      <div className="w-full max-w-xl bg-slate-900 border-2 border-purple-500/50 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-purple-400">🎡 VÒNG QUAY MAY MẮN RỒNG THẦN</h1>
          <p className="text-slate-400 text-xs mt-1">Dùng Lượt Quay để húp điểm Ki và phần thưởng khủng từ vũ trụ!</p>
        </div>

        <div className={`w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-500 p-1 flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.6)] ${spinning ? "animate-spin" : ""}`}>
          <div className="w-full h-full bg-slate-950 rounded-full flex flex-col items-center justify-center">
            <span className="text-4xl sm:text-5xl animate-bounce">🐲</span>
            <span className="text-[11px] text-amber-300 font-bold mt-1">SAIYAN WHEEL</span>
          </div>
        </div>

        {resultMessage && (
          <div className="bg-purple-500/20 border border-purple-400/50 px-4 py-2 rounded-xl text-purple-300 text-xs sm:text-sm font-bold animate-bounce">
            {resultMessage}
          </div>
        )}

        <button
          onClick={handleSpin}
          disabled={spinning || luckySpins <= 0}
          className="w-full max-w-sm bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-slate-950 font-black text-sm py-3.5 rounded-xl cursor-pointer hover:brightness-110 active:scale-95 shadow-lg shadow-purple-500/30 disabled:opacity-50"
        >
          {spinning ? "Rồng Thần Đang Quay..." : luckySpins <= 0 ? "HẾT LƯỢT QUAY (ĐẾN SHOP ĐỔI NGAY)" : `QUAY NGAY (${luckySpins} Lượt) 🚀`}
        </button>

        <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 w-full flex justify-around">
          <span>⚡ Không tốn điểm Ki</span>
          <span>🎁 Thưởng ngẫu nhiên 100%</span>
        </div>
      </div>
    </div>
  );
}