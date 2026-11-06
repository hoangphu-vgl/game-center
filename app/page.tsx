"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";

interface ChatMessage {
  id: string;
  uid: string;
  name: string;
  avatar_url?: string;
  text: string;
  created_at?: string;
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [points, setPoints] = useState<number>(1000);
  const [luckySpins, setLuckySpins] = useState<number>(3);
  const [lastCheckIn, setLastCheckIn] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const getTodayString = () => new Date().toISOString().split("T")[0];

  useEffect(() => {
    async function initUserSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
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
        }
      } catch (err) {
        console.error("Lỗi lấy thông tin session Supabase:", err);
      } finally {
        setLoading(false);
      }
    }

    initUserSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();
        if (profile) {
          setPoints(profile.balance ?? 1000);
          setLuckySpins(profile.lucky_spins ?? 3);
          setLastCheckIn(profile.last_check_in ?? "");
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function fetchInitialChat() {
      const { data } = await supabase
        .from("global_chat")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(50);
      if (data) setMessages(data);
    }
    fetchInitialChat();

    const channel = supabase
      .channel("public:global_chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "global_chat" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
          setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
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
      alert("🔥 Bứt phá giới hạn! Điểm danh thành công +500 PTS Ki Aura!");
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
          name: user.user_metadata?.full_name || "Chiến Binh",
          avatar_url: user.user_metadata?.avatar_url || "",
          text: textToSend,
        },
      ]);
    } catch (err) {
      console.error("Lỗi gửi tin nhắn Supabase:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-amber-400 font-black tracking-widest animate-pulse px-4 text-center">
        <span className="text-5xl mb-4">🔮</span>
        ĐANG KẾT NỐI VŨ TRỤ SUPABASE...
      </div>
    );
  }

  const isCheckedInToday = lastCheckIn === getTodayString();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-white font-sans select-none relative pb-20 overflow-x-hidden">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-amber-500/40 px-3 py-2.5 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
            <div className="w-full sm:w-auto flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl animate-bounce">🐲</span>
                <span className="font-black text-xl sm:text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500">
                  DRAGON ARCADE
                </span>
              </div>
              {user && (
                <button
                  onClick={handleLogout}
                  className="sm:hidden text-xs text-slate-400 hover:text-rose-400 font-bold px-2 py-1 bg-slate-800/80 rounded-lg border border-slate-700"
                >
                  Thoát 🚪
                </button>
              )}
            </div>

            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-1.5 sm:gap-3">
              {user ? (
                <>
                  <div className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-slate-800/90 border border-amber-500/50 px-2 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm">
                    <span>⚡</span>
                    <span className="font-black text-amber-400 truncate">{points.toLocaleString()}</span>
                  </div>

                  <button
                    onClick={handleCheckIn}
                    disabled={isCheckedInToday}
                    className={`flex-1 sm:flex-none text-xs sm:text-sm font-black py-1.5 px-3 sm:px-4 rounded-xl transition-all ${
                      isCheckedInToday
                        ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                        : "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 cursor-pointer"
                    }`}
                  >
                    {isCheckedInToday ? "✅ Đã Tụ Ki" : "🔥 Tụ Ki"}
                  </button>

                  <button
                    onClick={handleLogout}
                    className="hidden sm:block text-xs text-slate-400 hover:text-rose-400 font-semibold cursor-pointer ml-1"
                  >
                    Thoát
                  </button>
                </>
              ) : (
                <button
                  onClick={handleGoogleLogin}
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs sm:text-sm py-2 px-4 rounded-xl cursor-pointer"
                >
                  Đăng Nhập Google
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Banner */}
        <section
          className="relative flex items-center justify-center min-h-[240px] sm:min-h-[300px] bg-cover bg-center text-center p-4 border-b border-amber-500/30 overflow-hidden"
          style={{
            backgroundImage: "url('https://images3.alphacoders.com/812/thumb-1920-812808.png')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/85 to-slate-950"></div>
          <div className="relative z-10 max-w-3xl space-y-2 sm:space-y-3">
            <div className="inline-block px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-[11px] font-bold text-amber-300 uppercase tracking-widest">
              ✨ Khai Phá Sức Mạnh Ultra Instinct
            </div>
            <h1 className="text-3xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-red-500">
              DRAGON GAMING ARENA
            </h1>
          </div>
        </section>

        {/* Danh Sách Game Cốt Lõi (Chỉ giữ lại Jackpot) */}
        <main className="max-w-7xl mx-auto px-3 sm:px-4 py-6 space-y-8">
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
              <h2 className="text-lg sm:text-xl font-black text-amber-400 tracking-wider uppercase">
                🔥 Trò Chơi Nổi Bật
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

        {/* CHAT BOX NỔI TOÀN CỤC */}
        <div className="fixed bottom-4 right-4 z-[9999]">
          {!chatOpen ? (
            <button
              onClick={() => setChatOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black px-4 py-3 rounded-full shadow-xl flex items-center gap-2 cursor-pointer active:scale-95 border-2 border-amber-200 animate-bounce"
            >
              <span className="text-xl">💬</span>
              <span className="text-xs tracking-wider">CHAT SAIYAN ({messages.length})</span>
            </button>
          ) : (
            <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl w-[92vw] sm:w-[380px] h-[400px] sm:h-[450px] flex flex-col overflow-hidden backdrop-blur-xl">
              <div className="bg-slate-800/95 border-b border-amber-500/30 p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span>💬</span>
                  <span className="font-black text-xs sm:text-sm text-amber-400 tracking-wider">
                    CHAT CHUNG VŨ TRỤ (REALTIME)
                  </span>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="text-slate-400 hover:text-white font-bold text-sm px-2 py-1 rounded-lg cursor-pointer bg-slate-800"
                >
                  ✖
                </button>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-950/80">
                {messages.length === 0 ? (
                  <div className="text-center text-xs text-slate-500 py-16">
                    Chưa có tin nhắn nào. Hãy phát tín hiệu Ki đầu tiên!
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
                          className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs break-words font-medium shadow-md ${
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

              <form onSubmit={handleSendMessage} className="p-2.5 border-t border-slate-800 bg-slate-950 flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập tin nhắn vũ trụ..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 text-xs text-white px-3 py-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl cursor-pointer active:scale-95"
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