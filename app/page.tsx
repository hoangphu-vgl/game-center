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
  if (power >= 1000000000) return { name: "⚡ Lv.10 - Thần Hủy Diệt", color: "text-purple-400 border-purple-500/50 bg-purple-950/40" };
  if (power >= 500000000) return { name: "🔥 Lv.9 - Bản Năng Hoàn Thiện", color: "text-rose-400 border-rose-500/50 bg-rose-950/40" };
  if (power >= 250000000) return { name: "⚪ Lv.8 - Bản Năng Vô Thượng", color: "text-cyan-300 border-cyan-500/50 bg-cyan-950/40" };
  if (power >= 100000000) return { name: "🔵 Lv.7 - Siêu Saiyan Blue", color: "text-blue-400 border-blue-500/50 bg-blue-950/40" };
  if (power >= 50000000) return { name: "🔴 Lv.6 - Siêu Saiyan God", color: "text-red-400 border-red-500/50 bg-red-950/40" };
  if (power >= 10000000) return { name: "💥 Lv.5 - Siêu Saiyan 3", color: "text-amber-400 border-amber-500/50 bg-amber-950/40" };
  if (power >= 5000000) return { name: "⚡ Lv.4 - Siêu Saiyan 2", color: "text-yellow-400 border-yellow-500/50 bg-yellow-950/40" };
  if (power >= 1000000) return { name: "🟡 Lv.3 - Siêu Saiyan 1", color: "text-yellow-300 border-yellow-500/50 bg-yellow-950/30" };
  if (power >= 500000) return { name: "🛡️ Lv.2 - Saiyan Hạ Đẳng", color: "text-orange-400 border-orange-500/40 bg-orange-950/30" };
  return { name: "🌍 Lv.1 - Người Trái Đất", color: "text-slate-300 border-slate-700 bg-slate-900/50" };
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [points, setPoints] = useState<number>(5000);
  const [luckySpins, setLuckySpins] = useState<number>(3);
  const [lastCheckIn, setLastCheckIn] = useState<string>("");
  const [loading, setLoading] = useState(true);

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

  const getTodayString = () => new Date().toISOString().split("T")[0];

  const getWeekKey = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${week}`;
  };

  useEffect(() => {
    setDailyQuote(AURA_QUOTES[Math.floor(Math.random() * AURA_QUOTES.length)]);
  }, []);

  useEffect(() => {
    async function loadUserProfile(currentUser: any) {
      if (!currentUser) {
        setUser(null);
        setPoints(5000);
        setLuckySpins(3);
        setLastCheckIn("");
        setDragonBallsCount(0);
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

        const currentWeek = getWeekKey();
        const lastCheckedWeek = localStorage.getItem(`last_reset_week_${currentUser.id}`);

        let currentBalance = profile?.balance ?? 5000;
        let currentSpins = profile?.lucky_spins ?? 3;
        let lastCheck = profile?.last_check_in ?? "";

        if (!lastCheckedWeek) {
          localStorage.setItem(`last_reset_week_${currentUser.id}`, currentWeek);
        } else if (lastCheckedWeek !== currentWeek) {
          currentBalance = 0;
          await supabase
            .from("profiles")
            .update({ balance: 0 })
            .eq("id", currentUser.id);
          
          localStorage.setItem(`last_reset_week_${currentUser.id}`, currentWeek);
        }

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
          
          localStorage.setItem("tlmn_user_name", defaultName);
          localStorage.setItem("tlmn_user_avatar", defaultAvatar);
        } else {
          setPoints(currentBalance);
          setLuckySpins(currentSpins);
          setLastCheckIn(lastCheck);
          const activeName = profile.full_name || defaultName;
          const activeAvatar = profile.avatar_url || defaultAvatar;
          
          setDisplayName(activeName);
          setAvatarUrl(activeAvatar);

          localStorage.setItem("tlmn_user_name", activeName);
          localStorage.setItem("tlmn_user_avatar", activeAvatar);
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
    localStorage.removeItem("tlmn_user_name");
    localStorage.removeItem("tlmn_user_avatar");
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

      localStorage.setItem("tlmn_user_name", newCleanName);
      localStorage.setItem("tlmn_user_avatar", avatarUrl);

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
    const newPoints = points + 1000;
    const newSpins = luckySpins + 1;

    const { error } = await supabase
      .from("profiles")
      .update({ balance: newPoints, lucky_spins: newSpins, last_check_in: today })
      .eq("id", user.id);

    if (!error) {
      setPoints(newPoints);
      setLuckySpins(newSpins);
      setLastCheckIn(today);
      alert("🔥 TỤ KI THÀNH CÔNG! +1.000 Điểm Sức Mạnh & +1 Lượt Quay Free!");
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

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 text-white font-sans select-none flex flex-col justify-between" style={{ touchAction: 'manipulation' }}>
      
      {/* 🚀 THANH ĐIỀU HƯỚNG NHANH GIỮA CÁC TRANG */}
      <div className="bg-slate-900/95 border-b border-amber-500/30 px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto text-[11px] font-bold shrink-0 backdrop-blur-md z-30">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-amber-400">⚡ Chuyển Sảnh:</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Link href="/" className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-md transition text-[10px]">
            🏠 Trang Chủ
          </Link>
          <Link href="/tienlen" className="bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 px-2.5 py-0.5 rounded-md transition text-[10px]">
            ⚔️ Võ Thuật 13 Ấn Ký
          </Link>
          <Link href="/poker" className="bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-500/50 px-2.5 py-0.5 rounded-md transition text-[10px]">
            ♠️ Sòng Poker
          </Link>
          <Link href="/jackpot" className="bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-500/50 px-2.5 py-0.5 rounded-md transition text-[10px]">
            🔮 Jackpot
          </Link>
          <Link href="/wheel" className="bg-orange-950 hover:bg-orange-900 text-orange-300 border border-orange-500/50 px-2.5 py-0.5 rounded-md transition text-[10px]">
            🎟️ Vòng Quay
          </Link>
        </div>
      </div>

      {/* POPUP THÔNG BÁO / LUẬT CHƠI */}
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

            <div className="space-y-2 text-[11px] text-slate-300">
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                <h3 className="font-bold text-amber-400 flex items-center gap-1">
                  <img src="/assets/home/dausenzu.png" alt="Senzu" className="w-3.5 h-3.5 object-contain" /> Luật Chơi Võ Đạo Vũ Trụ:
                </h3>
                <p className="text-slate-400 leading-tight">
                  Vui vẻ, hòa đồng, cùng nhau cày Sức Mạnh (Ki). <b className="text-amber-300">Thứ Hai hàng tuần, Sức Mạnh tự động reset về 0</b> để chiến binh bắt đầu cuộc đua mới!
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

      {/* Header */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-amber-500/40 px-3 py-1.5 shadow-md shrink-0 z-20">
        <div className="w-full flex justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <img src="/assets/home/shenron.png" alt="Logo" className="w-6 h-6 sm:w-7 sm:h-7 object-contain animate-bounce" />
            <span className="font-black text-base sm:text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500">
              DRAGON ARCADE
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-slate-800/90 border border-amber-500/50 px-2 py-1 rounded-lg text-[10px] sm:text-xs">
              <img src="/assets/home/dausenzu.png" alt="Ki" className="w-3.5 h-3.5 object-contain" />
              <span className="font-black text-amber-400">{points.toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-800/90 border border-purple-500/50 px-2 py-1 rounded-lg text-[10px] sm:text-xs">
              <img src="/assets/home/capsule.png" alt="Ticket" className="w-3.5 h-3.5 object-contain" />
              <span className="font-black text-purple-300">{luckySpins}</span>
            </div>

            <button
              onClick={handleCheckIn}
              disabled={isCheckedInToday}
              className={`text-[10px] sm:text-xs font-black py-1 px-2.5 rounded-lg transition-all shadow active:scale-95 ${
                isCheckedInToday
                  ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                  : "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 cursor-pointer"
              }`}
            >
              {isCheckedInToday ? "✅ Tụ Ki" : "🔥 Tụ Ki"}
            </button>

            <button
              onClick={() => setProfileModalOpen(true)}
              className="w-7 h-7 rounded-full overflow-hidden border border-amber-400 active:scale-95 transition ml-1 cursor-pointer"
            >
              <img src={avatarUrl || DEFAULT_AVATARS[0].url} alt="Avatar" className="w-full h-full object-cover" />
            </button>
            <button
              onClick={handleLogout}
              className="text-[10px] text-slate-400 hover:text-rose-400 font-bold px-1.5 py-1 bg-slate-800/80 rounded-lg border border-slate-700 cursor-pointer"
            >
              🚪
            </button>
          </div>
        </div>
      </header>

      {/* BODY CHÍNH CÓ THỂ CUỘN - TỰ CO GIÃN THEO KHUNG MOBILE NGANG */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 space-y-4">
        
        {/* Banner & Quote */}
        <section
          className="relative flex items-center justify-center min-h-[140px] sm:min-h-[180px] bg-cover bg-center text-center p-3 rounded-2xl border border-amber-500/30 overflow-hidden shadow-lg"
          style={{
            backgroundImage: "url('https://images3.alphacoders.com/812/thumb-1920-812808.png')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/85 to-slate-950"></div>
          <div className="relative z-10 max-w-3xl space-y-1.5">
            <div className="flex flex-wrap justify-center items-center gap-1.5">
              <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-400/40 rounded-full text-[9px] sm:text-[10px] font-bold text-amber-300 uppercase tracking-widest backdrop-blur-sm">
                ✨ Chiến Binh: <span className="text-white">{displayName}</span>
              </span>
              <span className={`px-2.5 py-0.5 border rounded-full text-[9px] sm:text-[10px] font-black backdrop-blur-sm shadow ${currentLevel.color}`}>
                {currentLevel.name}
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 drop-shadow tracking-wide">
              DRAGON GAMING ARENA
            </h1>
            <p className="text-amber-200/90 text-[10px] sm:text-xs italic font-medium max-w-xl mx-auto px-2 bg-slate-900/50 p-1.5 rounded-lg border border-amber-500/20 truncate">
              {dailyQuote}
            </p>
            
            <div>
              <button
                onClick={() => setShowNoticeModal(true)}
                className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer bg-slate-900/80 px-2.5 py-1 rounded-lg border border-amber-500/30 transition shadow inline-flex items-center gap-1"
              >
                <img src="/assets/home/dragonball.png" alt="Ball" className="w-3.5 h-3.5 object-contain" /> Xem Luật Chơi & Săn Ngọc Rồng
              </button>
            </div>
          </div>
        </section>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* CỘT TRÁI (SẢNH GAME & GAME GIẢI TRÍ) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* 1. SẢNH NỔI BẬT */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 border-l-4 border-amber-500 pl-2">
                <h2 className="text-sm sm:text-base font-black text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
                  <img src="/assets/home/candauvan.png" alt="Fire" className="w-4 h-4 object-contain" /> Sảnh Nổi Bật
                </h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/jackpot"
                  className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-3 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden hover:border-amber-400"
                >
                  <div className="absolute right-2 -bottom-2 opacity-15">
                    <img src="/assets/home/dragonball.png" alt="Ball" className="w-16 h-16 object-contain" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-amber-400 flex items-center gap-1.5">
                    <img src="/assets/home/dragon-ball-4.png" alt="Jackpot" className="w-5 h-5 object-contain" /> Jackpot Rồng Thần
                  </h3>
                  <p className="text-slate-400 text-[10px] mt-0.5">Quay hũ tích tụ Điểm Sức Mạnh nổ hũ Grand!</p>
                  <div className="mt-2.5 bg-gradient-to-r from-amber-500 to-red-500 text-slate-950 font-black py-1.5 px-2 rounded-lg text-center text-[10px] shadow">
                    Vào Nổ Hũ 🔮
                  </div>
                </Link>

                <Link
                  href="/wheel"
                  className="bg-slate-900/90 border border-purple-500/40 rounded-xl p-3 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden hover:border-purple-400"
                >
                  <div className="absolute right-2 -bottom-2 opacity-15">
                    <img src="/assets/home/capsule.png" alt="Capsule" className="w-16 h-16 object-contain" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-purple-400 flex items-center gap-1.5">
                    <img src="/assets/home/capsule.png" alt="Wheel" className="w-5 h-5 object-contain" /> Vòng Quay May Mắn
                  </h3>
                  <p className="text-slate-400 text-[10px] mt-0.5">Sử dụng Lượt Quay để húp thêm Điểm Sức Mạnh!</p>
                  <div className="mt-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black py-1.5 px-2 rounded-lg text-center text-[10px] shadow">
                    Quay Ngay 🎟️
                  </div>
                </Link>

                <Link
                  href="/shop"
                  className="bg-slate-900/90 border border-yellow-500/40 rounded-xl p-3 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden hover:border-yellow-400 sm:col-span-2 md:col-span-1 lg:col-span-2"
                >
                  <div className="absolute right-2 -bottom-2 opacity-15">
                    <img src="/assets/home/dausenzu.png" alt="Senzu" className="w-16 h-16 object-contain" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-yellow-400 flex items-center gap-1.5">
                    <img src="/assets/home/dausenzu.png" alt="Shop" className="w-5 h-5 object-contain" /> Shop Võ Đạo
                  </h3>
                  <p className="text-slate-400 text-[10px] mt-0.5">Dùng Điểm Sức Mạnh quy đổi Lượt Quay & Flex!</p>
                  <div className="mt-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 font-black py-1.5 px-2 rounded-lg text-center text-[10px] shadow">
                    Vào Shop 💎
                  </div>
                </Link>
              </div>
            </div>

            {/* 2. GAME GIẢI TRÍ */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 border-l-4 border-emerald-500 pl-2">
                <h2 className="text-sm sm:text-base font-black text-emerald-400 tracking-wider uppercase flex items-center gap-1.5">
                  <img src="/assets/home/shenron.png" alt="Game" className="w-4 h-4 object-contain" /> Game Giải Trí
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/tienlen"
                  className="bg-slate-900/90 border-2 border-emerald-500/60 rounded-xl p-3 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden hover:border-emerald-400"
                >
                  <div className="flex items-center gap-1.5">
                    <img src="/assets/home/dragonball.png" alt="Card" className="w-5 h-5 object-contain" />
                    <h3 className="text-xs sm:text-sm font-black text-emerald-400">Đại Hội Võ Thuật 13 Ấn Ký</h3>
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded-full font-bold uppercase ml-auto animate-pulse">Hot</span>
                  </div>
                  <p className="text-slate-300 text-[10px] mt-1">Sòng bài lôi đài 13 Ấn Ký độc lập online, chặt heo cực đỉnh!</p>
                  <div className="mt-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 text-slate-950 font-black py-2 px-2 rounded-lg text-center text-[10px] shadow">
                    BƯỚC VÀO LÔI ĐÀI ⚔️
                  </div>
                </Link>

                <Link
                  href="/poker"
                  className="bg-slate-900/90 border-2 border-blue-500/60 rounded-xl p-3 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden hover:border-blue-400"
                >
                  <div className="flex items-center gap-1.5">
                    <img src="/assets/home/dragonball.png" alt="Card" className="w-5 h-5 object-contain" />
                    <h3 className="text-xs sm:text-sm font-black text-blue-400">Poker Texas Hold'em</h3>
                    <span className="text-[8px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-1.5 py-0.2 rounded-full font-bold uppercase ml-auto animate-pulse">VIP</span>
                  </div>
                  <p className="text-slate-300 text-[10px] mt-1">Sát phạt Poker Multiplayer 5 ghế, Whis chia bài tự động.</p>
                  <div className="mt-2.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-600 text-slate-950 font-black py-2 px-2 rounded-lg text-center text-[10px] shadow">
                    VÀO SÒNG POKER ♠️
                  </div>
                </Link>
              </div>
            </div>

          </div>

          {/* BẢNG XẾP HẠNG TOP 5 */}
          <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-3 shadow-xl space-y-3 h-fit">
            <div className="flex items-center justify-between border-l-4 border-orange-500 pl-2">
              <h2 className="text-xs sm:text-sm font-black text-orange-400 tracking-wider uppercase">
                🏆 Top 5 Võ Đạo Vũ Trụ
              </h2>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                <img src="/assets/home/dragonball.png" alt="Ball" className="w-3 h-3 object-contain" /> Ngọc Rồng
              </span>
            </div>
            <div className="space-y-2">
              {leaderboard.length === 0 ? (
                <div className="text-[10px] text-slate-500 text-center py-4">Đang cập nhật...</div>
              ) : (
                leaderboard.map((item, index) => {
                  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
                  const isMe = item.id === user?.id;
                  const userLvl = getSaiyanLevel(item.balance);
                  const userAvatar = item.avatar_url || DEFAULT_AVATARS[0].url;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-2 rounded-lg border ${
                        isMe ? "bg-amber-500/15 border-amber-500/60 font-bold" : "bg-slate-950/60 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs shrink-0">{medals[index]}</span>
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-amber-400/60 shrink-0">
                          <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] sm:text-xs text-slate-200 truncate max-w-[80px]">
                            {item.full_name} {isMe && "(Tôi)"}
                          </span>
                          <span className="text-[8px] text-amber-300 font-semibold">{userLvl.name.split(" - ")[1]}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-amber-400 font-black shrink-0">
                        <img src="/assets/home/dausenzu.png" alt="Ki" className="w-3 h-3 object-contain" />
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

      {/* POPUP HỒ SƠ & SƯU TẬP NGỌC RỒNG */}
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
                  <span className="flex items-center gap-1"><img src="/assets/home/dausenzu.png" alt="Ki" className="w-3 h-3 object-contain" /> {points.toLocaleString()} Ki</span>
                  <span className="flex items-center gap-1"><img src="/assets/home/capsule.png" alt="Ticket" className="w-3 h-3 object-contain" /> {luckySpins} Lượt</span>
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