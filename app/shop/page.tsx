"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const SHOP_SPIN_PACKS = [
  { id: 1, name: "🎟️ 1 Lượt Quay Tập Sự", cost: 1000, spins: 1, desc: "Gói đổi Ki lấy lượt quay thử vận may nhỏ lẻ!" },
  { id: 2, name: "🎟️ 5 Lượt Quay Saiyan", cost: 4500, spins: 5, desc: "Khuyến mãi tiết kiệm 500 Điểm Sức Mạnh!" },
  { id: 3, name: "🎟️ 10 Lượt Quay SSJ", cost: 8500, spins: 10, desc: "Siêu ưu đãi bứt phá giới hạn!" },
  { id: 4, name: "🎟️ 20 Lượt Quay Ultra Instinct", cost: 16000, spins: 20, desc: "Gói lượt quay tối thượng húp trọn kho phần thưởng!" },
  { id: 5, name: "🎟️ 50 Lượt Quay Rồng Thần", cost: 35000, spins: 50, desc: "Gói đại gia võ đạo dành riêng cho cao thủ tích Ki!" },
];

interface ShopHistoryItem {
  id: number;
  user_email: string;
  pack_name: string;
  cost: number;
  created_at: string;
}

export default function ShopPage() {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("Chiến Binh");
  const [points, setPoints] = useState<number>(0);
  const [luckySpins, setLuckySpins] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ShopHistoryItem[]>([]);

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, balance, lucky_spins")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setDisplayName(profile.full_name || "Chiến Binh");
          setPoints(profile.balance || 0);
          setLuckySpins(profile.lucky_spins || 0);
        }
      }
      setLoading(false);
    }
    fetchUserData();

    // Lấy lịch sử mua hàng từ Server
    async function fetchHistory() {
      const { data } = await supabase
        .from("shop_history")
        .select("*")
        .order("id", { ascending: false })
        .limit(10);
      if (data) setHistory(data);
    }
    fetchHistory();

    const channel = supabase
      .channel("shop_history_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "shop_history" }, (payload) => {
        setHistory((prev) => [payload.new as ShopHistoryItem, ...prev.slice(0, 9)]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleBuySpins = async (pack: typeof SHOP_SPIN_PACKS[0]) => {
    if (!user) return;
    if (points < pack.cost) {
      alert("⚡ Điểm Sức Mạnh không đủ! Hãy cược game hoặc Tụ Ki mỗi ngày để kiếm thêm điểm nhé!");
      return;
    }

    if (confirm(`Bạn có chắc muốn dùng ${pack.cost.toLocaleString()} Điểm Sức Mạnh để đổi +${pack.spins} Lượt Quay không?`)) {
      const newPts = points - pack.cost;
      const newSpins = luckySpins + pack.spins;

      const { error } = await supabase
        .from("profiles")
        .update({ balance: newPts, lucky_spins: newSpins })
        .eq("id", user.id);

      if (!error) {
        // Ghi log lên server shop_history
        await supabase.from("shop_history").insert([
          {
            user_email: displayName || user.email,
            pack_name: pack.name,
            cost: pack.cost,
          }
        ]);

        setPoints(newPts);
        setLuckySpins(newSpins);
        alert(`🎉 ĐỔI THÀNH CÔNG! Nhận ngay +${pack.spins} Lượt Quay Vòng May Mắn!`);
      } else {
        alert("Có lỗi xảy ra: " + error.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-amber-400 font-black flex items-center justify-center animate-pulse">
        ĐANG MỞ CỬA HÀNG VÕ ĐẠO...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-3 sm:p-6 flex flex-col items-center select-none space-y-4">
      {/* Top Bar chuyển tiếp */}
      <div className="w-full max-w-3xl flex justify-between items-center">
        <Link href="/" className="text-xs sm:text-sm font-black text-amber-400 hover:underline">
          ← Về Cổng Game
        </Link>
        <div className="flex gap-2 items-center">
          <Link href="/wheel" className="bg-purple-600/80 hover:bg-purple-500 text-white px-2.5 py-1 rounded-xl text-[11px] font-black transition">
            🎡 Vòng Quay
          </Link>
          <div className="bg-slate-900 border border-amber-500/40 px-3 py-1 rounded-xl text-xs font-black text-amber-400">
            ⚡ {points.toLocaleString()} Ki
          </div>
          <div className="bg-slate-900 border border-purple-500/40 px-3 py-1 rounded-xl text-xs font-black text-purple-300">
            🎟️ {luckySpins} Lượt
          </div>
        </div>
      </div>

      <div className="w-full max-w-3xl bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
        <div className="border-b border-slate-800 pb-3 text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-black text-emerald-400">🛒 CỬA HÀNG ĐỔI LƯỢT QUAY</h1>
          <p className="text-slate-400 text-xs mt-1">Dùng Điểm Sức Mạnh tích lũy để lấy Lượt Quay Vòng May Mắn rinh quà khủng!</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SHOP_SPIN_PACKS.map((pack) => (
            <div key={pack.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between gap-3 hover:border-emerald-500/50 transition">
              <div>
                <h3 className="font-bold text-sm text-amber-300">{pack.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{pack.desc}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                <span className="text-xs font-black text-emerald-400">{pack.cost.toLocaleString()} Ki</span>
                <button
                  onClick={() => handleBuySpins(pack)}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl cursor-pointer hover:brightness-110 active:scale-95 shadow"
                >
                  Đổi Lượt 🎟️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BẢNG LỊCH SỬ MUA GÓI LƯỢT QUAY (Đồng bộ Server) */}
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
          <h2 className="text-sm font-black text-emerald-400 uppercase tracking-wider">
            📜 Lịch Sử Đổi Lượt Gần Đây (Toàn Server)
          </h2>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {history.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-4">Chưa có giao dịch đổi lượt nào gần đây.</div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="flex justify-between items-center bg-slate-950/70 border border-slate-800/80 px-3 py-2 rounded-xl text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">{item.user_email}</span>
                  <span className="text-slate-400">đã đổi gói <b className="text-amber-300">{item.pack_name}</b></span>
                </div>
                <span className="text-amber-400 font-black">-{item.cost.toLocaleString()} Ki</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}