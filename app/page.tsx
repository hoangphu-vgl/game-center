"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface LeaderboardUser {
  id: string;
  full_name: string;
  balance: number;
  avatar_url: string;
}

const DEFAULT_AVATARS = Array.from({ length: 30 }, (_, index) => ({
  name: `Chiến Binh ${index + 1}`,
  url: `/assets/avatar/xtra${index + 1}.ico`,
}));

const AURA_QUOTES = [
  "🔥 'Không phải là hoàn hảo, nhưng ta sẽ vượt qua giới hạn tại Đại Hội Võ Thuật!' - Son Goku",
  "⚡ 'Sức mạnh 13 Ấn Ký đến từ ý chí kiên định, không phải từ mong muốn.' - Vegeta",
  "🐉 'Khi bạn từ bỏ hy vọng trên lôi đài, đó là lúc cuộc chơi thực sự kết thúc.' - Master Roshi",
  "💥 'Ta mang trong mình dòng máu kiêu hãnh của chiến binh Saiyan tham chiến!' - Vegeta",
  "🌟 'Hãy dồn toàn bộ Ki và 13 Ấn Ký vào cú đánh quyết định!' - Gogeta",
  "🌀 'Nỗi sợ hãi khi đối đầu không có gì đáng xấu hổ, nó giúp ngươi biết được điểm yếu của mình!' - Goku",
  "🥋 'Võ thuật lôi đài không phải để đánh bại kẻ thù, mà là để hoàn thiện bản thân.' - Thần Rùa",
  "🔥 'Hàng tỷ thiên hà trong vũ trụ, và ta chính là Bá Chủ Đại Hội Võ Thuật!' - Broly",
  "⚡ 'Một chiến binh thực sự không bao giờ cúi đầu trước lôi đài số phận!' - Vegeta",
  "🐉 'Bản Năng Vô Thượng... trạng thái khi 13 Ấn Ký tự động phản ứng!' - Whis",
];

const getSaiyanLevel = (power: number) => {
  if (power >= 1000000000000000) return { name: "⚡ Lv.10 - Thần Hủy Diệt", color: "text-purple-400 border-purple-500/50 bg-purple-950/40" };
  if (power >= 500000000000000) return { name: "🔥 Lv.9 - Bản Năng Hoàn Thiện", color: "text-rose-400 border-rose-500/50 bg-rose-950/40" };
  if (power >= 250000000000000) return { name: "⚪ Lv.8 - Bản Năng Vô Thượng", color: "text-cyan-300 border-cyan-500/50 bg-cyan-950/40" };
  if (power >= 10000000000000) return { name: "🔵 Lv.7 - Siêu Saiyan Blue", color: "text-blue-400 border-blue-500/50 bg-blue-950/40" };
  if (power >= 5000000000000) return { name: "🔴 Lv.6 - Siêu Saiyan God", color: "text-red-400 border-red-500/50 bg-red-950/40" };
  if (power >= 100000000000) return { name: "💥 Lv.5 - Siêu Saiyan 3", color: "text-amber-400 border-amber-500/50 bg-amber-950/40" };
  if (power >= 50000000000) return { name: "⚡ Lv.4 - Siêu Saiyan 2", color: "text-yellow-400 border-yellow-500/50 bg-yellow-950/40" };
  if (power >= 1000000000) return { name: "🟡 Lv.3 - Siêu Saiyan 1", color: "text-yellow-300 border-yellow-500/50 bg-yellow-950/30" };
  if (power >= 500000000) return { name: "🛡️ Lv.2 - Saiyan Hạ Đẳng", color: "text-orange-400 border-orange-500/40 bg-orange-950/30" };
  return { name: "🌍 Lv.1 - Người Trái Đất", color: "text-slate-300 border-slate-700 bg-slate-900/50" };
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [points, setPoints] = useState<number>(0);
  const [luckySpins, setLuckySpins] = useState<number>(3);
  const [lastCheckIn, setLastCheckIn] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [inventory, setInventory] = useState<{ [key: string]: number }>({});

  const [isSignUp, setIsSignUp] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const [dragonBallsCount, setDragonBallsCount] = useState<number>(0);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [dailyQuote, setDailyQuote] = useState("");

  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const getTodayString = () => new Date().toISOString().split("T")[0];

  const getTodayCheckInReward = () => {
    const dayOfWeek = new Date().getDay();
    const dayMap: { [key: number]: { dayName: string; ki: number } } = {
      1: { dayName: "Thứ 2", ki: 10000 },
      2: { dayName: "Thứ 3", ki: 20000 },
      3: { dayName: "Thứ 4", ki: 30000 },
      4: { dayName: "Thứ 5", ki: 40000 },
      5: { dayName: "Thứ 6", ki: 50000 },
      6: { dayName: "Thứ 7", ki: 60000 },
      0: { dayName: "Chủ Nhật", ki: 100000 },
    };
    return dayMap[dayOfWeek] || { dayName: "Hôm nay", ki: 10000 };
  };

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const currentDay = now.getDay();
      const daysUntilMonday = currentDay === 1 ? 7 : (8 - currentDay) % 7;
      
      const targetMonday = new Date(now);
      targetMonday.setDate(now.getDate() + daysUntilMonday);
      targetMonday.setHours(0, 0, 0, 0);

      const diff = targetMonday.getTime() - now.getTime();

      if (diff > 0) {
        const totalHours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft({ hours: totalHours, minutes, seconds });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setDailyQuote(AURA_QUOTES[Math.floor(Math.random() * AURA_QUOTES.length)]);
  }, []);

  useEffect(() => {
    async function loadUserProfile(currentUser: any) {
      if (!currentUser) {
        setUser(null);
        setPoints(0);
        setLuckySpins(3);
        setLastCheckIn("");
        setDragonBallsCount(0);
        setInventory({});
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

        const defaultName = currentUser.user_metadata?.username || currentUser.user_metadata?.full_name || "Chiến Binh Saiyan";
        const defaultAvatar = currentUser.user_metadata?.avatar_url || DEFAULT_AVATARS[0].url;

        if (!profile) {
          const initialData = {
            id: currentUser.id,
            email: currentUser.email || "",
            full_name: defaultName,
            avatar_url: defaultAvatar,
            balance: 0,
            lucky_spins: 3,
            last_check_in: "",
            inventory: {},
          };
          await supabase.from("profiles").insert([initialData]);
          setPoints(0);
          setLuckySpins(3);
          setLastCheckIn("");
          setInventory({});
          setDisplayName(defaultName);
          setAvatarUrl(defaultAvatar);
        } else {
          setPoints(profile.balance ?? 0);
          setLuckySpins(profile.lucky_spins ?? 3);
          setLastCheckIn(profile.last_check_in ?? "");
          setInventory(profile.inventory ?? {});
          
          const activeName = profile.full_name || defaultName;
          const activeAvatar = profile.avatar_url || defaultAvatar;
          
          setDisplayName(activeName);
          setAvatarUrl(activeAvatar);
        }

        const savedBalls = localStorage.getItem(`dragon_balls_${currentUser.id}`);
        setDragonBallsCount(savedBalls ? parseInt(savedBalls) : 0);

        const todayStr = getTodayString();
        const hideNoticeDate = localStorage.getItem(`hide_notice_${currentUser.id}`);
        if (hideNoticeDate !== todayStr) {
          setShowNoticeModal(true);
        }

      } catch (err) {
        console.error("Lỗi tải profile game:", err);
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

  const handleCloseNoticeForToday = () => {
    if (!user) return;
    const todayStr = getTodayString();
    localStorage.setItem(`hide_notice_${user.id}`, todayStr);
    setShowNoticeModal(false);
  };

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, balance, avatar_url")
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

  const handleExchangeBalls = (type: 'single' | 'all') => {
    if (!user) return;
    if (type === 'single') {
      if (dragonBallsCount < 1) {
        alert("🛡️ Bạn chưa có viên Ngọc Rồng nào để đổi!");
        return;
      }
      if (confirm("Xác nhận quy đổi 1 Viên Ngọc Rồng lấy 10.000 VNĐ tiền mặt?")) {
        const newCount = dragonBallsCount - 1;
        setDragonBallsCount(newCount);
        localStorage.setItem(`dragon_balls_${user.id}`, newCount.toString());
        alert("🎉 Quy đổi thành công! Nhận ngay 10.000 VNĐ (Liên hệ Admin để nhận thưởng nhé)!");
      }
    } else if (type === 'all') {
      if (dragonBallsCount < 7) {
        alert("🐉 Bạn cần sưu tập đủ đúng 7 Viên Ngọc Rồng để thực hiện Điều Ước Rồng Thần nhận 100k VNĐ!");
        return;
      }
      if (confirm("🌟 THỰC HIỆN ĐIỀU ƯỚC RỒNG THẦN! Dùng đủ 7 Viên Ngọc Rồng để nhận ngay 100.000 VNĐ?")) {
        const newCount = dragonBallsCount - 7;
        setDragonBallsCount(newCount);
        localStorage.setItem(`dragon_balls_${user.id}`, newCount.toString());
        alert("🐲 ĐIỀU ƯỚC ĐÃ THỰC HIỆN! Chúc mừng bạn húp trọn 100.000 VNĐ từ Rồng Thần (Chụp màn hình và báo Admin nhận thưởng ngay)!");
      }
    }
  };

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
        .update({ 
          full_name: newCleanName, 
          avatar_url: avatarUrl 
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      await supabase.auth.updateUser({
        data: { full_name: newCleanName, avatar_url: avatarUrl }
      });

      alert("✨ Cập nhật thông tin chiến binh thành công! Đã đồng bộ vào toàn bộ sòng game.");
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

    const reward = getTodayCheckInReward();
    const newPoints = points + reward.ki;
    const newSpins = luckySpins + 1;

    const { error } = await supabase
      .from("profiles")
      .update({ balance: newPoints, lucky_spins: newSpins, last_check_in: today })
      .eq("id", user.id);

    if (!error) {
      setPoints(newPoints);
      setLuckySpins(newSpins);
      setLastCheckIn(today);
      alert(`🔥 TỤ KI THÀNH CÔNG (${reward.dayName})!\n+${reward.ki.toLocaleString()} Ki & +1 Lượt Quay Free!`);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-amber-400 font-black tracking-widest animate-pulse px-4 text-center">
        <img src="/assets/home/shenron.png" alt="Shenron" className="w-20 h-20 object-contain mb-4 animate-bounce drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]" />
        ĐANG KẾT NỐI LONG MẠCH DRAGON ARCADE...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 fixed inset-0 overflow-hidden select-none"
        style={{ backgroundImage: "url('https://images3.alphacoders.com/812/thumb-1920-812808.png')", backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-0"></div>

        <div className="relative z-10 w-full max-w-md bg-slate-900/90 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.3)] backdrop-blur-xl space-y-4 sm:space-y-6 max-h-[95vh] overflow-y-auto">
          <div className="text-center space-y-1 sm:space-y-2">
            <div className="flex justify-center">
              <img src="/assets/home/shenron.png" alt="Dragon" className="w-12 h-12 sm:w-16 sm:h-16 object-contain animate-bounce drop-shadow" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 drop-shadow">
              DRAGON ARCADE
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm font-medium">
              {isSignUp ? "✨ Khởi tạo tài khoản tham gia đua top Sức Mạnh tuần" : "⚡ Đăng nhập bước vào không gian võ đạo"}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-amber-400 ml-1">Tên Đăng Nhập</label>
              <input
                type="text"
                placeholder="Ví dụ: kennylor298"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-sm text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 transition lowercase"
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
                className="w-full bg-slate-950 border border-slate-700 text-sm text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 transition"
                required
              />
            </div>

            <div className="flex items-center gap-2 mt-1 px-1">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs font-semibold text-slate-300 cursor-pointer">
                Lưu thông tin đăng nhập
              </label>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-slate-950 font-black text-xs sm:text-sm py-3 rounded-xl cursor-pointer hover:brightness-110 transition active:scale-95 shadow-lg shadow-amber-500/20 disabled:opacity-50"
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
  const currentLevel = getSaiyanLevel(points);
  const todayReward = getTodayCheckInReward();

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 text-white font-sans select-none flex flex-col justify-between" style={{ touchAction: 'manipulation' }}>
      
      <div className="bg-slate-900/95 border-b border-amber-500/30 px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto text-[11px] font-bold shrink-0 backdrop-blur-md z-30">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-amber-400">⚡ Chuyển Sảnh:</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/" className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-lg transition text-[11px]">
            🏠 Trang Chủ
          </Link>
          <Link href="/cauca" className="bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/50 px-3 py-1 rounded-lg transition text-[11px]">
            🎣 Cần Thủ Vũ Trụ
          </Link>
          <Link href="/baccarat" className="bg-indigo-950 hover:bg-indigo-900 text-cyan-300 border border-cyan-500/50 px-3 py-1 rounded-lg transition text-[11px]">
            🎲 Baccarat Thần Thánh
          </Link>
          <Link href="/tienlen" className="bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 px-3 py-1 rounded-lg transition text-[11px]">
            ⚔️ Võ Thuật 13 Ấn Ký
          </Link>
          <Link href="/poker" className="bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-500/50 px-3 py-1 rounded-lg transition text-[11px]">
            ♠️ Sòng Poker Whis
          </Link>
          <Link href="/jackpot" className="bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-500/50 px-3 py-1 rounded-lg transition text-[11px]">
            🔮 Jackpot Rồng Thần
          </Link>
          <Link href="/wheel" className="bg-orange-950 hover:bg-orange-900 text-orange-300 border border-orange-500/50 px-3 py-1 rounded-lg transition text-[11px]">
            🎟️ Vòng Quay
          </Link>
          <Link href="/gacha" className="bg-pink-950 hover:bg-pink-900 text-pink-300 border border-pink-500/50 px-3 py-1 rounded-lg transition text-[11px]">
            🎁 Gacha Thiên Sứ
          </Link>
        </div>
      </div>

      {showNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-4 sm:p-5 shadow-[0_0_50px_rgba(245,158,11,0.4)] space-y-3 relative max-h-[88vh] overflow-y-auto">
            
            <div className="text-center space-y-1 border-b border-slate-800 pb-2">
              <div className="flex justify-center">
                <img src="/assets/home/dragonball.png" alt="Dragon Ball" className="w-10 h-10 object-contain animate-spin-slow" />
              </div>
              <span className="text-[9px] bg-amber-500/20 text-amber-400 font-black px-2.5 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-widest">
                ⚡ Sắc Lệnh Từ Thần Hủy Diệt ⚡
              </span>
              <h2 className="text-base sm:text-lg font-black text-yellow-300 mt-1">
                LUẬT CHƠI VÀ SĂN NGỌC RỒNG VŨ TRỤ
              </h2>
            </div>

            <div className="bg-gradient-to-r from-red-950/60 via-amber-950/80 to-red-950/60 p-2.5 rounded-xl border border-red-500/50 text-center space-y-1 shadow-lg">
              <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">⏳ Thời Gian Đến Lúc Reset Tuần (00:00 Thứ 2)</span>
              <div className="flex justify-center gap-2 text-amber-400 font-mono font-black text-base">
                <span className="bg-black/70 px-2 py-0.5 rounded border border-amber-500/40">{timeLeft.hours.toString().padStart(2, '0')}h</span> :
                <span className="bg-black/70 px-2 py-0.5 rounded border border-amber-500/40">{timeLeft.minutes.toString().padStart(2, '0')}m</span> :
                <span className="bg-black/70 px-2 py-0.5 rounded border border-amber-500/40">{timeLeft.seconds.toString().padStart(2, '0')}s</span>
              </div>
            </div>

            <div className="space-y-2 text-[11px] text-slate-300">
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                <h3 className="font-bold text-amber-400 flex items-center gap-1">
                  <img src="/assets/home/dausenzu.png" alt="Senzu" className="w-3.5 h-3.5 object-contain" /> Chuỗi Thưởng Tụ Ki Theo Ngày:
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  • Thứ 2 ➔ T7: Tăng dần từ 10k đến 60k Ki<br/>
                  🔥 <b className="text-yellow-400">Chủ Nhật: +100k Ki khủng!</b><br/>
                  <i className="text-slate-500">* Đúng 00:00 sáng Thứ Hai Điểm Ki tự động reset về 0.</i>
                </p>
              </div>

              <div className="bg-gradient-to-r from-amber-950/40 via-yellow-950/30 to-amber-950/40 p-2.5 rounded-xl border border-amber-500/50 space-y-1 shadow-md">
                <h3 className="font-bold text-yellow-400 flex items-center gap-1 text-xs">
                  <img src="/assets/home/dragon-ball-7.png" alt="Ball" className="w-4 h-4 object-contain" /> SĂN 7 VIÊN NGỌC RỒNG - ĐỔI 100K VNĐ!
                </h3>
                <p className="text-amber-200/90 leading-tight">
                  Chiến binh đạt <b className="text-white">Sức Mạnh cao nhất tuần</b> nhận ngay <b className="text-yellow-400">1 Viên Ngọc Rồng</b>! 
                </p>
                <div className="text-[10px] text-amber-300 pt-0.5 font-semibold">
                  ✨ Đổi lẻ <b className="text-white">10k VNĐ/viên</b> hoặc đủ <b className="text-white">7 Viên</b> nhận ngay <b className="text-amber-400 underline">100.000 VNĐ</b>!
                </div>
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={handleCloseNoticeForToday}
                className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 font-black text-xs py-2 rounded-xl cursor-pointer hover:brightness-110 active:scale-95 shadow-lg shadow-amber-500/30 transition"
              >
                ĐÃ RÕ, HÔM NAY KHÔNG HIỆN LẠI 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-slate-900/95 backdrop-blur-md border-b border-amber-500/40 px-3 sm:px-5 py-2 shadow-md shrink-0 z-20 overflow-x-auto">
        <div className="w-full min-w-max flex justify-between items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <img src="/assets/home/shenron.png" alt="Logo" className="w-7 h-7 sm:w-8 sm:h-8 object-contain animate-bounce" />
            <span className="font-black text-lg sm:text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500">
              DRAGON ARCADE
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-amber-500/50 px-3 py-1.5 rounded-xl text-xs shadow-inner">
              <img src="/assets/home/dausenzu.png" alt="Ki" className="w-4 h-4 object-contain" />
              <span className="font-black text-amber-400">{points.toLocaleString()}</span>
              <span className="text-[10px] text-amber-300/70">Ki</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-purple-500/50 px-3.5 py-2 rounded-xl text-xs shadow-inner">
              <img src="/assets/home/capsule.png" alt="Capsule" className="w-4 h-4 object-contain" />
              <span className="font-black text-purple-300">{luckySpins} Lượt</span>
            </div>

            <button
              onClick={handleCheckIn}
              disabled={isCheckedInToday}
              className={`text-xs font-black py-1.5 px-3 rounded-xl transition-all shadow active:scale-95 cursor-pointer whitespace-nowrap ${
                isCheckedInToday
                  ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                  : "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950"
              }`}
            >
              {isCheckedInToday ? "✅ Đã Tụ Ki" : `🔥 Tụ Ki (+${(todayReward.ki / 1000).toFixed(0)}k)`}
            </button>

            <button
              onClick={() => setProfileModalOpen(true)}
              className="w-8 h-8 rounded-full overflow-hidden border-2 border-amber-400 active:scale-95 transition cursor-pointer shadow-md shrink-0"
            >
              <img src={avatarUrl || DEFAULT_AVATARS[0].url} alt="Avatar" className="w-full h-full object-cover" />
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-rose-400 font-bold px-2.5 py-1.5 bg-slate-800/80 rounded-xl border border-slate-700 cursor-pointer transition shrink-0"
            >
              Thoát 🚪
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-5">
        
        <section
          className="relative flex flex-col items-center justify-center min-h-[180px] sm:min-h-[240px] bg-cover bg-center text-center p-4 sm:p-6 rounded-3xl border-2 border-amber-500/40 overflow-hidden shadow-2xl"
          style={{ backgroundImage: "url('https://images3.alphacoders.com/812/thumb-1920-812808.png')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/85 to-slate-950"></div>
          <div className="relative z-10 w-full max-w-4xl space-y-2.5 flex flex-col items-center">
            
            <div className="flex flex-wrap justify-center items-center gap-2">
              <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-xs font-bold text-amber-300 uppercase tracking-widest backdrop-blur-md">
                ✨ Chiến Binh: <span className="text-white font-black">{displayName}</span>
              </span>
              <span className={`px-3 py-1 border rounded-full text-xs font-black backdrop-blur-md shadow ${currentLevel.color}`}>
                {currentLevel.name}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 drop-shadow-xl tracking-wide uppercase break-words leading-tight w-full px-2">
              DRAGON GAMING ARENA
            </h1>

            <div className="inline-flex items-center gap-1.5 bg-slate-900/90 border border-amber-500/50 px-3 py-1 rounded-full text-xs font-bold text-amber-300 shadow-md backdrop-blur-md">
              <span>⏳ Reset Tuần Sau:</span>
              <span className="font-mono font-black text-yellow-400">
                {timeLeft.hours.toString().padStart(2, '0')}h {timeLeft.minutes.toString().padStart(2, '0')}m {timeLeft.seconds.toString().padStart(2, '0')}s
              </span>
            </div>

            <p className="text-amber-200/90 text-xs sm:text-sm italic font-medium max-w-2xl mx-auto px-3 py-2 bg-slate-900/60 rounded-xl border border-amber-500/30 whitespace-normal leading-relaxed shadow-inner">
              {dailyQuote}
            </p>
            
            <div className="pt-1">
              <button
                onClick={() => setShowNoticeModal(true)}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer bg-slate-900/90 px-4 py-1.5 rounded-xl border border-amber-500/40 transition shadow-lg inline-flex items-center gap-2 active:scale-95"
              >
                <img src="/assets/home/dragonball.png" alt="Ball" className="w-4 h-4 object-contain animate-pulse" /> Xem Chuỗi Tụ Ki ({todayReward.dayName}: +{(todayReward.ki/1000).toFixed(0)}k Ki) & Săn Ngọc Rồng
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          <div className="lg:col-span-2 space-y-5">
            
            {/* SẢNH NỔI BẬT VŨ TRỤ (CHỨA CÂU CÁ, JACKPOT, BACCARAT) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                <h2 className="text-base sm:text-lg font-black text-amber-400 tracking-wider uppercase flex items-center gap-2">
                  <img src="/assets/home/candauvan.png" alt="Fire" className="w-5 h-5 object-contain" /> Sảnh Nổi Bật Vũ Trụ
                </h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* 1. CẦN THỦ VŨ TRỤ */}
                <Link
                  href="/cauca"
                  className="bg-slate-900/90 border-2 border-cyan-500/60 rounded-2xl p-4 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden hover:border-cyan-400 flex flex-col justify-between"
                >
                  <div className="absolute right-2 -bottom-2 opacity-15">
                    <img src="/assets/cauca/Aetobatus_ocellatus.png" alt="Fish" className="w-20 h-20 object-contain" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-cyan-400 flex items-center gap-1.5">
                      <span>🎣</span> Cần Thủ Vũ Trụ
                    </h3>
                    <p className="text-slate-300 text-[11px] mt-1 italic font-medium">✨ 'Hạ gục cá mập, giật nổ hũ Jackpot đại dương cực khủng!'</p>
                  </div>
                  <div className="mt-3 bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 text-slate-950 font-black py-2 px-3 rounded-xl text-center text-xs shadow">
                    CÂU CÁ 🌊
                  </div>
                </Link>

                {/* 2. JACKPOT RỒNG THẦN */}
                <Link
                  href="/jackpot"
                  className="bg-slate-900/90 border-2 border-amber-500/60 rounded-2xl p-4 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden hover:border-amber-400 flex flex-col justify-between"
                >
                  <div className="absolute right-2 -bottom-2 opacity-15">
                    <img src="/assets/home/dragonball.png" alt="Ball" className="w-20 h-20 object-contain" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-400 flex items-center gap-1.5">
                      <img src="/assets/home/dragon-ball-4.png" alt="Jackpot" className="w-5 h-5 object-contain" /> Jackpot Rồng Thần
                    </h3>
                    <p className="text-slate-300 text-[11px] mt-1 italic font-medium">✨ 'Vận Ki quay hũ tích lũy Điểm Sức Mạnh nổ hũ Chí Tôn!'</p>
                  </div>
                  <div className="mt-3 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-slate-950 font-black py-2 px-3 rounded-xl text-center text-xs shadow">
                    NỔ HŨ 🔮
                  </div>
                </Link>

                {/* 3. BACCARAT THẦN THÁNH */}
                <Link
                  href="/baccarat"
                  className="bg-slate-900/90 border-2 border-indigo-500/60 rounded-2xl p-4 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden hover:border-indigo-400 flex flex-col justify-between"
                >
                  <div className="absolute right-2 -bottom-2 opacity-15">
                    <img src="/assets/baccarat/champa.png" alt="Champa" className="w-20 h-20 object-contain" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-indigo-400 flex items-center gap-1.5">
                      <img src="/assets/baccarat/champa.png" alt="Baccarat" className="w-5 h-5 object-contain" /> Baccarat Thần Thánh
                    </h3>
                    <p className="text-slate-300 text-[11px] mt-1 italic font-medium">⚡ 'Whis phẩy gậy định đoạt, lật bài baccarat phân định cao thấp!'</p>
                  </div>
                  <div className="mt-3 bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-600 text-slate-950 font-black py-2 px-3 rounded-xl text-center text-xs shadow">
                    BACCARAT 🎲
                  </div>
                </Link>

              </div>
            </div>

            {/* MỤC: THẦN ĐIỆN & KHO BẢO */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-l-4 border-purple-500 pl-3">
                <h2 className="text-base sm:text-lg font-black text-purple-400 tracking-wider uppercase flex items-center gap-2">
                  🔮 Thần Điện & Kho Báu Võ Đạo
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. VÒNG QUAY CAPSULE */}
                <Link
                  href="/wheel"
                  className="bg-slate-900/90 border border-purple-500/40 rounded-2xl p-4 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden hover:border-purple-400"
                >
                  <div className="absolute right-2 -bottom-2 opacity-15">
                    <img src="/assets/home/capsule.png" alt="Capsule" className="w-20 h-20 object-contain" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-purple-400 flex items-center gap-2">
                    <img src="/assets/home/capsule.png" alt="Wheel" className="w-6 h-6 object-contain" /> Vòng Quay Capsule
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">Dùng Lượt Quay Capsule mở rộng tiềm năng Ki chiến đấu!</p>
                  <div className="mt-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black py-2 px-3 rounded-xl text-center text-xs shadow">
                    QUAY NGAY 🎟️
                  </div>
                </Link>

                {/* 2. THẦN ĐIỆN KỸ NĂNG (SHOP SKILL) */}
                <Link
                  href="/shopskill"
                  className="bg-slate-900/90 border border-emerald-500/50 rounded-2xl p-4 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden hover:border-emerald-400"
                >
                  <div className="absolute right-2 -bottom-2 opacity-15">
                    <img src="/assets/home/dragonball.png" alt="Skill" className="w-20 h-20 object-contain" />
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400 flex items-center gap-2">
                    <img src="/assets/home/dragonball.png" alt="Skill" className="w-6 h-6 object-contain" /> Thần Điện Kỹ Năng (Shop Skill)
                  </h3>
                  <p className="text-slate-300 text-xs mt-1 italic font-medium">🔮 'Lĩnh ngộ kỹ năng tối thượng hỗ trợ chiến đấu trong ván Bài Tiến Lên & Poker!'</p>
                  <div className="mt-3 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 text-slate-950 font-black py-2 px-3 rounded-xl text-center text-xs shadow">
                    VÀO THẦN ĐIỆN SKILL ⚔️
                  </div>
                </Link>

                {/* 3. GACHA THIÊN SỨ */}
                <Link
                  href="/gacha"
                  className="bg-slate-900/90 border border-pink-500/50 rounded-2xl p-4 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden hover:border-pink-400"
                >
                  <div className="absolute right-2 -bottom-2 opacity-15">
                    <img src="/assets/gacha/ruongvang.png" alt="Gacha" className="w-20 h-20 object-contain" />
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-pink-400 flex items-center gap-2">
                    <span>🎁</span> Vận Mệnh của Thiên Sứ (Gacha)
                  </h3>
                  <p className="text-slate-300 text-xs mt-1 italic font-medium">✨ 'Mở Rương Bạc An Toàn hoặc Rương Vàng Anh Dũng nhận kỹ năng độc quyền!'</p>
                  <div className="mt-3 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white font-black py-2 px-3 rounded-xl text-center text-xs shadow">
                    MỞ RƯƠNG GACHA 🌟
                  </div>
                </Link>

                {/* 4. SHOP VÕ ĐẠO SAIYAN */}
                <Link
                  href="/shop"
                  className="bg-slate-900/90 border border-yellow-500/40 rounded-2xl p-4 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden hover:border-yellow-400"
                >
                  <div className="absolute right-2 -bottom-2 opacity-15">
                    <img src="/assets/home/dausenzu.png" alt="Senzu" className="w-20 h-20 object-contain" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-yellow-400 flex items-center gap-2">
                    <img src="/assets/home/dausenzu.png" alt="Shop" className="w-6 h-6 object-contain" /> Shop Võ Đạo Saiyan
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">Dùng Điểm Ki quy đổi Lượt Quay & Đậu Senzu Phôi Hồi!</p>
                  <div className="mt-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 font-black py-2 px-3 rounded-xl text-center text-xs shadow">
                    VÀO SHOP 💎
                  </div>
                </Link>

              </div>
            </div>

            {/* MỤC: LÔI ĐÀI VÕ ĐẠO SÁT PHẠT */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
                <h2 className="text-base sm:text-lg font-black text-emerald-400 tracking-wider uppercase flex items-center gap-2">
                  <img src="/assets/home/shenron.png" alt="Game" className="w-5 h-5 object-contain" /> Lôi Đài Võ Đạo Sát Phạt
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/tienlen"
                  className="bg-slate-900/90 border-2 border-emerald-500/60 rounded-2xl p-4 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden hover:border-emerald-400"
                >
                  <div className="flex items-center gap-2">
                    <img src="/assets/home/dragonball.png" alt="Card" className="w-6 h-6 object-contain" />
                    <h3 className="text-sm sm:text-base font-black text-emerald-400">Đại Hội 13 Ấn Ký</h3>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold uppercase ml-auto animate-pulse">Lôi Đài</span>
                  </div>
                  <p className="text-slate-300 text-xs mt-2 italic font-medium leading-relaxed bg-black/40 p-2 rounded-xl border border-emerald-500/20">
                    🌀 "Dồn 13 Ấn Ký vào tay bài, giải phóng Ki bùng nổ, chặt heo đoạt mệnh đối thủ!"
                  </p>
                  <div className="mt-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 text-slate-950 font-black py-2.5 px-3 rounded-xl text-center text-xs shadow">
                    BƯỚC VÀO LÔI ĐÀI ⚔️
                  </div>
                </Link>

                <Link
                  href="/poker"
                  className="bg-slate-900/90 border-2 border-blue-500/60 rounded-2xl p-4 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden hover:border-blue-400"
                >
                  <div className="flex items-center gap-2">
                    <img src="/assets/home/dragonball.png" alt="Card" className="w-6 h-6 object-contain" />
                    <h3 className="text-sm sm:text-base font-black text-blue-400">Sòng Poker Whis</h3>
                    <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full font-bold uppercase ml-auto animate-pulse">Thần Thánh</span>
                  </div>
                  <p className="text-slate-300 text-xs mt-2 italic font-medium leading-relaxed bg-black/40 p-2 rounded-xl border border-blue-500/20">
                    ⚡ "Whis lật bài phân định cao thấp, All-In vận Ki áp đảo Thần Hủy Diệt húp trọn Pot!"
                  </p>
                  <div className="mt-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-600 text-slate-950 font-black py-2.5 px-3 rounded-xl text-center text-xs shadow">
                    VÀO SÒNG POKER ♠️
                  </div>
                </Link>
              </div>
            </div>

          </div>

          <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-4 shadow-xl space-y-4 h-fit">
            <div className="flex items-center justify-between border-l-4 border-orange-500 pl-3">
              <h2 className="text-sm sm:text-base font-black text-orange-400 tracking-wider uppercase">
                🏆 Top 5 Võ Đạo Vũ Trụ
              </h2>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                <img src="/assets/home/dragonball.png" alt="Ball" className="w-3.5 h-3.5 object-contain" /> Ngọc Rồng
              </span>
            </div>
            <div className="space-y-2.5">
              {leaderboard.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-6">Đang cập nhật...</div>
              ) : (
                leaderboard.map((item, index) => {
                  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
                  const isMe = item.id === user?.id;
                  const userLvl = getSaiyanLevel(item.balance);
                  const userAvatar = item.avatar_url || DEFAULT_AVATARS[0].url;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border ${
                        isMe ? "bg-amber-500/15 border-amber-500/60 font-bold" : "bg-slate-950/60 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm shrink-0">{medals[index]}</span>
                        <div className="w-7 h-7 rounded-full overflow-hidden border border-amber-400/60 shrink-0">
                          <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs text-slate-200 truncate max-w-[90px]">
                            {item.full_name} {isMe && "(Tôi)"}
                          </span>
                          <span className="text-[9px] text-amber-300 font-semibold">{userLvl.name.split(" - ")[1]}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-amber-400 font-black shrink-0">
                        <img src="/assets/home/dausenzu.png" alt="Ki" className="w-3.5 h-3.5 object-contain" />
                        <span>{item.balance?.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-amber-500/60 w-full max-w-lg rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">🛡️</span>
                <h3 className="text-xs sm:text-sm font-black text-amber-400">HỒ SƠ & SƯU TẬP NGỌC RỒNG</h3>
              </div>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-xs px-2 py-0.5 cursor-pointer"
              >
                ✖
              </button>
            </div>

            <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400 shadow shrink-0">
                <img src={avatarUrl || DEFAULT_AVATARS[0].url} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-extrabold text-xs text-white truncate">{displayName}</h4>
                <div className={`inline-block text-[9px] font-black px-1.5 py-0.2 rounded border ${currentLevel.color}`}>
                  {currentLevel.name}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-amber-400 font-bold pt-0.5">
                  <span className="flex items-center gap-1"><img src="/assets/home/dausenzu.png" alt="Ki" className="w-3.5 h-3.5 object-contain" /> {points.toLocaleString()} Ki</span>
                  <span className="flex items-center gap-1"><img src="/assets/home/capsule.png" alt="Ticket" className="w-3.5 h-3.5 object-contain" /> {luckySpins} Lượt</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-amber-500/40 space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-wide flex items-center gap-1">
                  <img src="/assets/home/dragonball.png" alt="Ball" className="w-3.5 h-3.5 object-contain" /> Kho Ngọc Rồng ({dragonBallsCount}/7)
                </h4>
              </div>

              <div className="grid grid-cols-7 gap-1 py-1">
                {[1, 2, 3, 4, 5, 6, 7].map((starNum) => {
                  const isUnlocked = starNum <= dragonBallsCount;
                  const ballImageSrc = `/assets/home/dragon-ball-${starNum}.png`;
                  return (
                    <div
                      key={starNum}
                      className={`flex flex-col items-center justify-center p-1 rounded-lg border transition-all ${
                        isUnlocked
                          ? "bg-gradient-to-t from-amber-600 to-yellow-400 border-yellow-200 shadow scale-105"
                          : "bg-slate-900 border-slate-800 opacity-40 grayscale"
                      }`}
                    >
                      <img src={ballImageSrc} alt={`${starNum} Star`} className="w-6 h-6 object-contain drop-shadow" />
                      <span className={`text-[8px] font-black mt-0.5 ${isUnlocked ? 'text-slate-950' : 'text-slate-500'}`}>
                        {starNum}⭐
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleExchangeBalls('single')}
                  className="bg-slate-900 hover:bg-slate-800 border border-emerald-500/50 text-emerald-400 font-bold text-[10px] py-1.5 rounded-lg cursor-pointer"
                >
                  Đổi 1 Viên = 10k VNĐ 💵
                </button>
                <button
                  type="button"
                  onClick={() => handleExchangeBalls('all')}
                  className={`font-black text-[10px] py-1.5 rounded-lg cursor-pointer shadow ${
                    dragonBallsCount >= 7
                      ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 animate-pulse"
                      : "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed"
                  }`}
                >
                  Đủ 7 Viên Ước 100k VNĐ 🌟
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-amber-400 ml-1">Tên Hiển Thị</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-white px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-amber-400 ml-1">Chọn Avatar Dragon Ball (30 Mẫu)</label>
                <div className="grid grid-cols-6 gap-1.5 pt-1 max-h-36 overflow-y-auto bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
                  {DEFAULT_AVATARS.map((av, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setAvatarUrl(av.url)}
                      className={`w-9 h-9 rounded-lg overflow-hidden border-2 cursor-pointer transition shrink-0 ${
                        avatarUrl === av.url ? "border-amber-400 scale-105 shadow" : "border-slate-700 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={updatingProfile}
                className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs py-2.5 rounded-xl cursor-pointer hover:brightness-110 transition active:scale-95 shadow disabled:opacity-50"
              >
                {updatingProfile ? "Đang lưu..." : "LƯU THAY ĐỔI 💾"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}