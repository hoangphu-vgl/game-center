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
  const [lastCheckIn, setLastCheckIn] = useState<string>("");
  const [loading, setLoading] = useState(true);

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
      setLastCheckIn(data.lastCheckIn || "");
    } else {
      const newUser = {
        uid: currentUser.uid,
        name: currentUser.displayName || "Chiến Binh Saiyan",
        email: currentUser.email,
        photoURL: currentUser.photoURL,
        points: 1000,
        lastCheckIn: "",
      };
      await setDoc(userRef, newUser);
      setPoints(1000);
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
    await setDoc(userRef, { points: newPoints, lastCheckIn: today }, { merge: true });
    setPoints(newPoints);
    setLastCheckIn(today);
    alert("🔥 Bứt phá giới hạn! Điểm danh thành công +500 PTS Ki Aura!");
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
              Thách đấu võ đạo trí tuệ, bứt phá giới hạn Ki & chinh phục đỉnh cao Võ Hội Vũ Trụ!
            </p>
          </div>
        </section>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
          {/* PHỤ LỤC 1: ĐẶC QUYỀN SỨC MẠNH & JACKPOT */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
              <h2 className="text-xl font-black text-amber-400 tracking-wider uppercase">
                🔥 Đặc Quyền & Vòng Quay Ki
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-6 hover:border-amber-400/60 transition shadow-lg relative overflow-hidden group">
                <div className="absolute -right-6 -bottom-6 text-7xl opacity-10 group-hover:opacity-20 transition">🎡</div>
                <h3 className="text-xl font-bold text-amber-300">🎡 Vòng Quay Ngọc Rồng</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Quay ngẫu nhiên thu thập viên Ngọc Rồng và nhận thưởng điểm Ki mỗi ngày.
                </p>
                <div className="mt-4 text-xs font-bold text-amber-400/80 bg-amber-500/10 inline-block px-3 py-1 rounded-lg border border-amber-500/20">
                  Đang chuẩn bị mở cửa trận pháp...
                </div>
              </div>

              {/* JACKPOT RỒNG THẦN */}
              <Link
                href="/jackpot"
                className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-6 hover:border-amber-400 transition-all block group shadow-lg hover:-translate-y-1 relative overflow-hidden"
              >
                <div className="absolute -right-6 -bottom-6 text-7xl opacity-10 group-hover:opacity-20 transition">🎰</div>
                <h3 className="text-xl font-bold text-amber-400 group-hover:text-amber-300 transition">
                  🎰 Jackpot Rồng Thần
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                  Thử vận may quay hũ 4 hàng 6 cột tích tụ Ki nổ hũ Grand cực khủng!
                </p>
                <div className="mt-4 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black py-2 px-4 rounded-xl text-center text-sm shadow-md">
                  Vào Nổ Hũ ngay 🔮
                </div>
              </Link>
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

          {/* PHỤ LỤC 3: GAME ĐỐI KHÁNG & VÕ ĐẠO */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-l-4 border-rose-500 pl-3">
              <h2 className="text-xl font-black text-rose-500 tracking-wider uppercase">
                ⚔️ Game Đối Kháng & Võ Đạo
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 opacity-60 relative flex flex-col justify-between">
                <div>
                  <div className="text-4xl mb-2">⚡</div>
                  <h3 className="font-bold text-xl text-slate-300">Đại Hội Võ Thuật Saiyan</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Trận chiến solo tung chưởng Kamehameha đối kháng cực đỉnh đang được rèn giũa!
                  </p>
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

              {/* Bắn Cá Ki-Blast (Đã mở khóa đường dẫn /banca) */}
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