"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface ChatMessage {
  id: string;
  uid: string;
  name: string;
  text: string;
  createdAt?: any;
}

interface LeaderboardUser {
  id: string;
  full_name: string;
  balance: number;
}

const AURA_QUOTES = [
  "🔥 'Không phải là hoàn hảo, nhưng ta sẽ vượt qua giới hạn của chính mình!' - Son Goku",
  "⚡ 'Sức mạnh đến từ nhu cầu, không phải từ mong muốn.' - Vegeta",
  "🐉 'Khi bạn từ bỏ hy vọng, đó là lúc cuộc chơi thực sự kết thúc.' - Master Roshi",
  "💥 'Ta mang trong mình dòng máu kiêu hãnh của chiến binh Saiyan!' - Vegeta",
  "🌟 'Hãy dồn toàn bộ Ki vào cú đánh quyết định!' - Gogeta"
];

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [points, setPoints] = useState<number>(0);
  const [luckySpins, setLuckySpins] = useState<number>(0);
  const [lastCheckIn, setLastCheckIn] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Auth States
  const [isSignUp, setIsSignUp] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Chat States
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

  // Random Aura Quote
  const [dailyQuote, setDailyQuote] = useState("");

  const getTodayString = () => new Date().toISOString().split("T")[0];

  useEffect(() => {
    setDailyQuote(AURA_QUOTES[Math.floor(Math.random() * AURA_QUOTES.length)]);
  }, []);

  // LƯU TRỮ & LẮNG NGHE PHIÊN ĐĂNG NHẬP (LƯU ĐĂNG NHẬP TỰ ĐỘNG)
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

        const displayName = currentUser.user_metadata?.username || "Chiến Binh Saiyan";

        if (!profile) {
          const initialData = {
            id: currentUser.id,
            email: currentUser.email || "",
            full_name: displayName,
            avatar_url: "",
            balance: 5000,
            lucky_spins: 0,
            last_check_in: "",
          };
          await supabase.from("profiles").insert([initialData]);
          setPoints(1000);
          setLuckySpins(3);
          setLastCheckIn("");
        } else {
          setPoints(profile.balance ?? 1000);
          setLuckySpins(profile.lucky_spins ?? 3);
          setLastCheckIn(profile.last_check_in ?? "");
        }
      } catch (err) {
        console.error("Lỗi profile:", err);
      } finally {
        setLoading(false);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUserProfile(session?.user || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUserProfile(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // LẤY BẢNG XẾP HẠNG TOP 5 VŨ TRỤ
  useEffect(() => {
    async function fetchLeaderboard() {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, balance")
        .order("balance", { ascending: false })
        .limit(5);
      if (data) {
        setLeaderboard(data);
      }
    }
    fetchLeaderboard();

    const channel = supabase
      .channel("public:profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // REALTIME CHAT CHUNG
  useEffect(() => {
    if (!user) return;

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
  }, [user]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = usernameInput.trim().toLowerCase();
    if (!cleanUsername || !passwordInput) {
      alert("Vui lòng điền đầy đủ Tên đăng nhập và Mật khẩu!");
      return;
    }

    const internalEmail = `${cleanUsername}@gamecenter.com`;
    setAuthLoading(true);

    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        email: internalEmail,
        password: passwordInput,
        options: {
          data: {
            username: cleanUsername,
            full_name: cleanUsername,
          },
        },
      });

      if (signUpError) {
        setAuthLoading(false);
        alert("Lỗi đăng ký: " + signUpError.message);
        return;
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: passwordInput,
      });

      setAuthLoading(false);

      if (signInError) {
        alert("Tạo tài khoản thành công! Vui lòng đăng nhập lại.");
        setIsSignUp(false);
      } else if (signInData.session?.user) {
        setUser(signInData.session.user);
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: passwordInput,
      });

      setAuthLoading(false);

      if (error) {
        alert("Sai tên đăng nhập hoặc mật khẩu!");
      } else if (data.session?.user) {
        setUser(data.session.user);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
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
      alert("🔥 Bứt phá giới hạn! +500 PTS Ki Aura & +1 Lượt Quay!");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    const textToSend = newMessage.trim();
    setNewMessage("");

    const currentName = user.user_metadata?.username || user.user_metadata?.full_name || "Chiến Binh";

    try {
      await supabase.from("global_chat").insert([
        {
          uid: user.id,
          name: currentName,
          text: textToSend,
        },
      ]);
    } catch (err) {
      console.error("Lỗi chat:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-amber-400 font-black tracking-widest animate-pulse px-4 text-center">
        <span className="text-6xl mb-4 animate-bounce">🐲</span>
        ĐANG KẾT NỐI LONG MẠCH DRAGON ARCADE...
      </div>
    );
  }

  // MÀN HÌNH ĐĂNG NHẬP / ĐĂNG KÝ
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden select-none"
        style={{ backgroundImage: "url('https://images3.alphacoders.com/812/thumb-1920-812808.png')", backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-0"></div>

        <div className="relative z-10 w-full max-w-md bg-slate-900/90 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.3)] backdrop-blur-xl space-y-6">
          <div className="text-center space-y-2">
            <span className="text-5xl inline-block animate-bounce">🐲</span>
            <h1 className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 drop-shadow">
              DRAGON ARCADE
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm font-medium">
              {isSignUp ? "✨ Khởi tạo tài khoản nhận ngay 1000 PTS & 3 Lượt Quay" : "⚡ Đăng nhập bước vào không gian võ đạo"}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-amber-400 ml-1">Tên Đăng Nhập</label>
              <input
                type="text"
                placeholder="Ví dụ: kennylor298"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-sm text-white px-4 py-3 rounded-xl focus:outline-none focus:border-amber-500 transition lowercase"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-amber-400 ml-1">Mật Khẩu</label>
              <input
                type="password"
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-sm text-white px-4 py-3 rounded-xl focus:outline-none focus:border-amber-500 transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-slate-950 font-black text-sm py-3.5 rounded-xl cursor-pointer hover:brightness-110 transition active:scale-95 shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {authLoading ? "Đang Vận Ki..." : isSignUp ? "ĐĂNG KÝ NGAY 🚀" : "VÀO SẢNH GAME ⚡"}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer transition"
            >
              {isSignUp ? "Đã có tài khoản? Đăng nhập ➔" : "Chưa có tài khoản? Đăng ký mới ➔"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MÀN HÌNH CHÍNH (SẢNH GAME SAU KHI ĐĂNG NHẬP)
  const isCheckedInToday = lastCheckIn === getTodayString();
  const displayName = user.user_metadata?.username || user.user_metadata?.full_name || "Chiến Binh";

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans select-none relative pb-20 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-amber-500/40 px-3 py-2.5 shadow-[0_4px_20px_rgba(245,158,11,0.15)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="w-full sm:w-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl animate-bounce">🐲</span>
              <span className="font-black text-xl sm:text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500">
                DRAGON ARCADE
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="sm:hidden text-xs text-slate-400 hover:text-rose-400 font-bold px-2 py-1 bg-slate-800/80 rounded-lg border border-slate-700 active:scale-95 transition"
            >
              Thoát 🚪
            </button>
          </div>

          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-1.5 sm:gap-3">
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
          </div>
        </div>
      </header>

      {/* Banner Dragon Ball & Aura Quote */}
      <section
        className="relative flex items-center justify-center min-h-[260px] sm:min-h-[320px] bg-cover bg-center text-center p-4 border-b border-amber-500/30 overflow-hidden"
        style={{
          backgroundImage: "url('https://images3.alphacoders.com/812/thumb-1920-812808.png')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/85 to-slate-950"></div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-block px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-[11px] font-bold text-amber-300 uppercase tracking-widest backdrop-blur-sm">
            ✨ Xin chào chiến binh: <span className="text-white">{displayName}</span>
          </div>
          <h1 className="text-3xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 drop-shadow-lg tracking-wide">
            DRAGON GAMING ARENA
          </h1>
          <p className="text-amber-200/90 text-xs sm:text-sm italic font-medium max-w-xl mx-auto px-2 bg-slate-900/40 p-2 rounded-xl border border-amber-500/20">
            {dailyQuote}
          </p>
        </div>
      </section>

      {/* Nội Dung Sảnh Game & Bảng Xếp Hạng */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trò Chơi Nổi Bật */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
            <h2 className="text-lg sm:text-xl font-black text-amber-400 tracking-wider uppercase">
              🔥 Trò Chơi Nổi Bật
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>

        {/* Bảng Xếp Hạng Top 5 Vũ Trụ */}
        <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-4 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-l-4 border-orange-500 pl-3">
            <h2 className="text-base sm:text-lg font-black text-orange-400 tracking-wider uppercase">
              🏆 Top 5 Võ Đạo Vũ Trụ
            </h2>
          </div>
          <div className="space-y-2.5">
            {leaderboard.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-6">Đang cập nhật bảng xếp hạng...</div>
            ) : (
              leaderboard.map((item, index) => {
                const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
                const isMe = item.id === user?.id;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border ${
                      isMe
                        ? "bg-amber-500/15 border-amber-500/60 font-bold"
                        : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{medals[index]}</span>
                      <span className="text-xs sm:text-sm text-slate-200 truncate max-w-[120px] sm:max-w-[140px]">
                        {item.full_name} {isMe && "(Tôi)"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-amber-400 font-black">
                      <span>⚡</span>
                      <span>{item.balance?.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* CHAT CHUNG REALTIME */}
      <div className="fixed bottom-3 right-3 z-50">
        {!chatOpen ? (
          <button
            onClick={() => setChatOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black p-3.5 rounded-full shadow-2xl flex items-center gap-2 cursor-pointer active:scale-95 border-2 border-amber-300 hover:scale-105 transition"
          >
            <span className="text-xl">💬</span>
            <span className="text-xs tracking-wider hidden sm:inline">CHAT VŨ TRỤ</span>
          </button>
        ) : (
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl shadow-2xl w-[92vw] sm:w-[380px] h-[400px] sm:h-[450px] flex flex-col overflow-hidden backdrop-blur-xl">
            <div className="bg-slate-800/95 border-b border-amber-500/30 p-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span>💬</span>
                <span className="font-black text-xs sm:text-sm text-amber-400 tracking-wider">
                  CHAT CHUNG VŨ TRỤ (REALTIME)
                </span>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-xs px-2 py-1 rounded-lg cursor-pointer"
              >
                ✖
              </button>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
              {messages.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-12">
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
                      <span className="text-[10px] text-amber-400/80 mb-0.5 px-1 font-bold">
                        {msg.name}
                      </span>
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs break-words font-medium shadow-sm ${
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
                placeholder="Nhập thông điệp vũ trụ..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 text-xs text-white px-3 py-2.5 rounded-xl focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl cursor-pointer active:scale-95 shadow"
              >
                Gửi
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}