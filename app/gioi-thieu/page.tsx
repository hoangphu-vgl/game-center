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

// --- DATA MỒI CƠ BẢN ---
const basicBaitsConfig = [
  { id: "basic_worm", emoji: "🪱", name: "Mồi Trùng Thượng Hạng", price: 100, desc: "Mồi giun tự nhiên (Cá < 50kg)." },
  { id: "basic_hook", emoji: "🎣", name: "Mồi Câu Tiêu Chuẩn", price: 200, desc: "Mồi câu phổ thông (Cá < 50kg)." },
  { id: "basic_bread", emoji: "🥖", name: "Mồi Bánh Mì", price: 500, desc: "Chuyên dụ cá nhỏ tầng mặt (Cá < 50kg)." },
  { id: "basic_cricket", emoji: "🦗", name: "Mồi Dế Nhủi", price: 1000, desc: "Mồi côn trùng tầm trung (Cá < 50kg)." },
  { id: "basic_fly", emoji: "🪰", name: "Mồi Nhặng Xanh", price: 5000, desc: "Mồi phổ thông (Cá < 50kg)." },
  { id: "basic_shrimp", emoji: "🦐", name: "Mồi Tép Ô Xi Hóa", price: 10000, desc: "Mồi tép (50% chìm tới đáy, cá < 50kg)." },
];

// --- DICTIONARY ĐỒNG BỘ TOÀN BỘ KHO ĐỒ ---
const baitDictionary: { [key: string]: { name: string; filename?: string; emoji?: string; desc: string; type: string } } = {
  basic_worm: { name: "Mồi Trùng Thượng Hạng", emoji: "🪱", desc: "Mồi giun tự nhiên (Cá < 50kg).", type: "basic" },
  basic_hook: { name: "Mồi Câu Tiêu Chuẩn", emoji: "🎣", desc: "Mồi câu phổ thông (Cá < 50kg).", type: "basic" },
  basic_bread: { name: "Mồi Bánh Mì", emoji: "🥖", desc: "Chuyên dụ cá nhỏ tầng mặt (Cá < 50kg).", type: "basic" },
  basic_cricket: { name: "Mồi Dế Nhủi", emoji: "🦗", desc: "Mồi côn trùng tầm trung (Cá < 50kg).", type: "basic" },
  basic_fly: { name: "Mồi Nhặng Xanh", emoji: "🪰", desc: "Mồi phổ thông (Cá < 50kg).", type: "basic" },
  basic_shrimp: { name: "Mồi Tép Ô Xi Hóa", emoji: "🦐", desc: "Mồi tép (50% chìm tới đáy, cá < 50kg).", type: "basic" },

  bait_thuong_1: { name: "Mồi Kì Vàng Hoàn Hảo", filename: "01_thinh_ki_vang.png", desc: "Mồi trộn thường (Cá <= 500kg, tầng trung).", type: "normal" },
  bait_thinh_ki_vang: { name: "Mồi Kì Vàng Hoàn Hảo", filename: "01_thinh_ki_vang.png", desc: "Mồi trộn thường (Cá <= 500kg, tầng trung).", type: "normal" },

  bait_thuong_2: { name: "Bả Độc Tố Hợp Thành", filename: "02_ba_doc_sam.png", desc: "Mồi trộn thường (Cá <= 500kg, tầng trung).", type: "normal" },
  bait_ba_doc_sam: { name: "Bả Độc Tố Hợp Thành", filename: "02_ba_doc_sam.png", desc: "Mồi trộn thường (Cá <= 500kg, tầng trung).", type: "normal" },

  bait_thuong_3: { name: "Mồi Hắc Hải Sâu", filename: "03_moi_bien_sau.png", desc: "Mồi trộn thường (Cá <= 500kg, tầng trung).", type: "normal" },
  bait_moi_bien_sau: { name: "Mồi Hắc Hải Sâu", filename: "03_moi_bien_sau.png", desc: "Mồi trộn thường (Cá <= 500kg, tầng trung).", type: "normal" },

  bait_moi_thao_duoc: { name: "Mồi Thảo Dược", filename: "10_moi_thao_duoc.png", desc: "Mồi trộn thường (Cá <= 500kg, bớt giật căng dây).", type: "normal" },
  bait_moi_xac_song: { name: "Mồi Xác Sống", filename: "06_ba_xac_song.png", desc: "☣️ Mồi độc tố xác sống.", type: "normal" },

  bait_xin_hoang_gia: { name: "Mồi Hoàng Gia (Xịn)", filename: "07_moi_hoang_gia.png", desc: "👑 Mồi duy nhất săn được BOSS THƯỢNG CỔ!", type: "advanced" },
  bait_moi_hoang_gia: { name: "Mồi Hoàng Gia (Xịn)", filename: "07_moi_hoang_gia.png", desc: "👑 Mồi duy nhất săn được BOSS THƯỢNG CỔ!", type: "advanced" },

  bait_xin_lua_do: { name: "Mồi Lửa Đỏ (Xịn)", filename: "04_moi_lua_do.png", desc: "🔥 Đốt 5% HP cá khủng khi đớp.", type: "advanced" },
  bait_moi_lua_do: { name: "Mồi Lửa Đỏ (Xịn)", filename: "04_moi_lua_do.png", desc: "🔥 Đốt 5% HP cá khủng khi đớp.", type: "advanced" },

  bait_xin_sam_set: { name: "Mồi Sấm Sét (Xịn)", filename: "05_moi_sam_set.png", desc: "⚡ Choáng cá 2 giây.", type: "advanced" },
  bait_moi_sam_set: { name: "Mồi Sấm Sét (Xịn)", filename: "05_moi_sam_set.png", desc: "⚡ Choáng cá 2 giây.", type: "advanced" },

  bait_xin_bang_gia: { name: "Mồi Băng Giá (Xịn)", filename: "09_moi_bang_gia.png", desc: "❄️ Đóng băng cá ngay khi cắn mồi.", type: "advanced" },
  bait_moi_bang_gia: { name: "Mồi Băng Giá (Xịn)", filename: "09_moi_bang_gia.png", desc: "❄️ Đóng băng cá ngay khi cắn mồi.", type: "advanced" },

  bait_xin_co_khi: { name: "Mồi Cơ Khí (Xịn)", filename: "08_moi_co_khi.png", desc: "⚙️ Giảm 30% độ căng dây.", type: "advanced" },
  bait_moi_co_khi: { name: "Mồi Cơ Khí (Xịn)", filename: "08_moi_co_khi.png", desc: "⚙️ Giảm 30% độ căng dây.", type: "advanced" },

  bait_thuong_1_poor: { name: "Mồi Kì Vàng (Kém)", filename: "01_thinh_ki_vang.png", desc: "⚠️ Lỗi trộn, 50% hụt mồi.", type: "normal_poor" },
  bait_thinh_ki_vang_poor: { name: "Mồi Kì Vàng (Kém)", filename: "01_thinh_ki_vang.png", desc: "⚠️ Lỗi trộn, 50% hụt mồi.", type: "normal_poor" },

  bait_thuong_2_poor: { name: "Bả Độc Sẫm (Kém)", filename: "02_ba_doc_sam.png", desc: "⚠️ Lỗi trộn, 50% hụt mồi.", type: "normal_poor" },
  bait_ba_doc_sam_poor: { name: "Bả Độc Sẫm (Kém)", filename: "02_ba_doc_sam.png", desc: "⚠️ Lỗi trộn, 50% hụt mồi.", type: "normal_poor" },

  bait_thuong_3_poor: { name: "Mồi Biển Sâu (Kém)", filename: "03_moi_bien_sau.png", desc: "⚠️ Lỗi trộn, 50% hụt mồi.", type: "normal_poor" },
  bait_moi_bien_sau_poor: { name: "Mồi Biển Sâu (Kém)", filename: "03_moi_bien_sau.png", desc: "⚠️ Lỗi trộn, 50% hụt mồi.", type: "normal_poor" },

  bait_moi_lua_do_poor: { name: "Mồi Lửa Đỏ (Kém)", filename: "04_moi_lua_do.png", desc: "⚠️ Lỗi trộn, 50% hụt mồi.", type: "normal_poor" },
  bait_moi_sam_set_poor: { name: "Mồi Sấm Sét (Kém)", filename: "05_moi_sam_set.png", desc: "⚠️ Lỗi trộn, 50% hụt mồi.", type: "normal_poor" },
  bait_moi_bang_gia_poor: { name: "Mồi Băng Giá (Kém)", filename: "09_moi_bang_gia.png", desc: "⚠️ Lỗi trộn, 50% hụt mồi.", type: "normal_poor" },
  bait_moi_xac_song_poor: { name: "Mồi Xác Sống (Kém)", filename: "06_ba_xac_song.png", desc: "⚠️ Lỗi trộn, 50% hụt mồi.", type: "normal_poor" },
};

function resolveBaitInfo(id: string) {
  if (baitDictionary[id]) return baitDictionary[id];
  const basic = basicBaitsConfig.find(b => b.id === id);
  if (basic) return { name: basic.name, emoji: basic.emoji, desc: basic.desc, type: "basic" };

  let displayName = id;
  if (id.startsWith("bait_")) {
    displayName = id.replace("bait_", "").replace(/_/g, " ").toUpperCase();
  }
  return { name: displayName, emoji: "📦", desc: "Vật phẩm trong kho", type: id.startsWith("basic_") ? "basic" : "special" };
}

const specialBaits = [
  { id: "bait_thuong_1", filename: "01_thinh_ki_vang.png", name: "Mồi Kì Vàng Hoàn Hảo", type: "normal", desc: "Mồi trộn thường (Cá <= 500kg, tầng trung)." },
  { id: "bait_thuong_2", filename: "02_ba_doc_sam.png", name: "Bả Độc Tố Hợp Thành", type: "normal", desc: "Mồi trộn thường (Cá <= 500kg, tầng trung)." },
  { id: "bait_thuong_3", filename: "03_moi_bien_sau.png", name: "Mồi Hắc Hải Sâu", type: "normal", desc: "Mồi trộn thường (Cá <= 500kg, tầng trung)." },
  { id: "bait_moi_thao_duoc", filename: "10_moi_thao_duoc.png", name: "Mồi Thảo Dược", type: "normal", desc: "Mồi trộn thường (Cá <= 500kg, bớt giật căng dây)." },
  { id: "bait_xin_hoang_gia", filename: "07_moi_hoang_gia.png", name: "Mồi Hoàng Gia (Xịn)", type: "advanced", desc: "👑 Mồi duy nhất săn được BOSS THƯỢNG CỔ!" },
  { id: "bait_xin_lua_do", filename: "04_moi_lua_do.png", name: "Mồi Lửa Đỏ (Xịn)", type: "advanced", desc: "🔥 Đốt 5% HP cá khủng khi đớp." },
  { id: "bait_xin_sam_set", filename: "05_moi_sam_set.png", name: "Mồi Sấm Sét (Xịn)", type: "advanced", desc: "⚡ Choáng cá 2 giây." },
  { id: "bait_xin_bang_gia", filename: "09_moi_bang_gia.png", name: "Mồi Băng Giá (Xịn)", type: "advanced", desc: "❄️ Đóng băng cá ngay khi cắn mồi." },
  { id: "bait_xin_co_khi", filename: "08_moi_co_khi.png", name: "Mồi Cơ Khí (Xịn)", type: "advanced", desc: "⚙️ Giảm 30% độ căng dây." },
];

const CRAFT_RECIPES_NORMAL = [
  { id: "rc_n1", output: "bait_thuong_1", name: "Mồi Kì Vàng Hoàn Hảo", qtyRange: [1, 3], req: [{id: "basic_worm", qty: 2}, {id: "basic_hook", qty: 1}], fee: 10000, difficulty: "normal" },
  { id: "rc_n2", output: "bait_thuong_2", name: "Bả Độc Tố Hợp Thành", qtyRange: [1, 3], req: [{id: "basic_bread", qty: 3}, {id: "basic_cricket", qty: 1}], fee: 10000, difficulty: "normal" },
  { id: "rc_n3", output: "bait_thuong_3", name: "Mồi Hắc Hải Sâu", qtyRange: [1, 4], req: [{id: "basic_fly", qty: 2}, {id: "basic_shrimp", qty: 2}], fee: 10000, difficulty: "normal" },
  { id: "rc_n4", output: "bait_moi_thao_duoc", name: "Mồi Thảo Dược", qtyRange: [1, 2], req: [{id: "basic_bread", qty: 2}, {id: "basic_fly", qty: 2}], fee: 15000, difficulty: "normal" },
];

const CRAFT_RECIPES_ADVANCED = [
  { id: "rc_a1", output: "bait_xin_lua_do", name: "Mồi Lửa Đỏ (Xịn)", qtyRange: [1, 2], req: [{id: "bait_thuong_1", qty: 2}, {id: "basic_worm", qty: 5}], fee: 20000, difficulty: "hard" },
  { id: "rc_a2", output: "bait_xin_sam_set", name: "Mồi Sấm Sét (Xịn)", qtyRange: [1, 2], req: [{id: "bait_thuong_2", qty: 2}, {id: "basic_hook", qty: 5}], fee: 20000, difficulty: "hard" },
  { id: "rc_a3", output: "bait_xin_bang_gia", name: "Mồi Băng Giá (Xịn)", qtyRange: [1, 2], req: [{id: "bait_thuong_3", qty: 2}, {id: "basic_bread", qty: 5}], fee: 25000, difficulty: "hard" },
  { id: "rc_a4", output: "bait_xin_co_khi", name: "Mồi Cơ Khí (Xịn)", qtyRange: [1, 2], req: [{id: "bait_xin_lua_do", qty: 1}, {id: "bait_xin_sam_set", qty: 1}], fee: 50000, difficulty: "hard" },
  { id: "rc_a5", output: "bait_xin_hoang_gia", name: "Mồi Hoàng Gia (Xịn)", qtyRange: [1, 3], req: [{id: "bait_xin_co_khi", qty: 1}, {id: "bait_xin_bang_gia", qty: 1}], fee: 100000, difficulty: "hard" },
];

function CraftingMinigame({ recipe, onComplete, onCancel }: { recipe: any, onComplete: (isPerfect: boolean, earnedQty: number) => void, onCancel: () => void }) {
    const [gameType] = useState<number>(() => Math.floor(Math.random() * 5) + 1);
    const isHard = recipe.difficulty === "hard";
    const [tapCount, setTapCount] = useState(0);
    const targetTaps = isHard ? 20 : 12;

    const [barPos, setBarPos] = useState(0);
    const barDirRef = useRef(1);
    const [memorySeq, setMemorySeq] = useState<number[]>([]);
    const [userSeqIndex, setUserSeqIndex] = useState(0);
    const [holdProgress, setHoldProgress] = useState(0);
    const isHoldingRef = useRef(false);
    const [gridTarget] = useState<number>(() => Math.floor(Math.random() * (isHard ? 12 : 9)));
    const [selectedGrid, setSelectedGrid] = useState<number | null>(null);

    const [isFinished, setIsFinished] = useState(false);
    const [finalResult, setFinalResult] = useState<{isPerfect: boolean, qty: number} | null>(null);

    useEffect(() => {
        const speedMultiplier = isHard ? 1.8 : 1.0;
        if (gameType === 2) {
            const interval = setInterval(() => {
                setBarPos(prev => {
                    let next = prev + barDirRef.current * (3 * speedMultiplier);
                    if (next >= 100) { next = 100; barDirRef.current = -1; }
                    if (next <= 0) { next = 0; barDirRef.current = 1; }
                    return next;
                });
            }, 20);
            return () => clearInterval(interval);
        } else if (gameType === 3) {
            const seqLength = isHard ? 6 : 4;
            const seq = Array.from({length: seqLength}, () => Math.floor(Math.random() * 4));
            setMemorySeq(seq);
        } else if (gameType === 4) {
            const interval = setInterval(() => {
                if (isHoldingRef.current) {
                    setHoldProgress(prev => Math.min(100, prev + (isHard ? 3.5 : 2)));
                }
            }, 30);
            return () => clearInterval(interval);
        }
    }, [gameType, isHard]);

    const finishGame = (isPerfect: boolean) => {
        if (isFinished) return;
        setIsFinished(true);
        const minQ = recipe.qtyRange[0];
        const maxQ = recipe.qtyRange[1];
        const earnedQty = isPerfect ? Math.floor(Math.random() * (maxQ - minQ + 1)) + minQ : 1;
        setFinalResult({ isPerfect, qty: earnedQty });
        setTimeout(() => { onComplete(isPerfect, earnedQty); }, 1800);
    };

    return (
        <div className="absolute inset-0 z-[70] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 rounded-3xl animate-fadeIn">
             <div className="bg-slate-900 border-2 border-purple-500 w-full max-w-sm rounded-2xl p-6 shadow-[0_0_30px_rgba(168,85,247,0.4)] text-center relative overflow-hidden">
                  <h3 className="text-xl font-black text-purple-400 mb-1 uppercase">Trộn {isHard ? 'XỊN' : 'Thường'}: {recipe.name}</h3>
                  <p className="text-[10px] text-slate-400 mb-4">Thử thách chế tác #{gameType}/5 ({isHard ? 'Độ khó cao ⚡' : 'Tiêu chuẩn'})</p>

                  {gameType === 1 && (
                      <div className="space-y-4">
                          <p className="text-xs font-bold text-amber-300">Nhấn liên tục để nghiền nguyên liệu ({tapCount}/{targetTaps})</p>
                          <button onClick={() => {
                              const next = tapCount + 1;
                              setTapCount(next);
                              if (next >= targetTaps) finishGame(true);
                          }} className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-4 rounded-xl active:scale-95 transition shadow-lg cursor-pointer">
                              🔨 ĐẬP MẠNH! ({tapCount}/{targetTaps})
                          </button>
                      </div>
                  )}

                  {gameType === 2 && (
                      <div className="space-y-4">
                          <p className="text-xs font-bold text-amber-300">Canh dừng đúng vạch xanh lá!</p>
                          <div className="relative w-full h-8 bg-slate-800 rounded-full overflow-hidden border-2 border-slate-600">
                              <div className={`absolute top-0 bottom-0 ${isHard ? 'left-[46%] w-[8%]' : 'left-[40%] w-[20%]' } bg-emerald-500/80`}></div>
                              <div className="absolute top-0 bottom-0 w-2 bg-white rounded-full -ml-1 shadow" style={{ left: `${barPos}%` }}></div>
                          </div>
                          <button onClick={() => {
                              const targetMin = isHard ? 46 : 40;
                              const targetMax = isHard ? 54 : 60;
                              const isPerfect = barPos >= targetMin && barPos <= targetMax;
                              finishGame(isPerfect);
                          }} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl active:scale-95 shadow cursor-pointer">
                              CHỐT THANH NHỊP!
                          </button>
                      </div>
                  )}

                  {gameType === 3 && (
                      <div className="space-y-4">
                          <p className="text-xs font-bold text-amber-300">Nhấn đúng thứ tự mài mồi ({userSeqIndex}/{memorySeq.length})</p>
                          <div className="grid grid-cols-2 gap-2">
                              {[0, 1, 2, 3].map((idx) => (
                                  <button key={idx} onClick={() => {
                                      if (memorySeq[userSeqIndex] === idx) {
                                          const nextIdx = userSeqIndex + 1;
                                          setUserSeqIndex(nextIdx);
                                          if (nextIdx >= memorySeq.length) finishGame(true);
                                      } else { finishGame(false); }
                                  }} className="bg-slate-800 hover:bg-purple-600 text-white font-black py-4 rounded-xl border border-slate-700 active:scale-95 transition">
                                      Nút #{idx + 1}
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}

                  {gameType === 4 && (
                      <div className="space-y-4">
                          <p className="text-xs font-bold text-amber-300">Giữ và thả đúng vùng Xanh Lá</p>
                          <div className="w-full bg-slate-800 h-6 rounded-full overflow-hidden border border-slate-600 relative">
                              <div className={`absolute top-0 bottom-0 ${isHard ? 'left-[80%] w-[8%]' : 'left-[70%] w-[20%]' } bg-emerald-500/50`}></div>
                              <div className="h-full bg-purple-500 transition-all duration-75" style={{ width: `${holdProgress}%` }}></div>
                          </div>
                          <button 
                              onMouseDown={() => { isHoldingRef.current = true; }}
                              onMouseUp={() => { 
                                  isHoldingRef.current = false;
                                  const minH = isHard ? 80 : 70;
                                  const maxH = isHard ? 88 : 90;
                                  const isPerfect = holdProgress >= minH && holdProgress <= maxH;
                                  finishGame(isPerfect);
                              }}
                              onTouchStart={() => { isHoldingRef.current = true; }}
                              onTouchEnd={() => { 
                                  isHoldingRef.current = false;
                                  const minH = isHard ? 80 : 70;
                                  const maxH = isHard ? 88 : 90;
                                  const isPerfect = holdProgress >= minH && holdProgress <= maxH;
                                  finishGame(isPerfect);
                              }}
                              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-3 rounded-xl active:scale-95 shadow cursor-pointer select-none"
                          >
                              GIỮ & THẢ VÙNG XANH!
                          </button>
                      </div>
                  )}

                  {gameType === 5 && (
                      <div className="space-y-4">
                          <p className="text-xs font-bold text-amber-300">Chọn đúng hũ mồi thần bí</p>
                          <div className={`grid ${isHard ? 'grid-cols-4' : 'grid-cols-3'} gap-2`}>
                              {Array.from({length: isHard ? 12 : 9}).map((_, boxIdx) => (
                                  <button key={boxIdx} disabled={selectedGrid !== null} onClick={() => {
                                      setSelectedGrid(boxIdx);
                                      const isPerfect = boxIdx === gridTarget;
                                      finishGame(isPerfect);
                                  }} className={`h-12 rounded-xl font-black transition ${selectedGrid === boxIdx ? (boxIdx === gridTarget ? 'bg-emerald-500 text-slate-950' : 'bg-rose-600 text-white') : 'bg-slate-800 hover:bg-slate-700 text-white'}`}>
                                      📦
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}

                  {isFinished && finalResult && (
                      <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 animate-fadeIn">
                          <p className={`text-lg font-black uppercase mb-1 ${finalResult.isPerfect ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {finalResult.isPerfect ? '✨ HOÀN HẢO XUẤT SẮC!' : '⚠️ TRỘN HỤT (MỒI KÉM CHẤT LƯỢNG)'}
                          </p>
                          <p className="text-xs text-white font-bold">Nhận được: +{finalResult.qty} Mồi {finalResult.isPerfect ? '' : '(Kém Chất Lượng)'}</p>
                      </div>
                  )}
             </div>
        </div>
    );
}

function FindBaitFIFAMinigame({ type, onFinish, onCancel }: { type: "insect" | "shrimp" | "bread", onFinish: (earnedQty: number) => void, onCancel: () => void }) {
    const [difficulty] = useState<"easy" | "medium" | "hard">( () => {
        const r = Math.random();
        if (r < 0.4) return "easy";
        if (r < 0.75) return "medium";
        return "hard";
    });

    const [pos, setPos] = useState(0);
    const dirRef = useRef(1);
    const [stopped, setStopped] = useState(false);
    const [resultMsg, setResultMsg] = useState<string | null>(null);

    const speed = difficulty === "easy" ? 2.2 : (difficulty === "medium" ? 3.5 : 5.0);
    const zoneWidth = difficulty === "easy" ? 24 : (difficulty === "medium" ? 14 : 8);
    const zoneStart = difficulty === "easy" ? 38 : (difficulty === "medium" ? 43 : 46);
    const zoneEnd = zoneStart + zoneWidth;

    const bonusQty = difficulty === "easy" ? 2 : (difficulty === "medium" ? 5 : 10);
    const totalSuccess = 3 + bonusQty;

    useEffect(() => {
        if (stopped) return;
        const interval = setInterval(() => {
            setPos(prev => {
                let next = prev + dirRef.current * speed;
                if (next >= 100) { next = 100; dirRef.current = -1; }
                if (next <= 0) { next = 0; dirRef.current = 1; }
                return next;
            });
        }, 16);
        return () => clearInterval(interval);
    }, [stopped, speed]);

    const handleShoot = () => {
        if (stopped) return;
        setStopped(true);
        const isSuccess = pos >= zoneStart && pos <= zoneEnd;
        const finalQty = isSuccess ? totalSuccess : 3;

        setResultMsg(isSuccess ? `⚽ CĂN CHUẨN FIFA! (+${totalSuccess} MỒI)` : `⚠️ TRƯỢT VẠCH VÀNG! (NHẬN 3 MỒI CƠ BẢN)`);
        setTimeout(() => {
            onFinish(finalQty);
        }, 1800);
    };

    return (
        <div className="absolute inset-0 z-[80] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 rounded-3xl animate-fadeIn">
            <div className="bg-slate-900 border-2 border-amber-400 w-full max-w-sm rounded-2xl p-6 text-center relative shadow-[0_0_35px_rgba(245,158,11,0.5)]">
                <h4 className="text-xl font-black text-amber-400 uppercase mb-1">
                    ⚽ CĂN VẠCH TÌM MỒI
                </h4>
                <p className="text-xs text-slate-300 font-bold mb-3">
                    Độ khó: <span className={difficulty === 'easy' ? 'text-emerald-400' : (difficulty === 'medium' ? 'text-amber-400' : 'text-rose-500 font-black')}>
                        {difficulty === 'easy' ? '🟢 DỄ (+2)' : (difficulty === 'medium' ? '🟡 TRUNG BÌNH (+5)' : '🔴 KHÓ (+10)')}
                    </span>
                </p>

                <div className="relative w-full h-10 bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-700 mb-6 shadow-inner">
                    <div className="absolute top-0 bottom-0 bg-emerald-500/80 border-x-2 border-emerald-300" style={{ left: `${zoneStart}%`, width: `${zoneWidth}%` }}></div>
                    <div className="absolute top-0 bottom-0 w-2.5 bg-yellow-300 rounded-full -ml-1 shadow-[0_0_10px_#FFD700]" style={{ left: `${pos}%` }}></div>
                </div>

                {!stopped ? (
                    <button onClick={handleShoot} className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black py-4 rounded-xl text-base uppercase active:scale-95 shadow-xl transition cursor-pointer">
                        ⚽ BẤM CĂN VẠCH FIFA!
                    </button>
                ) : (
                    <div className={`p-3 rounded-xl font-black text-xs uppercase animate-bounce ${resultMsg?.includes('FIFA') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500' : 'bg-amber-500/20 text-amber-300 border border-amber-500'}`}>
                        {resultMsg}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CauCaMultiPage() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [score, setScore] = useState<number>(1000);
  const [userAvatar, setUserAvatar] = useState<string>("/assets/avatar/xtra1.ico");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  const [inventory, setInventory] = useState<{ [key: string]: number }>({ basic_worm: 10, bait_thuong_1: 5 });

  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [currentSlot, setCurrentSlot] = useState<string | null>(null);
  const [roomPlayerCount, setRoomPlayerCount] = useState<number>(1);
  const roomChannelRef = useRef<any>(null);
  const [oppAlert, setOppAlert] = useState<string | null>(null);

  const [centerCatchNotice, setCenterCatchNotice] = useState<{ text: string; show: boolean } | null>(null);
  const [myCatchNotice, setMyCatchNotice] = useState<{ text: string; amount: string; show: boolean } | null>(null);
  const [oppCatchNotice, setOppCatchNotice] = useState<{ text: string; amount: string; show: boolean } | null>(null);
  const [bossUI, setBossUI] = useState<{ name: string; hpPercent: number; weightText: string; } | null>(null);

  const [selectedBait, setSelectedBait] = useState<{ cost: number; filename: string; name: string; isBag: boolean; id: string; emoji?: string }>({
    cost: 10000, filename: "", name: "Mồi Trùng Thượng Hạng", isBag: false, id: "basic_worm", emoji: "🪱"
  });

  const [isBasicBaitDropdownOpen, setIsBasicBaitDropdownOpen] = useState<boolean>(false);
  const [isSpecialBaitDropdownOpen, setIsSpecialBaitDropdownOpen] = useState<boolean>(false);

  const [selectedRod, setSelectedRod] = useState<string>("cancaucoban.png");
  const [popupData, setPopupData] = useState<{
    show: boolean; title: string; message: string; type: "rare" | "beerus" | "coop" | "weather";
  } | null>(null);

  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [isBasicShopOpen, setIsBasicShopOpen] = useState<boolean>(false);
  const [isCraftingOpen, setIsCraftingOpen] = useState<boolean>(false);
  const [craftingTab, setCraftingTab] = useState<"normal" | "advanced">("normal");

  const [isFindBaitMenuOpen, setIsFindBaitMenuOpen] = useState<boolean>(false);
  const [activeFindGame, setActiveFindGame] = useState<"insect" | "shrimp" | "bread" | null>(null);
  const [lastInsectTime, setLastInsectTime] = useState<number>(0);
  const [lastShrimpTime, setLastShrimpTime] = useState<number>(0);
  const [lastBreadTime, setLastBreadTime] = useState<number>(0);

  const [isAuctionOpen, setIsAuctionOpen] = useState<boolean>(false);
  const [auctionTab, setAuctionTab] = useState<"browse" | "sell">("browse");
  const [realtimeAuctions, setRealtimeAuctions] = useState<any[]>([]);
  const [sellForm, setSellForm] = useState({ itemId: "", itemType: "bait", amount: 1, startBid: 50000, durationMins: 10 });

  const [userRodsMap, setUserRodsMap] = useState<{ [filename: string]: string | null }>({ "cancaucoban.png": null });
  const [shopNotification, setShopNotification] = useState<string | null>(null);
  
  const [isStrugglingUI, setIsStrugglingUI] = useState<boolean>(false);
  const [activeCraftingRecipe, setActiveCraftingRecipe] = useState<any | null>(null);

  const [weatherState, setWeatherState] = useState<{ type: string; warningText: string; active: boolean }>({
    type: "none", warningText: "", active: false
  });

  const shopRods = [
    { filename: "cancaucoban.png", name: "Cần Câu Cơ Bản", price3Days: 0, price5Days: 0, price7Days: 0, desc: "Mặc định khởi nghiệp", damageBuff: 1.0, critChance: 0.1, buff: "Ổn định" },
    { filename: "cancaugo.png", name: "Cần Câu Gỗ", price3Days: 500000, price5Days: 800000, price7Days: 1100000, desc: "Chế tác từ gỗ tự nhiên", damageBuff: 1.2, critChance: 0.12, buff: "Lực kéo +20%" },
    { filename: "cancaugoliem.png", name: "Cần Câu Gỗ Liêm", price3Days: 200000000, price5Days: 320000000, price7Days: 450000000, desc: "Làm từ gỗ liêm quý hiếm", damageBuff: 1.5, critChance: 0.15, buff: "Sát thương +50%" },
    { filename: "cancaumaycoban.png", name: "Cần Câu Máy Cơ Bản", price3Days: 500000000, price5Days: 800000000, price7Days: 1100000000, desc: "Trang bị máy quay", damageBuff: 1.8, critChance: 0.18, buff: "Thu dây nhanh" },
    { filename: "cancaumaychuyennghiep.png", name: "Cần Câu Máy Chuyên", price3Days: 1500000000, price5Days: 2400000000, price7Days: 3300000000, desc: "Tích hợp máy hiện đại", damageBuff: 2.2, critChance: 0.22, buff: "Sát thương x2.2" },
    { filename: "cancaucatrenbang.png", name: "Cần Câu Băng", price3Days: 5000000000, price5Days: 8000000000, price7Days: 11000000000, desc: "Dòng cần độc đáo", damageBuff: 2.6, critChance: 0.25, buff: "Tăng cá hiếm" },
    { filename: "cancauvectogo.png", name: "Cần Câu Véc-tơ Gỗ", price3Days: 10000000000, price5Days: 16000000000, price7Days: 22000000000, desc: "Công nghệ véc-tơ", damageBuff: 3.2, critChance: 0.3, buff: "Săn cá lớn" },
    { filename: "cancauvectordo.png", name: "Cần Câu Véc-tơ Đỏ", price3Days: 50000000000, price5Days: 80000000000, price7Days: 110000000000, desc: "Màu đỏ rực rỡ", damageBuff: 4.0, critChance: 0.35, buff: "Kéo nhanh" },
    { filename: "cancauvectorvang.png", name: "Cực Phẩm Mạ Vàng", price3Days: 1000000000000, price5Days: 1600000000000, price7Days: 2200000000000, desc: "Cực phẩm mạ vàng", damageBuff: 5.5, critChance: 0.45, buff: "X2 Điểm" }
  ];

  useEffect(() => {
    setIsMounted(true);
    async function fetchRooms() {
      const { data } = await supabase.from("cauca_rooms").select("*");
      if (data) {
        const sortedRooms = data.sort((a, b) => {
          const numA = parseInt(a.id.replace("room_", ""));
          const numB = parseInt(b.id.replace("room_", ""));
          return numA - numB;
        });
        setRooms(sortedRooms);
      }
    }
    fetchRooms();

    const roomsChannel = supabase
      .channel("public:cauca_rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "cauca_rooms" }, (payload: any) => {
        const newRoom = payload.new as any;
        if (newRoom && newRoom.id) {
          setRooms((prev) => prev.map((r) => (r.id === newRoom.id ? newRoom : r)));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(roomsChannel); };
  }, []);

  useEffect(() => {
    async function fetchAuctions() {
      const { data } = await supabase.from("auctions").select("*").order("created_at", { ascending: false });
      if (data) setRealtimeAuctions(data);
    }
    fetchAuctions();

    const auctionChannel = supabase
      .channel("public:auctions")
      .on("postgres_changes", { event: "*", schema: "public", table: "auctions" }, () => {
        fetchAuctions();
      })
      .subscribe();

    return () => { supabase.removeChannel(auctionChannel); };
  }, []);

  useEffect(() => {
    async function getProfile(currentUser: any) {
      if (!currentUser) return;
      setUser(currentUser);
      (window as any).currentUser = currentUser;

      const { data } = await supabase
        .from("profiles")
        .select("balance, avatar_url, equipped_rod, inventory")
        .eq("id", currentUser.id)
        .single();

      if (data) {
        if (data.balance !== undefined) {
          setScore(data.balance);
          (window as any).currentGameScore = data.balance;
        }
        if (data.avatar_url) setUserAvatar(data.avatar_url);
        if (data.equipped_rod) setSelectedRod(data.equipped_rod);
        
        if (data.inventory && typeof data.inventory === "object") {
            setInventory(data.inventory);
            (window as any).currentInventory = data.inventory;
        } else {
            const defaultInv = { basic_worm: 10, bait_thuong_1: 5 };
            setInventory(defaultInv);
            (window as any).currentInventory = defaultInv;
            await supabase.from("profiles").update({ inventory: defaultInv }).eq("id", currentUser.id);
        }
      }

      const { data: rodsData } = await supabase
        .from("user_rods")
        .select("rod_filename, expires_at")
        .eq("user_id", currentUser.id);

      const map: { [filename: string]: string | null } = { "cancaucoban.png": null };
      if (rodsData && rodsData.length > 0) {
        const now = new Date();
        rodsData.forEach((r: any) => {
          if (!r.expires_at || new Date(r.expires_at) > now) {
            map[r.rod_filename] = r.expires_at;
          }
        });
      }
      setUserRodsMap(map);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) getProfile(session.user);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) getProfile(session.user);
    });

    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
      (window as any).currentSelectedBait = selectedBait;
      (window as any).currentInventory = inventory;
  }, [selectedBait, inventory]);

  const syncScoreToSupabase = async (newScore: number) => {
    setScore(newScore);
    (window as any).currentGameScore = newScore;
    const activeUser = (window as any).currentUser || user;
    if (activeUser?.id) {
      await supabase.from("profiles").update({ balance: newScore }).eq("id", activeUser.id);
    }
  };

  const showShopNotice = (msg: string) => {
    setShopNotification(msg);
    setTimeout(() => setShopNotification(null), 3000);
  };

  const handleBuyBasicBait = async (baitId: string, unitPrice: number, qty: number) => {
      const totalPrice = unitPrice * qty;
      if (score < totalPrice) { alert("Không đủ xu để mua mồi cơ bản này!"); return; }
      const newScore = score - totalPrice;
      const newInv = { ...inventory, [baitId]: (inventory[baitId] || 0) + qty };
      setScore(newScore);
      setInventory(newInv);
      (window as any).currentGameScore = newScore;
      (window as any).currentInventory = newInv;
      const activeUser = (window as any).currentUser || user;
      if (activeUser?.id) await supabase.from("profiles").update({ balance: newScore, inventory: newInv }).eq("id", activeUser.id);
      showShopNotice(`Đã mua thành công x${qty} mồi!`);
  }

  const prepareCraftBait = (recipe: any) => {
      if (score < recipe.fee) { alert("Không đủ xu chế tạo!"); return; }
      let canCraft = true;
      for (let req of recipe.req) {
          if ((inventory[req.id] || 0) < req.qty) canCraft = false;
      }
      if (!canCraft) { alert("Thiếu nguyên liệu pha chế!"); return; }
      setActiveCraftingRecipe(recipe);
  }

  const executeCraftBait = async (isPerfect: boolean, earnedQty: number) => {
      const recipe = activeCraftingRecipe;
      if (!recipe) return;

      const newInv = { ...inventory };
      for (let req of recipe.req) {
          newInv[req.id] -= req.qty;
      }
      
      let outputId = recipe.output;
      if (recipe.difficulty === "normal" && !isPerfect) {
          outputId = `${recipe.output}_poor`;
      }
      newInv[outputId] = (newInv[outputId] || 0) + earnedQty;
      
      const newScore = score - recipe.fee;

      setScore(newScore);
      setInventory(newInv);
      (window as any).currentGameScore = newScore;
      (window as any).currentInventory = newInv;
      const activeUser = (window as any).currentUser || user;
      if (activeUser?.id) await supabase.from("profiles").update({ balance: newScore, inventory: newInv }).eq("id", activeUser.id);
      
      showShopNotice(`Trộn thành công +${earnedQty} ${recipe.name}${isPerfect ? ' (Hoàn Hảo)!' : ' (Kém Chất Lượng)'}`);
      setActiveCraftingRecipe(null);
  }

  const handleCreateAuction = async () => {
      const activeUser = (window as any).currentUser || user;
      if (!activeUser?.id) { alert("Đăng nhập để đấu giá!"); return; }
      if (!sellForm.itemId) { alert("Vui lòng chọn món đồ muốn đăng bán!"); return; }
      
      const isBait = sellForm.itemType === "bait";
      if (isBait) {
          const currentQty = inventory[sellForm.itemId] || 0;
          if (currentQty < sellForm.amount) { alert("Ní không đủ mồi này trong kho để đăng bán!"); return; }
          
          const newInv = { ...inventory, [sellForm.itemId]: currentQty - sellForm.amount };
          setInventory(newInv);
          (window as any).currentInventory = newInv;
          await supabase.from("profiles").update({ inventory: newInv }).eq("id", activeUser.id);

          const baitObj = resolveBaitInfo(sellForm.itemId);
          const itemName = baitObj ? baitObj.name : sellForm.itemId;
          const itemImg = baitObj?.filename ? `/assets/cauca/baits/${baitObj.filename}` : (baitObj?.emoji || "🪱");

          const endsAt = new Date(Date.now() + sellForm.durationMins * 60000).toISOString();
          const { error } = await supabase.from("auctions").insert({
              seller_id: activeUser.id,
              seller_name: activeUser.email?.split("@")[0] || "Cần thủ",
              item_id: sellForm.itemId,
              item_name: itemName,
              item_type: "bait",
              item_image: itemImg,
              amount: sellForm.amount,
              start_bid: sellForm.startBid,
              current_bid: sellForm.startBid,
              ends_at: endsAt
          });

          if (!error) {
              showShopNotice("Đăng vật phẩm đấu giá thành công lên sàn!");
              setAuctionTab("browse");
          } else { alert("Có lỗi tạo phiên đấu giá!"); }
      } else {
          const rodObj = shopRods.find(r => r.filename === sellForm.itemId);
          if (!rodObj) return;
          const endsAt = new Date(Date.now() + sellForm.durationMins * 60000).toISOString();
          const { error } = await supabase.from("auctions").insert({
              seller_id: activeUser.id,
              seller_name: activeUser.email?.split("@")[0] || "Cần thủ",
              item_id: sellForm.itemId,
              item_name: rodObj.name,
              item_type: "rod",
              item_image: `/assets/cauca/cancau/${rodObj.filename}`,
              amount: 1,
              start_bid: sellForm.startBid,
              current_bid: sellForm.startBid,
              ends_at: endsAt
          });

          if (!error) {
              showShopNotice("Đăng cần câu lên sàn thành công!");
              setAuctionTab("browse");
          } else { alert("Lỗi đăng bán cần!"); }
      }
  }

  const handleBidRealtime = async (auction: any) => {
      const activeUser = (window as any).currentUser || user;
      if (!activeUser?.id) { alert("Vui lòng đăng nhập!"); return; }
      if (auction.seller_id === activeUser.id) { alert("Không thể tự đấu giá món của chính mình!"); return; }

      const minNextBid = Math.floor(auction.current_bid * 1.1);
      if (score < minNextBid) { alert(`Cần ít nhất ${minNextBid.toLocaleString()}🪙 để ra giá tiếp theo!`); return; }

      const confirm = window.confirm(`Bạn muốn ra giá ${minNextBid.toLocaleString()}🪙 cho ${auction.item_name}?`);
      if (!confirm) return;

      const newScore = score - minNextBid;
      syncScoreToSupabase(newScore);

      const { error } = await supabase.from("auctions").update({
          current_bid: minNextBid,
          highest_bidder_id: activeUser.id,
          highest_bidder_name: activeUser.email?.split("@")[0] || "Cần thủ"
      }).eq("id", auction.id);

      if (!error) {
          showShopNotice("Ní đã trở thành người ra giá cao nhất!");
      } else {
          alert("Lỗi đấu giá, kiểm tra kết nối!");
      }
  }

  const leaveRoom = async () => {
    const activeUser = (window as any).currentUser || user;
    if (activeRoom && currentSlot && activeUser?.id) await supabase.from("cauca_rooms").update({ [currentSlot]: null }).eq("id", activeRoom);
    if (roomChannelRef.current) { roomChannelRef.current.unsubscribe(); roomChannelRef.current = null; }
    setActiveRoom(null); setCurrentSlot(null); setRoomPlayerCount(1); (window as any).roomPlayerCount = 1;
  };

  const joinRoom = async (roomId: string) => {
    const activeUser = (window as any).currentUser || user;
    if (!activeUser?.id) { alert("Vui lòng đăng nhập để tham gia!"); return; }
    const { data: targetRoom } = await supabase.from("cauca_rooms").select("*").eq("id", roomId).single();
    if (!targetRoom) { alert("Không tìm thấy phòng!"); return; }

    let slotToTake: string | null = null;
    for (let i = 1; i <= 10; i++) {
      const slotKey = `player_${i}`;
      if (targetRoom[slotKey] === activeUser.id) { slotToTake = slotKey; break; }
    }
    if (!slotToTake) {
      for (let i = 1; i <= 10; i++) {
        const slotKey = `player_${i}`;
        if (!targetRoom[slotKey]) { slotToTake = slotKey; break; }
      }
    }

    if (!slotToTake) { alert("Phòng này đã đầy (10/10)!"); return; }

    if (targetRoom[slotToTake] !== activeUser.id) {
      await supabase.from("cauca_rooms").update({ [slotToTake]: activeUser.id }).eq("id", roomId);
    }

    setCurrentSlot(slotToTake);
    setActiveRoom(roomId);

    const channel = supabase.channel(`gameplay_${roomId}`, { config: { presence: { key: activeUser.id } } });
    roomChannelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const players: any[] = [];
      Object.keys(state).forEach((key) => { players.push((state[key] as any)[0]); });

      const count = Math.max(1, players.length);
      setRoomPlayerCount(count);
      (window as any).roomPlayerCount = count;

      if (players.length > 0) {
        players.sort((a, b) => {
          const slotA = parseInt(a.slot?.replace("player_", "") || "99");
          const slotB = parseInt(b.slot?.replace("player_", "") || "99");
          return slotA - slotB;
        });
        const topPlayer = players[0];
        (window as any).isHost = (topPlayer.user_id === activeUser.id);
      }

      if (count > 1) {
        setOppAlert(`🤝 Có ${count} người chơi trong phòng! Giật chung sẽ giảm 50% Damage!`);
        setTimeout(() => setOppAlert(null), 4000);
      }
    });

    channel.on("broadcast", { event: "player_state" }, (payload) => {
      if (payload.payload.user_id !== activeUser.id) window.dispatchEvent(new CustomEvent("updateOpponentState", { detail: payload.payload }));
    });
    channel.on("broadcast", { event: "coop_damage_hit" }, (payload) => {
      if (payload.payload.targetUserId === activeUser.id) window.dispatchEvent(new CustomEvent("receivedCoopDamage", { detail: payload.payload }));
    });
    channel.on("broadcast", { event: "catch_alert" }, (payload) => {
      if (payload.payload.user_id !== activeUser.id) {
        setOppCatchNotice({ text: payload.payload.fishName, amount: `+${payload.payload.points.toLocaleString()}🪙`, show: true });
        setTimeout(() => setOppCatchNotice(null), 3500);
        setCenterCatchNotice({ text: `${payload.payload.fishName} (${payload.payload.weightText || ""})`, show: true });
        setTimeout(() => setCenterCatchNotice(null), 3500);
      }
    });
    channel.on("broadcast", { event: "sync_fishes" }, (payload) => {
      if (!(window as any).isHost && payload.payload.fishes) window.dispatchEvent(new CustomEvent("receivedSyncFishes", { detail: payload.payload.fishes }));
    });
    channel.on("broadcast", { event: "boss_damage" }, (payload) => {
      window.dispatchEvent(new CustomEvent("syncBossDamage", { detail: payload.payload }));
    });
    channel.on("broadcast", { event: "cancel_fishing" }, (payload) => {
        window.dispatchEvent(new CustomEvent("receivedCancelFishing", { detail: payload.payload }));
    });
    channel.on("broadcast", { event: "weather_update" }, (payload) => {
        setWeatherState(payload.payload);
        (window as any).currentWeather = payload.payload;
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await channel.track({ user_id: activeUser.id, avatar: userAvatar, slot: slotToTake });
    });
  };

  useEffect(() => {
    const handleUnload = () => { 
      const activeUser = (window as any).currentUser || user;
      if (activeRoom && currentSlot && activeUser?.id) supabase.from("cauca_rooms").update({ [currentSlot]: null }).eq("id", activeRoom); 
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [activeRoom, currentSlot, user]);

  useEffect(() => {
    if (!isMounted || !activeRoom) return;
    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const statusEl = document.getElementById("status");
    const powerContainer = document.getElementById("power-container");

    const fishDatabase = [
      { filename: "Amphiprion_ocellaris.png", vnName: "Cá hề Nemo", sizeScale: 0.65, basePoints: 100, weightRange: [2, 10], layer: "top", struggleWeight: 0.1, isRare: false },
      { filename: "Abudefduf_saxatilis.png", vnName: "Cá thia vằn", sizeScale: 0.7, basePoints: 100, weightRange: [5, 20], layer: "top", struggleWeight: 0.1, isRare: false },
      { filename: "Chromis_chromis.png", vnName: "Cá thia xanh", sizeScale: 0.6, basePoints: 100, weightRange: [2, 15], layer: "top", struggleWeight: 0.1, isRare: false },
      { filename: "Carassius_auratus.png", vnName: "Cá vàng cảnh", sizeScale: 0.7, basePoints: 120, weightRange: [10, 30], layer: "top", struggleWeight: 0.1, isRare: false },
      { filename: "Campostoma_anomalum.png", vnName: "Cá tuế suối", sizeScale: 0.65, basePoints: 100, weightRange: [1, 10], layer: "top", struggleWeight: 0.1, isRare: false },
      { filename: "Abudefduf_sordidus.png", vnName: "Cá thia xám", sizeScale: 0.8, basePoints: 120, weightRange: [15, 40], layer: "top", struggleWeight: 0.1, isRare: false },
      { filename: "Abramis_brama.png", vnName: "Cá vền", sizeScale: 0.85, basePoints: 150, weightRange: [20, 50], layer: "top", struggleWeight: 0.1, isRare: false },
      { filename: "cahongdang.png", vnName: "Cá hồng đăng", sizeScale: 0.8, basePoints: 150, weightRange: [10, 35], layer: "top", struggleWeight: 0.1, isRare: false },
      { filename: "cakoinhatban.png", vnName: "Cá Koi Nhật Bản", sizeScale: 0.6, basePoints: 150, weightRange: [15, 45], layer: "top", struggleWeight: 0.1, isRare: false },

      { filename: "cataituong.png", vnName: "Cá tai tượng", sizeScale: 3.1, basePoints: 500, weightRange: [50, 100], layer: "mid", struggleWeight: 0.25, isRare: false },
      { filename: "cahuyetlong.png", vnName: "Cá Huyết Long", sizeScale: 3.25, basePoints: 1000, weightRange: [60, 200], layer: "mid", struggleWeight: 0.3, isRare: false },
      { filename: "calochoangde.png", vnName: "Cá Lóc Hoàng Đế", sizeScale: 2.3, basePoints: 600, weightRange: [70, 150], layer: "mid", struggleWeight: 0.35, isRare: false },
      { filename: "cachep.png", vnName: "Cá chép lớn", sizeScale: 2.6, basePoints: 700, weightRange: [80, 180], layer: "mid", struggleWeight: 0.4, isRare: false },
      { filename: "cachimbien.png", vnName: "Cá chim biển", sizeScale: 2.1, basePoints: 500, weightRange: [50, 130], layer: "mid", struggleWeight: 0.35, isRare: false },
      { filename: "carolon.png", vnName: "Cá rô khủng", sizeScale: 2.5, basePoints: 800, weightRange: [90, 200], layer: "mid", struggleWeight: 0.45, isRare: false },
      { filename: "cabasa.png", vnName: "Cá basa", sizeScale: 2.3, basePoints: 500, weightRange: [50, 120], layer: "mid", struggleWeight: 0.3, isRare: false },
      { filename: "camu.png", vnName: "Cá mú", sizeScale: 2.6, basePoints: 900, weightRange: [100, 200], layer: "mid", struggleWeight: 0.5, isRare: false },
      { filename: "calahan.png", vnName: "Cá la hán", sizeScale: 2.25, basePoints: 500, weightRange: [50, 100], layer: "mid", struggleWeight: 0.5, isRare: false },
      { filename: "cangubo.png", vnName: "Cá ngừ bò", sizeScale: 2.4, basePoints: 1000, weightRange: [120, 200], layer: "mid", struggleWeight: 0.55, isRare: false },
      { filename: "catra.png", vnName: "Cá tra", sizeScale: 2.7, basePoints: 700, weightRange: [10, 50], layer: "mid", struggleWeight: 0.6, isRare: false },
      
      { filename: "caduoimata.png", vnName: "Cá đuối mata", sizeScale: 4.6, basePoints: 2000, weightRange: [100, 1500], layer: "bottom", struggleWeight: 0.75, isRare: true },
      { filename: "mucnamcuc.png", vnName: "Mực nam cực", sizeScale: 4.8, basePoints: 2500, weightRange: [200, 3000], layer: "bottom", struggleWeight: 0.8, isRare: true },
      { filename: "canhamvoi.png", vnName: "Cá nhám voi", sizeScale: 5.2, basePoints: 3000, weightRange: [5000, 9000], layer: "bottom", struggleWeight: 0.85, isRare: true },
      { filename: "camaptrang.png", vnName: "Cá mặp trắng", sizeScale: 6.4, basePoints: 8000, weightRange: [1000, 6000], layer: "bottom", struggleWeight: 0.88, isRare: true },
      { filename: "camapdaubua.png", vnName: "Cá mập đầu búa", sizeScale: 5.0, basePoints: 6000, weightRange: [800, 5000], layer: "bottom", struggleWeight: 0.9, isRare: true },
      { filename: "canhatan.png", vnName: "Cá nhà tán", sizeScale: 7.4, basePoints: 10000, weightRange: [7000, 10000], layer: "bottom", struggleWeight: 0.93, isRare: true },
      { filename: "cavoisatthu.png", vnName: "Cá voi sát thủ", sizeScale: 6.6, basePoints: 9000, weightRange: [2000, 9000], layer: "bottom", struggleWeight: 0.95, isRare: true },
      
      { filename: "livyatan.png", vnName: "Livyatan Thượng Cổ", sizeScale: 15.5, basePoints: 50000, weightRange: [100000, 200000], layer: "boss", struggleWeight: 1.0, isRare: true },
      { filename: "megalodon.png", vnName: "Megalodon Sơ Cổ", sizeScale: 14.0, basePoints: 20000, weightRange: [20000, 50000], layer: "boss", struggleWeight: 1.0, isRare: true },
      { filename: "mosa.png", vnName: "Mosasaurus Đại Dương", sizeScale: 14.5, basePoints: 30000, weightRange: [50000, 100000], layer: "boss", struggleWeight: 1.0, isRare: true }
    ];

    const loadedFishObjects = fishDatabase.map((item) => {
      const img = new Image(); img.src = `/assets/cauca/${item.filename}`; return { img, info: item };
    });

    const decorFilenames = ["dabien.png", "dabien2.png", "rongbien.png", "sanho.png", "sanho2.png", "taobien.png", "taobien2.png"];
    const loadedDecorImages = decorFilenames.map((fname) => {
      const img = new Image(); img.src = `/assets/cauca/daybien/${fname}`; return { img, filename: fname };
    });

    let width: number = window.innerWidth;
    let height: number = window.innerHeight;
    let waterY: number = height * 0.22;
    
    const slotIndex = currentSlot ? parseInt(currentSlot.replace("player_", "")) - 1 : 0;
    const totalSlots = 10;
    let boatX: number = width * (0.1 + (slotIndex / (totalSlots - 1)) * 0.8);
    let boatSpeed: number = 0;
    let boatFacing: number = 1;
    let lastBossKillTime = 0;

    let oppStates: { [userId: string]: any } = {};
    const critPopups: { x: number; y: number; alpha: number; scale: number; text: string; color: string }[] = [];

    let currentWeatherType = "none"; 
    let weatherTimerFrame = 0;
    let nextWeatherIntervalFrames = Math.floor(Math.random() * 7200) + 10800;
    let weatherDurationFrames = 0;
    const targetWeatherDuration = Math.floor(Math.random() * 7200) + 3600;
    
    const rainDrops: { x: number; y: number; speed: number; len: number }[] = [];
    for (let i = 0; i < 90; i++) {
        rainDrops.push({ x: Math.random() * width, y: Math.random() * height, speed: Math.random() * 10 + 12, len: Math.random() * 20 + 10 });
    }

    (window as any).updateGameScore = (newScore: number) => { syncScoreToSupabase(newScore); };

    function resize() {
      const w = window.innerWidth; const h = window.innerHeight; const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx!.setTransform(1, 0, 0, 1, 0, 0); ctx!.scale(dpr, dpr);
      width = w; height = h; waterY = height * 0.22;
    }
    window.addEventListener("resize", resize); resize();

    class Fish {
      id: string; direction!: number; size!: number; y!: number;
      basePoints!: number; points!: number; weight!: number; hp!: number; maxHp!: number;
      speed!: number; x!: number; isCaught!: boolean;
      fishData!: typeof fishDatabase[0]; animFrame!: number; fishObj!: typeof loadedFishObjects[0];
      layer!: string; notifiedRare?: boolean; isWaitingForWave?: boolean; escapedBoost: boolean = false;
      stunTimer: number = 0;
      targetX?: number; 
      targetY?: number; 

      constructor(forcedLayer?: string, forcedY?: number, forcedDirection?: number, syncData?: any) {
        this.id = Math.random().toString(36).substring(2, 9);
        if (syncData) {
            this.id = syncData.id; this.x = syncData.x; this.y = syncData.y; this.speed = syncData.vx;
            this.direction = syncData.direction; this.size = syncData.size; this.points = syncData.points;
            this.weight = syncData.weight; this.hp = syncData.hp; this.maxHp = syncData.maxHp; this.layer = syncData.layer;
            const chosenInfo = fishDatabase.find(fd => fd.filename === syncData.filename) || fishDatabase[0];
            this.fishObj = loadedFishObjects.find((fo) => fo.info.filename === chosenInfo.filename) || loadedFishObjects[0];
            this.fishData = this.fishObj.info; this.isCaught = false; this.animFrame = Math.random() * 100;
        } else { this.spawn(forcedLayer, forcedY, forcedDirection); }
      }

      spawn(forcedLayer?: string, forcedY?: number, forcedDirection?: number) {
        this.direction = forcedDirection !== undefined ? forcedDirection : (Math.random() > 0.5 ? 1 : -1);
        let availableFish = fishDatabase.filter(f => f.layer !== "boss");
        
        if (forcedLayer === "boss") availableFish = fishDatabase.filter(f => f.layer === "boss");
        else if (forcedLayer) {
          availableFish = fishDatabase.filter((f) => f.layer === forcedLayer);
          if (availableFish.length === 0) availableFish = fishDatabase.filter(f => f.layer !== "boss");
        }

        const chosenInfo = availableFish[Math.floor(Math.random() * availableFish.length)];
        this.fishObj = loadedFishObjects.find((f) => f.info.filename === chosenInfo.filename) || loadedFishObjects[0];
        this.fishData = this.fishObj.info; this.layer = this.fishData.layer;
        this.size = (Math.random() * 8 + 16) * this.fishData.sizeScale;
        
        const wRange = this.fishData.weightRange;
        this.weight = Math.floor(Math.random() * (wRange[1] - wRange[0] + 1)) + wRange[0];

        const pCount = (window as any).roomPlayerCount || 1;
        const bonusMultiplier = (1 + (pCount - 1) * 0.05);
        
        // CÔNG THỨC MỚI: weight (kg thực tế) * basePoints, không dùng multi nữa
        this.points = Math.round(this.weight * this.fishData.basePoints * bonusMultiplier);
        
        let actualWeightKg = this.layer === "boss" ? this.weight : this.weight;
        this.maxHp = Math.max(10, Math.sqrt(actualWeightKg) * 12);
        this.hp = this.maxHp;
        
        this.animFrame = Math.random() * 100;
        this.notifiedRare = false; this.isWaitingForWave = false; this.escapedBoost = false;
        this.stunTimer = 0;

        const waterHeight = height - waterY;
        if (this.layer === "top") {
          this.y = forcedY !== undefined ? forcedY : waterY + 20 + Math.random() * (waterHeight * 0.28);
          this.speed = (Math.random() * 1.5 + 1.0) * this.direction;
        } else if (this.layer === "mid") {
          this.y = forcedY !== undefined ? forcedY : waterY + waterHeight * 0.32 + Math.random() * (waterHeight * 0.35);
          this.speed = (Math.random() * 0.9 + 0.5) * this.direction;
        } else {
          this.y = forcedY !== undefined ? forcedY : waterY + waterHeight * 0.7 + Math.random() * (waterHeight * 0.22);
          this.speed = (Math.random() * 0.4 + 0.2) * this.direction;
        }
        this.x = this.direction === 1 ? -this.size * 3 : width + this.size * 3;
        this.isCaught = false;
      }

      update() {
        if (this.isCaught || this.isWaitingForWave) return;
        if (this.stunTimer > 0) { this.stunTimer--; return; }

        if (!(window as any).isHost && this.targetX !== undefined && this.targetY !== undefined) {
          this.x += (this.targetX - this.x) * 0.2;
          this.y += (this.targetY - this.y) * 0.2;
        } else {
          let currentSpeed = this.speed;
          const activeWeather = (window as any).currentWeather?.type;
          if (activeWeather === "rain") currentSpeed *= 1.45;
          else if (activeWeather === "storm") currentSpeed *= 1.25;

          if (this.escapedBoost) currentSpeed *= 1.2; 
          this.x += currentSpeed;
        }
        
        this.animFrame += this.escapedBoost ? 0.15 : 0.08;

        if ((this.layer === "bottom" || this.layer === "boss") && !this.notifiedRare && this.x > width * 0.2 && this.x < width * 0.8) {
          this.notifiedRare = true;
          if ((window as any).isHost && roomChannelRef.current) {
            roomChannelRef.current.send({ type: "broadcast", event: "rare_fish_spawn", payload: { fishName: this.fishData.vnName, points: this.points } });
          }
        }

        if ((this.direction === 1 && this.x > width + this.size * 3) || (this.direction === -1 && this.x < -this.size * 3)) {
          if ((window as any).isHost) {
            if (this.layer === "boss") {
                const idx = fishes.indexOf(this); if (idx > -1) fishes.splice(idx, 1);
            }
            else if (this.layer === "bottom") {
              this.isWaitingForWave = true;
              const delayMs = Math.floor(Math.random() * (60000 - 15000 + 1)) + 15000;
              setTimeout(() => { if (isMounted && fishes.includes(this)) this.spawn("bottom"); }, delayMs);
            } else { this.spawn(this.layer); }
          }
        }
      }

      draw() {
        if (this.isWaitingForWave) return;
        ctx!.save(); ctx!.translate(this.x, this.y); ctx!.rotate(Math.sin(this.animFrame) * (this.escapedBoost ? 0.1 : 0.04));
        if (this.direction === 1) ctx!.scale(-1, 1);
        const img = this.fishObj.img;
        if (img && img.complete && img.naturalWidth !== 0) {
          ctx!.imageSmoothingEnabled = false;
          ctx!.drawImage(img, -this.size, -this.size * 0.6, this.size * 2.2, this.size * 1.2);
        }
        ctx!.restore();
      }
    }

    const activeBaitImg = new Image(); 
    const updateActiveBaitImg = (filename: string) => {
        if (filename) activeBaitImg.src = `/assets/cauca/baits/${filename}`;
    };
    updateActiveBaitImg(selectedBait.filename);

    const updateBaitListener = (e: any) => { updateActiveBaitImg(e.detail.filename); };
    window.addEventListener("changeBaitImg", updateBaitListener);

    const rodImg = new Image(); rodImg.src = `/assets/cauca/cancau/${selectedRod}`;
    let currentRodDamageBuff = 1.0; let currentRodCritChance = 0.1;
    const updateRodListener = (e: any) => {
      const filename = e.detail; rodImg.src = `/assets/cauca/cancau/${filename}`;
      const foundRod = shopRods.find((r) => r.filename === filename);
      if (foundRod) { currentRodDamageBuff = foundRod.damageBuff; currentRodCritChance = foundRod.critChance; }
    };
    window.addEventListener("changeRod", updateRodListener);

    const initialRodObj = shopRods.find((r) => r.filename === selectedRod);
    if (initialRodObj) { currentRodDamageBuff = initialRodObj.damageBuff; currentRodCritChance = initialRodObj.critChance; }

    const moveBoatListener = (e: any) => { boatSpeed = e.detail; if (boatSpeed < 0) boatFacing = -1; else if (boatSpeed > 0) boatFacing = 1; };
    window.addEventListener("moveBoat", moveBoatListener);

    const oppStateListener = (e: any) => { const data = e.detail; if (data && data.user_id) oppStates[data.user_id] = data; };
    window.addEventListener("updateOpponentState", oppStateListener);
    
    const cancelFishingListener = () => { hook.cancelFishing(); };
    window.addEventListener("cancelFishingAction", cancelFishingListener);

    const oppCancelFishingListener = (e: any) => {
        const { targetUserId, senderUserId } = e.detail;
        const activeUser = (window as any).currentUser || user;
        if (hook.isAssistingOpponent && hook.caughtFish?.id === senderUserId) { hook.cancelFishing(); } 
        else if (hook.isJointPulling && targetUserId === activeUser?.id) { hook.isJointPulling = false; }
    }
    window.addEventListener("receivedCancelFishing", oppCancelFishingListener);

    const syncBossDamageListener = (e: any) => {
        const { fishId, damage } = e.detail;
        const targetFish = fishes.find(f => f.id === fishId);
        if (targetFish && targetFish.hp > 0) {
            targetFish.hp -= damage;
            if (targetFish.hp <= 0 && !(window as any).isHost) targetFish.hp = 0;
        }
    }
    window.addEventListener("syncBossDamage", syncBossDamageListener);

    class Hook {
      x!: number; y!: number; state!: string; power!: number; targetWaterX!: number; maxDepthY!: number;
      castStartX!: number; castStartY!: number; castProgress!: number; caughtFish: Fish | null = null;
      lineTension: number = 0; isJointPulling: boolean = false; isAssistingOpponent: boolean = false; tapProgress: number = 0; oppTargetId: string | null = null;
      biteWaitFrames: number = 0;

      qteEvent: {
         active: boolean; direction: "left" | "right" | null; timer: number; maxTime: number; 
         requiredSwipes: number; currentSwipes: number; cooldown: number;
      } = { active: false, direction: null, timer: 0, maxTime: 0, requiredSwipes: 0, currentSwipes: 0, cooldown: 0 };

      constructor() { this.reset(); }

      reset() {
        const scaleFactor = 0.62;
        let rodTipX = boatFacing === -1 ? boatX - scaleFactor * (2 + Math.cos(-0.42) * 110) : boatX + scaleFactor * (2 + Math.cos(-0.42) * 110);
        let rodTipY = waterY - 12 + scaleFactor * (-10 + Math.sin(-0.42) * 110);
        this.x = rodTipX; this.y = rodTipY; this.state = "IDLE"; this.power = 0; this.targetWaterX = 0; this.maxDepthY = 0;
        this.castStartX = 0; this.castStartY = 0; this.castProgress = 0; this.caughtFish = null; this.lineTension = 0; this.tapProgress = 0;
        this.isJointPulling = false; this.isAssistingOpponent = false; this.oppTargetId = null; this.biteWaitFrames = 0;
        this.qteEvent = { active: false, direction: null, timer: 0, maxTime: 0, requiredSwipes: 0, currentSwipes: 0, cooldown: 0 };
        setIsStrugglingUI(false); setBossUI(null);
        if (statusEl) { statusEl.innerText = "Sẵn sàng (Chạm giữ để quăng)"; statusEl.style.color = "white"; }
        if (powerContainer) powerContainer.style.display = "none";
      }

      cancelFishing() {
          if (this.state === "STRUGGLING" || this.state === "COOP_HELPING") {
              if (this.caughtFish) {
                  this.caughtFish.isCaught = false; 
                  this.caughtFish.escapedBoost = true; this.caughtFish.direction = Math.random() > 0.5 ? 1 : -1;
              }
              const activeUser = (window as any).currentUser || user;
              if (roomChannelRef.current && activeUser?.id) {
                   roomChannelRef.current.send({ type: "broadcast", event: "cancel_fishing", payload: { targetUserId: this.oppTargetId, senderUserId: activeUser.id } });
              }
              this.state = "REELING_HORIZ"; this.lineTension = 0; this.caughtFish = null;
              this.isAssistingOpponent = false; this.isJointPulling = false; this.oppTargetId = null; this.qteEvent.active = false;
              setIsStrugglingUI(false); setBossUI(null);
              if (statusEl) { statusEl.innerText = "Đã bỏ câu (Cắt dây), thu về..."; statusEl.style.color = "#aaa"; }
          }
      }
      
      triggerSnap() {
          this.state = "IDLE";
          if (statusEl) { statusEl.innerText = "💥 Đứt dây tiêu r!"; statusEl.style.color = "#F44336"; }
          window.dispatchEvent(new CustomEvent("showPopupBanner", { detail: { title: "💥 ĐỨT DÂY!", message: "Cá lạng mạnh đứt dây!", type: "beerus" } }));
          if (this.caughtFish) { this.caughtFish.isCaught = false; this.caughtFish.escapedBoost = true; }
          this.reset();
      }

      startCharging() {
        if (this.state !== "IDLE") return;
        
        const currentSelectedBait = (window as any).currentSelectedBait || { id: "basic_worm" };
        const inv = (window as any).currentInventory || {};
        
        if (!inv[currentSelectedBait.id] || inv[currentSelectedBait.id] <= 0) {
            alert("Ní đã hết mồi này rồi! Hãy chọn mồi khác trong kho!"); return;
        }

        const newInv = { ...inv, [currentSelectedBait.id]: inv[currentSelectedBait.id] - 1 };
        setInventory(newInv);
        (window as any).currentInventory = newInv;

        const activeUser = (window as any).currentUser || user;
        if (activeUser?.id) {
          supabase.from("profiles").update({ inventory: newInv }).eq("id", activeUser.id).then(({ error }) => {
            if (error) console.error("Lỗi đồng bộ mồi xuống Supabase:", error.message);
          });
        }

        this.state = "CHARGING"; this.power = 0;
        if (powerContainer) powerContainer.style.display = "block";
        if (statusEl) statusEl.innerText = "Đang gồng lực...";
      }

      releaseCharging() {
        if (this.state !== "CHARGING") return;
        
        const currentBaitId = (window as any).currentSelectedBait?.id || "";
        const isAdvanced = currentBaitId.startsWith("bait_xin_") || currentBaitId.includes("_hoang_gia") || currentBaitId.includes("_lua_do") || currentBaitId.includes("_sam_set") || currentBaitId.includes("_bang_gia") || currentBaitId.includes("_co_khi");
        const isShrimp = currentBaitId === "basic_shrimp";

        let allowBottom = false;
        if (isAdvanced) {
            allowBottom = true; 
        } else if (isShrimp) {
            allowBottom = Math.random() < 0.50; 
        } else {
            allowBottom = false; 
        }
        
        const sinkDepthRatio = allowBottom ? 0.95 : 0.60; 
        this.maxDepthY = waterY + (height - waterY) * sinkDepthRatio;

        const scaleFactor = 0.62;
        let rodTipX = boatFacing === -1 ? boatX - scaleFactor * (2 + Math.cos(-0.42) * 110) : boatX + scaleFactor * (2 + Math.cos(-0.42) * 110);
        let rodTipY = waterY - 12 + scaleFactor * (-10 + Math.sin(-0.42) * 110);

        if (boatFacing === -1) this.targetWaterX = Math.min(width - 40, Math.max(rodTipX - (rodTipX - 60) * (this.power / 100), 60));
        else this.targetWaterX = Math.max(40, Math.min(rodTipX + (width - 60 - rodTipX) * (this.power / 100), width - 60));

        this.state = "CASTING"; this.castStartX = rodTipX; this.castStartY = rodTipY; this.castProgress = 0;
        if (powerContainer) powerContainer.style.display = "none";
        if (statusEl) statusEl.innerText = "Đang quăng mồi...";
      }

      tapStruggle() {
        if (this.state === "BITE_WAIT") {
            this.state = "STRUGGLING"; this.lineTension = 15; setIsStrugglingUI(true);
            critPopups.push({ x: this.x, y: this.y - 30, alpha: 1, scale: 1.2, text: "BÙM!! GIẬT!", color: "#FFD700" });
            
            if (this.caughtFish) {
               let wTxt = this.caughtFish.layer === "boss" ? `${this.caughtFish.weight >= 1000 ? (this.caughtFish.weight / 1000).toFixed(1) + ' Tấn' : this.caughtFish.weight + 'kg'}` : `${this.caughtFish.weight}kg`;
               if (statusEl) { statusEl.innerText = `Dính ${this.caughtFish.fishData.vnName} (${wTxt})! TAP LIÊN TỤC ĐỂ RỈA MÁU!`; statusEl.style.color = "#FF5252"; }
               setBossUI({ name: this.caughtFish.fishData.vnName, hpPercent: (this.caughtFish.hp / this.caughtFish.maxHp) * 100, weightText: wTxt });
            }
            this.applyStruggleDamage(2.5);
        } 
        else if (this.state === "STRUGGLING" || this.isAssistingOpponent) {
          this.lineTension = Math.max(0, this.lineTension - 3); 
          this.applyStruggleDamage(1.5);
        }
      }

      holdStruggleTick(isHoldingDown: boolean) {
        if (this.state === "STRUGGLING" && this.caughtFish && this.caughtFish.hp > 0) {
            if (this.qteEvent.active) return;
            const baseTensionGain = this.caughtFish.fishData.struggleWeight || 0.2;
            
            const currentBaitId = (window as any).currentSelectedBait?.id || "";
            let tensionMultiplier = 1.0;
            if (currentBaitId.includes("_poor")) tensionMultiplier *= 1.5;
            if (currentBaitId.includes("co_khi")) tensionMultiplier *= 0.7;

            if ((window as any).currentWeather?.type === "storm" && Math.random() < 0.08) {
                this.lineTension += 12; 
                critPopups.push({ x: this.x, y: this.y - 50, alpha: 1, scale: 0.8, text: "⚡ Gió Giật Dây!", color: "#FF3D00" });
            }

            if (isHoldingDown) {
                this.lineTension += (baseTensionGain * 0.8 * tensionMultiplier);
                if (statusEl) { statusEl.innerText = `⚠️ Giữ chặt! Căng dây: ${Math.round(this.lineTension)}% (Nhớ TAP nhen)`; statusEl.style.color = "#FF9800"; }
            } else {
                this.lineTension += (baseTensionGain * 3.5 * tensionMultiplier);
                if (statusEl) { statusEl.innerText = `🎣 Cá đang trôi đi! TAP NHANH! (Căng: ${Math.round(this.lineTension)}%)`; statusEl.style.color = "#F44336"; }
            }
        }
      }

      applyStruggleDamage(multiplier: number) {
        const pCount = (window as any).roomPlayerCount || 1;
        const playerBuffBonus = 1 + (pCount - 1) * 0.05;

        let hitDamage = multiplier * currentRodDamageBuff * playerBuffBonus * (Math.floor(Math.random() * 5) + 10);
        
        if (this.isJointPulling || this.isAssistingOpponent) {
          hitDamage *= 0.5;
        }

        let actualCritChance = 0.15 + ((pCount > 1) ? 0.05 * (pCount - 1) : 0);
        if (Math.random() < actualCritChance) {
          hitDamage *= 2.2; 
          critPopups.push({ x: this.x + (Math.random()-0.5)*20, y: this.y - 20, alpha: 1, scale: 1.2, text: "⚡ CRIT DAME!", color: "#FFD700" });
        } else {
          critPopups.push({ x: this.x + (Math.random()-0.5)*20, y: this.y - 20, alpha: 1, scale: 0.8, text: `-${Math.round(hitDamage)} HP`, color: "#FFF" });
        }

        if (this.caughtFish) {
            this.caughtFish.hp = Math.max(0, this.caughtFish.hp - hitDamage);
            const remainingPercent = Math.max(0, (this.caughtFish.hp / this.caughtFish.maxHp) * 100);
            this.tapProgress = 100 - remainingPercent;
            
            let wTxt = this.caughtFish.layer === "boss" ? `${this.caughtFish.weight >= 1000 ? (this.caughtFish.weight / 1000).toFixed(1) + ' Tấn' : this.caughtFish.weight + 'kg'}` : `${this.caughtFish.weight}kg`;
            setBossUI({ name: this.caughtFish.fishData.vnName, hpPercent: remainingPercent, weightText: wTxt });

            if (roomChannelRef.current) roomChannelRef.current.send({ type: "broadcast", event: "boss_damage", payload: { fishId: this.caughtFish.id, damage: hitDamage } });

            if (this.caughtFish.hp <= 0 && !this.isAssistingOpponent) {
                this.state = "REELING_HORIZ"; this.lineTension = 0; setIsStrugglingUI(false); setBossUI(null); this.qteEvent.active = false;
                
                if (this.caughtFish.layer === "boss") lastBossKillTime = Date.now();

                if (statusEl) { statusEl.innerText = `Khuất phục thành công! Kéo lên...`; statusEl.style.color = "#FFEB3B"; }
            }
        }
      }
      
      resolveSwipe(swipeDirection: string) {
          if (!this.qteEvent.active || this.qteEvent.cooldown > 0) return;
          if (swipeDirection === this.qteEvent.direction) {
             this.qteEvent.currentSwipes++;
             critPopups.push({ x: this.x, y: this.y - 40, alpha: 1, scale: 1.2, text: `TỐT! (${this.qteEvent.currentSwipes}/${this.qteEvent.requiredSwipes})`, color: "#4CAF50" });
             this.lineTension = Math.max(0, this.lineTension - 10);
             
             if (this.qteEvent.currentSwipes >= this.qteEvent.requiredSwipes) {
                 this.qteEvent.active = false;
             } else {
                 this.qteEvent.cooldown = 45;
             }
          } else {
             this.triggerSnap();
          }
      }

      update() {
        const scaleFactor = 0.62;
        let rodTipX = boatFacing === -1 ? boatX - scaleFactor * (2 + Math.cos(-0.42) * 110) : boatX + scaleFactor * (2 + Math.cos(-0.42) * 110);
        let rodTipY = waterY - 12 + scaleFactor * (-10 + Math.sin(-0.42) * 110);

        if (this.state === "IDLE" || this.state === "CHARGING") { this.x = rodTipX; this.y = rodTipY; }

        if (this.state === "CHARGING") {
          this.power += 1.8; if (this.power > 100) this.power = 100;
          if (powerContainer) powerContainer.style.width = this.power + "%";
        } else if (this.state === "CASTING") {
          this.castProgress += 0.035;
          if (this.castProgress >= 1) {
            this.castProgress = 1; this.state = "SINKING"; if (statusEl) statusEl.innerText = "Mồi đang chìm...";
          }
          let t = this.castProgress;
          this.x = this.castStartX + (this.targetWaterX - this.castStartX) * t;
          this.y = this.castStartY + (waterY - this.castStartY) * t - Math.sin(t * Math.PI) * 60;
        } else if (this.state === "SINKING") {
          this.y += 3.5;
          
          for (let f of fishes) {
            if (f.isCaught || f.isWaitingForWave) continue;
            if (this.y < f.y - f.size) continue;

            let fishRadius = Math.max(16, f.size * 0.45);
            let dist = Math.sqrt(Math.pow(this.x - f.x, 2) + Math.pow(this.y - f.y, 2));
            
            if (dist < fishRadius) {
              const currentBaitId = (window as any).currentSelectedBait?.id || "";
              const isBasic = currentBaitId.startsWith("basic_");
              const isNormal = currentBaitId.startsWith("bait_thuong_") || currentBaitId.includes("_thinh_ki_") || currentBaitId.includes("_ba_doc_") || currentBaitId.includes("_bien_sau_") || currentBaitId.includes("_thao_duoc");
              const isPoor = currentBaitId.includes("_poor");

              if (f.layer === "boss" && !currentBaitId.includes("hoang_gia")) {
                  continue;
              }

              if (isBasic && f.weight >= 50) {
                  continue;
              }

              if (isNormal && f.weight > 500) {
                  continue;
              }

              const missChance = isPoor ? 0.50 : 0.30;
              if (Math.random() < missChance) {
                  window.dispatchEvent(new CustomEvent("showPopupBanner", { detail: { title: "💨 HỤT MỒI!", message: `Bị ${f.fishData.vnName} ngó lơ hoặc đớp mất mồi!`, type: "beerus" } }));
                  this.state = "REELING_HORIZ"; break;
              }

              if (currentBaitId.includes("sam_set")) {
                  f.stunTimer = 120;
                  window.dispatchEvent(new CustomEvent("showPopupBanner", { detail: { title: "⚡ SẤM SÉT ĐỊNH THÂN!", message: `${f.fishData.vnName} bị choáng 2 giây!`, type: "rare" } }));
              } else if (currentBaitId.includes("lua_do")) {
                  f.hp = Math.max(0, f.hp - (f.maxHp * 0.05));
                  window.dispatchEvent(new CustomEvent("showPopupBanner", { detail: { title: "🔥 THIÊU ĐỐT LỬA ĐỎ!", message: `${f.fishData.vnName} mất 5% HP!`, type: "rare" } }));
              }

              this.catchFishWait(f); break;
            }
          }

          if (this.state === "SINKING" && this.y >= this.maxDepthY) {
            this.state = "REELING_HORIZ";
            if (statusEl) { statusEl.innerText = "Hết tầm dây, kéo về"; statusEl.style.color = "#aaa"; }
          }
        } else if (this.state === "BITE_WAIT") {
           this.biteWaitFrames--;
           if (this.biteWaitFrames <= 0) {
               this.state = "REELING_HORIZ";
               if (statusEl) { statusEl.innerText = "Chậm tay quá, cá rỉa mồi chạy rồi!"; statusEl.style.color = "#aaa"; }
               if (this.caughtFish) { 
                   this.caughtFish.isCaught = false; 
                   this.caughtFish.escapedBoost = true; 
                   this.caughtFish = null; 
               }
           }
        } else if (this.state === "STRUGGLING" || this.state === "COOP_HELPING") {
          if (this.lineTension >= 100) { this.triggerSnap(); return; }
          
          if (this.state === "STRUGGLING" && this.caughtFish && !this.qteEvent.active && this.caughtFish.hp > 0) {
              const isEligible = this.caughtFish.layer === "mid" || this.caughtFish.layer === "bottom" || this.caughtFish.layer === "boss";
              if (isEligible && Math.random() < 0.005) { 
                  this.qteEvent.active = true;
                  let actualWeightKg = this.caughtFish.weight;
                  
                  let reqSwipes = 2;
                  if (actualWeightKg >= 100 && actualWeightKg < 500) reqSwipes = 3;
                  else if (actualWeightKg >= 500) reqSwipes = 4;

                  this.qteEvent.requiredSwipes = reqSwipes;
                  this.qteEvent.currentSwipes = 0;
                  this.qteEvent.cooldown = 0;
                  this.qteEvent.maxTime = 180;
                  this.qteEvent.timer = this.qteEvent.maxTime;
                  this.qteEvent.direction = Math.random() > 0.5 ? "left" : "right";
              }
          }
          
          if (this.qteEvent.active) {
              if (this.qteEvent.cooldown > 0) {
                  this.qteEvent.cooldown--;
                  if (this.qteEvent.cooldown <= 0) {
                      this.qteEvent.direction = Math.random() > 0.5 ? "left" : "right";
                      this.qteEvent.timer = this.qteEvent.maxTime;
                  }
              } else {
                  this.qteEvent.timer--;
                  if (this.qteEvent.timer <= 0) { this.triggerSnap(); return; }
              }
          }
        } else if (this.state === "REELING_HORIZ") {
          let dx = rodTipX - this.x; let speed = this.caughtFish ? 8 : 15;
          if (Math.abs(dx) < speed) { this.x = rodTipX; this.state = "REELING_VERT"; } 
          else {
            this.x += Math.sign(dx) * speed;
            if (this.caughtFish) { this.caughtFish.x = this.x - (this.caughtFish.direction === 1 ? this.caughtFish.size * 0.7 : -this.caughtFish.size * 0.7); this.caughtFish.y = this.y - -this.caughtFish.size * 0.15; }
          }
        } else if (this.state === "REELING_VERT") {
          let dy = rodTipY - this.y; let speed = 30;
          if (Math.abs(dy) < speed) {
            if (this.caughtFish && !this.isAssistingOpponent) {
              let earnedPoints = this.caughtFish.points; const currentFish = this.caughtFish.fishData;
              let wTxt = this.caughtFish.weight >= 1000 ? `${(this.caughtFish.weight / 1000).toFixed(1)} Tấn` : `${this.caughtFish.weight}kg`;
              if (selectedRod === "cancauvectorvang.png") earnedPoints *= 2;

              const activeUser = (window as any).currentUser || user;
              if (roomChannelRef.current && activeUser?.id) roomChannelRef.current.send({ type: "broadcast", event: "catch_alert", payload: { user_id: activeUser.id, fishName: currentFish.vnName, weightText: wTxt, points: earnedPoints } });

              setMyCatchNotice({ text: currentFish.vnName, amount: `+${earnedPoints.toLocaleString()}🪙`, show: true });
              setTimeout(() => setMyCatchNotice(null), 3500);
              setCenterCatchNotice({ text: `${currentFish.vnName} (${wTxt})`, show: true });
              setTimeout(() => setCenterCatchNotice(null), 3500);

              syncScoreToSupabase(((window as any).currentGameScore ?? 1000) + earnedPoints);
              let idx = fishes.indexOf(this.caughtFish);
              if (idx > -1) { fishes.splice(idx, 1); if (currentFish.layer !== "boss") fishes.push(new Fish()); }
            }
            this.reset();
          } else {
            this.y += Math.sign(dy) * speed;
            if (this.caughtFish) {
              this.caughtFish.x = this.x - (this.caughtFish.direction === 1 ? this.caughtFish.size * 0.7 : -this.caughtFish.size * 0.7) + (Math.random() - 0.5) * 6;
              this.caughtFish.y = this.y - -this.caughtFish.size * 0.15;
            }
          }
        }
      }

      catchFishWait(fish: Fish) {
        this.caughtFish = fish; fish.isCaught = true; 
        const currentBaitId = (window as any).currentSelectedBait?.id || "";

        let actualWeightKg = fish.weight;
        fish.maxHp = Math.max(10, Math.sqrt(actualWeightKg) * 12); 
        fish.hp = fish.maxHp;

        if (currentBaitId.includes("bang_gia")) {
            this.state = "STRUGGLING"; this.lineTension = 10; setIsStrugglingUI(true);
            let wTxt = fish.weight >= 1000 ? `${(fish.weight / 1000).toFixed(1)} Tấn` : `${fish.weight}kg`;
            if (statusEl) { statusEl.innerText = `Băng giá đóng băng ${fish.fishData.vnName}! Nhấp Để Kéo!`; statusEl.style.color = "#00E676"; }
            setBossUI({ name: fish.fishData.vnName, hpPercent: 100, weightText: wTxt });
            return;
        }

        this.state = "BITE_WAIT"; this.biteWaitFrames = 35;
        if (statusEl) { statusEl.innerText = `CÁ CẮN MỒI!! GIẬT LÊN NGAY (TAP)!!`; statusEl.style.color = "#FFD700"; }
      }

      draw() {
        let drawX = this.x; let drawY = this.y;
        if (this.state === "STRUGGLING" || this.state === "COOP_HELPING") {
          drawX += (Math.random() - 0.5) * 12; drawY += (Math.random() - 0.5) * 12;
        }
        const scaleFactor = 0.62;
        let rodTipX = boatFacing === -1 ? boatX - scaleFactor * (2 + Math.cos(-0.42) * 110) : boatX + scaleFactor * (2 + Math.cos(-0.42) * 110);
        let rodTipY = waterY - 12 + scaleFactor * (-10 + Math.sin(-0.42) * 110);

        ctx!.beginPath(); ctx!.moveTo(rodTipX, rodTipY);
        
        const activeWeather = (window as any).currentWeather?.type;
        if (activeWeather === "storm" && this.state !== "IDLE") {
            const stormWobble = Math.sin(Date.now() * 0.02) * 25;
            ctx!.quadraticCurveTo((rodTipX + drawX) / 2 + stormWobble, Math.min(rodTipY, drawY) - 30 + stormWobble, drawX, drawY);
        } else if (this.state === "IDLE" || this.state === "CHARGING") {
          ctx!.lineTo(rodTipX, rodTipY + 20); 
        } else {
          ctx!.quadraticCurveTo((rodTipX + drawX) / 2, Math.min(rodTipY, drawY) - 30, drawX, drawY);
        }

        if (this.state === "STRUGGLING" || this.state === "COOP_HELPING") ctx!.strokeStyle = this.qteEvent.active ? "#E91E63" : "#FF5252";
        else if (this.state === "BITE_WAIT") ctx!.strokeStyle = "#00E676";
        else ctx!.strokeStyle = "rgba(255,255,255,0.95)";
        
        ctx!.lineWidth = 1.5; ctx!.stroke(); this.drawHookAndBait(drawX, drawY);
        
        if (this.state === "BITE_WAIT") {
            ctx!.save(); ctx!.font = "900 24px sans-serif"; ctx!.fillStyle = "#FF1744"; ctx!.strokeStyle = "#FFF"; ctx!.lineWidth = 4;
            const tw = ctx!.measureText("!!").width; ctx!.strokeText("!!", drawX - tw/2, drawY - 25); ctx!.fillText("!!", drawX - tw/2, drawY - 25); ctx!.restore();
        }
        
        if (this.qteEvent.active) {
            ctx!.save(); ctx!.font = "900 18px sans-serif"; ctx!.fillStyle = "#FFF"; ctx!.strokeStyle = "#000"; ctx!.lineWidth = 3;
            const text = this.qteEvent.direction === "left" ? `◀ VUỐT TRÁI (${this.qteEvent.currentSwipes}/${this.qteEvent.requiredSwipes})` : `VUỐT PHẢI ▶ (${this.qteEvent.currentSwipes}/${this.qteEvent.requiredSwipes})`;
            const tw = ctx!.measureText(text).width;
            ctx!.strokeText(text, drawX - tw/2, drawY - 60); ctx!.fillText(text, drawX - tw/2, drawY - 60);
            ctx!.restore();
        }

        if (this.state === "STRUGGLING" || this.state === "COOP_HELPING") {
          const barW = 60; const barH = 6; const barX = drawX - barW / 2;
          const tensionY = drawY - 45; ctx!.fillStyle = "rgba(0,0,0,0.6)"; ctx!.fillRect(barX, tensionY, barW, barH);
          const tensionRatio = Math.min(1, this.lineTension / 100); ctx!.fillStyle = this.lineTension > 80 ? "#F44336" : "#FFEB3B";
          ctx!.fillRect(barX, tensionY, barW * tensionRatio, barH); ctx!.strokeStyle = "#FFFFFF"; ctx!.lineWidth = 1; ctx!.strokeRect(barX, tensionY, barW, barH);
          
          const progY = drawY - 35; ctx!.fillStyle = "rgba(0,0,0,0.6)"; ctx!.fillRect(barX, progY, barW, barH);
          const progRatio = Math.min(1, this.tapProgress / 100); ctx!.fillStyle = "#4CAF50"; ctx!.fillRect(barX, progY, barW * progRatio, barH);
          ctx!.strokeStyle = "#FFFFFF"; ctx!.lineWidth = 1; ctx!.strokeRect(barX, progY, barW, barH);
        }
      }

      drawHookAndBait(hx: number, hy: number) {
        const currentBaitId = (window as any).currentSelectedBait?.id || "";
        const baitInfo = resolveBaitInfo(currentBaitId);

        if (baitInfo.emoji && !baitInfo.filename) {
            ctx!.save(); ctx!.font = "16px sans-serif"; ctx!.textAlign = "center"; ctx!.textBaseline = "middle";
            ctx!.fillText(baitInfo.emoji, hx, hy); ctx!.restore();
        } else if (typeof activeBaitImg !== "undefined" && activeBaitImg.complete && activeBaitImg.naturalWidth !== 0 && activeBaitImg.src) {
          ctx!.imageSmoothingEnabled = false; ctx!.drawImage(activeBaitImg, hx - 12, hy - 12, 24, 24);
        } else {
          ctx!.fillStyle = "#FF9800"; ctx!.beginPath(); ctx!.arc(hx, hy, 5, 0, Math.PI * 2); ctx!.fill();
        }
      }
    }

    const fishes: Fish[] = [];
    const computedWaterY = (canvas.height / (window.devicePixelRatio || 1)) * 0.22;
    const waterHeight = canvas.height / (window.devicePixelRatio || 1) - computedWaterY;

    if ((window as any).isHost) {
      for (let i = 0; i < 20; i++) fishes.push(new Fish("top", computedWaterY + 15 + ((waterHeight * 0.28) / 20) * i));
      for (let i = 0; i < 10; i++) fishes.push(new Fish("mid", computedWaterY + waterHeight * 0.32 + ((waterHeight * 0.35) / 10) * i));
      for (let i = 0; i < 2; i++) fishes.push(new Fish("bottom", computedWaterY + waterHeight * 0.7 + ((waterHeight * 0.22) / 2) * i));
      
      setInterval(() => {
          const now = Date.now();
          const cooldownPassed = now - lastBossKillTime >= 300000;
          const hasBoss = fishes.some(f => f.layer === "boss");
          if (cooldownPassed && !hasBoss && Math.random() < 0.25) {
              fishes.push(new Fish("boss", computedWaterY + waterHeight * 0.5));
          }
      }, 15000); 
    }

    const syncFishesListener = (e: any) => {
      if (!(window as any).isHost && e.detail) {
        const rawList = e.detail; const updatedIds = new Set();
        rawList.forEach((data: any) => {
            updatedIds.add(data.id);
            const existingFish = fishes.find(f => f.id === data.id);
            if (existingFish) { 
                if (!existingFish.isCaught) {
                    existingFish.targetX = data.x; 
                    existingFish.targetY = data.y; 
                    existingFish.direction = data.direction; 
                    existingFish.hp = data.hp; 
                }
            } 
            else fishes.push(new Fish(undefined, undefined, undefined, data));
        });
        for (let i = fishes.length - 1; i >= 0; i--) if (!updatedIds.has(fishes[i].id) && !fishes[i].isCaught) fishes.splice(i, 1);
      }
    };
    window.addEventListener("receivedSyncFishes", syncFishesListener);

    const hook = new Hook();
    const coopDamageListener = (e: any) => { if (hook.state === "STRUGGLING") hook.isJointPulling = true; };
    window.addEventListener("receivedCoopDamage", coopDamageListener);

    let isHolding = false; let touchStartX = 0;

    const handleDown = (clientX: number) => {
      isHolding = true; touchStartX = clientX;
      if (hook.state === "BITE_WAIT" || hook.state === "STRUGGLING" || hook.state === "COOP_HELPING") hook.tapStruggle();
      else if (hook.state === "IDLE") { hook.startCharging(); }
    };
    const handleUp = (clientX: number) => {
      isHolding = false;
      if (hook.state === "CHARGING") { if (powerContainer) powerContainer.style.display = "none"; hook.releaseCharging(); }
      if (hook.state === "STRUGGLING" && hook.qteEvent.active) {
         const deltaX = clientX - touchStartX;
         if (Math.abs(deltaX) > 50) {
             if (deltaX < 0) hook.resolveSwipe("left");
             else hook.resolveSwipe("right");
         }
      }
    };

    canvas.addEventListener("mousedown", (e) => handleDown(e.clientX));
    canvas.addEventListener("mouseup", (e) => handleUp(e.clientX));
    canvas.addEventListener("touchstart", (e) => handleDown(e.touches[0].clientX), { passive: true });
    canvas.addEventListener("touchend", (e) => handleUp(e.changedTouches[0].clientX));

    const placedDecorations: any[] = [];
    function initDecorationsMap() {
      if (loadedDecorImages.length === 0) return;
      let clusterCenters = [60, 150, 280, width - 320, width - 180, width - 70, width / 2 - 80, width / 2 + 90];
      for (let cx of clusterCenters) {
        let countInCluster = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < countInCluster; i++) {
          const randomDecor = loadedDecorImages[Math.floor(Math.random() * loadedDecorImages.length)];
          let isWeed = randomDecor.filename.includes("rongbien") || randomDecor.filename.includes("taobien");
          let w = 45 + Math.random() * 45; let h = 40 + Math.random() * 40;
          let offsetX = cx + (Math.random() - 0.5) * 50; let itemY = height - h - Math.random() * 10;
          placedDecorations.push({ imgObj: randomDecor, x: offsetX, y: itemY, width: w, height: h, isWeed, swayOffset: Math.random() * Math.PI * 2 });
        }
      }
    }
    initDecorationsMap();

    function drawDecorations() {
      for (let d of placedDecorations) {
        const img = d.imgObj.img;
        if (img && img.complete && img.naturalWidth !== 0) {
          ctx!.save();
          if (d.isWeed) {
            let sway = Math.sin(Date.now() * 0.003 + d.swayOffset) * 6;
            ctx!.translate(d.x + d.width / 2, d.y + d.height);
            ctx!.transform(1, 0, sway / d.height, 1, 0, 0);
            ctx!.translate(-(d.x + d.width / 2), -(d.y + d.height));
          }
          ctx!.drawImage(img, d.x, d.y, d.width, d.height);
          ctx!.restore();
        }
      }
    }

    function drawOpponents() {
      Object.values(oppStates).forEach((opp: any) => {
        if (!opp) return;
        const charX = opp.boatRatio !== undefined ? opp.boatRatio * width : width * 0.5;
        const charY = waterY - 12; const scaleFactor = 0.62; const oppFacing = opp.facing !== undefined ? opp.facing : 1;

        ctx!.save(); ctx!.translate(charX, charY);
        if (oppFacing === -1) ctx!.scale(-scaleFactor, scaleFactor); else ctx!.scale(scaleFactor, scaleFactor);

        ctx!.fillStyle = "#5D4037"; ctx!.beginPath(); ctx!.moveTo(-45, 15); ctx!.lineTo(55, 15); ctx!.lineTo(40, 28); ctx!.lineTo(-30, 28); ctx!.closePath(); ctx!.fill();
        ctx!.strokeStyle = "#3E2723"; ctx!.lineWidth = 2; ctx!.stroke(); ctx!.fillStyle = "#424242"; ctx!.fillRect(-10, -15, 20, 30);

        const oppAvatarImg = new Image(); oppAvatarImg.src = opp.avatar;
        if (oppAvatarImg.complete && oppAvatarImg.naturalWidth !== 0) {
          ctx!.save(); ctx!.beginPath(); ctx!.arc(0, 0, 13, 0, Math.PI * 2); ctx!.closePath(); ctx!.clip();
          if (oppFacing === -1) ctx!.scale(-1, 1);
          ctx!.drawImage(oppAvatarImg, -13, -13, 26, 26);
          ctx!.restore(); ctx!.strokeStyle = "#00B0FF"; ctx!.lineWidth = 2; ctx!.beginPath(); ctx!.arc(0, 0, 13, 0, Math.PI * 2); ctx!.stroke();
        } else { ctx!.fillStyle = "#00B0FF"; ctx!.beginPath(); ctx!.arc(0, 0, 11, 0, Math.PI * 2); ctx!.fill(); }
        ctx!.restore();
      });
    }

    function drawBackground() {
      weatherTimerFrame++;
      
      if (currentWeatherType !== "none") {
          weatherDurationFrames++;
          if (weatherDurationFrames > targetWeatherDuration) {
              currentWeatherType = "none";
              weatherTimerFrame = 0;
              weatherDurationFrames = 0;
              nextWeatherIntervalFrames = Math.floor(Math.random() * 7200) + 10800;
              
              setWeatherState({ type: "none", warningText: "", active: false });
              if ((window as any).isHost && roomChannelRef.current) {
                  roomChannelRef.current.send({ type: "broadcast", event: "weather_update", payload: { type: "none", warningText: "", active: false } });
              }
          }
      } 
      else if (weatherTimerFrame > nextWeatherIntervalFrames) {
          weatherTimerFrame = 0;
          weatherDurationFrames = 0;
          
          const rand = Math.random();
          let newType = "none";
          let warnText = "";

          if (rand < 0.35) {
              newType = "rain";
              warnText = "🌧️ Mưa lớn! Nước đọng làm tất cả cá bơi nhanh hơn 30%-50%!";
          } else if (rand < 0.7) {
              newType = "storm";
              warnText = "⚡ Bão giật! Dây câu bị lắc uốn lượn dữ dội & cá bơi cực hăng!";
          } else {
              newType = "fog";
              warnText = "🌫️ Sương mù dày đặc! Phủ kín toàn bộ mặt hồ cá!";
          }

          currentWeatherType = newType;
          const newWeatherPayload = { type: newType, warningText: warnText, active: true };
          
          setWeatherState(newWeatherPayload);
          (window as any).currentWeather = newWeatherPayload;

          if ((window as any).isHost && roomChannelRef.current) {
              roomChannelRef.current.send({ type: "broadcast", event: "weather_update", payload: newWeatherPayload });
          }
      }

      ctx!.fillStyle = currentWeatherType === "storm" ? "#374151" : (currentWeatherType === "rain" ? "#64748B" : (currentWeatherType === "fog" ? "#90A4AE" : "#87CEEB"));
      ctx!.fillRect(0, 0, width, waterY);
      ctx!.fillStyle = "#FFEB3B"; ctx!.beginPath(); ctx!.arc(width * 0.8, height * 0.08, 35, 0, Math.PI * 2); ctx!.fill();

      let grad = ctx!.createLinearGradient(0, waterY, 0, height);
      grad.addColorStop(0, currentWeatherType !== "none" ? "#0F172A" : "#0288D1"); 
      grad.addColorStop(1, "#000A1F");
      ctx!.fillStyle = grad; ctx!.fillRect(0, waterY, width, height - waterY);

      drawDecorations();
      drawOpponents();

      if (currentWeatherType === "rain" || currentWeatherType === "storm") {
          ctx!.strokeStyle = "rgba(255, 255, 255, 0.7)";
          ctx!.lineWidth = currentWeatherType === "storm" ? 2.5 : 1.5;
          ctx!.beginPath();
          for (let drop of rainDrops) {
              ctx!.moveTo(drop.x, drop.y);
              ctx!.lineTo(drop.x - (currentWeatherType === "storm" ? 5 : 2), drop.y + drop.len);
              drop.y += drop.speed;
              drop.x -= (currentWeatherType === "storm" ? 2 : 0.5);
              if (drop.y > height) { drop.y = -20; drop.x = Math.random() * width; }
          }
          ctx!.stroke();
      }

      if (boatSpeed !== 0 && hook.state === "IDLE") { boatX += boatSpeed; if (boatX < 40) boatX = 40; if (boatX > width - 100) boatX = width - 100; }

      const charX = boatX; const charY = waterY - 12; const scaleFactor = 0.62;
      ctx!.save(); ctx!.translate(charX, charY);
      if (boatFacing === -1) ctx!.scale(-scaleFactor, scaleFactor); else ctx!.scale(scaleFactor, scaleFactor);

      ctx!.fillStyle = "#8D6E63"; ctx!.beginPath(); ctx!.moveTo(-45, 15); ctx!.lineTo(55, 15); ctx!.lineTo(40, 28); ctx!.lineTo(-30, 28); ctx!.closePath(); ctx!.fill();
      ctx!.strokeStyle = "#3E2723"; ctx!.lineWidth = 2; ctx!.stroke(); ctx!.fillStyle = "#212121"; ctx!.fillRect(-10, -15, 20, 30);

      if (rodImg && rodImg.complete && rodImg.naturalWidth !== 0) {
         ctx!.drawImage(rodImg, 5, -55, 50, 50);
      }

      const avatarImg = new Image(); avatarImg.src = userAvatar;
      if (avatarImg.complete && avatarImg.naturalWidth !== 0) {
        ctx!.save(); ctx!.beginPath(); ctx!.arc(0, 0, 13, 0, Math.PI * 2); ctx!.closePath(); ctx!.clip();
        if (boatFacing === -1) ctx!.scale(-1, 1);
        ctx!.drawImage(avatarImg, -13, -13, 26, 26);
        ctx!.restore(); ctx!.strokeStyle = "#FFD700"; ctx!.lineWidth = 2; ctx!.beginPath(); ctx!.arc(0, 0, 13, 0, Math.PI * 2); ctx!.stroke();
      } else { ctx!.fillStyle = "#FFD700"; ctx!.beginPath(); ctx!.arc(0, 0, 11, 0, Math.PI * 2); ctx!.fill(); }
      ctx!.restore();

      // --- SƯƠNG MÙ CHE KHUẤT TOÀN BỘ VÙNG NƯỚC HỒ CÁ ---
      if (currentWeatherType === "fog") {
          ctx!.fillStyle = "rgba(180, 195, 205, 0.92)";
          ctx!.fillRect(0, waterY, width, height - waterY);

          ctx!.fillStyle = "rgba(220, 230, 240, 0.45)";
          let fogDrift = (Date.now() * 0.025) % width;
          ctx!.fillRect(-fogDrift, waterY, width * 2, height - waterY);
      }
    }

    let lastBroadcastTime = 0; let syncTimer = 0; let animationFrameId: number;

    function gameLoop() {
      ctx!.clearRect(0, 0, width, height); drawBackground();

      if ((window as any).isHost && roomChannelRef.current) {
        syncTimer++;
        if (syncTimer > 6) { 
          syncTimer = 0;
          const fishPayload = fishes.map(f => ({ id: f.id, x: f.x, y: f.y, vx: f.speed, direction: f.direction, size: f.size, points: f.points, weight: f.weight, hp: f.hp, maxHp: f.maxHp, layer: f.layer, filename: f.fishData.filename }));
          roomChannelRef.current.send({ type: "broadcast", event: "sync_fishes", payload: { fishes: fishPayload } });
        }
      }

      for (let f of fishes) { f.update(); f.draw(); }
      hook.holdStruggleTick(isHolding); hook.update(); hook.draw();

      const now = Date.now();
      const activeUser = (window as any).currentUser || user;
      if (roomChannelRef.current && activeUser?.id && now - lastBroadcastTime > 100) {
        roomChannelRef.current.send({ type: "broadcast", event: "player_state", payload: { user_id: activeUser.id, avatar: userAvatar, rodFilename: selectedRod, boatRatio: boatX / width, hookX: hook.x, hookY: hook.y, hookState: hook.state, facing: boatFacing } });
        lastBroadcastTime = now;
      }
      animationFrameId = requestAnimationFrame(gameLoop);
    }
    gameLoop();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("changeBaitImg", updateBaitListener);
      window.removeEventListener("changeRod", updateRodListener);
      window.removeEventListener("moveBoat", moveBoatListener);
      window.removeEventListener("updateOpponentState", oppStateListener);
      window.removeEventListener("receivedCoopDamage", coopDamageListener);
      window.removeEventListener("receivedSyncFishes", syncFishesListener);
      window.removeEventListener("syncBossDamage", syncBossDamageListener);
      window.removeEventListener("cancelFishingAction", cancelFishingListener);
      window.removeEventListener("receivedCancelFishing", oppCancelFishingListener);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMounted, activeRoom, userAvatar, selectedRod]);

  useEffect(() => {
    const handlePopupBanner = (e: any) => { setPopupData({ show: true, title: e.detail.title, message: e.detail.message, type: e.detail.type }); setTimeout(() => setPopupData(null), 4500); };
    window.addEventListener("showPopupBanner", handlePopupBanner);
    return () => window.removeEventListener("showPopupBanner", handlePopupBanner);
  }, []);

  const handleFindBaitReward = async (earnedQty: number) => {
      if (!activeFindGame) return;
      let targetBaitId = "basic_worm";
      if (activeFindGame === "insect") targetBaitId = Math.random() > 0.5 ? "basic_worm" : "basic_cricket";
      else if (activeFindGame === "shrimp") targetBaitId = "basic_shrimp";
      else if (activeFindGame === "bread") targetBaitId = "basic_bread";

      const newInv = { ...inventory, [targetBaitId]: (inventory[targetBaitId] || 0) + earnedQty };
      setInventory(newInv);
      (window as any).currentInventory = newInv;
      const activeUser = (window as any).currentUser || user;
      if (activeUser?.id) await supabase.from("profiles").update({ inventory: newInv }).eq("id", activeUser.id);

      const now = Date.now();
      if (activeFindGame === "insect") setLastInsectTime(now);
      else if (activeFindGame === "shrimp") setLastShrimpTime(now);
      else if (activeFindGame === "bread") setLastBreadTime(now);

      setActiveFindGame(null);
      showShopNotice(`✨ Thu hoạch thành công +${earnedQty} mồi!`);
  };

  if (!activeRoom) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-white">
        <div className="absolute top-4 left-4">
          <Link href="/" className="bg-slate-900 border border-amber-500/40 text-amber-400 px-4 py-2 rounded-xl font-black text-sm shadow">← Quay Lại</Link>
        </div>
        <div className="max-w-md w-full bg-slate-900/80 border-2 border-amber-500/60 p-6 rounded-3xl shadow-2xl backdrop-blur-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-amber-400 uppercase tracking-widest drop-shadow-lg">🎣 Sảnh Câu Cá Realtime</h1>
          </div>
          <div className="space-y-3">
            {rooms.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-4">Đang tải danh sách phòng...</div>
            ) : (
              rooms.map((room) => {
                let currentCount = 0; for (let i = 1; i <= 10; i++) if (room[`player_${i}`]) currentCount++;
                const isFull = currentCount >= room.max_players;
                return (
                  <button key={room.id} disabled={isFull} onClick={() => joinRoom(room.id)} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition font-black ${isFull ? "bg-slate-800 border-rose-500/40 text-rose-300 cursor-not-allowed" : "bg-slate-950 border-amber-500/40 text-amber-300 hover:bg-slate-800 hover:scale-[1.02] cursor-pointer"}`}>
                    <span className="text-base uppercase">{room.name}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-md ${isFull ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"}`}>{currentCount} / {room.max_players}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 select-none font-sans pointer-events-auto" style={{ touchAction: "none" }}>
      
      {activeCraftingRecipe && (
         <CraftingMinigame 
            recipe={activeCraftingRecipe} 
            onComplete={(isPerfect, qty) => executeCraftBait(isPerfect, qty)}
            onCancel={() => setActiveCraftingRecipe(null)}
         />
      )}

      {isFindBaitMenuOpen && !activeFindGame && (
        <div className="absolute inset-0 z-[70] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 rounded-3xl animate-fadeIn">
             <div className="bg-slate-900 border-2 border-amber-500 w-full max-w-md rounded-2xl p-6 shadow-[0_0_30px_rgba(245,158,11,0.4)] text-center relative">
                  <h3 className="text-xl font-black text-amber-400 mb-1 uppercase">🏕️ KHO MỤC TÌM MỒI</h3>
                  <p className="text-[10px] text-slate-400 mb-4">Mỗi hoạt động có thời gian hồi riêng 5 phút!</p>

                  <div className="space-y-3">
                      {(() => {
                          const now = Date.now();
                          const diff = now - lastInsectTime;
                          const cooldown = 300000;
                          const canDo = diff >= cooldown;
                          const leftSec = Math.ceil((cooldown - diff) / 1000);
                          return (
                              <button disabled={!canDo} onClick={() => setActiveFindGame("insect")} className={`w-full p-3 rounded-xl font-black text-xs uppercase flex items-center justify-between border transition ${canDo ? 'bg-amber-600/30 border-amber-500 text-amber-300 hover:bg-amber-600/50 cursor-pointer' : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'}`}>
                                  <span>⛏️ Đào Côn Trùng (Giun, Dế)</span>
                                  <span>{canDo ? 'Sẵn sàng' : `Hồi: ${Math.floor(leftSec/60)}p ${leftSec%60}s`}</span>
                              </button>
                          );
                      })()}

                      {(() => {
                          const now = Date.now();
                          const diff = now - lastShrimpTime;
                          const cooldown = 300000;
                          const canDo = diff >= cooldown;
                          const leftSec = Math.ceil((cooldown - diff) / 1000);
                          return (
                              <button disabled={!canDo} onClick={() => setActiveFindGame("shrimp")} className={`w-full p-3 rounded-xl font-black text-xs uppercase flex items-center justify-between border transition ${canDo ? 'bg-teal-600/30 border-teal-500 text-teal-300 hover:bg-teal-600/50 cursor-pointer' : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'}`}>
                                  <span>🦐 Bắt Tôm (Tép Ô Xi Hóa)</span>
                                  <span>{canDo ? 'Sẵn sàng' : `Hồi: ${Math.floor(leftSec/60)}p ${leftSec%60}s`}</span>
                              </button>
                          );
                      })()}

                      {(() => {
                          const now = Date.now();
                          const diff = now - lastBreadTime;
                          const cooldown = 300000;
                          const canDo = diff >= cooldown;
                          const leftSec = Math.ceil((cooldown - diff) / 1000);
                          return (
                              <button disabled={!canDo} onClick={() => setActiveFindGame("bread")} className={`w-full p-3 rounded-xl font-black text-xs uppercase flex items-center justify-between border transition ${canDo ? 'bg-purple-600/30 border-purple-500 text-purple-300 hover:bg-purple-600/50 cursor-pointer' : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'}`}>
                                  <span>🥖 Làm Bánh Mì Dụ Cá</span>
                                  <span>{canDo ? 'Sẵn sàng' : `Hồi: ${Math.floor(leftSec/60)}p ${leftSec%60}s`}</span>
                              </button>
                          );
                      })()}
                  </div>

                  <button onClick={() => setIsFindBaitMenuOpen(false)} className="mt-5 w-full bg-slate-800 hover:bg-rose-600 text-white font-black py-2.5 rounded-xl text-xs uppercase transition cursor-pointer">
                      Đóng
                  </button>
             </div>
        </div>
      )}

      {activeFindGame && (
          <FindBaitFIFAMinigame 
              type={activeFindGame} 
              onFinish={(qty) => handleFindBaitReward(qty)} 
              onCancel={() => setActiveFindGame(null)} 
          />
      )}

      {/* --- SÀN ĐẤU GIÁ REALTIME --- */}
      {isAuctionOpen && (
        <div className="absolute inset-0 z-[75] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 rounded-3xl animate-fadeIn">
             <div className="bg-slate-900 border-2 border-blue-500 w-full max-w-3xl max-h-[85vh] rounded-2xl p-6 shadow-[0_0_30px_rgba(59,130,246,0.4)] relative flex flex-col">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                      <h3 className="text-xl font-black text-blue-400 uppercase tracking-wider">⚖️ Sàn Đấu Giá </h3>
                      <button onClick={() => setIsAuctionOpen(false)} className="bg-slate-800 hover:bg-rose-600 text-white font-black w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer shadow text-xs">✕</button>
                  </div>
                  
                  <div className="flex gap-2 my-3">
                      <button onClick={() => setAuctionTab("browse")} className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer ${auctionTab === 'browse' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-950 text-slate-400'}`}>
                          🔥 Tất Cả Vật Phẩm Đang Đấu Giá
                      </button>
                      <button onClick={() => setAuctionTab("sell")} className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer ${auctionTab === 'sell' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-950 text-slate-400'}`}>
                          📦 Đăng Bán Đồ Từ Kho Cá Nhân
                      </button>
                  </div>

                  {shopNotification && <div className="my-1 bg-blue-500 text-white px-3 py-1.5 rounded-xl font-black text-xs text-center animate-bounce shadow">{shopNotification}</div>}

                  {auctionTab === "browse" ? (
                      <div className="flex-1 overflow-y-auto mt-2 pr-1 space-y-3">
                          {(() => {
                              const validAuctions = realtimeAuctions.filter(item => {
                                  const timeLeft = Math.floor((new Date(item.ends_at).getTime() - Date.now()) / 1000);
                                  return timeLeft > 0;
                              });

                              if (validAuctions.length === 0) {
                                  return <div className="text-center text-slate-500 py-10 font-bold text-xs">Không có phiên đấu giá nào đang hoạt động. Ní hãy là người đầu tiên đăng bán!</div>;
                              }

                              return validAuctions.map(item => {
                                  const timeLeft = Math.max(0, Math.floor((new Date(item.ends_at).getTime() - Date.now()) / 1000));
                                  const mins = Math.floor(timeLeft / 60);
                                  const secs = timeLeft % 60;
                                  return (
                                      <div key={item.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 shadow-lg">
                                          <div className="flex items-center gap-4">
                                              <div className="w-14 h-14 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 p-1 text-2xl">
                                                  {item.item_image.startsWith("/") ? <img src={item.item_image} className="max-h-full object-contain" /> : item.item_image}
                                              </div>
                                              <div>
                                                  <h4 className="text-sm font-black text-amber-300">{item.item_name} {item.amount > 1 ? `(x${item.amount})` : ''}</h4>
                                                  <p className="text-[10px] text-slate-400">Người đăng: <span className="text-blue-400 font-bold">{item.seller_name}</span></p>
                                                  <p className="text-[10px] text-slate-400">Giá hiện tại: <span className="text-emerald-400 font-bold">{item.current_bid.toLocaleString()}🪙</span></p>
                                                  <p className="text-[10px] text-slate-400">Dẫn đầu: <span className="text-white font-bold">{item.highest_bidder_name || "Chưa có"}</span></p>
                                                  <p className="text-[10px] font-bold text-slate-500">Còn lại: {mins}p {secs}s</p>
                                              </div>
                                          </div>
                                          <button onClick={() => handleBidRealtime(item)} className="px-3 py-2 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-500 text-white hover:from-blue-500 hover:to-indigo-400 shadow-lg">
                                              Ra Giá {Math.floor(item.current_bid * 1.1).toLocaleString()}🪙
                                          </button>
                                      </div>
                                  );
                              });
                          })()}
                      </div>
                  ) : (
                      <div className="flex-1 overflow-y-auto mt-2 p-2 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                          <h4 className="text-xs font-black text-emerald-400 uppercase">Chọn Vật Phẩm Trong Kho Đồ Của Bạn</h4>
                          <div className="space-y-3">
                              <div>
                                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Loại vật phẩm:</label>
                                  <select value={sellForm.itemType} onChange={(e) => setSellForm({...sellForm, itemType: e.target.value, itemId: ""})} className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-2 font-bold">
                                      <option value="bait">Mồi Câu Trong Kho</option>
                                      <option value="rod">Cần Câu Đang Sở Hữu</option>
                                  </select>
                              </div>

                              <div>
                                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Vật phẩm cụ thể:</label>
                                  <select value={sellForm.itemId} onChange={(e) => setSellForm({...sellForm, itemId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-amber-300 text-xs rounded-xl p-2 font-bold">
                                      <option value="">-- Chọn vật phẩm --</option>
                                      {sellForm.itemType === 'bait' ? (
                                          Object.keys(inventory).map(bId => {
                                              const amt = inventory[bId];
                                              if (amt <= 0) return null;
                                              const bObj = resolveBaitInfo(bId);
                                              return <option key={bId} value={bId}>{bObj.name} (Còn {amt} túi)</option>;
                                          })
                                      ) : (
                                          Object.keys(userRodsMap).map(rFname => {
                                              const rObj = shopRods.find(r=>r.filename===rFname);
                                              return <option key={rFname} value={rFname}>{rObj?.name || rFname}</option>;
                                          })
                                      )}
                                  </select>
                              </div>

                              {sellForm.itemType === 'bait' && (
                                  <div>
                                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Số lượng đăng bán:</label>
                                      <input type="number" min="1" max={inventory[sellForm.itemId] || 1} value={sellForm.amount} onChange={(e) => setSellForm({...sellForm, amount: parseInt(e.target.value) || 1})} className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-2 font-bold" />
                                  </div>
                              )}

                              <div className="grid grid-cols-2 gap-2">
                                  <div>
                                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Giá khởi điểm (🪙):</label>
                                      <input type="number" min="1000" step="5000" value={sellForm.startBid} onChange={(e) => setSellForm({...sellForm, startBid: parseInt(e.target.value) || 1000})} className="w-full bg-slate-900 border border-slate-700 text-emerald-400 text-xs rounded-xl p-2 font-bold" />
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Thời gian đấu (phút):</label>
                                      <select value={sellForm.durationMins} onChange={(e) => setSellForm({...sellForm, durationMins: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-2 font-bold">
                                          <option value={5}>5 Phút</option>
                                          <option value={10}>10 Phút</option>
                                          <option value={30}>30 Phút</option>
                                      </select>
                                  </div>
                              </div>

                              <button onClick={handleCreateAuction} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs uppercase shadow-lg transition cursor-pointer">
                                  🚀 Đưa Lên Sàn Đấu Giá
                              </button>
                          </div>
                      </div>
                  )}
             </div>
        </div>
      )}

      <div className="absolute top-2 left-2 right-2 flex justify-between items-center z-50 pointer-events-auto gap-1">
        <div className="flex items-center space-x-1">
          <button onClick={leaveRoom} className="bg-rose-900/95 text-rose-200 hover:bg-rose-800 px-2.5 py-1.5 rounded-md text-[10px] sm:text-xs font-black border border-rose-500/40 shadow cursor-pointer active:scale-95 transition">← Rời</button>
          <div className="bg-black/85 text-white px-2 py-1.5 rounded-md font-bold text-[10px] sm:text-xs border border-amber-500/40 shadow flex items-center gap-1">
            <img src={userAvatar} alt="Avatar" className="w-4 h-4 rounded-full border border-amber-400 object-cover" />
            <span><span id="score" className="text-[#FFEB3B] font-black">{isMounted ? score.toLocaleString() : "..."}</span>🪙</span>
          </div>
          <button onClick={() => setIsShopOpen(true)} className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 px-2.5 py-1.5 rounded-md font-black text-[10px] sm:text-xs shadow active:scale-95 transition cursor-pointer flex items-center gap-0.5 border border-white/40">
            🛍️ Cần
          </button>
          <button onClick={() => setIsBasicShopOpen(true)} className="bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 px-2.5 py-1.5 rounded-md font-black text-[10px] sm:text-xs shadow active:scale-95 transition cursor-pointer flex items-center gap-0.5 border border-white/40">
            🪱 Shop
          </button>
          <button onClick={() => setIsCraftingOpen(true)} className="bg-gradient-to-r from-purple-500 to-pink-400 text-white px-2.5 py-1.5 rounded-md font-black text-[10px] sm:text-xs shadow active:scale-95 transition cursor-pointer flex items-center gap-0.5 border border-white/40">
            🔮 Trộn Mồi
          </button>
          <button onClick={() => setIsFindBaitMenuOpen(true)} className="bg-gradient-to-r from-amber-600 to-yellow-600 text-white px-2.5 py-1.5 rounded-md font-black text-[10px] sm:text-xs shadow active:scale-95 transition cursor-pointer flex items-center gap-0.5 border border-white/40">
            🏕️ Tìm Mồi
          </button>
          <button onClick={() => setIsAuctionOpen(true)} className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white px-2.5 py-1.5 rounded-md font-black text-[10px] sm:text-xs shadow active:scale-95 transition cursor-pointer flex items-center gap-0.5 border border-white/40">
            ⚖️ Đấu Giá
          </button>
        </div>

        {weatherState.active && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-rose-600/90 text-white px-4 py-1.5 rounded-lg font-black text-[10px] shadow-lg animate-pulse border border-white pointer-events-none z-40">
                {weatherState.warningText}
            </div>
        )}

        {centerCatchNotice && centerCatchNotice.show && (
          <div className="absolute left-1/2 -translate-x-1/2 top-1.5 z-40 bg-slate-900/90 border border-amber-400/60 px-2.5 py-0.5 rounded-md shadow-lg pointer-events-none flex items-center gap-1 animate-fadeIn">
            <span className="text-[9px]">🎣</span><span className="text-[9px] font-black text-amber-300">{centerCatchNotice.text}</span>
          </div>
        )}

        <div className="flex items-center space-x-1.5">
          <div className="relative">
            <button 
              onClick={() => {
                setIsBasicBaitDropdownOpen(!isBasicBaitDropdownOpen);
                setIsSpecialBaitDropdownOpen(false);
              }} 
              className={`px-2.5 py-1.5 rounded-md shadow-2xl flex items-center space-x-1 text-[10px] sm:text-xs font-black cursor-pointer transition select-none active:scale-95 border ${selectedBait.id.startsWith("basic_") ? "bg-amber-950/90 border-amber-400 text-amber-300 ring-1 ring-amber-400/50" : "bg-slate-900/95 border-slate-700 text-slate-300 hover:bg-slate-800"}`}
            >
              <span>{selectedBait.id.startsWith("basic_") ? (selectedBait.emoji || "🪱") : "🪱"}</span>
              <span className="truncate max-w-[75px] sm:max-w-[100px]">
                {selectedBait.id.startsWith("basic_") ? selectedBait.name : "Mồi Cơ Bản"}
              </span>
              <span>{isBasicBaitDropdownOpen ? "▲" : "▼"}</span>
            </button>
            {isBasicBaitDropdownOpen && (
              <div className="absolute right-0 mt-1 w-60 bg-slate-950/98 border-2 border-amber-500 rounded-xl shadow-2xl overflow-hidden z-50 p-1 space-y-1 backdrop-blur-md animate-fadeIn">
                <div className="px-2 py-1 text-[9px] font-black text-amber-400 uppercase border-b border-slate-800 flex justify-between items-center">
                    <span>🪱 Mồi Cơ Bản Trong Kho</span>
                    <span className="text-[8px] text-slate-400">Chọn để dùng</span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
                   {(() => {
                       const basicKeys = Object.keys(inventory).filter(k => k.startsWith("basic_") && (inventory[k] || 0) > 0);
                       if (basicKeys.length === 0) {
                           return <div className="p-3 text-center text-[10px] text-slate-500 font-bold">Kho hết mồi cơ bản! Hãy mua ở Shop 🪱</div>;
                       }
                       return basicKeys.map((bId) => {
                           const count = inventory[bId] || 0;
                           const info = resolveBaitInfo(bId);
                           const isSelected = selectedBait.id === bId;
                           return (
                              <button key={bId} onClick={() => {
                                    const newB = { cost: 0, filename: "", name: info.name, isBag: false, id: bId, emoji: info.emoji || "🪱" };
                                    setSelectedBait(newB);
                                    setIsBasicBaitDropdownOpen(false);
                                    (window as any).currentSelectedBait = newB;
                                    window.dispatchEvent(new CustomEvent("changeBaitImg", { detail: { filename: "" } }));
                              }} className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-black flex items-center justify-between cursor-pointer transition ${isSelected ? "bg-amber-500/20 text-amber-300 border border-amber-500/50" : "bg-slate-900 text-slate-200 hover:bg-slate-800"}`}>
                                  <div className="flex items-center gap-1.5">
                                      <span className="text-sm">{info.emoji || "🪱"}</span>
                                      <span>{info.name}</span>
                                  </div>
                                  <span className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-400 font-extrabold">x{count}</span>
                              </button>
                           );
                       });
                   })()}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => {
                setIsSpecialBaitDropdownOpen(!isSpecialBaitDropdownOpen);
                setIsBasicBaitDropdownOpen(false);
              }} 
              className={`px-2.5 py-1.5 rounded-md shadow-2xl flex items-center space-x-1 text-[10px] sm:text-xs font-black cursor-pointer transition select-none active:scale-95 border ${!selectedBait.id.startsWith("basic_") ? "bg-purple-950/90 border-purple-400 text-purple-300 ring-1 ring-purple-400/50" : "bg-slate-900/95 border-slate-700 text-slate-300 hover:bg-slate-800"}`}
            >
              <span>🔮</span>
              <span className="truncate max-w-[75px] sm:max-w-[100px]">
                {!selectedBait.id.startsWith("basic_") ? selectedBait.name : "Mồi Trộn"}
              </span>
              <span>{isSpecialBaitDropdownOpen ? "▲" : "▼"}</span>
            </button>
            {isSpecialBaitDropdownOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-slate-950/98 border-2 border-purple-500 rounded-xl shadow-2xl overflow-hidden z-50 p-1 space-y-1 backdrop-blur-md animate-fadeIn">
                <div className="px-2 py-1 text-[9px] font-black text-purple-400 uppercase border-b border-slate-800 flex justify-between items-center">
                    <span>🔮 Mồi Trộn & Đặc Biệt</span>
                    <span className="text-[8px] text-slate-400">Chọn để dùng</span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
                   {(() => {
                       const specialKeys = Object.keys(inventory).filter(k => !k.startsWith("basic_") && !k.startsWith("fish_sk") && (inventory[k] || 0) > 0);
                       if (specialKeys.length === 0) {
                           return <div className="p-3 text-center text-[10px] text-slate-500 font-bold">Chưa có mồi trộn! Hãy vào Trạm Trộn 🔮</div>;
                       }
                       return specialKeys.map((bId) => {
                           const count = inventory[bId] || 0;
                           const info = resolveBaitInfo(bId);
                           const isSelected = selectedBait.id === bId;
                           return (
                              <button key={bId} onClick={() => {
                                    const newB = { cost: 0, filename: info.filename || "", name: info.name, isBag: true, id: bId };
                                    setSelectedBait(newB);
                                    setIsSpecialBaitDropdownOpen(false);
                                    (window as any).currentSelectedBait = newB;
                                    window.dispatchEvent(new CustomEvent("changeBaitImg", { detail: { filename: info.filename || "" } }));
                              }} className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-black flex items-center justify-between cursor-pointer transition ${isSelected ? "bg-purple-500/20 text-purple-300 border border-purple-500/50" : "bg-slate-900 text-slate-200 hover:bg-slate-800"}`}>
                                 <div className="flex items-center gap-1.5">
                                     {info.filename ? (
                                       <img src={`/assets/cauca/baits/${info.filename}`} className="w-4 h-4 object-contain shrink-0" />
                                     ) : (
                                       <span className="text-sm">{info.emoji || "📦"}</span>
                                     )}
                                     <span className="truncate max-w-[130px]">{info.name}</span>
                                 </div>
                                 <span className="bg-slate-950 px-1.5 py-0.5 rounded text-purple-300 font-extrabold">x{count}</span>
                              </button>
                           );
                       });
                   })()}
                </div>
              </div>
            )}
          </div>

          <button onClick={() => { if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); setIsFullscreen(true); } else { document.exitFullscreen(); setIsFullscreen(false); } }} className="bg-slate-800/90 text-white font-bold py-1.5 px-2.5 rounded-md text-[10px] sm:text-xs border border-slate-700 shadow hidden sm:block active:scale-95 cursor-pointer">
            {isFullscreen ? "🗗" : "🖵"}
          </button>
        </div>
      </div>

      {oppAlert && <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-emerald-500/90 text-white px-3 py-1 rounded-lg font-black text-[10px] shadow-lg animate-bounce border border-emerald-300 pointer-events-none">{oppAlert}</div>}
      
      {bossUI && (
        <div className={`absolute top-16 right-4 w-40 sm:w-48 bg-slate-950/90 border-2 p-2 rounded-xl backdrop-blur-md z-30 shadow-xl animate-fade-in pointer-events-none border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]`}>
          <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-black mb-1 text-white">
            <span className="truncate max-w-[80px]">👑 {bossUI.name}</span><span className="text-yellow-300">{bossUI.weightText}</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-600">
            <div className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 transition-all duration-200" style={{ width: `${bossUI.hpPercent}%` }} />
          </div>
          <div className="text-right text-[7px] text-slate-400 mt-0.5 font-bold">{Math.round(bossUI.hpPercent)}% HP</div>
        </div>
      )}

      {myCatchNotice && myCatchNotice.show && (
        <div className="absolute top-14 left-2 z-40 bg-slate-900/95 border-2 border-amber-400 px-2 py-1 rounded-xl shadow-2xl pointer-events-none flex items-center gap-1.5 animate-fadeIn">
          <span className="text-xs">🎣</span><div><p className="text-[8px] font-bold text-slate-300">{myCatchNotice.text}</p><p className="text-xs font-black text-amber-300">{myCatchNotice.amount}</p></div>
        </div>
      )}

      {isBasicShopOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 pointer-events-auto">
          <div className="bg-slate-950 border-2 border-emerald-500/60 w-full max-w-2xl max-h-[85vh] rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h2 className="text-base sm:text-xl font-black text-emerald-400 uppercase tracking-wider">🪱 Shop Mồi Cơ Bản (Chọn Số Lượng)</h2>
              <button onClick={() => setIsBasicShopOpen(false)} className="bg-slate-800 hover:bg-rose-600 text-white font-black w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer shadow text-xs">✕</button>
            </div>
            {shopNotification && <div className="my-2 bg-emerald-400 text-slate-950 px-3 py-1.5 rounded-xl font-black text-xs text-center animate-bounce shadow">{shopNotification}</div>}
            
            <div className="flex-1 overflow-y-auto my-3 pr-1 space-y-3">
              {basicBaitsConfig.map((bait) => {
                 const count = inventory[bait.id] || 0;
                 return (
                   <div key={bait.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                      <div className="flex items-center gap-3">
                         <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800 text-2xl">
                             {bait.emoji}
                         </div>
                         <div>
                             <h4 className="text-xs font-black text-amber-300">{bait.name}</h4>
                             <p className="text-[10px] text-slate-400">{bait.desc} • Giá: {bait.price.toLocaleString()}🪙</p>
                             <p className="text-[9px] text-emerald-400 font-bold mt-0.5">Đang có: {count}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                          {[1, 5, 10, 20].map((qty) => (
                              <button key={qty} onClick={() => handleBuyBasicBait(bait.id, bait.price, qty)} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-2.5 py-1.5 rounded-lg text-[9px] active:scale-95 shadow cursor-pointer">
                                 x{qty} ({((bait.price * qty)).toLocaleString()})
                              </button>
                          ))}
                      </div>
                   </div>
                 );
              })}
            </div>
          </div>
        </div>
      )}

      {isShopOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 pointer-events-auto">
          <div className="bg-slate-950 border-2 border-amber-500/60 w-full max-w-4xl max-h-[85vh] rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h2 className="text-base sm:text-xl font-black text-amber-400 uppercase tracking-wider">🛍️ Kho Cần Câu</h2>
              <button onClick={() => setIsShopOpen(false)} className="bg-slate-800 hover:bg-rose-600 text-white font-black w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer shadow text-xs">✕</button>
            </div>
            {shopNotification && <div className="my-2 bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl font-black text-xs text-center animate-bounce shadow">{shopNotification}</div>}
            <div className="flex-1 overflow-y-auto my-3 pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {shopRods.map((rod) => {
                const expiresAt = userRodsMap[rod.filename]; const isOwned = expiresAt !== undefined; const isEquipped = selectedRod === rod.filename;
                let timeLeftStr = "";
                if (isOwned && expiresAt) {
                  const diff = new Date(expiresAt).getTime() - Date.now();
                  if (diff > 0) timeLeftStr = `Còn hạn: ${Math.floor(diff / 86400000)}d ${Math.floor((diff / 3600000) % 24)}h`; else timeLeftStr = "Đã hết hạn";
                } else if (rod.price3Days === 0) timeLeftStr = "Vĩnh viễn";

                return (
                  <div key={rod.filename} className={`bg-slate-900 border rounded-2xl p-3 flex flex-col justify-between shadow-lg relative ${isEquipped ? "border-amber-400 ring-2 ring-amber-400/40" : "border-slate-800"}`}>
                    {isEquipped && <span className="absolute top-2 right-2 bg-amber-500 text-slate-950 text-[8px] font-black px-2 py-0.5 rounded-md uppercase">Đang Dùng</span>}
                    <div className="space-y-2">
                      <h4 className="text-xs font-black text-amber-300">{rod.name}</h4>
                      <div className="w-full h-16 bg-black/50 rounded-xl flex items-center justify-center p-1 border border-slate-800">
                        <img src={`/assets/cauca/cancau/${rod.filename}`} alt={rod.name} className="max-h-full object-contain" />
                      </div>
                      <p className="text-[10px] text-slate-300 leading-snug">{rod.desc}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800 space-y-2">
                      <div className="text-[9px] font-bold text-slate-400 flex justify-between"><span>Trạng thái:</span><span className={isOwned ? "text-emerald-400 font-black" : "text-rose-400"}>{timeLeftStr || "Chưa thuê"}</span></div>
                      {rod.price3Days === 0 ? (
                        <button disabled={isEquipped} onClick={() => {
                          setSelectedRod(rod.filename);
                          window.dispatchEvent(new CustomEvent("changeRod", { detail: rod.filename }));
                          const activeUser = (window as any).currentUser || user;
                          if (activeUser?.id) supabase.from("profiles").update({ equipped_rod: rod.filename }).eq("id", activeUser.id);
                        }} className={`w-full py-1.5 rounded-xl text-[10px] font-black cursor-pointer shadow ${isEquipped ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-emerald-500 text-slate-950"}`}>
                          {isEquipped ? "Đang Sử Dụng" : "Trang Bị"}
                        </button>
                      ) : (
                        <div className="space-y-1.5">
                          {isOwned && <button disabled={isEquipped} onClick={() => {
                            setSelectedRod(rod.filename);
                            window.dispatchEvent(new CustomEvent("changeRod", { detail: rod.filename }));
                          }} className={`w-full py-1 rounded-xl text-[10px] font-black cursor-pointer shadow ${isEquipped ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-emerald-500 text-slate-950"}`}>{isEquipped ? "Đang Sử Dụng" : "Trang Bị Ngay"}</button>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isCraftingOpen && !activeCraftingRecipe && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 pointer-events-auto">
          <div className="bg-slate-950 border-2 border-purple-500/60 w-full max-w-4xl max-h-[85vh] rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h2 className="text-base sm:text-xl font-black text-purple-400 uppercase tracking-wider">🔮 Trạm Trộn Mồi Thần Bí</h2>
              <button onClick={() => setIsCraftingOpen(false)} className="bg-slate-800 hover:bg-rose-600 text-white font-black w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer shadow text-xs">✕</button>
            </div>
            
            <div className="flex gap-2 my-3">
               <button onClick={() => setCraftingTab("normal")} className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer ${craftingTab === 'normal' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400'}`}>
                   🟢 Trộn Mồi Thường 
               </button>
               <button onClick={() => setCraftingTab("advanced")} className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer ${craftingTab === 'advanced' ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400'}`}>
                   ⚡ Trộn Mồi Xịn 
               </button>
            </div>

            {shopNotification && <div className="my-1 bg-purple-400 text-slate-950 px-3 py-1.5 rounded-xl font-black text-xs text-center animate-bounce shadow">{shopNotification}</div>}
            
            <div className="flex-1 overflow-y-auto my-2 pr-1 grid grid-cols-1 md:grid-cols-2 gap-3">
               {(craftingTab === 'normal' ? CRAFT_RECIPES_NORMAL : CRAFT_RECIPES_ADVANCED).map((recipe) => {
                  return (
                     <div key={recipe.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2 shadow-lg">
                        <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
                           <div className="w-12 h-12 bg-slate-950 rounded-xl p-1.5 flex items-center justify-center border border-purple-500/50 shadow">
                               <img src={`/assets/cauca/baits/${specialBaits.find(b=>b.id===recipe.output)?.filename}`} className="w-full h-full object-contain" />
                           </div>
                           <div>
                               <h4 className="text-sm font-black text-purple-300">{recipe.name}</h4>
                               <p className="text-[10px] text-slate-400">{specialBaits.find(b=>b.id===recipe.output)?.desc}</p>
                           </div>
                        </div>
                        <div className="text-[10px] font-bold text-slate-300">Yêu cầu nguyên liệu:</div>
                        <div className="flex gap-2">
                           {recipe.req.map(r => {
                               const bBasic = basicBaitsConfig.find(sb => sb.id === r.id);
                               const bSpecial = specialBaits.find(sb => sb.id === r.id);
                               const hasAmt = inventory[r.id] || 0;
                               const isEnough = hasAmt >= r.qty;
                               return (
                                   <div key={r.id} className={`flex-1 flex flex-col items-center bg-slate-950 p-2 rounded-lg border ${isEnough ? "border-emerald-500/30" : "border-rose-500/30"}`}>
                                      {bBasic ? <span className="text-xl mb-1">{bBasic.emoji}</span> : <img src={`/assets/cauca/baits/${bSpecial?.filename}`} className="w-6 h-6 object-contain mb-1" />}
                                      <span className="text-[8px] text-center line-clamp-1">{bBasic?.name || bSpecial?.name}</span>
                                      <span className={`text-[9px] font-black ${isEnough ? "text-emerald-400" : "text-rose-400"}`}>{hasAmt} / {r.qty}</span>
                                   </div>
                               );
                           })}
                        </div>
                        <button onClick={() => prepareCraftBait(recipe)} className="mt-2 w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black py-2 rounded-xl text-xs active:scale-95 shadow cursor-pointer">
                           🔥 Trộn Ngay ({recipe.fee.toLocaleString()}🪙)
                        </button>
                     </div>
                  );
               })}
            </div>
          </div>
        </div>
      )}

      {popupData && popupData.show && (
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none animate-bounce text-center bg-slate-950/95 border-4 px-4 py-2 rounded-xl shadow-2xl space-y-1 max-w-xs ${popupData.type === "beerus" ? "border-rose-500" : "border-amber-400"}`}>
          <p className="font-black text-[9px] sm:text-[10px] text-amber-300 uppercase">{popupData.title}</p>
          <p className="text-white font-black text-[10px] sm:text-xs">{popupData.message}</p>
        </div>
      )}

      <div className="absolute bottom-6 left-4 z-40 flex items-center space-x-2 bg-black/80 p-2 rounded-xl border border-amber-500/60 shadow-xl backdrop-blur-md pointer-events-auto">
        <button onMouseDown={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("moveBoat", { detail: -4 })); }}
          onMouseUp={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("moveBoat", { detail: 0 })); }}
          onMouseLeave={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("moveBoat", { detail: 0 })); }}
          onTouchStart={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("moveBoat", { detail: -4 })); }}
          onTouchEnd={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("moveBoat", { detail: 0 })); }}
          className="w-10 h-10 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-lg rounded-lg active:scale-90 transition shadow cursor-pointer flex items-center justify-center select-none"
        >◀</button>
        <span className="text-[10px] font-black text-amber-300 uppercase px-1">Chèo</span>
        <button onMouseDown={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("moveBoat", { detail: 4 })); }}
          onMouseUp={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("moveBoat", { detail: 0 })); }}
          onMouseLeave={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("moveBoat", { detail: 0 })); }}
          onTouchStart={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("moveBoat", { detail: 4 })); }}
          onTouchEnd={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("moveBoat", { detail: 0 })); }}
          className="w-10 h-10 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-lg rounded-lg active:scale-90 transition shadow cursor-pointer flex items-center justify-center select-none"
        >▶</button>
      </div>
      
      {isStrugglingUI && (
          <div className="absolute bottom-6 right-4 z-40">
             <button onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("cancelFishingAction")); }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-black px-4 py-3 rounded-xl border border-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.6)] active:scale-95 transition-all text-xs cursor-pointer"
             >
                🔪 CẮT DÂY (HỦY)
             </button>
          </div>
      )}

      <div id="power-container" className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[180px] h-[18px] bg-black/70 rounded-lg border border-white hidden pointer-events-none overflow-hidden shadow-lg z-30">
        <div id="power-bar" className="w-[0%] h-full bg-gradient-to-r from-[#4CAF50] via-[#FFEB3B] to-[#F44336] transition-all duration-75"></div>
      </div>
      <div id="status" className="absolute bottom-20 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-black drop-shadow-[1px_1px_1px_#000] text-center w-full z-30 pointer-events-none text-white">
        Sẵn sàng
      </div>

      <canvas id="gameCanvas" className="absolute inset-0 block w-full h-full pointer-events-auto -z-10"></canvas>
    </div>
  );
}