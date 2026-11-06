"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface ChatMessage {
  id: number;
  user_email: string;
  message: string;
  created_at?: any;
}

interface LeaderboardUser {
  id: string;
  full_name: string;
  balance: number;
}

const DEFAULT_AVATARS = [
  { name: "Son Goku Super Saiyan", url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=80" },
  { name: "Vegeta Prince", url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150&auto=format&fit=crop&q=80" },
  { name: "Super Saiyan God", url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&auto=format&fit=crop&q=80" },
  { name: "Dragon Shenron", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80" },
  { name: "Saiyan Aura", url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150&auto=format&fit=crop&q=80" },
];

const AURA_QUOTES = [
  "🔥 'Không phải là hoàn hảo, nhưng ta sẽ vượt qua giới hạn của chính mình!' - Son Goku",
  "⚡ 'Sức mạnh đến từ nhu cầu, không phải từ mong muốn.' - Vegeta",
  "🐉 'Khi bạn từ bỏ hy vọng, đó là lúc cuộc chơi thực sự kết thúc.' - Master Roshi",
  "💥 'Ta mang trong mình dòng máu kiêu hãnh của chiến binh Saiyan!' - Vegeta",
  "🌟 'Hãy dồn toàn bộ Ki vào cú đánh quyết định!' - Gogeta",
  "🌀 'Nỗi sợ hãi không có gì đáng xấu hổ, nó giúp ngươi biết được điểm yếu của mình và trở nên mạnh mẽ hơn.' - Goku",
  "🥋 'Võ thuật không phải để đánh bại kẻ thù, mà là để hoàn thiện bản thân.' - Thần Rùa (Master Roshi)",
  "🔥 'Hàng tỷ thiên hà trong vũ trụ, và ta chính là kẻ mạnh nhất!' - Broly",
  "⚡ 'Một chiến binh thực sự không bao giờ cúi đầu trước số phận, kể cả khi đối mặt với thần linh!' - Vegeta",
  "🐉 'Bản Năng Vô Thượng (Ultra Instinct)... đó là trạng thái khi cơ thể tự động phản ứng mà không cần suy nghĩ!' - Whis",
  "💥 'Hãy nhớ lấy điều này: Ta không chiến đấu vì công lý, ta chiến đấu vì những kẻ ta yêu thương!' - Son Goku",
  "🌟 'Tuyệt chiêu Kamehameha không chỉ là năng lượng, nó là ý chí được cô đọng lại!' - Son Gohan",
  "🌀 'Giới hạn chỉ tồn tại trong tâm trí của những kẻ chịu bỏ cuộc.' - Piccolo",
  "🔥 'Sự tức giận chính là cội nguồn của sức mạnh tiềm ẩn trong người Saiyan chúng ta!' - Vegeta",
  "⚡ 'Tương lai là thứ do chính đôi tay này tự viết nên, không một vị thần nào có quyền phán xét!' - Trunks Tương Lai"
];

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [points, setPoints] = useState<number>(5000);
  const [luckySpins, setLuckySpins] = useState<number>(3);
  const [lastCheckIn, setLastCheckIn] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Auth States
  const [isSignUp, setIsSignUp] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  // Profile & Modal States
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Chat States
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [dailyQuote, setDailyQuote] = useState("");

  const getTodayString = () => new Date().toISOString().split("T")[0];

  useEffect(() => {
    setDailyQuote(AURA_QUOTES[Math.floor(Math.random() * AURA_QUOTES.length)]);
  }, []);

  // LƯU TRỮ & LẮNG NGHE PHIÊN ĐĂNG NHẬP
  useEffect(() => {
    async function loadUserProfile(currentUser: any) {
      if (!currentUser) {
        setUser(null);
        setPoints(5000);
        setLuckySpins(3);
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

        const defaultName = currentUser.user_metadata?.username || "Chiến Binh Saiyan";
        const defaultAvatar = currentUser.user_metadata?.avatar_url || DEFAULT_AVATARS[0].url;

        if (!profile) {
          const initialData = {
            id: currentUser.id,
            email: currentUser.email || "",
            full_name: defaultName,
            avatar_url: defaultAvatar,
            balance: 5000,
            lucky_spins: 3,
            last_check_in: "",
          };
          await supabase.from("profiles").insert([initialData]);
          setPoints(5000);
          setLuckySpins(3);
          setLastCheckIn("");
          setDisplayName(defaultName);
          setAvatarUrl(defaultAvatar);
        } else {
          setPoints(profile.balance ?? 5000);
          setLuckySpins(profile.lucky_spins ?? 3);
          setLastCheckIn(profile.last_check_in ?? "");
          setDisplayName(profile.full_name || defaultName);
          setAvatarUrl(profile.avatar_url || defaultAvatar);
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

  // LẤY BẢNG XẾP HẠNG TOP 5
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

  // LẮNG NGHE CHAT CHUNG REALTIME KHỚP VỚI BẢNG CỦA NÍ
  useEffect(() => {
    if (!user) return;

    async function fetchInitialChat() {
      const { data, error } = await supabase
        .from("global_chat")
        .select("*")
        .order("id", { ascending: true })
        .limit(50);
      
      if (!error && data) {
        setMessages(data);
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    }
    fetchInitialChat();

    const channel = supabase
      .channel("global_chat_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "global_chat" },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
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
            avatar_url: DEFAULT_AVATARS[0].url,
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
        alert("Tạo tài khoản thành công! Vui lòng đăng nhập.");
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUpdatingProfile(true);

    const newCleanName = displayName.trim() || "Chiến Binh";

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: newCleanName, avatar_url: avatarUrl })
        .eq("id", user.id);

      if (profileError) throw profileError;

      await supabase.auth.updateUser({
        data: { full_name: newCleanName, avatar_url: avatarUrl }
      });

      alert("✨ Cập nhật thông tin chiến binh thành công!");
      setProfileModalOpen(false);
    } catch (err: any) {
      alert("Lỗi cập nhật: " + err.message);
    } finally {
      setUpdatingProfile(false);
    }
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

    // Dùng đúng các cột sẵn có trên Supabase của ní: user_email và message
    const userIdentifier = displayName || user.email || "Chiến Binh";

    try {
      const { error } = await supabase.from("global_chat").insert([
        {
          user_email: userIdentifier,
          message: textToSend,
        },
      ]);
      if (error) {
        console.error("Lỗi gửi tin nhắn:", error.message);
        alert("Không thể gửi tin nhắn: " + error.message);
      }
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
              {isSignUp ? "✨ Khởi tạo tài khoản nhận ngay 5000 PTS & 3 Lượt Quay" : "⚡ Đăng nhập bước vào không gian võ đạo"}
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

            <div className="flex items-center justify-between text-xs text-slate-300 px-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <span>Ghi nhớ phiên đăng nhập</span>
              </label>
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

  const isCheckedInToday = lastCheckIn === getTodayString();

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

            <div className="flex items-center gap-2 sm:hidden">
              <button
                onClick={() => setProfileModalOpen(true)}
                className="w-9 h-9 rounded-full overflow-hidden border-2 border-amber-400 active:scale-95 transition"
              >
                <img src={avatarUrl || DEFAULT_AVATARS[0].url} alt="Avatar" className="w-full h-full object-cover" />
              </button>
              <button
                onClick={handleLogout}
                className="text-xs text-slate-400 hover:text-rose-400 font-bold px-2 py-1 bg-slate-800/80 rounded-lg border border-slate-700"
              >
                Thoát 🚪
              </button>
            </div>
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

            <div className="hidden sm:flex items-center gap-3 ml-2">
              <button
                onClick={() => setProfileModalOpen(true)}
                className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-800 border border-amber-500/40 p-1.5 pr-3 rounded-full cursor-pointer transition active:scale-95 shadow-md group"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-400">
                  <img src={avatarUrl || DEFAULT_AVATARS[0].url} alt="Avatar" className="w-full h-full object-cover group-hover:scale-110 transition" />
                </div>
                <span className="text-xs font-bold text-amber-300 truncate max-w-[100px]">{displayName}</span>
              </button>

              <button
                onClick={handleLogout}
                className="text-xs text-slate-400 hover:text-rose-400 font-semibold transition cursor-pointer"
              >
                Thoát
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Banner & Quote */}
      <section
        className="relative flex items-center justify-center min-h-[260px] sm:min-h-[320px] bg-cover bg-center text-center p-4 border-b border-amber-500/30 overflow-hidden"
        style={{
          backgroundImage: "url('https://images3.alphacoders.com/812/thumb-1920-812808.png')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/85 to-slate-950"></div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-block px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-[11px] font-bold text-amber-300 uppercase tracking-widest backdrop-blur-sm">
            ✨ Chiến Binh: <span className="text-white">{displayName}</span>
          </div>
          <h1 className="text-3xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 drop-shadow-lg tracking-wide">
            DRAGON GAMING ARENA
          </h1>
          <p className="text-amber-200/90 text-xs sm:text-sm italic font-medium max-w-xl mx-auto px-2 bg-slate-900/40 p-2 rounded-xl border border-amber-500/20">
            {dailyQuote}
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        {/* Bảng Xếp Hạng Top 5 */}
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
                      isMe ? "bg-amber-500/15 border-amber-500/60 font-bold" : "bg-slate-950/60 border-slate-800"
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

      {/* POPUP HỒ SƠ */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-amber-500/60 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h3 className="text-base sm:text-lg font-black text-amber-400">HỒ SƠ CHIẾN BINH</h3>
              </div>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm px-2 py-1 cursor-pointer"
              >
                ✖
              </button>
            </div>

            <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-400 shadow-md shrink-0">
                <img src={avatarUrl || DEFAULT_AVATARS[0].url} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-white truncate">{displayName}</h4>
                <div className="flex items-center gap-3 text-xs text-amber-400 font-bold">
                  <span>⚡ {points.toLocaleString()} PTS</span>
                  <span>🎟️ {luckySpins} Lượt</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-amber-400 ml-1">Tên Hiển Thị (Display Name)</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-sm text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-amber-400 ml-1">Chọn 5 Avatar Dragon Ball Mặc Định</label>
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {DEFAULT_AVATARS.map((av, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setAvatarUrl(av.url)}
                      className={`w-12 h-12 rounded-xl overflow-hidden border-2 cursor-pointer transition ${
                        avatarUrl === av.url ? "border-amber-400 scale-105 shadow-lg shadow-amber-500/30" : "border-slate-700 opacity-60 hover:opacity-100"
                      }`}
                      title={av.name}
                    >
                      <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-amber-400 ml-1">Hoặc dán Link Ảnh (URL) Tùy Ý</label>
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-white px-3 py-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={updatingProfile}
                className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs py-3 rounded-xl cursor-pointer hover:brightness-110 transition active:scale-95 shadow-md shadow-amber-500/20 disabled:opacity-50"
              >
                {updatingProfile ? "Đang lưu..." : "LƯU THAY ĐỔI 💾"}
              </button>
            </form>
          </div>
        </div>
      )}

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
                  const isMe = msg.user_email === displayName || msg.user_email === user?.email;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <span className="text-[10px] text-amber-400/80 mb-0.5 px-1 font-bold">
                        {msg.user_email}
                      </span>
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs break-words font-medium shadow-sm ${
                          isMe
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold rounded-tr-none"
                            : "bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none"
                        }`}
                      >
                        {msg.message}
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