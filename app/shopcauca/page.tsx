"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ShopCauCaPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<number>(0);
  const [userAvatar, setUserAvatar] = useState<string>("/assets/avatar/xtra1.ico");
  const [userRodsMap, setUserRodsMap] = useState<{ [filename: string]: string | null }>({}); // Lưu filename -> expires_at
  const [equippedRod, setEquippedRod] = useState<string>("cancaucoban.png");
  const [notification, setNotification] = useState<string | null>(null);

  // Danh sách 9 cây cần câu với giá gốc (mốc 3 ngày), tự động scale giá cho mốc 5 ngày và 7 ngày
  const shopRods = [
    {
      filename: "cancaucoban.png",
      name: "Cần Câu Cơ Bản",
      price3Days: 0,
      price5Days: 0,
      price7Days: 0,
      description: "Cần truyền thống đi kèm khi khởi nghiệp. Phù hợp câu cá nhỏ ven bờ.",
      buff: "Mặc định (Vĩnh viễn)"
    },
    {
      filename: "cancaugo.png",
      name: "Cần Câu Gỗ",
      price3Days: 500000,
      price5Days: 800000,
      price7Days: 1100000,
      description: "Chế tác từ gỗ tự nhiên dẻo dai, giúp tăng độ bền dây khi kéo cá tầng trung.",
      buff: "Tăng 10% lực kéo dây"
    },
    {
      filename: "cancaugoliem.png",
      name: "Cần Câu Gỗ Liêm",
      price3Days: 200000000,
      price5Days: 320000000,
      price7Days: 450000000,
      description: "Làm từ gỗ liêm quý hiếm, đầm tay và chống chọi tốt khi cá lớn giãy giụa.",
      buff: "Tăng 20% lực kéo dây"
    },
    {
      filename: "cancaumaycoban.png",
      name: "Cần Câu Máy Cơ Bản",
      price3Days: 500000000,
      price5Days: 800000000,
      price7Days: 1100000000,
      description: "Trang bị máy quay tay truyền thống, giúp thu dây nhanh hơn một chút so với cần thường.",
      buff: "Tăng tốc độ thu dây"
    },
    {
      filename: "cancaumaychuyennghiep.png",
      name: "Cần Câu Máy Chuyên Nghiệp",
      price3Days: 1500000000,
      price5Days: 2400000000,
      price7Days: 3300000000,
      description: "Tích hợp máy câu hiện đại, tối ưu hóa tốc độ và giảm thiểu thời gian cá vùng vẫy.",
      buff: "Giảm 30% thời gian cá giãy giụa"
    },
    {
      filename: "cancaucatrenbang.png",
      name: "Cần Câu Cá Trên Băng",
      price3Days: 5000000000,
      price5Days: 8000000000,
      price7Days: 11000000000,
      description: "Dòng cần độc đáo với khả năng làm dịu những loài cá hung hãn ở tầng sâu.",
      buff: "Tăng nhẹ tỉ lệ bắt cá hiếm"
    },
    {
      filename: "cancauvectogo.png",
      name: "Cần Câu Véc-tơ Gỗ",
      price3Days: 10000000000,
      price5Days: 16000000000,
      price7Days: 22000000000,
      description: "Sự kết hợp hoàn hảo giữa công nghệ véc-tơ và gỗ cao cấp, chuyên săn cá khủng.",
      buff: "Tăng mạnh tỉ lệ gặp cá lớn"
    },
    {
      filename: "cancauvectordo.png",
      name: "Cần Câu Véc-tơ Đỏ",
      price3Days: 50000000000,
      price5Days: 80000000000,
      price7Days: 110000000000,
      description: "Siêu phẩm phối màu đỏ rực lửa. Tăng đột phá cơ hội kích hoạt nổ hũ Jackpot!",
      buff: "Tăng mạnh tỉ lệ Nổ Hũ Jackpot"
    },
    {
      filename: "cancauvectorvang.png",
      name: "Cần Câu Véc-tơ Vàng",
      price3Days: 1000000000000,
      price5Days: 1600000000000,
      price7Days: 2200000000000,
      description: "Cực phẩm tối thượng dát vàng nguyên chất. Nhân đôi điểm thưởng và max may mắn!",
      buff: "X2 Điểm thưởng & Tối thượng"
    }
  ];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    async function fetchUserData(currentUser: any) {
      if (!currentUser) return;
      setUser(currentUser);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('balance, avatar_url, equipped_rod')
        .eq('id', currentUser.id)
        .single();

      if (profileData) {
        if (profileData.balance !== undefined) setBalance(profileData.balance);
        if (profileData.avatar_url) setUserAvatar(profileData.avatar_url);
        if (profileData.equipped_rod) setEquippedRod(profileData.equipped_rod);
      }

      const { data: rodsData } = await supabase
        .from('user_rods')
        .select('rod_filename, expires_at')
        .eq('user_id', currentUser.id);

      const map: { [filename: string]: string | null } = { "cancaucoban.png": null }; // Cơ bản vĩnh viễn (null expires)

      if (rodsData && rodsData.length > 0) {
        const now = new Date();
        rodsData.forEach((r: any) => {
          // Kiểm tra xem cần còn hạn hay đã hết hạn
          if (!r.expires_at || new Date(r.expires_at) > now) {
            map[r.rod_filename] = r.expires_at;
          }
        });
      }

      // Đảm bảo luôn có cần cơ bản
      if (!map["cancaucoban.png"]) {
        await supabase.from('user_rods').upsert([
          { user_id: currentUser.id, rod_filename: 'cancaucoban.png', rod_name: 'Cần Câu Cơ Bản', expires_at: null }
        ], { onConflict: 'user_id,rod_filename' });
      }

      setUserRodsMap(map);
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
  }, []);

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Thuê cần theo số ngày (3, 5, hoặc 7 ngày)
  const handleRentRod = async (rod: typeof shopRods[0], days: number) => {
    if (!user) {
      alert("Vui lòng đăng nhập để thuê vật phẩm!");
      return;
    }

    let priceToPay = rod.price3Days;
    if (days === 5) priceToPay = rod.price5Days;
    if (days === 7) priceToPay = rod.price7Days;

    if (balance < priceToPay) {
      alert("⚡ Số dư điểm (Balance) không đủ để thuê cần này trong " + days + " ngày!");
      return;
    }

    const newBalance = balance - priceToPay;

    // Tính thời gian hết hạn mới
    const now = new Date();
    const currentExpiry = userRodsMap[rod.filename];
    let baseTime = (currentExpiry && new Date(currentExpiry) > now) ? new Date(currentExpiry) : now;
    
    const newExpiresAt = new Date(baseTime.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    // 1. Trừ tiền profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', user.id);

    if (profileError) {
      alert("Lỗi cập nhật số dư: " + profileError.message);
      return;
    }

    // 2. Lưu vào user_rods (Upsert để gia hạn nếu đã có)
    const { error: rodError } = await supabase
      .from('user_rods')
      .upsert([
        { user_id: user.id, rod_filename: rod.filename, rod_name: rod.name, expires_at: newExpiresAt }
      ], { onConflict: 'user_id,rod_filename' });

    if (rodError) {
      alert("Lỗi lưu cần câu: " + rodError.message);
      return;
    }

    setBalance(newBalance);
    setUserRodsMap({ ...userRodsMap, [rod.filename]: newExpiresAt });
    showNotice(`🎉 Thuê thành công ${rod.name} trong ${days} ngày!`);
  };

  const handleEquipRod = async (filename: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ equipped_rod: filename })
      .eq('id', user.id);

    if (!error) {
      setEquippedRod(filename);
      showNotice(`🎣 Đã trang bị thành công cần câu mới!`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-3 sm:p-8 select-none">
      
      {/* Header điều hướng */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-900/90 border border-amber-500/40 p-3 sm:p-4 rounded-2xl shadow-xl backdrop-blur-md mb-6 sm:mb-8">
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-start">
          <Link href="/testgame" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-2 rounded-xl text-xs transition shadow cursor-pointer">
            ← Game Câu Cá
          </Link>
          <Link href="/" className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-2 rounded-xl text-xs transition">
            Cổng Game
          </Link>
        </div>

        <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-xl border border-amber-500/30">
          <img src={userAvatar} alt="Avatar" className="w-6 h-6 rounded-full border border-amber-400 object-cover" />
          <span className="text-xs font-bold">
            Số Dư: <span className="text-amber-300 font-black">{isMounted ? balance.toLocaleString() : "..."}</span> 🪙
          </span>
        </div>
      </div>

      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-amber-400 text-slate-950 px-6 py-3 rounded-2xl font-black shadow-2xl animate-bounce text-xs sm:text-base border-2 border-white">
          {notification}
        </div>
      )}

      <div className="max-w-6xl mx-auto text-center mb-8 space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent uppercase tracking-wider">
          🛍️ Cửa Hàng Thuê Cần Câu
        </h1>
        <p className="text-slate-400 text-[11px] sm:text-sm">
          Thuê các dòng cần câu cao cấp theo mốc 3 ngày, 5 ngày hoặc 7 ngày để săn cá khủng!
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {shopRods.map((rod) => {
          const expiresAt = userRodsMap[rod.filename];
          const isOwned = expiresAt !== undefined;
          const isEquipped = equippedRod === rod.filename;

          // Tính thời gian còn lại nếu đã sở hữu và có hạn sử dụng
          let timeLeftStr = "";
          if (isOwned && expiresAt) {
            const diff = new Date(expiresAt).getTime() - Date.now();
            if (diff > 0) {
              const daysLeft = Math.floor(diff / (1000 * 60 * 60 * 24));
              const hoursLeft = Math.floor((diff / (1000 * 60 * 60)) % 24);
              timeLeftStr = `Còn hạn: ${daysLeft} ngày ${hoursLeft}h`;
            } else {
              timeLeftStr = "Đã hết hạn";
            }
          } else if (rod.price3Days === 0) {
            timeLeftStr = "Vĩnh viễn";
          }

          return (
            <div 
              key={rod.filename}
              className={`bg-slate-900/80 border rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-between shadow-2xl transition duration-300 relative overflow-hidden ${
                isEquipped ? "border-amber-400 ring-2 ring-amber-400/50 bg-slate-900" : "border-slate-800 hover:border-amber-500/50"
              }`}
            >
              {isEquipped && (
                <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-[9px] font-black px-3 py-0.5 rounded-bl-xl uppercase tracking-widest shadow">
                  Đang Đeo
                </div>
              )}

              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-black text-amber-300 leading-snug">
                    {rod.name}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-black/40 px-2 py-0.5 rounded border border-slate-800">
                    {timeLeftStr || "Chưa thuê"}
                  </span>
                </div>

                <div className="w-full h-28 sm:h-32 bg-black/40 rounded-xl sm:rounded-2xl flex items-center justify-center p-2 border border-slate-800">
                  <img 
                    src={`/assets/cauca/cancau/${rod.filename}`} 
                    alt={rod.name} 
                    className="max-h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]" 
                  />
                </div>

                <p className="text-slate-300 text-[11px] sm:text-xs leading-relaxed line-clamp-2">
                  {rod.description}
                </p>

                <div className="bg-slate-950/70 border border-emerald-500/30 p-2 rounded-xl text-emerald-400 text-[11px] font-bold flex items-center gap-1.5">
                  <span>✨</span> <span className="truncate">{rod.buff}</span>
                </div>
              </div>

              {/* Các nút bấm Thuê / Trang bị */}
              <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                {rod.price3Days === 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-emerald-400 font-semibold">✅ Miễn phí khởi nghiệp</span>
                    <button
                      disabled={isEquipped}
                      onClick={() => handleEquipRod(rod.filename)}
                      className={`px-4 py-1.5 rounded-xl text-[11px] font-black transition cursor-pointer shadow ${
                        isEquipped ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-emerald-500 text-slate-950 hover:opacity-90"
                      }`}
                    >
                      {isEquipped ? "Đang Dùng" : "Trang Bị"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-1">
                      <button
                        onClick={() => handleRentRod(rod, 3)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 py-1.5 px-1 rounded-lg text-[10px] font-black transition text-center cursor-pointer"
                      >
                        3 Ngày <br/>{rod.price3Days.toLocaleString()}🪙
                      </button>
                      <button
                        onClick={() => handleRentRod(rod, 5)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 py-1.5 px-1 rounded-lg text-[10px] font-black transition text-center cursor-pointer"
                      >
                        5 Ngày <br/>{rod.price5Days.toLocaleString()}🪙
                      </button>
                      <button
                        onClick={() => handleRentRod(rod, 7)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 py-1.5 px-1 rounded-lg text-[10px] font-black transition text-center cursor-pointer"
                      >
                        7 Ngày <br/>{rod.price7Days.toLocaleString()}🪙
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {isOwned ? "✅ Đã sở hữu quyền dùng" : "🔒 Hết hạn/Chưa thuê"}
                      </span>

                      {isOwned && (
                        <button
                          disabled={isEquipped}
                          onClick={() => handleEquipRod(rod.filename)}
                          className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black transition cursor-pointer shadow ${
                            isEquipped 
                              ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                              : "bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:opacity-90"
                          }`}
                        >
                          {isEquipped ? "Đang Dùng" : "Trang Bị"}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}