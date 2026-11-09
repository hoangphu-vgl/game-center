"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// --- CÁC CÂU THOẠI KHỊA "QUAY HỤT" TỪ WHIS ---
const WHIS_MISS_QUOTES = [
  "Whis: Ôi da! Vừa quay hụt kìa cưng! Lại tốn thêm ít Ki cúng nhà cái rồi!",
  "Whis: Khí của ngươi mỏng quá nên hòm không thèm độ đấy! Thử lại phát nữa xem có khóc không nào!",
  "Whis: Trắng tay hoàn toàn! Thần Hủy Diệt mà thấy cú quay này chắc ngài cho hủy diệt luôn cái ví của ngươi quá!",
  "Whis: Hahaha, tưởng hốt được quà to lắm cơ hóa ra chỉ là gió thoảng mây bay!",
  "Whis: Cố gắng nạp thêm Ki đi chiến binh ơi, vận may đang ngủm ở hành tinh khác rồi!"
];

// --- DANH SÁCH VẬT PHẨM RƯƠNG BẠC ---
const SILVER_CHEST_ITEMS = [
  { id: "pk_4", name: "🛡️ Tấm Khiên Hư Không", type: "skill", rate: 10, desc: "Hoàn trả 25% tiền cược khi thua Showdown" },
  { id: "pk_5", name: "🌀 Dịch Chuyển Tức Thời", type: "skill", rate: 25, desc: "Chuyển sang Xem Bài hoặc né rủi ro" },
];

// --- DANH SÁCH VẬT PHẨM RƯƠNG VÀNG ---
const GOLD_CHEST_ITEMS = [
  { id: "pk_1", name: "⚡ Uy Lực Thần Hủy Diệt", type: "skill", rate: 5, desc: "Tăng 50% độ uy hiếp khi Tố/All-In" },
  { id: "pk_2", name: "🔮 Thấu Thị Dư Âm", type: "skill", rate: 10, desc: "Nhìn thấu bài tiếp theo của Whis" },
  { id: "pk_3", name: "🔥 Bùng Nổ Tiềm Năng", type: "skill", rate: 20, desc: "Đổi 1 lá bài trên tay lấy lá mới" },
];

// --- HÀM RANDOM SỐ LƯỢT NHẬN ĐƯỢC (1-5) ---
const getRandomRewardAmount = () => {
  const roll = Math.random() * 100;
  if (roll < 5) return 5;
  if (roll < 15) return 4;
  if (roll < 30) return 3;
  if (roll < 50) return 2;
  return 1;
};

export default function GachaPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [luckySpins, setLuckySpins] = useState(0);
  const [inventory, setInventory] = useState<{ [key: string]: number }>({});
  const [history, setHistory] = useState<any[]>([]);
  const [opening, setOpening] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Bộ đếm bảo hiểm 10 lần hụt liên tiếp
  const [silverPityCount, setSilverPityCount] = useState(0);
  const [goldPityCount, setGoldPityCount] = useState(0);

  // Popup bảo hiểm chọn kỹ năng
  const [pityModal, setPityModal] = useState<{ isOpen: boolean; chestType: 'silver' | 'gold' | null }>({
    isOpen: false,
    chestType: null
  });

  const [resultModal, setResultModal] = useState<{ isOpen: boolean; title: string; desc: string; isMiss: boolean; quote?: string }>({
    isOpen: false,
    title: "",
    desc: "",
    isMiss: false,
    quote: ""
  });

  useEffect(() => {
    async function initUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("balance, lucky_spins, inventory, gacha_history, silver_pity, gold_pity")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setBalance(profile.balance ?? 0);
          setLuckySpins(profile.lucky_spins ?? 0);
          setInventory(profile.inventory ?? {});
          setHistory(profile.gacha_history ?? []);
          setSilverPityCount(profile.silver_pity ?? 0);
          setGoldPityCount(profile.gold_pity ?? 0);
        }
      }
    }
    initUser();
  }, []);

  const saveUserDataToSupabase = async (newBal: number, newInv: any, newHist: any[], newSilverPity: number, newGoldPity: number) => {
    setBalance(newBal);
    setInventory(newInv);
    setHistory(newHist);
    setSilverPityCount(newSilverPity);
    setGoldPityCount(newGoldPity);

    if (currentUser?.id) {
      await supabase
        .from("profiles")
        .update({
          balance: newBal,
          inventory: newInv,
          gacha_history: newHist,
          silver_pity: newSilverPity,
          gold_pity: newGoldPity
        })
        .eq("id", currentUser.id);
    }
  };

  const handleOpenChest = async (chestType: 'silver' | 'gold') => {
    const cost = chestType === 'silver' ? 50000 : 100000;
    if (balance < cost) {
      alert("⚡ Ki tích lũy của bạn không đủ để mở hòm này!");
      return;
    }

    setOpening(true);

    setTimeout(async () => {
      const newBalance = balance - cost;
      const roll = Math.random() * 100;

      let wonItem: any = null;
      let isMiss = false;
      let missQuote = "";
      let rewardAmount = 0;

      let currentSilverPity = silverPityCount;
      let currentGoldPity = goldPityCount;
      let triggerPity = false;

      // Kiểm tra bảo hiểm 10 lần hụt
      if (chestType === 'silver') {
        currentSilverPity += 1;
        if (currentSilverPity >= 10) {
          triggerPity = true;
          currentSilverPity = 0;
        }
      } else {
        currentGoldPity += 1;
        if (currentGoldPity >= 10) {
          triggerPity = true;
          currentGoldPity = 0;
        }
      }

      if (triggerPity) {
        setOpening(false);
        await saveUserDataToSupabase(newBalance, inventory, history, currentSilverPity, currentGoldPity);
        setPityModal({ isOpen: true, chestType });
        return;
      }

      // Roll bình thường (65% hụt)
      if (roll < 65) {
        isMiss = true;
        missQuote = WHIS_MISS_QUOTES[Math.floor(Math.random() * WHIS_MISS_QUOTES.length)];
      } else {
        if (chestType === 'silver') currentSilverPity = 0;
        else currentGoldPity = 0;

        const pool = chestType === 'silver' ? SILVER_CHEST_ITEMS : GOLD_CHEST_ITEMS;
        let cumulative = 65;

        for (const item of pool) {
          cumulative += item.rate;
          if (roll <= cumulative) {
            wonItem = item;
            break;
          }
        }

        if (!wonItem) {
          isMiss = true;
          missQuote = WHIS_MISS_QUOTES[Math.floor(Math.random() * WHIS_MISS_QUOTES.length)];
        } else {
          rewardAmount = getRandomRewardAmount();
        }
      }

      let updatedInv = { ...inventory };
      let titleMsg = "";
      let descMsg = "";

      if (isMiss) {
        titleMsg = "🌀 QUAY HỤT MẤT RỒI!";
        descMsg = missQuote;
      } else {
        const currentCount = updatedInv[wonItem.id] || 0;
        updatedInv[wonItem.id] = currentCount + rewardAmount;
        titleMsg = `🎉 CHÚC MỪNG ĐẠI CAO THỦ!`;
        descMsg = `Trúng kỹ năng [${wonItem.name}] và nhận được ngay +${rewardAmount} lượt!`;
      }

      const historyEntry = {
        time: new Date().toLocaleTimeString(),
        chest: chestType === 'silver' ? 'Rương Bạc' : 'Rương Vàng',
        result: isMiss ? 'Quay Hụt (Trắng Tay)' : `${wonItem.name} (+${rewardAmount} lượt)`,
        cost: cost
      };

      const updatedHistory = [historyEntry, ...history.slice(0, 19)];

      await saveUserDataToSupabase(newBalance, updatedInv, updatedHistory, currentSilverPity, currentGoldPity);
      setOpening(false);
      setResultModal({
        isOpen: true,
        title: titleMsg,
        desc: descMsg,
        isMiss: isMiss,
        quote: isMiss ? missQuote : undefined
      });
    }, 1200);
  };

  const handleClaimPityReward = async (selectedItem: any) => {
    const updatedInv = { ...inventory };
    const currentCount = updatedInv[selectedItem.id] || 0;
    updatedInv[selectedItem.id] = currentCount + 5;

    const historyEntry = {
      time: new Date().toLocaleTimeString(),
      chest: pityModal.chestType === 'silver' ? 'Rương Bạc (Bảo Hiểm 10L)' : 'Rương Vàng (Bảo Hiểm 10L)',
      result: `${selectedItem.name} (+5 lượt bảo hiểm)`,
      cost: 0
    };

    const updatedHistory = [historyEntry, ...history.slice(0, 19)];
    await saveUserDataToSupabase(balance, updatedInv, updatedHistory, silverPityCount, goldPityCount);

    setPityModal({ isOpen: false, chestType: null });
    setResultModal({
      isOpen: true,
      title: "🛡️ KÍCH HOẠT BẢO HIỂM THÀNH CÔNG!",
      desc: `Vì quay hụt 10 lần liên tiếp, Whis đã đặc cách trao tay bạn kỹ năng [${selectedItem.name}] với số lượng chắc chắn +5 lượt!`,
      isMiss: false
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col items-center justify-between select-none font-sans relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(59,130,246,0.15),transparent_70%)] pointer-events-none" />

      {/* HEADER */}
      <div className="w-full max-w-4xl flex justify-between items-center z-10 mb-4">
        <Link href="/" className="bg-slate-900 text-amber-400 border border-amber-500/40 px-4 py-2 rounded-xl text-xs font-black shadow hover:bg-slate-800 transition">
          ⬅️ Về Sảnh Chính
        </Link>

        <div className="flex items-center gap-2">
          <div className="bg-slate-900/90 border border-cyan-500/40 px-4 py-2 rounded-xl text-cyan-400 font-mono font-black text-sm shadow">
            ⚡ Ki: {balance.toLocaleString()}
          </div>

          <div className="bg-slate-800/90 border border-purple-500/50 px-3.5 py-2 rounded-xl text-xs shadow-inner flex items-center gap-1.5">
            <img src="/assets/home/capsule.png" alt="Capsule" className="w-4 h-4 object-contain" />
            <span className="font-black text-purple-300">{luckySpins} Lượt</span>
          </div>

          <button
            onClick={() => setShowRulesModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-yellow-400 border border-yellow-500/50 px-3 py-2 rounded-xl text-xs font-black shadow transition active:scale-95 flex items-center gap-1 cursor-pointer"
          >
            📜 Luật
          </button>
        </div>
      </div>

      {/* TIÊU ĐỀ */}
      <div className="text-center z-10 mb-6">
        <div className="text-4xl mb-1 animate-bounce">🎁</div>
        <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-emerald-400 to-cyan-400">
          KHO BÁU THẦN ĐIỆN - GACHA VŨ TRỤ
        </h1>
        <p className="text-slate-400 text-[11px] tracking-widest uppercase mt-1">
          Hệ thống bảo hiểm 10 lần hụt • Săn tìm kỹ năng tối thượng cùng Whis!
        </p>
      </div>

      {/* 2 RƯƠNG GACHA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl z-10 mb-6">
        {/* RƯƠNG BẠC */}
        <div className="bg-slate-900/90 border-2 border-slate-700 hover:border-cyan-400 rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl transition transform hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute top-3 right-3 bg-cyan-950/80 border border-cyan-500/40 px-2.5 py-1 rounded-full text-[10px] font-mono font-black text-cyan-300 shadow">
            🛡️ Bảo hiểm: {silverPityCount}/10
          </div>
          <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition pointer-events-none" />
          <div className="w-32 h-32 mb-3 flex items-center justify-center transform group-hover:scale-110 transition duration-300">
            <img src="/assets/gacha/ruongbac.png" alt="Rương Bạc" className="w-full h-full object-contain drop-shadow-[0_10px_15px_rgba(6,182,212,0.3)]" />
          </div>
          <h2 className="text-base font-black text-cyan-300 uppercase">Rương Bạc Phòng Thủ</h2>
          <p className="text-[11px] text-slate-400 mt-1 mb-3">Chứa các kỹ năng phòng thủ và bảo vệ tài sản.</p>
          <div className="text-amber-400 font-mono font-black text-sm mb-4">Giá mở: 50,000 Ki</div>
          <button
            onClick={() => handleOpenChest('silver')}
            disabled={opening}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white font-black py-2.5 rounded-xl text-xs uppercase shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {opening ? "Đang mở hòm..." : "Mở Rương Bạc 🗝️"}
          </button>
        </div>

        {/* RƯƠNG VÀNG */}
        <div className="bg-slate-900/90 border-2 border-amber-500/70 hover:border-yellow-400 rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl transition transform hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute top-3 right-3 bg-amber-950/80 border border-yellow-500/40 px-2.5 py-1 rounded-full text-[10px] font-mono font-black text-yellow-300 shadow">
            ⚡ Bảo hiểm: {goldPityCount}/10
          </div>
          <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition pointer-events-none" />
          <div className="w-32 h-32 mb-3 flex items-center justify-center transform group-hover:scale-110 transition duration-300">
            <img src="/assets/gacha/ruongvang.png" alt="Rương Vàng" className="w-full h-full object-contain drop-shadow-[0_10px_15px_rgba(234,179,8,0.3)]" />
          </div>
          <h2 className="text-base font-black text-yellow-400 uppercase">Rương Vàng Tấn Công</h2>
          <p className="text-[11px] text-slate-400 mt-1 mb-3">Chứa các kỹ năng tối thượng, thấu thị và lật ngược ván bài.</p>
          <div className="text-amber-400 font-mono font-black text-sm mb-4">Giá mở: 100,000 Ki</div>
          <button
            onClick={() => handleOpenChest('gold')}
            disabled={opening}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 text-slate-950 font-black py-2.5 rounded-xl text-xs uppercase shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {opening ? "Đang mở hòm..." : "Mở Rương Vàng 🗝️"}
          </button>
        </div>
      </div>

      {/* LỊCH SỬ GACHA */}
      <div className="w-full max-w-3xl bg-slate-900/80 border border-slate-800 rounded-2xl p-4 z-10 mb-4">
        <h3 className="text-xs font-black text-yellow-400 uppercase mb-2 tracking-wider">📜 Lịch Sử Mở Hòm Gần Đây</h3>
        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
          {history.length === 0 ? (
            <div className="text-[11px] text-slate-500 italic text-center py-2">Chưa có lịch sử mở rương nào. Hãy thử vận may ngay!</div>
          ) : (
            history.map((item, idx) => (
              <div key={idx} className="bg-slate-950/80 px-3 py-1.5 rounded-xl flex justify-between items-center text-[11px] border border-slate-900">
                <span className="text-slate-400 font-mono">{item.time}</span>
                <span className="text-cyan-300 font-bold">{item.chest}</span>
                <span className={item.result.includes("Hụt") ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>{item.result}</span>
                <span className="text-amber-400 font-mono">-{item.cost.toLocaleString()} Ki</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* POPUP CHỌN KỸ NĂNG BẢO HIỂM 10 LẦN */}
      {pityModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-cyan-400 rounded-3xl max-w-lg w-full p-6 text-center shadow-2xl relative space-y-4 animate-scaleUp">
            <div className="text-5xl">🛡️</div>
            <h3 className="text-lg font-black text-cyan-300 uppercase">
              KÍCH HOẠT BẢO HIỂM 10 LẦN HỤT!
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              Whis: "Chao ôi, vận khí hôm nay của ngươi hơi âm u đấy! Nhà cái đặc cách cho phép ngươi tự do chọn <strong className="text-yellow-400">1 kỹ năng tùy ý</strong> trong rương này với số lượng chắc chắn <strong className="text-emerald-400">+5 lượt</strong>!"
            </p>

            <div className="grid grid-cols-1 gap-2.5 pt-2">
              {(pityModal.chestType === 'silver' ? SILVER_CHEST_ITEMS : GOLD_CHEST_ITEMS).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleClaimPityReward(item)}
                  className="bg-slate-950 hover:bg-slate-800 border border-cyan-500/50 hover:border-yellow-400 p-3 rounded-2xl flex justify-between items-center transition group cursor-pointer text-left shadow"
                >
                  <div>
                    <div className="text-sm font-black text-amber-300 group-hover:text-yellow-400">{item.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                  </div>
                  <span className="bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-3 py-1.5 rounded-xl text-xs font-black shrink-0">
                    Nhận +5 lượt 🎁
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* POPUP LUẬT CHƠI */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-yellow-500/60 rounded-2xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto text-left shadow-2xl relative">
            <div className="flex justify-between items-center mb-3 border-b border-yellow-500/30 pb-2">
              <h3 className="text-sm font-black text-yellow-400 uppercase tracking-wide flex items-center gap-1.5">
                📜 LUẬT KHO BÁU THẦN ĐIỆN & BẢO HIỂM
              </h3>
              <button 
                onClick={() => setShowRulesModal(false)}
                className="bg-rose-600 hover:bg-rose-500 text-white w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-[11px] text-slate-300 leading-relaxed font-sans">
              <div>
                <h4 className="text-yellow-400 font-bold mb-1">1. Giới thiệu Rương Báu:</h4>
                <p>Nơi các chiến binh dùng Ki từ tài khoản cá nhân để khai mở những hòm báu vật do Thần Hủy Diệt và Trọng Tài Whis quản lý (Rương Bạc Phòng Thủ và Rương Vàng Tấn Công).</p>
              </div>

              <div>
                <h4 className="text-yellow-400 font-bold mb-1">2. Cơ Chế Bảo Hiểm 10 Lần Hụt:</h4>
                <p>Mỗi loại rương sẽ đếm số lần quay hụt liên tiếp của bạn. Nếu quay liên tiếp đủ <strong className="text-rose-400">10 lần mà không trúng skill nào</strong>, hệ thống sẽ lập tức hiển thị một Popup đặc biệt cho phép bạn <strong className="text-emerald-400">tự do chọn 1 kỹ năng bất kỳ trong rương đó với số lượng cố định chắc chắn là +5 lượt</strong>!</p>
              </div>

              <div>
                <h4 className="text-yellow-400 font-bold mb-1">3. Lưu ý từ nhà cái Whis:</h4>
                <p>Vận may có lúc thăng lúc trầm, nhưng với hệ thống Bảo Hiểm 10 Lần này thì các chiến binh cứ yên tâm quẩy tới bến!</p>
              </div>
            </div>

            <div className="mt-5 text-center">
              <button
                onClick={() => setShowRulesModal(false)}
                className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black px-6 py-2 rounded-xl text-xs uppercase shadow cursor-pointer"
              >
                Đã Hiểu, Mở Tiếp Thôi! 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KẾT QUẢ QUAY */}
      {resultModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-yellow-500/80 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl relative space-y-4 animate-scaleUp">
            <div className="text-5xl">{resultModal.isMiss ? "💨" : "🏆"}</div>
            <h3 className={`text-lg font-black uppercase ${resultModal.isMiss ? "text-rose-400" : "text-yellow-400"}`}>
              {resultModal.title}
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed font-mono bg-black/40 p-3 rounded-xl border border-slate-800">
              {resultModal.desc}
            </p>
            <button
              onClick={() => setResultModal({ ...resultModal, isOpen: false })}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black py-2.5 rounded-xl text-xs uppercase shadow cursor-pointer"
            >
              Đã Hiểu, Thử Lại 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}