"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";

interface ChatMessage {
  id: string;
  uid: string;
  name: string;
  photoURL?: string;
  text: string;
  createdAt?: any;
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [points, setPoints] = useState<number>(0);
  const [luckySpins, setLuckySpins] = useState<number>(0);
  const [lastCheckIn, setLastCheckIn] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const getTodayString = () => new Date().toISOString().split("T")[0];

  // KHỞI TẠO & LẮNG NGHE USER TRÊN SUPABASE CHUẨN XÁC 100%
  useEffect(() => {
    async function loadUserProfile(currentUser: any) {
      if (!currentUser) {
        setUser(null);
        setPoints(0);
        setLuckySpins(0);
        setLastCheckIn("");
        setLoading(false);
        return;
      }

      setUser(currentUser);

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();

        if (!profile) {
          const initialData = {
            id: currentUser.id,
            email: currentUser.email || "",
            full_name: currentUser.user_metadata?.full_name || "Chiến Binh Saiyan",
            avatar_url: currentUser.user_metadata?.avatar_url || "",
            balance: 1000,
            lucky_spins: 3,
            last_check_in: "",
          };
          await supabase.from("profiles").insert([initialData]);
          setPoints(1000);
          setLuckySpins(3);
        } else {
          setPoints(profile.balance ?? 1000);
          setLuckySpins(profile.lucky_spins ?? 3);
          setLastCheckIn(profile.last_check_in ?? "");
        }
      } catch (err) {
        console.error("Lỗi lấy thông tin profile:", err);
      } finally {
        setLoading(false);
      }
    }

    // 1. Kiểm tra session ban đầu
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUserProfile(session?.user || null);
    });

    // 2. Lắng nghe sự kiện Auth (Bắt token từ Google OAuth trả về ngay lập tức)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        loadUserProfile(session.user);
        // Tự động dọn dẹp hash token trên URL cho sạch đẹp
        if (window.location.hash.includes("access_token")) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // LẮNG NGHE CHAT CHUNG REALTIME
  useEffect(() => {
    async function fetchInitialChat() {
      const { data } = await supabase
        .from("global_chat")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(50);
      if (data) {
        const formattedMsgs = data.map((item: any) => ({
          id: item.id,
          uid: item.uid,
          name: item.name,
          photoURL: item.avatar_url,
          text: item.text,
          createdAt: item.created_at,
        }));
        setMessages(formattedMsgs);
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    }
    fetchInitialChat();

    const channel = supabase
      .channel("public:global_chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "global_chat" },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages((prev) => [
            ...prev,
            {
              id: newMsg.id,
              uid: newMsg.uid,
              name: newMsg.name,
              photoURL: newMsg.avatar_url,
              text: newMsg.text,
              createdAt: newMsg.created_at,
            },
          ]);
          setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) {
      console.error("Lỗi đăng nhập Google:", error.message);
      alert("Lỗi đăng nhập: " + error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.reload();
  };

  const handleCheckIn = async () => {
    if (!user) return;
    const today = getTodayString();
    if (lastCheckIn === today) {
      alert("Hôm nay chiến binh đã tụ Ki nhận thưởng rồi!");
      return;
    }
    const newPoints = points + 500;
    const newSpins = luckySpins + 1;

    const { error } = await supabase
      .from("profiles")
      .update({ balance: newPoints, lucky_spins: newSpins, last_check_in: today })
      .eq("id", user.id);

    if (!error) {
      setPoints(newPoints);
      setLuckySpins(newSpins);
      setLastCheckIn(today);
      alert("🔥 Bứt phá giới hạn! Điểm danh thành công +500 PTS Ki Aura & +1 Lượt Quay Miễn Phí!");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    const textToSend = newMessage.trim();
    setNewMessage("");

    try {
      await supabase.from("global_chat").insert([
        {
          uid: user.id,
          name: currentUserDisplayName() || "Chiến Binh",
          avatar_url: user.user_metadata?.avatar_url || "",
          text: textToSend,
        },
      ]);
    } catch (err) {
      console.error("Lỗi gửi tin nhắn:", err);
    }
  };

  function currentUserDisplayName() {
    return user?.user_metadata?.full_name || user?.email || "Chiến Binh";
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-amber-400 font-black tracking-widest animate-pulse px-4 text-center">
        <span className="text-5xl mb-4">🔮</span>
        ĐANG TRIỆU HỒI RỒNG THẦN DRAGON ARCADE...
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
            
            <div className="w-full sm:w-auto flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl animate-bounce">🐲</span>
                <span className="font-black text-xl sm:text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500">
                  DRAGON ARCADE
                </span>
              </div>

              {user ? (
                <button
                  onClick={handleLogout}
                  className="sm:hidden text-xs text-slate-400 hover:text-rose-400 font-bold px-2 py-1 bg-slate-800/80 rounded-lg border border-slate-700 active:scale-95 transition"
                >
                  Thoát 🚪
                </button>
              ) : null}
            </div>

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
                    onClick={handleLogout}
                    className="hidden sm:block text-xs text-slate-400 hover:text-rose-400 font-semibold transition cursor-pointer ml-1"
                  >
                    Thoát
                  </button>
                </>
              ) : (
                <button
                  onClick={handleGoogleLogin}
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
                🔥 Trò Chơi Nổi Bật
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href="/jackpot"
                className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-5 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden"
              >
                <div className="absolute -right-4 -bottom-4 text-6xl opacity-10">🎰</div>
                <h3 className="text-lg font-bold text-amber-400">🎰 Jackpot Rồng Thần</h3>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">Quay hũ tích tụ Ki nổ hũ Grand, Major, Minor cực khủng!</p>
                <div className="mt-3 bg-gradient-to-r from-amber-500 to-red-500 text-slate-950 font-black py-2.5 px-3 rounded-xl text-center text-xs shadow-md">
                  Vào Nổ Hũ 🔮
                </div>
              </Link>
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
                    const isMe = msg.uid === user?.id;
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