"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface SkillItem {
  id: string;
  name: string;
  desc: string;
  price?: number;
  getPrice?: (bet: number) => number;
  icon: string;
  category: "baccarat" | "jackpot" | "tienlen" | "poker" | "fishing";
  effect: string;
  isDynamic?: boolean;
  isShield?: boolean;
}

const JACKPOT_BET_OPTIONS = [20, 50, 100, 200, 500, 1000, 2000, 5000];

const ALL_SKILLS: SkillItem[] = [
  // --- FISHING (CÂU CÁ DRAGON BALL) ---
  { id: "fish_sk1", name: "🌀 Chân Không Trấn Hải", desc: "Cần câu đứng yên 1 chỗ trong 5s khi thả dây rồi mới tuột lên.", price: 500000, icon: "🌀", category: "fishing", effect: "Đứng yên cần 5s", isShield: false },
  { id: "fish_sk2", name: "⚡ Bản Năng Vô Cực", desc: "Đóng băng thời gian và đứng yên cá lớn/trung bình để giật (mất lượt nếu cá nhỏ ăn).", price: 5000000, icon: "⚡", category: "fishing", effect: "Đóng băng cá/thời gian", isShield: false },
  { id: "fish_sk3", name: "🛡️ Giáp Sắt Kachi Katchin", desc: "Tăng 30% khả năng chống đứt dây khi ghì cá lớn.", price: 2000000, icon: "🛡️", category: "fishing", effect: "Kháng đứt dây +30%", isShield: false },
  { id: "fish_sk4", name: "⏳ Thời Gian Ngoại Lệ", desc: "Làm chậm toàn bộ cá dưới nước 30% trong vòng 5 giây.", price: 1000000, icon: "⏳", category: "fishing", effect: "Làm chậm cá 30%", isShield: false },
  { id: "fish_sk5", name: "👻 Hào Quang Biến Mất", desc: "Cá nhỏ phớt lờ bạn trong lượt kế, cá lớn cắn câu sẽ dẫy mạnh hơn.", price: 1000000, icon: "👻", category: "fishing", effect: "Phớt lờ cá nhỏ", isShield: false },
  { id: "fish_sk6", name: "🔮 Nhãn Quan Thần Linh", desc: "Soi chính xác giá trị tiền thưởng của 1 con cá lớn ngẫu nhiên trong hồ.", price: 500000, icon: "🔮", category: "fishing", effect: "Soi giá cá lớn", isShield: false },

  // --- BACCARAT ---
  { id: "bc_1", name: "🌀 Nhãn Quan Whis", desc: "Cho phép nhìn trước 1 lá bài tiếp theo chuẩn bị được chia cho Player hoặc Banker.", price: 150000, icon: "🌀", category: "baccarat", effect: "Thấu thị ma thuật", isShield: false },
  { id: "bc_2", name: "🛡️ Hộ Thân Ki", desc: "Giảm ngay 50% số lượng Ki bị trừ khi thua cược ở bất kỳ cửa nào (+5 lượt/lần mua).", price: 50000, icon: "🛡️", category: "baccarat", effect: "Giảm sát thương thua", isShield: true },
  { id: "bc_3", name: "⚡ Bản Năng Vô Cực", desc: "Khi điểm số của bạn nhỏ hơn hoặc bằng 3, tự động kích hoạt hiệu ứng rút thêm lá bài tối ưu điểm số.", price: 100000, icon: "⚡", category: "baccarat", effect: "Lật ngược thế cờ", isShield: false },
  { id: "bc_4", name: "👑 Quyền Năng Hủy Diệt", desc: "Tăng gấp đôi giá trị tiền thưởng nhận được nếu ván đó cửa bạn chọn chiến thắng (Áp dụng 1 lần).", price: 100000, icon: "👑", category: "baccarat", effect: "Nhân đôi Pot thưởng", isShield: false },
  { id: "bc_5", name: "🐉 Long Thần Hộ Mệnh", desc: "Nếu thua cược ở cửa Hòa (Tie) hoặc Cửa Chính, hoàn trả lại 30% tổng số Ki đã đặt (+5 lượt/lần mua).", price: 50000, icon: "🐉", category: "baccarat", effect: "Hoàn trả Ki cược", isShield: true },

  // --- JACKPOT ---
  { id: "jp_1", name: "🌟 Triệu Hồi Thần Long", desc: "Cộng ngay lập tức 1 lần dính biểu tượng Scatter mở khóa 10 vòng quay miễn phí (+1 lượt/lần mua).", getPrice: (bet) => bet * 100, icon: "🌟", category: "jackpot", effect: "Kích hoạt Scatter (Cược x10)", isDynamic: true, isShield: false },
  { id: "jp_2", name: "⚡ Hào Quang Saiyan Blue", desc: "Tăng gấp đôi (x2) tỷ lệ ra phần thưởng lớn (Aura / Hũ) cho 5 lượt quay tiếp theo (+1 lượt/lần mua).", getPrice: (bet) => bet * 10, icon: "⚡", category: "jackpot", effect: "Tăng tỷ lệ x2 (Cược x10)", isDynamic: true, isShield: false },
  { id: "jp_3", name: "🔥 Phẫn Nộ Super Saiyan 3", desc: "Khởi tạo hoặc duy trì chuỗi liên hoàn x2 bậc ngay lập tức mà không sợ bị ngắt quãng khi quay hũ thua.", price: 500000, icon: "🔥", category: "jackpot", effect: "Đột phá chuỗi hũ", isShield: false },
  { id: "jp_4", name: "💥 Kamehameha Hủy Diệt", desc: "Xóa sạch các biểu tượng rác yếu trong lượt quay tiếp theo và ép hệ thống ra toàn biểu tượng cấp cao.", price: 100000, icon: "💥", category: "jackpot", effect: "Ép biểu tượng VIP", isShield: false },
  { id: "jp_5", name: "🛡️ Khiên Giáp Thần Thánh", desc: "Hoàn trả 50% số Ki cược của lượt quay nếu lượt đó không trúng thưởng (+5 lượt/lần mua).", price: 10000, icon: "🛡️", category: "jackpot", effect: "Bảo vệ hũ cược", isShield: true },

  // --- TIẾN LÊN ---
  { id: "tl_1", name: "🌀 Biến Hóa Bài", desc: "Cho phép đổi 1 lá bài rác bất kỳ trên tay thành 1 lá bài ngẫu nhiên có giá trị cao hơn.", price: 150000, icon: "🌀", category: "tienlen", effect: "Kỹ năng đổi bài", isShield: false },
  { id: "tl_2", name: "👁️ Thấu Thị Thiên Hãn", desc: "Xem trước số lượng bài còn lại và 1 lá bài bất kỳ đang nằm trên tay của người chơi bên cạnh.", price: 50000, icon: "👁️", category: "tienlen", effect: "Nhìn bài đối thủ", isShield: false },
  { id: "tl_3", name: "⚡ Chặt Chém Thần Tốc", desc: "Cho phép dùng một đôi thông hoặc tứ quý nhỏ để chặt Heo (2) mà không cần tuân theo quy luật vòng khắt khe.", price: 100000, icon: "⚡", category: "tienlen", effect: "Phá luật chặt heo", isShield: false },
  { id: "tl_4", name: "🛡️ Giáp Sắt Saiyan", desc: "Triệu hồi khiên bảo vệ, giảm 50% điểm phạt khi có người chơi khác đánh Thắng Trắng (+2 lượt/lần mua).", price: 50000, icon: "🛡️", category: "tienlen", effect: "Chống thua trắng", isShield: true },
  { id: "tl_5", name: "👑 Uy Lực Bá Chủ", desc: "Dùng Ki để giành quyền đánh trước ở ván đấu tiếp theo mà không cần phải dựa vào lá 3 bích truyền thống.", price: 300000, icon: "👑", category: "tienlen", effect: "Giành quyền đi trước", isShield: false },

  // --- POKER ---
  { id: "pk_1", name: "⚡ Uy Lực Thần Hủy Diệt", desc: "Tăng 50% độ uy hiếp khi Tố hoặc All-In, khiến các đối thủ sợ hãi mà bỏ bài (Fold).", price: 500000, icon: "⚡", category: "poker", effect: "Bluff cực mạnh", isShield: false },
  { id: "pk_2", name: "🔮 Thấu Thị Dư Âm", desc: "Nhìn trước lá bài chung tiếp theo (River hoặc Turn) chuẩn bị lật trên bàn đấu.", price: 150000, icon: "🔮", category: "poker", effect: "Xem bài chung", isShield: false },
  { id: "pk_3", name: "🔥 Bùng Nổ Tiềm Năng", desc: "Đổi ngẫu nhiên 1 lá bài trên tay lấy một lá bài mới từ nọc để hoàn thiện bộ (Sảnh, Thùng, Lốc...).", price: 100000, icon: "🔥", category: "poker", effect: "Nâng cấp tay bài", isShield: false },
  { id: "pk_4", name: "🛡️ Tấm Khiên Hư Không", desc: "Khi thua ở vòng Showdown, được hệ thống hoàn trả lại 25% tổng số tiền cược vào Pot (+5 lượt/lần mua).", price: 100000, icon: "🛡️", category: "poker", effect: "Bảo toản Pot cược", isShield: true },
  { id: "pk_5", name: "🌀 Dịch Chuyển Tức Thời", desc: "Cho phép bỏ qua lượt tố rủi ro cao hoặc chuyển trạng thái sang Xem Bài (Check) miễn phí 1 lần trong ván (+2 lượt/lần mua).", price: 50000, icon: "🌀", category: "poker", effect: "Đổi vị trí cược", isShield: false },
];

export default function UnifiedSkillShopPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [currentBet, setCurrentBet] = useState<number>(100);
  const [inventory, setInventory] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    setMounted(true);
    const savedBet = localStorage.getItem("jackpot_current_bet");
    if (savedBet) {
      setCurrentBet(Number(savedBet));
    }

    async function init() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      if (currentUser) {
        const { data: profile } = await supabase.from("profiles").select("balance, inventory").eq("id", currentUser.id).single();
        if (profile) {
          setBalance(profile.balance ?? 0);
          if (profile.inventory) {
            setInventory(profile.inventory);
          }
        }
      }
    }
    init();
  }, []);

  const handleBetChange = (newBet: number) => {
    setCurrentBet(newBet);
    localStorage.setItem("jackpot_current_bet", newBet.toString());
  };

  const handleBuySkill = async (skill: SkillItem) => {
    if (!user) { alert("Vui lòng đăng nhập để lĩnh ngộ!"); return; }
    const price = skill.isDynamic && skill.getPrice ? skill.getPrice(currentBet) : (skill.price || 0);

    if (balance < price) {
      alert("⚡ Điểm Ki trong tài khoản không đủ để lĩnh ngộ kỹ năng này!");
      return;
    }

    let confirmMsg = `Xác nhận dùng ${price.toLocaleString()} Ki để mua/lĩnh ngộ [${skill.name}]?`;
    if (confirm(confirmMsg)) {
      const newBal = balance - price;
      setBalance(newBal);

      const currentCount = inventory[skill.id] || 0;
      const addAmount = 1;
      const updatedInventory = { ...inventory, [skill.id]: currentCount + addAmount };
      
      setInventory(updatedInventory);

      const { error } = await supabase
        .from("profiles")
        .update({ 
          balance: newBal, 
          inventory: updatedInventory 
        })
        .eq("id", user.id);

      if (error) {
        alert("❌ Lỗi đồng bộ Supabase: " + error.message);
      } else {
        alert(`🎉 Mua thành công! Tổng kho [${skill.name}]: ${updatedInventory[skill.id]} lượt.`);
      }
    }
  };

  const filteredSkills = activeTab === "all" 
    ? ALL_SKILLS 
    : ALL_SKILLS.filter(s => s.category === activeTab);

  return (
    <div className="fixed inset-0 h-[100dvh] overflow-y-auto bg-slate-950 text-white font-sans p-3 sm:p-6 select-none flex flex-col justify-between">
      
      {/* HEADER */}
      <header className="w-full max-w-5xl mx-auto bg-slate-900/90 border border-amber-500/40 rounded-2xl p-3 flex justify-between items-center shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-black transition">
            🏠 Sảnh Chính
          </Link>
          <h1 className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 uppercase tracking-wide">
            🔮 THẦN ĐIỆN KỸ NĂNG (SKILL SHOP)
          </h1>
        </div>

        <div className="bg-slate-950 border border-amber-500/50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-inner">
          <span className="text-xs">⚡</span>
          <span className="text-xs font-black text-amber-400 font-mono">
            {mounted ? balance.toLocaleString() : "5,000"} Ki
          </span>
        </div>
      </header>

      {/* BODY CONTAINER */}
      <main className="w-full max-w-5xl mx-auto flex-1 my-4 space-y-4">
        
        {/* TABS LỌC */}
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => setActiveTab("all")} className={`px-4 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${activeTab === "all" ? "bg-amber-400 text-slate-950 shadow" : "bg-slate-900 text-slate-300 border border-slate-800"}`}>🔥 Tất Cả</button>
          <button onClick={() => setActiveTab("fishing")} className={`px-4 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${activeTab === "fishing" ? "bg-emerald-400 text-slate-950 shadow" : "bg-slate-900 text-slate-300 border border-slate-800"}`}>🎣 Câu Cá Thần Long</button>
          <button onClick={() => setActiveTab("baccarat")} className={`px-4 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${activeTab === "baccarat" ? "bg-cyan-400 text-slate-950 shadow" : "bg-slate-900 text-slate-300 border border-slate-800"}`}>🎲 Baccarat</button>
          <button onClick={() => setActiveTab("jackpot")} className={`px-4 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${activeTab === "jackpot" ? "bg-amber-400 text-slate-950 shadow" : "bg-slate-900 text-slate-300 border border-slate-800"}`}>🔮 Jackpot</button>
          <button onClick={() => setActiveTab("tienlen")} className={`px-4 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${activeTab === "tienlen" ? "bg-emerald-400 text-slate-950 shadow" : "bg-slate-900 text-slate-300 border border-slate-800"}`}>⚔️ Tiến Lên</button>
          <button onClick={() => setActiveTab("poker")} className={`px-4 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${activeTab === "poker" ? "bg-blue-400 text-slate-950 shadow" : "bg-slate-900 text-slate-300 border border-slate-800"}`}>♠️ Poker</button>
        </div>

        {/* DANH SÁCH SKILL GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredSkills.map((skill) => {
            const price = skill.isDynamic && skill.getPrice ? skill.getPrice(currentBet) : (skill.price || 0);
            const count = inventory[skill.id] || 0;

            return (
              <div key={skill.id} className="bg-slate-900/90 border border-amber-500/40 hover:border-amber-400 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden transition">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{skill.icon}</span>
                      <h3 className="text-sm font-black text-amber-300">{skill.name}</h3>
                    </div>
                    <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-0.5 rounded-full font-bold">
                      {skill.effect}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">{skill.desc}</p>
                  <div className="text-[11px] font-bold text-cyan-400 pt-1">
                    🛡️ Kho trong Supabase: <span className="text-white font-black underline">{count} lượt</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-800/80">
                  <span className="text-xs font-mono font-black text-amber-400">💎 {price.toLocaleString()} Ki</span>
                  <button
                    onClick={() => handleBuySkill(skill)}
                    className="px-4 py-2 rounded-xl text-xs font-black shadow transition active:scale-95 cursor-pointer bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 hover:brightness-110"
                  >
                    Mua Lượt 🛒
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </main>

      <footer className="w-full max-w-5xl mx-auto text-center text-[10px] text-slate-500 py-2 shrink-0">
        🛡️ Bản quyền thuộc về Hệ Thống Sảnh Game Dragon Arcade - Tích trữ kỹ năng chiến thuật trực tiếp lên CSDL Supabase.
      </footer>
    </div>
  );
}