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

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [luckySpins, setLuckySpins] = useState<number>(0);
  const [lastCheckIn, setLastCheckIn] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const getTodayString = () => new Date().toISOString().split("T")[0];

  // KHỞI TẠO & LẮNG NGHE USER TRÊN FIRESTORE CHUẨN XÁC 100%
  useEffect(() => {
    let unsubscribeUserDoc: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);

        try {
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            // NẾU CHƯA CÓ TRÊN FIRESTORE -> TẠO MỚI NGAY LẬP TỨC CHO CẢ BẠN BÈ & CHỦ NHÀ
            await setDoc(userRef, {
              uid: currentUser.uid,
              name: currentUser.displayName || "Chiến Binh Saiyan",
              email: currentUser.email || "",
              photoURL: currentUser.photoURL || "",
              points: 1000,
              luckySpins: 3,
              lastCheckIn: "",
              createdAt: serverTimestamp(),
            });
            setPoints(1000);
            setLuckySpins(3);
          } else {
            // NẾU ĐÃ CÓ RỒI -> CHỈ CẬP NHẬT THÔNG TIN PROFILE, GIỮ NGUYÊN ĐIỂM SỐ
            await setDoc(
              userRef,
              {
                name: currentUser.displayName || "Chiến Binh Saiyan",
                email: currentUser.email || "",
                photoURL: currentUser.photoURL || "",
              },
              { merge: true }
            );
          }
        } catch (err) {
          console.error("Lỗi khởi tạo user trên Firestore:", err);
        }

        // LẮNG NGHE REALTIME: ĐIỂM SỐ NHẬY SỐ LẬP TỨC KHI THAY ĐỔI
        unsubscribeUserDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setPoints(data.points !== undefined ? data.points : 1000);
            setLuckySpins(data.luckySpins !== undefined ? data.luckySpins : 3);
            setLastCheckIn(data.lastCheckIn || "");
          }
        });
      } else {
        setPoints(0);
        setLuckySpins(0);
        setLastCheckIn("");
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  // LẮNG NGHE CHAT CHUNG
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

  const handleCheckIn = async () => {
    if (!user) return;
    const today = getTodayString();
    if (lastCheckIn === today) {
      alert("Hôm nay chiến binh đã tụ Ki nhận thưởng rồi!");
      return;
    }
    const userRef = doc(db, "users", user.uid);
    const newPoints = points + 500;
    const newSpins = luckySpins + 1;
    await setDoc(userRef, { points: newPoints, luckySpins: newSpins, lastCheckIn: today }, { merge: true });
    alert("🔥 Bứt phá giới hạn! Điểm danh thành công +500 PTS Ki Aura & +1 Lượt Quay Miễn Phí!");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    try {
      await addDoc(collection(db, "globalChat"), {
        uid: user.uid,
        name: currentUserDisplayName() || "Chiến Binh", // Đã xử lý an toàn ní bên dưới
        photoURL: user.photoURL || "",
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
      });
      setNewMessage("");
    } catch (err) {
      console.error("Lỗi gửi tin nhắn:", err);
    }
  };

  function currentUserDisplayName() {
    return user?.displayName;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-amber-400 font-black tracking-widest animate-pulse px-4 text-center">
        <span className="text-5xl mb-4">🔮</span>
        ĐANG TRIỆU HOỒI RỒNG THẦN DRAGON ARCADE...
      </div>
    );
  }

  const isCheckedInToday = lastCheckIn === getTodayString();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-white font-sans select-none relative pb-20 overflow-x-hidden">
        {/* Header Tối Ưu Bố Cục Cho Mobile */}
        <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-amber-500/40 px-3 py-2.5 shadow-[0_4px_20px_rgba(245,158,11,0.15)]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
            
            {/* Dòng 1: Logo + Nút Thoát */}
            <div className="w-full sm:w-auto flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl animate-bounce">🐲</span>
                <span className="font-black text-xl sm:text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500">
                  DRAGON ARCADE
                </span>
              </div>

              {user ? (
                <button
                  onClick={() => signOut(auth)}
                  className="sm:hidden text-xs text-slate-400 hover:text-rose-400 font-bold px-2 py-1 bg-slate-800/80 rounded-lg border border-slate-700 active:scale-95 transition"
                >
                  Thoát 🚪
                </button>
              ) : null}
            </div>

            {/* Dòng 2: 3 Ô Điểm - Lượt - Tụ Ki Dàn Hàng Ngang */}
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-1.5 sm:gap-3">
              {user ? (
                <>
                  <div className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-slate-800/90 border border-amber-500/50 px-2 sm:px-3 py-1.5 rounded-xl shadow-inner text-xs sm:text-sm">
                    <span>⚡</span>
                    <span className="font-black text-amber-400 truncate">{points.toLocaleString()}</span>
                  </div>

                  <div className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-slate-800/90 border border-purple-500/50 px-2 sm:px-3 py-1.5 rounded-xl shadow-inner text-xs sm:text-sm">
                    <span>🎟️</span>
                    <span className="font-black text-purple-300 truncate">{luckySpins}</span>
                  </div>

                  <button
                    onClick={handleCheckIn}
                    disabled={isCheckedInToday}
                    className={`flex-1 sm:flex-none text-xs sm:text-sm font-black py-1.5 px-3 sm:px-4 rounded-xl transition-all shadow-md active:scale-95 ${
                      isCheckedInToday
                        ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                        : "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 cursor-pointer shadow-amber-500/20"
                    }`}
                  >
                    {isCheckedInToday ? "✅ Đã Tụ Ki" : "🔥 Tụ Ki"}
                  </button>

                  <button
                    onClick={() => signOut(auth)}
                    className="hidden sm:block text-xs text-slate-400 hover:text-rose-400 font-semibold transition cursor-pointer ml-1"
                  >
                    Thoát
                  </button>
                </>
              ) : (
                <button
                  onClick={() => signInWithPopup(auth, googleProvider)}
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs sm:text-sm py-2 px-4 rounded-xl cursor-pointer hover:brightness-110 transition active:scale-95 shadow-lg"
                >
                  Đăng Nhập Google
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Banner Dragon Gaming Arena */}
        <section
          className="relative flex items-center justify-center min-h-[240px] sm:min-h-[300px] bg-cover bg-center text-center p-4 border-b border-amber-500/30 overflow-hidden"
          style={{
            backgroundImage:
              "url('https://images3.alphacoders.com/812/thumb-1920-812808.png')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/85 to-slate-950"></div>
          <div className="relative z-10 max-w-3xl space-y-2 sm:space-y-3">
            <div className="inline-block px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-[11px] font-bold text-amber-300 uppercase tracking-widest backdrop-blur-sm">
              ✨ Khai Phá Sức Mạnh Ultra Instinct
            </div>
            <h1 className="text-3xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 drop-shadow-md tracking-wide">
              DRAGON GAMING ARENA
            </h1>
            <p className="text-slate-300 text-xs sm:text-base font-medium max-w-xl mx-auto px-2">
              Thách đấu võ đạo trí tuệ, bứt phá giới hạn Ki, quay vòng may mắn & đổi quà rực rỡ!
            </p>
          </div>
        </section>

        {/* Danh Sách Game */}
        <main className="max-w-7xl mx-auto px-3 sm:px-4 py-6 space-y-8">
          
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
              <h2 className="text-lg sm:text-xl font-black text-amber-400 tracking-wider uppercase">
                🔥 Đặc Quyền & Cửa Hàng
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <Link
                href="/vongquay"
                className="bg-slate-900/90 border border-purple-500/50 rounded-2xl p-5 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden"
              >
                <div className="absolute -right-4 -bottom-4 text-6xl opacity-10">🎡</div>
                <h3 className="text-lg font-bold text-purple-300">🎡 Vòng Quay Ngọc Rồng</h3>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">Săn nước suối, tiền mặt và thêm lượt quay!</p>
                <div className="mt-3 bg-purple-600 text-white font-black py-2.5 px-3 rounded-xl text-center text-xs shadow-md">
                  Vào Vòng Quay 🎟️
                </div>
              </Link>

              <Link
                href="/shop"
                className="bg-slate-900/90 border border-amber-500/50 rounded-2xl p-5 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden"
              >
                <div className="absolute -right-4 -bottom-4 text-6xl opacity-10">🛍️</div>
                <h3 className="text-lg font-bold text-amber-400">🛍️ Cửa Hàng Đổi Quà</h3>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">Dùng điểm Ki đổi lượt quay hoặc VNĐ!</p>
                <div className="mt-3 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black py-2.5 px-3 rounded-xl text-center text-xs shadow-md">
                  Vào Cửa Hàng 🛒
                </div>
              </Link>

              <Link
                href="/jackpot"
                className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-5 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden"
              >
                <div className="absolute -right-4 -bottom-4 text-6xl opacity-10">🎰</div>
                <h3 className="text-lg font-bold text-amber-400">🎰 Jackpot Rồng Thần</h3>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">Quay hũ tích tụ Ki nổ hũ Grand cực khủng!</p>
                <div className="mt-3 bg-gradient-to-r from-amber-500 to-red-500 text-slate-950 font-black py-2.5 px-3 rounded-xl text-center text-xs shadow-md">
                  Vào Nổ Hũ 🔮
                </div>
              </Link>

            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 border-l-4 border-blue-500 pl-3">
              <h2 className="text-lg sm:text-xl font-black text-blue-400 tracking-wider uppercase">
                🧠 Game Trí Tuệ & Chiến Thuật
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                href="/chess"
                className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-5 active:scale-[0.98] transition block shadow-lg"
              >
                <div className="text-3xl mb-1">♚</div>
                <h3 className="font-black text-lg text-white">Cờ Vua Quyết Liệt</h3>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">Đấu AI 3 cấp độ, tạo phòng Online cược PTS!</p>
                <div className="mt-3 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black py-2 px-3 rounded-xl text-center text-xs shadow-md">
                  Vào Bàn Cờ ♟️
                </div>
              </Link>

              <Link
                href="/chessthu"
                className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-5 active:scale-[0.98] transition block shadow-lg"
              >
                <div className="text-3xl mb-1">🦁</div>
                <h3 className="font-black text-lg text-white">Đấu Trường Cờ Thú</h3>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">Trận chiến động vật đỉnh cao, phòng Online cược lớn!</p>
                <div className="mt-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black py-2 px-3 rounded-xl text-center text-xs shadow-md">
                  Vào Bàn Cờ Thú 🐅
                </div>
              </Link>

              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 opacity-60 flex flex-col justify-between">
                <div>
                  <div className="text-3xl mb-1">🏮</div>
                  <h3 className="font-bold text-lg text-slate-300">Cờ Tướng</h3>
                  <p className="text-slate-500 text-xs sm:text-sm mt-1">Trận chiến trí tuệ Phương Đông.</p>
                </div>
                <div className="mt-3 text-[11px] font-bold text-slate-500 bg-slate-800/80 py-1.5 px-3 rounded-xl text-center">
                  ⏳ Đang phát triển
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
              <h2 className="text-lg sm:text-xl font-black text-emerald-400 tracking-wider uppercase">
                🎰 Game Giải Trí & May Mắn
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="text-3xl mb-1">🎴</div>
                  <h3 className="text-lg font-bold text-emerald-300 mb-1">Xì Dách Realtime (6 Người)</h3>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1 mb-3">
                    Đấu trường bài bạc đỉnh cao cùng bạn bè và AI Nhà Cái. Ghép phòng tự động!
                  </p>
                </div>
                <Link href="/xidach" className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black py-2.5 rounded-xl text-center text-xs shadow-md block">
                  Vào Bàn Xì Dách 🎴
                </Link>
              </div>

              <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="text-3xl mb-1">🎯</div>
                  <h3 className="text-lg font-bold text-cyan-300 mb-1">Bắn Cá Ki-Blast</h3>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1 mb-3">
                    Săn rồng biển bắn đạn nhận Ki, sát thương lan, crit x2 và nổ hũ Jackpot!
                  </p>
                </div>
                <Link href="/banca" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black py-2.5 rounded-xl text-center text-xs shadow-md block">
                  Vào Bàn Bắn Cá 🎯
                </Link>
              </div>

            </div>
          </section>
        </main>

        {/* CHAT BOX CHUNG TỐI ƯU MOBILE */}
        <div className="fixed bottom-3 right-3 z-50">
          {!chatOpen ? (
            <button
              onClick={() => setChatOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black p-3 rounded-full shadow-xl flex items-center gap-1.5 cursor-pointer active:scale-95 border-2 border-amber-300"
            >
              <span className="text-lg">💬</span>
              <span className="text-xs tracking-wider hidden sm:inline">CHAT SAIYAN</span>
            </button>
          ) : (
            <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl shadow-2xl w-[90vw] sm:w-[360px] h-[380px] sm:h-[420px] flex flex-col overflow-hidden backdrop-blur-xl">
              <div className="bg-slate-800/95 border-b border-amber-500/30 p-2.5 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span>💬</span>
                  <span className="font-black text-xs sm:text-sm text-amber-400 tracking-wider">
                    CHAT CHUNG VŨ TRỤ
                  </span>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="text-slate-400 hover:text-white font-bold text-xs px-2 py-1 rounded-lg cursor-pointer"
                >
                  ✖
                </button>
              </div>

              <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5">
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
                          className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-xs break-words font-medium shadow-sm ${
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

              <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-800 bg-slate-950 flex gap-1.5">
                <input
                  type="text"
                  placeholder="Nhập tin nhắn..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-3 py-2 rounded-xl cursor-pointer active:scale-95"
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