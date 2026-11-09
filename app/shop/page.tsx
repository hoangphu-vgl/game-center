"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const SHOP_SPIN_PACKS = [
  { id: 1, name: "🎟️ 1 Lượt Quay Tập Sự", cost: 100000000, spins: 1, desc: "Gói đổi Ki lấy lượt quay thử vận may nhỏ lẻ!" },
  { id: 2, name: "🎟️ 5 Lượt Quay Saiyan", cost: 450000000, spins: 5, desc: "Khuyến mãi tiết kiệm Điểm Sức Mạnh!" },
  { id: 3, name: "🎟️ 10 Lượt Quay SSJ", cost: 850000000, spins: 10, desc: "Siêu ưu đãi bứt phá giới hạn chiến lực!" },
  { id: 4, name: "🎟️ 20 Lượt Quay Ultra Instinct", cost: 16000000000, spins: 20, desc: "Gói lượt quay tối thượng húp trọn kho phần thưởng!" },
  { id: 5, name: "🎟️ 50 Lượt Quay Rồng Thần", cost: 45000000000, spins: 50, desc: "Gói đại gia võ đạo dành riêng cho cao thủ tích Ki!" },
];

// SIÊU GÓI 5 CỦ (FLEX TƯỢNG TRƯNG - CHỈ GHI LỊCH SỬ, KHÔNG CỘNG LƯỢT, KHÔNG TRỪ KI)
const MEGA_VIP_PACK = {
  id: 99,
  name: "👑 SIÊU GÓI 5.000.000.000 KI",
  costText: "5.000.000.000 Ki / 5.000 VNĐ",
  desc: "Gói flex danh dự vũ trụ!",
  maxGlobalStock: 20, // Kho chung còn lại mỗi tuần
  maxUserLimit: 5,    // Giới hạn cá nhân mỗi user/tuần
};

interface LocalHistory {
  id: number;
  text: string;
  time: string;
}

export default function ShopPage() {
  const [user, setUser] = useState<any>(null);
  const [points, setPoints] = useState<number>(0);
  const [luckySpins, setLuckySpins] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<LocalHistory[]>([]);
  
  const [globalStock, setGlobalStock] = useState<number>(20);
  const [userBuyCount, setUserBuyCount] = useState<number>(0);

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

        const savedHistory = localStorage.getItem(`shop_history_${user.id}`);
        if (savedHistory) {
          try { setHistory(JSON.parse(savedHistory)); } catch (e) {}
        }

        const currentWeekKey = getWeekKey();
        const storedStock = localStorage.getItem(`mega_global_stock_${currentWeekKey}`);
        if (storedStock !== null) {
          setGlobalStock(parseInt(storedStock));
        } else {
          localStorage.setItem(`mega_global_stock_${currentWeekKey}`, "20");
          setGlobalStock(20);
        }

        const storedUserCount = localStorage.getItem(`mega_user_count_${user.id}_${currentWeekKey}`);
        if (storedUserCount !== null) {
          setUserBuyCount(parseInt(storedUserCount));
        }
      }
      setLoading(false);
    }
    fetchUserData();
  }, []);

  const getWeekKey = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${week}`;
  };

  const handleBuySpins = async (packName: string, cost: number, spins: number) => {
    if (!user) return;
    if (points < cost) {
      alert("⚡ Ki tích lũy của bạn không đủ để đổi gói này! Hãy chăm chỉ cược game hoặc Tụ Ki đi nhé chiến binh!");
      return;
    }

    if (confirm(`Xác nhận dùng ${cost.toLocaleString()} Điểm Sức Mạnh để đổi ${packName}?`)) {
      const newPts = points - cost;
      const newSpins = luckySpins + spins;

      const { error } = await supabase
        .from("profiles")
        .update({ balance: newPts, lucky_spins: newSpins })
        .eq("id", user.id);

      if (!error) {
        const newItem: LocalHistory = {
          id: Date.now(),
          text: `Đã đổi ${packName} (-${cost.toLocaleString()} Ki)`,
          time: new Date().toLocaleTimeString(),
        };

        const updatedHistory = [newItem, ...history].slice(0, 15);
        setHistory(updatedHistory);
        localStorage.setItem(`shop_history_${user.id}`, JSON.stringify(updatedHistory));

        setPoints(newPts);
        setLuckySpins(newSpins);
        alert(`🎉 ĐỔI THÀNH CÔNG! Nhận ngay +${spins} Lượt Quay Vòng May Mắn!`);
      } else {
        alert("Có lỗi xảy ra: " + error.message);
      }
    }
  };

  // Mua Siêu Gói 1 Củ (CHỈ GHI LỊCH SỬ FLEX, KHÔNG CỘNG GÌ CẢ)
  const handleFlexMegaVip = () => {
    if (!user) return;
    const currentWeekKey = getWeekKey();

    if (userBuyCount >= MEGA_VIP_PACK.maxUserLimit) {
      alert("🛡️ THẦN HỦY DIỆT CŨNG PHẢI KHIÊM TỐN! Bạn đã flex đủ 5/5 lần trong tuần này rồi, nhường đất diễn cho anh em vũ trụ khác với chứ!");
      return;
    }
    if (globalStock <= 0) {
      alert("💨 CHẬM CHÂN RỒI ĐẠI GIA! Kho tổng gói 1 củ tuần này đã bị anh em húp sạch bách 20/20 vé flex. Đợi tuần sau reset kho nhé!");
      return;
    }

    if (confirm(`Xác nhận Flex Siêu Gói 1 Củ (5.000 VNĐ / 5.000.000 Ki) để lưu danh sử sách vũ trụ?`)) {
      const newGlobal = globalStock - 1;
      const newUserCount = userBuyCount + 1;
      setGlobalStock(newGlobal);
      setUserBuyCount(newUserCount);
      localStorage.setItem(`mega_global_stock_${currentWeekKey}`, newGlobal.toString());
      localStorage.setItem(`mega_user_count_${user.id}_${currentWeekKey}`, newUserCount.toString());

      const newItem: LocalHistory = {
        id: Date.now(),
        text: `👑 Đã flex thành công [SIÊU GÓI 5 CỦ] - Đẳng cấp đại gia vô đối!`,
        time: new Date().toLocaleTimeString(),
      };

      const updatedHistory = [newItem, ...history].slice(0, 15);
      setHistory(updatedHistory);
      localStorage.setItem(`shop_history_${user.id}`, JSON.stringify(updatedHistory));

      alert(`👑 FLEX THÀNH CÔNG RỰC RỠ! Tên của bạn đã được khắc ghi vào sử sách với Siêu Gói 5 Củ! Đã flex ${newUserCount}/5 lần tuần này. Zeno-sama phải thán phục! 🔥`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-amber-400 font-black flex items-center justify-center animate-pulse">
        ĐANG MỞ CỬA HÀNG VÕ ĐẠO...
      </div>
    );
  }

  const isMegaLocked = userBuyCount >= MEGA_VIP_PACK.maxUserLimit || globalStock <= 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-3 sm:p-6 flex flex-col items-center select-none space-y-4">
      <div className="w-full max-w-3xl flex justify-between items-center">
        <Link href="/" className="text-xs sm:text-sm font-black text-amber-400 hover:underline">
          ← Về Cổng Game
        </Link>
        <div className="flex gap-2 items-center">
          <Link href="/wheel" className="bg-purple-600/80 hover:bg-purple-500 text-white px-3 py-1 rounded-xl text-xs font-black transition shadow">
            🎡 Vòng Quay
          </Link>
          <div className="bg-slate-900 border border-amber-500/40 px-3 py-1 rounded-xl text-xs font-black text-amber-400 shadow">
            ⚡ {points.toLocaleString()} Ki
          </div>
          <div className="bg-slate-900 border border-purple-500/40 px-3 py-1 rounded-xl text-xs font-black text-purple-300 shadow">
            🎟️ {luckySpins} Lượt
          </div>
        </div>
      </div>

      <div className="w-full max-w-3xl bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5">
        <div className="border-b border-slate-800 pb-3 text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-black text-emerald-400">🛒 CỬA HÀNG VÕ ĐẠO SANG CHẢNH</h1>
          <p className="text-slate-400 text-xs mt-1">Nơi trao đổi chiến lực và flex đẳng cấp vượt mọi giới hạn vũ trụ!</p>
        </div>

        {/* --- SIÊU GÓI 1 CỦ (FLEX TƯỢNG TRƯNG - KHÔNG CỘNG LƯỢT) --- */}
        <div className="relative bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 p-[3px] rounded-3xl shadow-[0_0_35px_rgba(245,158,11,0.6)] animate-pulse">
          <div className="bg-slate-950 rounded-[22px] p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-[10px] bg-yellow-500 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  🔥 Độc Quyền Flex Danh Dự
                </span>
                <span className="text-[10px] bg-slate-900 text-amber-400 font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Kho tổng tuần: {globalStock}/20 vé
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-yellow-300">{MEGA_VIP_PACK.name}</h3>
              <p className="text-xs text-slate-300 max-w-md">{MEGA_VIP_PACK.desc}</p>
              <div className="text-[11px] text-amber-400/90 font-bold">
                ⚠️ Hạn mức flex của bạn: <span className="text-white">{userBuyCount}/5 lần</span> tuần này
              </div>
            </div>
            
            <div className="flex flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
              <span className="text-xs font-black text-yellow-400 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/30">{MEGA_VIP_PACK.costText}</span>
              <button
                onClick={handleFlexMegaVip}
                disabled={isMegaLocked}
                className={`w-full sm:w-auto font-black text-xs px-5 py-3 rounded-xl transition shadow-lg ${
                  isMegaLocked 
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                    : "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-slate-950 hover:brightness-110 active:scale-95 cursor-pointer shadow-amber-500/40"
                }`}
              >
                {userBuyCount >= MEGA_VIP_PACK.maxUserLimit ? "ĐÃ FLEX TỐI ĐA (KHÓA)" : globalStock <= 0 ? "HẾT KHO TỔNG" : "FLEX NGAY 1 CỦ 👑"}
              </button>
            </div>
          </div>
        </div>

        {/* --- CÁC GÓI THƯỜNG KHÁC --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {SHOP_SPIN_PACKS.map((pack) => (
            <div key={pack.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between gap-3 hover:border-emerald-500/50 transition">
              <div>
                <h3 className="font-bold text-sm text-amber-300">{pack.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{pack.desc}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                <span className="text-xs font-black text-emerald-400">{pack.cost.toLocaleString()} Ki</span>
                <button
                  onClick={() => handleBuySpins(pack.name, pack.cost, pack.spins)}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl cursor-pointer hover:brightness-110 active:scale-95 shadow"
                >
                  Đổi Lượt 🎟️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BẢNG LỊCH SỬ CÁ NHÂN */}
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
          <h2 className="text-xs sm:text-sm font-black text-emerald-400 uppercase tracking-wider">
            📜 Lịch Sử Đổi Lượt & Flex Của Bạn
          </h2>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {history.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-4">Bạn chưa có lịch sử giao dịch nào. Tụ Ki hoặc flex ngay đi nào chiến binh!</div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="flex justify-between items-center bg-slate-950/70 border border-slate-800/80 px-3 py-2 rounded-xl text-xs">
                <span className={`font-medium ${item.text.includes("FLEX") ? "text-yellow-300 font-bold" : "text-slate-300"}`}>{item.text}</span>
                <span className="text-slate-500 text-[10px]">{item.time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}