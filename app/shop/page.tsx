"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const SHOP_PACKAGES = [
  { id: 1, title: "Gói Thần Hủy Diệt", cost: 500000, type: "cash", reward: 5000, desc: "Đổi 500k điểm Ki lấy ngay 5.000 VNĐ tiền mặt!" },
  { id: 2, title: "Gói Siêu Sayan 11 Lượt", cost: 100000, type: "spin", reward: 11, desc: "100k điểm Ki = 11 Lượt quay may mắn vũ trụ!" },
  { id: 3, title: "Gói Ultra Instinct 6 Lượt", cost: 50000, type: "spin", reward: 6, desc: "50k điểm Ki = 6 Lượt quay bứt phá giới hạn!" },
  { id: 4, title: "Gói Ki Bền Bỉ 2 Lượt", cost: 18000, type: "spin", reward: 2, desc: "18k điểm Ki = 2 Lượt quay săn quà!" },
  { id: 5, title: "Gói Khởi Động 1 Lượt", cost: 10000, type: "spin", reward: 1, desc: "10k điểm Ki = 1 Lượt quay may mắn nhanh gọn!" },
];

export default function ShopPage() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [luckySpins, setLuckySpins] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setPoints(data.points || 0);
          setLuckySpins(data.luckySpins || 3);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const buyPackage = async (pkg: typeof SHOP_PACKAGES[0]) => {
    if (!user) {
      alert("Vui lòng đăng nhập để mua quà từ Shop!");
      return;
    }
    if (points < pkg.cost) {
      alert(`⚠️ Điểm Ki không đủ! Ní đang có ${points.toLocaleString()} PTS, cần đến ${pkg.cost.toLocaleString()} PTS.`);
      return;
    }

    const confirmBuy = confirm(`⚡ Xác nhận dùng ${pkg.cost.toLocaleString()} điểm Ki để đổi "${pkg.title}"?`);
    if (!confirmBuy) return;

    const newPoints = points - pkg.cost;
    let newSpins = luckySpins;

    if (pkg.type === "spin") {
      newSpins += pkg.reward;
    }

    setPoints(newPoints);
    setLuckySpins(newSpins);

    await setDoc(
      doc(db, "users", user.uid),
      {
        points: newPoints,
        luckySpins: newSpins,
      },
      { merge: true }
    );

    if (pkg.type === "spin") {
      alert(`🔥 MUA THÀNH CÔNG! Đã cộng +${pkg.reward} Lượt Quay vào tài khoản của ní!`);
    } else {
      alert(`👑 GIAO DỊCH THẦN THÁNH! Đổi thành công ${pkg.reward.toLocaleString()} VNĐ! Hãy chụp màn hình báo Admin nhận thưởng!`);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-amber-400 font-black animate-pulse">
        ĐANG TẢI CỬA HÀNG ĐỔI QUÀ...
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-white font-sans select-none p-4 sm:p-8 space-y-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center bg-slate-900/90 border border-amber-500/40 px-6 py-4 rounded-2xl shadow-xl backdrop-blur-md">
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

        <div className="max-w-6xl mx-auto space-y-6">
          <div className="border-l-4 border-amber-500 pl-3">
            <h1 className="text-3xl font-black text-amber-400 uppercase tracking-wider">
              🛍️ Cửa Hàng Đổi Quà Ki & Lượt Quay
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Dùng điểm Ki tích lũy từ các game để đổi lấy lượt quay vòng may mắn hoặc tiền mặt VNĐ!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SHOP_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-6 flex flex-col justify-between shadow-xl hover:border-amber-400 hover:-translate-y-1 transition-all group relative overflow-hidden"
              >
                <div className="absolute -right-6 -bottom-6 text-7xl opacity-10 group-hover:opacity-20 transition">🎁</div>
                <div>
                  <div className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs font-bold mb-3">
                    ⚡ Gói Quà Siêu Cấp
                  </div>
                  <h2 className="text-xl font-black text-white group-hover:text-amber-400 transition">{pkg.title}</h2>
                  <p className="text-slate-400 text-sm mt-2">{pkg.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Giá Đổi</div>
                    <div className="text-base font-black text-amber-400">{pkg.cost.toLocaleString()} PTS</div>
                  </div>
                  <button
                    onClick={() => buyPackage(pkg)}
                    className="bg-gradient-to-r from-amber-400 to-orange-500 hover:brightness-110 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                  >
                    Đổi Ngay 🛒
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-6">
            <Link
              href="/vongquay"
              className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow transition"
            >
              🎡 Tới Vòng Quay May Mắn Ngay
            </Link>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}