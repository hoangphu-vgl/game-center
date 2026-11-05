"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

interface ChatMessage {
  id: string;
  uid: string;
  name: string;
  photoURL?: string;
  text: string;
  createdAt?: any;
}

const WHEEL_SLICES = [
  { id: 1, label: "1 Chai Nước Suối 🥤", type: "water", prob: 0.05, color: "#38bdf8" },
  { id: 2, label: "1.000 VNĐ 💵", type: "money", value: 1000, prob: 0.10, color: "#facc15" },
  { id: 3, label: "Hut 1 (Yamcha nằm đất!) 💀", type: "empty", prob: 0.16, color: "#ef4444" },
  { id: 4, label: "Thêm 1 Lượt Quay 🎟️", type: "spin", value: 1, prob: 0.10, color: "#a855f7" },
  { id: 5, label: "Hut 2 (Bị Majin Buu nuốt!) 🍩", type: "empty", prob: 0.17, color: "#f97316" },
  { id: 6, label: "2.000 VNĐ 💵", type: "money", value: 2000, prob: 0.08, color: "#4ade80" },
  { id: 7, label: "Hut 3 (Zeno-sama xoá sổ!) 🌌", type: "empty", prob: 0.17, color: "#64748b" },
  { id: 8, label: "Hut 4 (Tàu Pảy Pảy né đi!) 🚀", type: "empty", prob: 0.17, color: "#ec4899" },
];

const SHOP_PACKAGES = [
  { id: 1, title: "Gói Thần Hủy Diệt", cost: 500000, type: "cash", reward: 5000, desc: "Đổi 500k điểm Ki lấy ngay 5.000 VNĐ tiền mặt!" },
  { id: 2, title: "Gói Siêu Sayan 11 Lượt", cost: 100000, type: "spin", reward: 11, desc: "100k điểm Ki = 11 Lượt quay may mắn vũ trụ!" },
  { id: 3, title: "Gói Ultra Instinct 6 Lượt", cost: 50000, type: "spin", reward: 6, desc: "50k điểm Ki = 6 Lượt quay bứt phá giới hạn!" },
  { id: 4, title: "Gói Ki Bền Bỉ 2 Lượt", cost: 18000, type: "spin", reward: 2, desc: "18k điểm Ki = 2 Lượt quay săn quà!" },
  { id: 5, title: "Gói Khởi Động 1 Lượt", cost: 10000, type: "spin", reward: 1, desc: "10k điểm Ki = 1 Lượt quay may mắn nhanh gọn!" },
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [luckySpins, setLuckySpins] = useState<number>(0);
  const [lastCheckIn, setLastCheckIn] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Vòng quay states
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [spinResultModal, setSpinResultModal] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const getTodayString = () => new Date().toISOString().split("T")[0];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          await loadOrInitUser(currentUser);
        } catch (e) {
          console.error(e);
        }
      } else {
        setPoints(0);
        setLuckySpins(0);
        setLastCheckIn("");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "globalChat"),
      orderBy("createdAt", "asc"),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(msgs);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubscribe();
  }, []);

  const loadOrInitUser = async (currentUser: User) => {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      setPoints(data.points || 0);
      setLuckySpins(data.luckySpins || 3); // Tặng sẵn 3 lượt quay trải nghiệm
      setLastCheckIn(data.lastCheckIn || "");
    } else {
      const newUser = {
        uid: currentUser.uid,
        name: currentUser.displayName || "Chiến Binh Saiyan",
        email: currentUser.email,
        photoURL: currentUser.photoURL,
        points: 1000,
        luckySpins: 3,
        lastCheckIn: "",
      };
      await setDoc(userRef, newUser);
      setPoints(1000);
      setLuckySpins(3);
    }
  };

  const handleCheckIn = async () => {
    if (!user) return;
    const today = getTodayString();
    if (lastCheckIn === today) {
      alert("Hôm nay chiến binh đã tụ Ki nhận thưởng rồi!");
      return;
    }
    const userRef = doc(db, "users", user.uid);
    const newPoints = points + 500;
    const newSpins = luckySpins + 1; // Thưởng thêm 1 lượt quay khi điểm danh
    await setDoc(userRef, { points: newPoints, luckySpins: newSpins, lastCheckIn: today }, { merge: true });
    setPoints(newPoints);
    setLuckySpins(newSpins);
    setLastCheckIn(today);
    alert("🔥 Bứt phá giới hạn! Điểm danh thành công +500 PTS Ki Aura & +1 Lượt Quay Miễn Phí!");
  };

  // Logic Quay Vòng Quay 8 Ô
  const spinWheel = async () => {
    if (isSpinning) return;
    if (luckySpins <= 0) {
      alert("⚡ Hết lượt quay rồi ní ơi! Hãy ghé Shop Đổi Quà hoặc Điểm danh để nhận thêm lượt!");
      return;
    }

    setIsSpinning(true);
    setSpinResultModal(null);

    const newSpins = luckySpins - 1;
    setLuckySpins(newSpins);
    if (user) {
      await setDoc(doc(db, "users", user.uid), { luckySpins: newSpins }, { merge: true });
    }

    // Chọn ngẫu nhiên phần thưởng theo tỉ lệ
    const rand = Math.random();
    let cumulative = 0;
    let selectedIndex = 0;
    for (let i = 0; i < WHEEL_SLICES.length; i++) {
      cumulative += WHEEL_SLICES[i].prob;
      if (rand <= cumulative) {
        selectedIndex = i;
        break;
      }
    }

    const sliceAngle = 360 / WHEEL_SLICES.length;
    // Quay ngẫu nhiên thêm 5-8 vòng (1800 - 2880 độ) để tạo cảm giác hồi hộp
    const randomFullRounds = 360 * (5 + Math.floor(Math.random() * 3));
    const targetAngle = randomFullRounds + (360 - (selectedIndex * sliceAngle + sliceAngle / 2));

    setWheelAngle(targetAngle);

    setTimeout(async () => {
      setIsSpinning(false);
      const prize = WHEEL_SLICES[selectedIndex];
      let msg = `🎉 Chúc mừng ní trúng: ${prize.label}`;

      if (prize.type === "spin") {
        const updatedSpins = newSpins + (prize.value || 1);
        setLuckySpins(updatedSpins);
        if (user) {
          await setDoc(doc(db, "users", user.uid), { luckySpins: updatedSpins }, { merge: true });
        }
        msg = `🎁 Quá đỉnh! Ní trúng thêm +1 Lượt Quay Miễn Phí! Tổng lượt: ${updatedSpins}`;
      } else if (prize.type === "money") {
        msg = `💰 Rồng Thần ban phước! Ní nhận ngay phần thưởng ${prize.label}! Liên hệ Admin để nhận thưởng nhé!`;
      } else if (prize.type === "water") {
        msg = `🥤 Khát nước quá hả ní? Trúng ngay 1 Chai Nước Suối mát lạnh từ Đấu Trường!`;
      } else {
        const trollQuotes = [
          "💀 Yamcha nằm đất! Hụt quà rồi ní ơi, ráng tu luyện thêm đi!",
          "🍩 Bị Majin Buu biến thành kẹo sô-cô-la mất phần rồi!",
          "🌌 Zeno-sama vừa xoá sổ ô quà của ní khỏi vũ trụ!",
          "🚀 Tàu Pảy Pảy phóng qua lấy mất phần thưởng rồi, quay lại đi ní!"
        ];
        msg = trollQuotes[Math.floor(Math.random() * trollQuotes.length)];
      }

      setSpinResultModal(msg);
    }, 4000);
  };

  // Mua gói từ Shop
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
      alert(`🔥 MUA THÀNH CÔNG! Đã cộng +${pkg.reward} Lượt Quay vào tài khoản vòng quay của ní!`);
    } else {
      alert(`👑 GIAO DỊCH THẦN THÁNH! Đổi thành công ${pkg.reward.toLocaleString()} VNĐ tiền mặt! Hãy chụp màn hình và báo Admin nhận quà ngay!`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    try {
      await addDoc(collection(db, "globalChat"), {
        uid: user.uid,
        name: user.displayName || "Chiến Binh",
        photoURL: user.photoURL || "",
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
      });
      setNewMessage("");
    } catch (err) {
      console.error("Lỗi gửi tin nhắn:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-amber-400 font-black tracking-widest animate-pulse">
        <span className="text-5xl mb-4">🔮</span>
        ĐANG TRIỆU HOỒI RỒNG THẦN DRAGON ARCADE...
      </div>
    );
  }

  const isCheckedInToday = lastCheckIn === getTodayString();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-white font-sans select-none relative pb-16">
        {/* Header Aura */}
        <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-amber-500/40 px-4 py-3 shadow-[0_4px_20px_rgba(245,158,11,0.15)]">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-3xl animate-bounce">🐲</span>
              <span className="font-black text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 drop-shadow">
                DRAGON ARCADE
              </span>
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <div className="flex items-center gap-2 bg-slate-800/90 border border-amber-500/50 px-3 py-1.5 rounded-xl shadow-inner">
                    <span>⚡</span>
                    <span className="font-black text-amber-400 tracking-wide">{points.toLocaleString()}</span>
                    <span className="text-[10px] text-amber-300/80 font-bold">KI PTS</span>
                  </div>

                  <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/90 border border-purple-500/50 px-3 py-1.5 rounded-xl shadow-inner">
                    <span>🎟️</span>
                    <span className="font-black text-purple-300 tracking-wide">{luckySpins}</span>
                    <span className="text-[10px] text-purple-300/80 font-bold">LƯỢT QUAY</span>
                  </div>

                  <button
                    onClick={handleCheckIn}
                    disabled={isCheckedInToday}
                    className={`text-xs sm:text-sm font-black py-1.5 px-3 sm:px-4 rounded-xl transition-all duration-300 shadow-md ${
                      isCheckedInToday
                        ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                        : "bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 cursor-pointer shadow-amber-500/20 active:scale-95"
                    }`}
                  >
                    {isCheckedInToday ? "✅ Đã Tụ Ki" : "🔥 Tụ Ki (+500)"}
                  </button>

                  <button
                    onClick={() => signOut(auth)}
                    className="text-xs text-slate-400 hover:text-rose-400 font-semibold transition cursor-pointer"
                  >
                    Thoát
                  </button>
                </>
              ) : (
                <button
                  onClick={() => signInWithPopup(auth, googleProvider)}
                  className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-sm py-2 px-4 rounded-xl cursor-pointer hover:brightness-110 transition active:scale-95 shadow-lg shadow-amber-500/20"
                >
                  Đăng Nhập Google
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Banner Dragon Ball Super Saiyan */}
        <section
          className="relative flex items-center justify-center min-h-[340px] bg-cover bg-center text-center p-6 border-b border-amber-500/30 overflow-hidden"
          style={{
            backgroundImage:
              "url('https://images3.alphacoders.com/812/thumb-1920-812808.png')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/85 to-slate-950"></div>
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-block px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-xs font-bold text-amber-300 uppercase tracking-widest backdrop-blur-sm">
              ✨ Khai Phá Sức Mạnh Ultra Instinct
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 drop-shadow-[0_5px_15px_rgba(245,158,11,0.4)] tracking-wide">
              DRAGON GAMING ARENA
            </h1>
            <p className="text-slate-300 text-sm sm:text-base font-medium max-w-xl mx-auto">
              Thách đấu võ đạo trí tuệ, bứt phá giới hạn Ki, quay vòng may mắn & đổi quà rực rỡ tại Võ Hội Vũ Trụ!
            </p>
          </div>
        </section>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
          
          {/* VÒNG QUAY MAY MẮN (8 Ô TỈ LỆ CHUẨN) */}
          <section id="vongquay" className="space-y-6 bg-gradient-to-br from-slate-900 via-purple-950/40 to-slate-900 border-2 border-purple-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-1 bg-purple-500/20 border border-purple-400/40 rounded-full text-xs font-bold text-purple-300 uppercase tracking-widest">
                ✨ Vòng Quay Sức Mạnh Vũ Trụ
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-400 to-amber-400">
                🎡 VÒNG QUAY NGỌC RỒNG MAY MẮN
              </h2>
              <p className="text-slate-400 text-sm">
                Sở hữu ngay 1 chai nước suối, tiền mặt 1k, 2k hoặc lượt quay thưởng miễn phí! Tránh né các ô Yamcha và Majin Buu nhé!
              </p>
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-center gap-8 py-6">
              {/* Vòng quay Canvas / CSS Wheel */}
              <div className="relative w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] flex items-center justify-center">
                {/* Mũi tên chỉ hướng */}
                <div className="absolute -top-4 z-30 text-4xl drop-shadow-[0_2px_8px_rgba(255,255,255,0.8)] animate-bounce">
                  🔻
                </div>

                {/* Bánh xe */}
                <div
                  className="w-full h-full rounded-full border-8 border-amber-400 shadow-[0_0_30px_rgba(168,85,247,0.5)] relative overflow-hidden transition-all ease-out"
                  style={{
                    transform: `rotate(${wheelAngle}deg)`,
                    transitionDuration: isSpinning ? "4s" : "0s",
                    background: "conic-gradient(#38bdf8 0deg 45deg, #facc15 45deg 90deg, #ef4444 90deg 135deg, #a855f7 135deg 180deg, #f97316 180deg 225deg, #4ade80 225deg 270deg, #64748b 270deg 315deg, #ec4899 315deg 360deg)"
                  }}
                >
                  {/* Nhãn 8 ô */}
                  <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-slate-950">
                    <span className="absolute top-4 rotate-0 drop-shadow">🥤 Nước Suối</span>
                    <span className="absolute right-6 top-16 rotate-45 drop-shadow">💵 1.000đ</span>
                    <span className="absolute right-4 bottom-16 rotate-90 drop-shadow">💀 Yamcha</span>
                    <span className="absolute bottom-4 right-16 rotate-[135deg] drop-shadow">🎟️ +1 Lượt</span>
                    <span className="absolute bottom-4 left-16 rotate-180 drop-shadow">🍩 Majin Buu</span>
                    <span className="absolute left-4 bottom-16 rotate-[225deg] drop-shadow">💵 2.000đ</span>
                    <span className="absolute left-4 top-16 rotate-[270deg] drop-shadow">🌌 Zeno</span>
                    <span className="absolute top-4 left-16 rotate-[315deg] drop-shadow">🚀 Tàu Pảy Pảy</span>
                  </div>
                </div>

                {/* Trục giữa */}
                <div className="absolute z-20 w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border-4 border-slate-950 shadow-xl flex items-center justify-center text-xl font-black text-slate-950">
                  🐉
                </div>
              </div>

              {/* Thông tin & Nút quay */}
              <div className="bg-slate-950/80 border border-purple-500/40 rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
                <div className="flex justify-between items-center bg-purple-950/60 border border-purple-500/30 px-4 py-2.5 rounded-xl">
                  <span className="text-xs font-bold text-purple-300">Lượt Quay Hiện Có:</span>
                  <span className="text-lg font-black text-amber-400">{luckySpins} 🎟️</span>
                </div>

                <button
                  onClick={spinWheel}
                  disabled={isSpinning}
                  className={`w-full py-4 rounded-2xl font-black text-lg uppercase tracking-wider transition shadow-lg cursor-pointer ${
                    isSpinning
                      ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                      : "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 hover:brightness-110 text-slate-950 shadow-amber-500/30 active:scale-95 animate-pulse"
                  }`}
                >
                  {isSpinning ? "🌀 ĐANG KÊU GỌI RỒNG THẦN..." : "🎰 QUAY NGAY (1 LƯỢT)"}
                </button>

                <p className="text-[11px] text-slate-400 italic">
                  * Mẹo: Lượt quay có thể nhận miễn phí từ Điểm danh hàng ngày hoặc mua trực tiếp trong Cửa Hàng Đổi Quà bên dưới!
                </p>
              </div>
            </div>

            {/* Modal kết quả quay */}
            {spinResultModal && (
              <div className="bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-pink-500/20 border-2 border-amber-400/80 rounded-2xl p-4 text-center animate-bounce shadow-2xl">
                <div className="text-base font-black text-amber-300">✨ KẾT QUẢ VÒNG QUAY VŨ TRỤ ✨</div>
                <div className="text-lg font-bold text-white mt-1">{spinResultModal}</div>
                <button
                  onClick={() => setSpinResultModal(null)}
                  className="mt-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-1.5 rounded-xl transition cursor-pointer"
                >
                  Đã hiểu, tiếp tục chiến!
                </button>
              </div>
            )}
          </section>

          {/* SHOP ĐỔI QUÀ & LƯỢT QUAY */}
          <section id="shop" className="space-y-6">
            <div className="flex items-center justify-between border-l-4 border-amber-500 pl-3">
              <div>
                <h2 className="text-2xl font-black text-amber-400 tracking-wider uppercase">
                  🛍️ Cửa Hàng Đổi Quà Ki & Lượt Quay
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                  Dùng điểm Ki tích lũy từ các game để đổi lấy lượt quay vòng may mắn hoặc tiền mặt VNĐ!
                </p>
              </div>
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
                    <h3 className="text-xl font-black text-white group-hover:text-amber-400 transition">{pkg.title}</h3>
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
          </section>

          {/* PHỤ LỤC 2: GAME TRÍ TUỆ & CHIẾN THUẬT */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-l-4 border-blue-500 pl-3">
              <h2 className="text-xl font-black text-blue-400 tracking-wider uppercase">
                🧠 Game Trí Tuệ & Chiến Thuật
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link
                href="/chess"
                className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-6 hover:border-amber-400 transition-all block group shadow-lg hover:shadow-amber-500/10 hover:-translate-y-1"
              >
                <div className="text-4xl mb-2">♚</div>
                <h3 className="font-black text-xl text-white group-hover:text-amber-400 transition">
                  Cờ Vua Quyết Liệt
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                  Đấu AI 3 cấp độ (Dễ - Vừa - Khó), tạo phòng Online Realtime cược 50 - 5,000 PTS!
                </p>
                <div className="mt-4 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black py-2.5 px-4 rounded-xl text-center text-sm shadow-md">
                  Vào Bàn Cờ ♟️
                </div>
              </Link>

              {/* THẺ ĐẤU TRƯỜNG CỜ THÚ */}
              <Link
                href="/chessthu"
                className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-6 hover:border-emerald-400 transition-all block group shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1"
              >
                <div className="text-4xl mb-2">🦁</div>
                <h3 className="font-black text-xl text-white group-hover:text-emerald-400 transition">
                  Đấu Trường Cờ Thú
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                  Trận chiến chiến thuật động vật đỉnh cao, phòng Online Realtime cược lên đến 10,000 PTS!
                </p>
                <div className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black py-2.5 px-4 rounded-xl text-center text-sm shadow-md">
                  Vào Bàn Cờ Thú 🐅
                </div>
              </Link>

              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 opacity-60 relative flex flex-col justify-between">
                <div>
                  <div className="text-4xl mb-2">🏮</div>
                  <h3 className="font-bold text-xl text-slate-300">Cờ Tướng</h3>
                  <p className="text-slate-500 text-sm mt-1">Trận chiến trí tuệ Phương Đông quy mô lớn.</p>
                </div>
                <div className="mt-4 text-xs font-bold text-slate-500 bg-slate-800/80 py-2 px-3 rounded-xl text-center">
                  ⏳ Phụ lục đang phát triển
                </div>
              </div>
            </div>
          </section>

          {/* PHỤ LỤC 4: GAME GIẢI TRÍ & MAY MẮN */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
              <h2 className="text-xl font-black text-emerald-400 tracking-wider uppercase">
                🎰 Game Giải Trí & May Mắn
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Thẻ Xì Dách Multiplayer Realtime */}
              <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-6 flex flex-col justify-between shadow-xl hover:border-emerald-400 transition">
                <div>
                  <div className="text-4xl mb-2">🎴</div>
                  <h3 className="text-xl font-bold text-emerald-300 mb-1">Xì Dách Realtime (6 Người)</h3>
                  <p className="text-slate-400 text-sm mt-1 mb-4">
                    Đấu trường bài bạc đỉnh cao cùng bạn bè và AI Nhà Cái Rồng Thần. Ghép phòng tự động, cược PTS cực gắt!
                  </p>
                </div>
                <Link href="/xidach" className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black py-2.5 rounded-xl text-center text-sm shadow-md hover:brightness-110 transition">
                  Vào Bàn Xì Dách 🎴
                </Link>
              </div>

              {/* Bắn Cá Ki-Blast */}
              <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-6 flex flex-col justify-between shadow-xl hover:border-cyan-400 transition">
                <div>
                  <div className="text-4xl mb-2">🎯</div>
                  <h3 className="text-xl font-bold text-cyan-300 mb-1">Bắn Cá Ki-Blast</h3>
                  <p className="text-slate-400 text-sm mt-1 mb-4">
                    Săn rồng biển đại dương bắn đạn chưởng nhận Ki, sát thương lan, crit x2 và nổ hũ Jackpot cực đỉnh!
                  </p>
                </div>
                <Link href="/banca" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black py-2.5 rounded-xl text-center text-sm shadow-md hover:brightness-110 transition block">
                  Vào Bàn Bắn Cá 🎯
                </Link>
              </div>

            </div>
          </section>
        </main>

        {/* CHAT BOX CHUNG */}
        <div className="fixed bottom-4 right-4 z-50">
          {!chatOpen ? (
            <button
              onClick={() => setChatOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black p-3.5 rounded-full shadow-[0_4px_25px_rgba(245,158,11,0.4)] flex items-center gap-2 cursor-pointer transition transform active:scale-95 border-2 border-amber-300"
            >
              <span className="text-xl">💬</span>
              <span className="text-xs sm:text-sm tracking-wider">KÊNH CHAT SAIYAN</span>
            </button>
          ) : (
            <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl shadow-2xl w-[320px] sm:w-[360px] h-[420px] flex flex-col overflow-hidden backdrop-blur-xl">
              <div className="bg-slate-800/90 border-b border-amber-500/30 p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span>💬</span>
                  <span className="font-black text-sm text-amber-400 tracking-wider">
                    CHAT CHUNG VŨ TRỤ
                  </span>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="text-slate-400 hover:text-white font-bold text-sm px-2 py-0.5 rounded-lg hover:bg-slate-700 cursor-pointer transition"
                >
                  ✖
                </button>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-amber-500/30">
                {messages.length === 0 ? (
                  <div className="text-center text-xs text-slate-500 py-10">
                    Chưa có tin nhắn. Hãy phát tín hiệu Ki đầu tiên!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.uid === user?.uid;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-semibold">
                          {msg.name}
                        </span>
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs break-words font-medium shadow-sm ${
                            isMe
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold rounded-tr-none"
                              : "bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-800 bg-slate-950/80 flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập tin nhắn..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-3 py-2 rounded-xl transition cursor-pointer active:scale-95"
                >
                  Gửi
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}