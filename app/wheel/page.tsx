"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface LeaderboardUser {
  id: string;
  full_name: string;
  balance: number;
  avatar_url: string;
}

interface LocalHistory {
  id: number;
  text: string;
  time: string;
}

export default function WheelPage() {
  const [user, setUser] = useState<any>(null);
  const [points, setPoints] = useState<number>(0);
  const [luckySpins, setLuckySpins] = useState<number>(0);
  const [wonToday, setWonToday] = useState<boolean>(false); // Kiểm tra xem hôm nay đã húp đặc biệt chưa
  const [spinning, setSpinning] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<LocalHistory[]>([]);

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const todayStr = new Date().toISOString().split("T")[0];

        const { data: profile } = await supabase
          .from("profiles")
          .select("balance, lucky_spins, last_jackpot_date, won_jackpot_today")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setPoints(profile.balance || 0);
          setLuckySpins(profile.lucky_spins || 0);

          // Kiểm tra reset ngày mới cho giải đặc biệt/Jackpot
          if (profile.last_jackpot_date === todayStr) {
            setWonToday(profile.won_jackpot_today || false);
          } else {
            // Qua ngày mới, reset trạng thái trúng giải đặc biệt trong ngày về false
            await supabase
              .from("profiles")
              .update({ last_jackpot_date: todayStr, won_jackpot_today: false })
              .eq("id", user.id);
            setWonToday(false);
          }
        }

        const saved = localStorage.getItem(`wheel_history_${user.id}`);
        if (saved) {
          try { setHistory(JSON.parse(saved)); } catch (e) {}
        }
      }
      setLoading(false);
    }
    fetchUserData();
  }, []);

  // 🌟 THUẬT TOÁN XÁC SUẤT ĐỘC LẬP GIỐNG JACKPOT (KHÔNG DÙNG WEIGHT)
  const getRandomReward = async (userId: string, alreadyWonToday: boolean) => {
    const todayStr = new Date().toISOString().split("T")[0];

    // 1. Kiểm tra xác suất trúng JACKPOT 1.000.000 Ki (Chỉ xét nếu hôm nay chưa ai trúng)
    const jackpotHit = !alreadyWonToday && Math.random() < 0.005; // Xác suất 0.5%

    if (jackpotHit) {
      // Đánh dấu tài khoản này đã húp giải đặc biệt trong ngày
      await supabase
        .from("profiles")
        .update({ won_jackpot_today: true, last_jackpot_date: todayStr })
        .eq("id", userId);
      
      setWonToday(true);
      return { label: "JACKPOT 1 tỷ Ki!", type: "pts", val: 1000000000 };
    }

    // 2. Kiểm tra xác suất trúng "Chai nước đặc biệt" (Chỉ cho phép trúng 1 lần/ngày)
    const waterBottleHit = !alreadyWonToday && Math.random() < 0.01; // Xác suất 1%

    if (waterBottleHit) {
      await supabase
        .from("profiles")
        .update({ won_jackpot_today: true, last_jackpot_date: todayStr })
        .eq("id", userId);

      setWonToday(true);
      return { label: "1 chai nước thần thánh", type: "item", val: 1 };
    }

    // 3. Các mốc thưởng thông thường dựa trên random rẽ nhánh
    const rand = Math.random();
    if (rand < 0.30) {
      return { label: "+200.000 Ki", type: "pts", val: 200000 };
    } else if (rand < 0.55) {
      return { label: "+500.000 Ki", type: "pts", val: 500000 };
    } else if (rand < 0.45) {
      return { label: "+1.000.000 Ki", type: "pts", val: 1000000 };
    } else if (rand < 0.30) {
      return { label: "+2.000.000 Ki", type: "pts", val: 2000000 };
    } else if (rand < 0.15) {
      return { label: "+1 Lượt Quay", type: "spins", val: 1 };
    } else {
      return { label: "Mất Ki! (0 PTS)", type: "pts", val: 0 };
    }
  };

  const handleSpin = async () => {
    if (!user) return;
    if (luckySpins <= 0) {
      alert("⚡ Hết lượt quay rồi chiến binh! Hãy vào Shop Võ Đạo đổi thêm lượt hoặc điểm danh hằng ngày nhé!");
      return;
    }
    if (spinning) return;

    setSpinning(true);
    setResultMessage(null);

    const remainingSpins = luckySpins - 1;
    const chosenReward = await getRandomReward(user.id, wonToday);

    setTimeout(async () => {
      let newPts = points;
      let newSpins = remainingSpins;

      if (chosenReward.type === "pts") {
        newPts += chosenReward.val;
      } else if (chosenReward.type === "spins") {
        newSpins += chosenReward.val;
      }
      // Nếu là "1 chai nước thần thánh", tùy ní muốn cộng quà gì vào profiles (ở đây tạm giữ nguyên hoặc cộng item nếu có bảng item riêng)

      const { error } = await supabase
        .from("profiles")
        .update({ balance: newPts, lucky_spins: newSpins })
        .eq("id", user.id);

      if (!error) {
        const newItem: LocalHistory = {
          id: Date.now(),
          text: `Quay trúng: ${chosenReward.label}`,
          time: new Date().toLocaleTimeString(),
        };

        const updatedHistory = [newItem, ...history].slice(0, 15);
        setHistory(updatedHistory as any);
        localStorage.setItem(`wheel_history_${user.id}`, JSON.stringify(updatedHistory));

        setPoints(newPts);
        setLuckySpins(newSpins);
        setSpinning(false);
        setResultMessage(`🎁 TRÚNG: ${chosenReward.label}! Rồng Thần ban phúc cực mạnh! 🔥`);
      } else {
        setSpinning(false);
        alert("Lỗi vòng quay: " + error.message);
      }
    }, 1800);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-purple-400 font-black flex items-center justify-center animate-pulse">
        ĐANG KHỞI TẠO VÒNG QUAY RỒNG THẦN...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-3 sm:p-6 flex flex-col items-center select-none space-y-5">
      {/* Top Bar điều hướng */}
      <div className="w-full max-w-2xl flex justify-between items-center">
        <Link href="/" className="text-xs sm:text-sm font-black text-amber-400 hover:underline">
          ← Về Cổng Game
        </Link>
        <div className="flex gap-2 items-center">
          <Link href="/shop" className="bg-emerald-600/80 hover:bg-emerald-500 text-white px-3 py-1 rounded-xl text-xs font-black transition shadow">
            🛒 Đổi Lượt
          </Link>
          <div className="bg-slate-900 border border-amber-500/40 px-3 py-1 rounded-xl text-xs font-black text-amber-400 shadow">
            ⚡ {points.toLocaleString()} Ki
          </div>
          <div className="bg-slate-900 border border-purple-500/40 px-3 py-1 rounded-xl text-xs font-black text-purple-300 shadow">
            🎟️ {luckySpins} Lượt
          </div>
        </div>
      </div>

      {/* BANNER QUẢNG CÁO JACKPOT 1 TRIỆU KI */}
      <div className="w-full max-w-2xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 p-[2px] rounded-3xl shadow-[0_0_25px_rgba(245,158,11,0.4)] animate-pulse">
        <div className="bg-slate-950 rounded-[22px] p-4 text-center flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl sm:text-4xl">👑</span>
            <div className="text-left">
              <span className="text-[10px] bg-amber-500/20 text-amber-400 font-black px-2 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-widest">
                Sự Kiện Đặc Biệt (1 lần/ngày)
              </span>
              <h2 className="text-sm sm:text-base font-black text-yellow-300 mt-1">
                JACKPOT 1M KI & CHAI NƯỚC THẦN THÁNH!
              </h2>
            </div>
          </div>
          <div className="text-xs text-slate-300 font-medium bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-center sm:text-right">
            {wonToday ? "✨ Hôm nay bạn đã nhận giải đặc biệt rồi!" : "🔥 Hôm nay chưa ai trúng, quay ngay kẻo lỡ!"}
          </div>
        </div>
      </div>

      {/* KHUNG CHÍNH: VÒNG QUAY + GÓC XEM PHẦN THƯỞNG */}
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Vòng quay chính */}
        <div className="md:col-span-2 bg-slate-900 border-2 border-purple-500/50 rounded-3xl p-5 shadow-2xl flex flex-col items-center text-center space-y-4">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-purple-400">🎡 VÒNG QUAY RỒNG THẦN</h1>
            <p className="text-slate-400 text-xs mt-0.5">Thử thách nhân phẩm, rinh thưởng cực đại!</p>
          </div>

          <div className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-500 p-1 flex items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.7)] ${spinning ? "animate-spin" : ""}`}>
            <div className="w-full h-full bg-slate-950 rounded-full flex flex-col items-center justify-center border-4 border-slate-900">
              <span className="text-4xl sm:text-5xl animate-bounce">🐲</span>
              <span className="text-[10px] text-amber-300 font-black mt-1 tracking-wider">SAIYAN WHEEL</span>
            </div>
          </div>

          {resultMessage && (
            <div className="bg-purple-500/20 border border-purple-400/50 px-4 py-2 rounded-xl text-purple-300 text-xs font-bold animate-bounce">
              {resultMessage}
            </div>
          )}

          <button
            onClick={handleSpin}
            disabled={spinning || luckySpins <= 0}
            className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-slate-950 font-black text-sm py-3 rounded-xl cursor-pointer hover:brightness-110 active:scale-95 shadow-lg shadow-purple-500/30 disabled:opacity-50 transition"
          >
            {spinning ? "Rồng Thần Đang Quay..." : luckySpins <= 0 ? "HẾT LƯỢT QUAY (ĐẾN SHOP)" : `QUAY NGAY (${luckySpins} Lượt) 🚀`}
          </button>
        </div>

        {/* BẢNG THÔNG TIN MỐC THƯỞNG */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col space-y-3">
          <div className="flex items-center justify-between border-l-4 border-amber-500 pl-2">
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider">
              🎁 Mốc Thưởng Săn Hũ
            </h3>
          </div>
          <div className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-yellow-400 font-bold block mb-0.5">👑 Jackpot 1M Ki & Chai Nước:</span>
              <p className="text-[10px] text-slate-400">Giới hạn tối đa <b className="text-amber-300">1 lần/ngày</b> cho mỗi tài khoản. Hụt trong ngày là mất, không cộng dồn qua ngày sau!</p>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-cyan-400 font-bold block mb-0.5">⚡ Thưởng Ki & Lượt:</span>
              <p className="text-[10px] text-slate-400">Các mốc +20K, +50K, +100K, +200K Ki và hoàn lượt quay diễn ra liên tục theo nhân phẩm.</p>
            </div>
          </div>
        </div>

      </div>

      {/* LỊCH SỬ QUAY THƯỞNG CÁ NHÂN */}
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center gap-2 border-l-4 border-purple-500 pl-3">
          <h2 className="text-xs sm:text-sm font-black text-purple-400 uppercase tracking-wider">
            📜 Lịch Sử Quay Thưởng Của Bạn
          </h2>
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {history.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-4">Bạn chưa có lượt quay thưởng nào.</div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="flex justify-between items-center bg-slate-950/70 border border-slate-800/80 px-3 py-2 rounded-xl text-xs">
                <span className="text-slate-300">{item.text}</span>
                <span className="text-slate-500 text-[10px]">{item.time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}