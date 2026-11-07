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
  "🔥 'Không phải là hoàn hảo, nhưng ta sẽ vượt qua giới hạn của chính mình!' - Son Goku",
  "⚡ 'Sức mạnh đến từ nhu cầu, không phải từ mong muốn.' - Vegeta",
  "🐉 'Khi bạn từ bỏ hy vọng, đó là lúc cuộc chơi thực sự kết thúc.' - Master Roshi",
  "💥 'Ta mang trong mình dòng máu kiêu hãnh của chiến binh Saiyan!' - Vegeta",
  "🌟 'Hãy dồn toàn bộ Ki vào cú đánh quyết định!' - Gogeta",
  "🌀 'Nỗi sợ hãi không có gì đáng xấu hổ, nó giúp ngươi biết được điểm yếu của mình!' - Goku",
  "🥋 'Võ thuật không phải để đánh bại kẻ thù, mà là để hoàn thiện bản thân.' - Thần Rùa",
  "🔥 'Hàng tỷ thiên hà trong vũ trụ, và ta chính là kẻ mạnh nhất!' - Broly",
  "⚡ 'Một chiến binh thực sự không bao giờ cúi đầu trước số phận!' - Vegeta",
  "🐉 'Bản Năng Vô Thượng... trạng thái khi cơ thể tự động phản ứng!' - Whis",
];

// HỆ THỐNG PHÂN CẤP 10 CẤP ĐỘ SỨC MẠNH DRAGON BALL
const getSaiyanLevel = (power: number) => {
  if (power >= 25000000) return { name: "⚡ Lv.10 - Thần Hủy Diệt", color: "text-purple-400 border-purple-500/50 bg-purple-950/40" };
  if (power >= 12000000) return { name: "🔥 Lv.9 - Bản Năng Hoàn Thiện", color: "text-rose-400 border-rose-500/50 bg-rose-950/40" };
  if (power >= 6000000) return { name: "⚪ Lv.8 - Bản Năng Vô Thượng", color: "text-cyan-300 border-cyan-500/50 bg-cyan-950/40" };
  if (power >= 3000000) return { name: "🔵 Lv.7 - Siêu Saiyan Blue", color: "text-blue-400 border-blue-500/50 bg-blue-950/40" };
  if (power >= 1500000) return { name: "🔴 Lv.6 - Siêu Saiyan God", color: "text-red-400 border-red-500/50 bg-red-950/40" };
  if (power >= 500000) return { name: "💥 Lv.5 - Siêu Saiyan 3", color: "text-amber-400 border-amber-500/50 bg-amber-950/40" };
  if (power >= 200000) return { name: "⚡ Lv.4 - Siêu Saiyan 2", color: "text-yellow-400 border-yellow-500/50 bg-yellow-950/40" };
  if (power >= 50000) return { name: "🟡 Lv.3 - Siêu Saiyan 1", color: "text-yellow-300 border-yellow-500/50 bg-yellow-950/30" };
  if (power >= 10000) return { name: "🛡️ Lv.2 - Saiyan Hạ Đẳng", color: "text-orange-400 border-orange-500/40 bg-orange-950/30" };
  return { name: "🌍 Lv.1 - Người Trái Đất", color: "text-slate-300 border-slate-700 bg-slate-900/50" };
};

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
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Profile & Modal States
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Ngọc Rồng (Mỗi user sở hữu số lượng từ 0 đến 7)
  const [dragonBallsCount, setDragonBallsCount] = useState<number>(0);

  // Popup Thông Báo Luật Chơi & Sưu Tập Ngọc Rồng
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  // Leaderboard State
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

        const defaultName = currentUser.user_metadata?.username || "Chiến Binh Saiyan";
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
            balance: 0,
            lucky_spins: 3,
            last_check_in: "",
          };
          await supabase.from("profiles").insert([initialData]);
          setPoints(0);
          setLuckySpins(3);
          setLastCheckIn("");
          setDisplayName(defaultName);
          setAvatarUrl(defaultAvatar);
        } else {
          setPoints(currentBalance);
          setLuckySpins(currentSpins);
          setLastCheckIn(lastCheck);
          setDisplayName(profile.full_name || defaultName);
          setAvatarUrl(profile.avatar_url || defaultAvatar);
        }

        const savedBalls = localStorage.getItem(`dragon_balls_${currentUser.id}`);
        setDragonBallsCount(savedBalls ? parseInt(savedBalls) : 0);

        const todayStr = getTodayString();
        const hideNoticeDate = localStorage.getItem(`hide_notice_${currentUser.id}`);
        if (hideNoticeDate !== todayStr) {
          setShowNoticeModal(true);
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

  const handleCloseNoticeForToday = () => {
    if (!user) return;
    const todayStr = getTodayString();
    localStorage.setItem(`hide_notice_${user.id}`, todayStr);
    setShowNoticeModal(false);
  };

  // 🛠️ ĐÃ CẬP NHẬT LẤY THÊM avatar_url CHO BẢNG XẾP HẠNG
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

      alert("✨ Cập nhật thông tin chiến binh thành công! Điểm số được bảo toàn.");
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-amber-400 font-black tracking-widest animate-pulse px-4 text-center">
        <img src="/assets/home/shenron.png" alt="Shenron" className="w-20 h-20 object-contain mb-4 animate-bounce drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]" />
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
            <div className="flex justify-center">
              <img src="/assets/home/shenron.png" alt="Dragon" className="w-16 h-16 object-contain animate-bounce drop-shadow" />
            </div>
            <h1 className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 drop-shadow">
              DRAGON ARCADE
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm font-medium">
              {isSignUp ? "✨ Khởi tạo tài khoản tham gia đua top Sức Mạnh tuần" : "⚡ Đăng nhập bước vào không gian võ đạo"}
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
  const currentLevel = getSaiyanLevel(points);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans select-none relative pb-20 overflow-x-hidden">
      
      {/* POPUP THÔNG BÁO / LUẬT CHƠI & SƯU TẬP NGỌC RỒNG */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.4)] space-y-4 relative max-h-[90vh] overflow-y-auto">
            
            <div className="text-center space-y-1 border-b border-slate-800 pb-3">
              <div className="flex justify-center">
                <img src="/assets/home/dragonball.png" alt="Dragon Ball" className="w-12 h-12 object-contain animate-spin-slow" />
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-400 font-black px-3 py-1 rounded-full border border-amber-500/30 uppercase tracking-widest">
                ⚡ Sắc Lệnh Từ Thần Hủy Diệt ⚡
              </span>
              <h2 className="text-lg sm:text-xl font-black text-yellow-300 mt-2">
                LUẬT CHƠI VÀ SĂN NGỌC RỒNG VŨ TRỤ
              </h2>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1">
                <h3 className="font-bold text-amber-400 flex items-center gap-1.5">
                  <img src="/assets/home/dausenzu.png" alt="Senzu" className="w-4 h-4 object-contain" /> Luật Chơi Võ Đạo Vũ Trụ:
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Vui vẻ, hòa đồng, cùng nhau cày Sức Mạnh (Ki). <b className="text-amber-300">Đặc biệt vào thứ Hai hàng tuần, Sức Mạnh sẽ tự động reset về 0</b> để tất cả chiến binh bắt đầu cuộc đua mới từ vạch xuất phát!
                </p>
              </div>

              <div className="bg-gradient-to-r from-amber-950/40 via-yellow-950/30 to-amber-950/40 p-3.5 rounded-2xl border border-amber-500/50 space-y-1.5 shadow-md">
                <h3 className="font-bold text-yellow-400 flex items-center gap-1.5 text-sm">
                  <img src="/assets/home/dragon-ball-7.png" alt="Ball" className="w-5 h-5 object-contain" /> SĂN 7 VIÊN NGỌC RỒNG - ĐỔI 100K VNĐ!
                </h3>
                <p className="text-amber-200/90 leading-relaxed">
                  Chiến binh nào đạt <b className="text-white">Sức Mạnh cao nhất trong tuần</b> sẽ nhận ngay <b className="text-yellow-400">1 Viên Ngọc Rồng</b> vào kho sưu tập cá nhân! 
                </p>
                <div className="text-[11px] text-amber-300 pt-1 font-semibold">
                  ✨ <b>Quy đổi phần thưởng:</b> Đổi lẻ từng viên lấy <b className="text-white">10k VNĐ/viên</b> hoặc tích lũy đủ <b className="text-white">7 Viên Ngọc Rồng</b> để thực hiện điều ước Rồng Thần nhận ngay <b className="text-amber-400 underline">100.000 VNĐ</b>!
                </div>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1">
                <h3 className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <img src="/assets/home/capsule.png" alt="Capsule" className="w-4 h-4 object-contain" /> Cửa Hàng Đổi Lượt & Siêu Gói Flex:
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Đổi Ki lấy lượt quay qua các gói từ <b className="text-amber-300">1 Lượt (100k Ki)</b> đến <b className="text-amber-300">50 Lượt Rồng Thần</b>. Có <b className="text-yellow-400">Siêu Gói Flex 1 Củ (5.000 VNĐ / 1.000.000 Ki)</b> giới hạn kho tổng <b className="text-amber-300">20 gói/tuần</b> để flex danh dự!
                </p>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1">
                <h3 className="font-bold text-purple-400 flex items-center gap-1.5">
                  <img src="/assets/home/candauvan.png" alt="Cloud" className="w-4 h-4 object-contain" /> Kho Quà Vòng Quay Rồng Thần:
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Húp ngay các mốc khủng: <b className="text-emerald-400">+5.000 Ki</b>, <b className="text-amber-400">+100k / +200k Ki</b>, Lượt quay thêm, và chí tôn <b className="text-yellow-400">JACKPOT 1.000K Ki</b>!
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleCloseNoticeForToday}
                className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 font-black text-xs py-3 rounded-xl cursor-pointer hover:brightness-110 active:scale-95 shadow-lg shadow-amber-500/30 transition"
              >
                ĐÃ RÕ, HÔM NAY KHÔNG HIỆN LẠI 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-amber-500/40 px-3 py-2.5 shadow-[0_4px_20px_rgba(245,158,11,0.15)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="w-full sm:w-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/assets/home/shenron.png" alt="Logo" className="w-8 h-8 object-contain animate-bounce" />
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
            <div className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-800/90 border border-amber-500/50 px-2.5 py-1.5 rounded-xl shadow-inner text-xs sm:text-sm">
              <img src="/assets/home/dausenzu.png" alt="Ki" className="w-4 h-4 object-contain" />
              <span className="font-black text-amber-400 truncate">{points.toLocaleString()}</span>
              <span className="text-[10px] text-amber-300/70">Ki</span>
            </div>

            <div className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-800/90 border border-purple-500/50 px-2.5 py-1.5 rounded-xl shadow-inner text-xs sm:text-sm">
              <img src="/assets/home/capsule.png" alt="Ticket" className="w-4 h-4 object-contain" />
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
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-amber-300 truncate max-w-[100px]">{displayName}</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${currentLevel.color}`}>{currentLevel.name}</span>
                </div>
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
        className="relative flex items-center justify-center min-h-[240px] sm:min-h-[300px] bg-cover bg-center text-center p-4 border-b border-amber-500/30 overflow-hidden"
        style={{
          backgroundImage: "url('https://images3.alphacoders.com/812/thumb-1920-812808.png')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/85 to-slate-950"></div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex flex-wrap justify-center items-center gap-2">
            <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-[11px] font-bold text-amber-300 uppercase tracking-widest backdrop-blur-sm">
              ✨ Chiến Binh: <span className="text-white">{displayName}</span>
            </span>
            <span className={`px-3 py-1 border rounded-full text-[11px] font-black backdrop-blur-sm shadow ${currentLevel.color}`}>
              {currentLevel.name}
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 drop-shadow-lg tracking-wide">
            DRAGON GAMING ARENA
          </h1>
          <p className="text-amber-200/90 text-xs sm:text-sm italic font-medium max-w-xl mx-auto px-2 bg-slate-900/40 p-2 rounded-xl border border-amber-500/20">
            {dailyQuote}
          </p>
          
          <div>
            <button
              onClick={() => setShowNoticeModal(true)}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer bg-slate-900/80 px-3 py-1.5 rounded-xl border border-amber-500/30 transition shadow flex items-center gap-1.5 mx-auto"
            >
              <img src="/assets/home/dragonball.png" alt="Ball" className="w-4 h-4 object-contain" /> Xem Luật Chơi, Reset Thứ Hai & Săn Ngọc Rồng
            </button>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CỘT TRÁI (SẢNH GAME & GAME GIẢI TRÍ) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. SẢNH NỔI BẬT */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
              <h2 className="text-lg sm:text-xl font-black text-amber-400 tracking-wider uppercase flex items-center gap-2">
                <img src="/assets/home/candauvan.png" alt="Fire" className="w-5 h-5 object-contain" /> Sảnh Nổi Bật
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/jackpot"
                className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-4 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden hover:border-amber-400"
              >
                <div className="absolute right-2 -bottom-2 opacity-15">
                  <img src="/assets/home/dragonball.png" alt="Ball" className="w-20 h-20 object-contain" />
                </div>
                <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                  <img src="/assets/home/dragon-ball-4.png" alt="Jackpot" className="w-6 h-6 object-contain" /> Jackpot Rồng Thần
                </h3>
                <p className="text-slate-400 text-xs mt-1">Quay hũ tích tụ Điểm Sức Mạnh nổ hũ Grand, Major!</p>
                <div className="mt-4 bg-gradient-to-r from-amber-500 to-red-500 text-slate-950 font-black py-2 px-3 rounded-xl text-center text-xs shadow-md">
                  Vào Nổ Hũ 🔮
                </div>
              </Link>

              <Link
                href="/wheel"
                className="bg-slate-900/90 border border-purple-500/40 rounded-2xl p-4 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden hover:border-purple-400"
              >
                <div className="absolute right-2 -bottom-2 opacity-15">
                  <img src="/assets/home/capsule.png" alt="Capsule" className="w-20 h-20 object-contain" />
                </div>
                <h3 className="text-base font-bold text-purple-400 flex items-center gap-2">
                  <img src="/assets/home/capsule.png" alt="Wheel" className="w-6 h-6 object-contain" /> Vòng Quay May Mắn
                </h3>
                <p className="text-slate-400 text-xs mt-1">Sử dụng Lượt Quay để húp thêm Điểm Sức Mạnh!</p>
                <div className="mt-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black py-2 px-3 rounded-xl text-center text-xs shadow-md">
                  Quay Ngay 🎟️
                </div>
              </Link>

              <Link
                href="/shop"
                className="bg-slate-900/90 border border-yellow-500/40 rounded-2xl p-4 active:scale-[0.98] transition block group shadow-lg relative overflow-hidden hover:border-yellow-400 sm:col-span-2 md:col-span-1 lg:col-span-2 xl:col-span-1"
              >
                <div className="absolute right-2 -bottom-2 opacity-15">
                  <img src="/assets/home/dausenzu.png" alt="Senzu" className="w-20 h-20 object-contain" />
                </div>
                <h3 className="text-base font-bold text-yellow-400 flex items-center gap-2">
                  <img src="/assets/home/dausenzu.png" alt="Shop" className="w-6 h-6 object-contain" /> Shop Võ Đạo
                </h3>
                <p className="text-slate-400 text-xs mt-1">Dùng Điểm Sức Mạnh quy đổi Lượt Quay & Flex!</p>
                <div className="mt-4 bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 font-black py-2 px-3 rounded-xl text-center text-xs shadow-md">
                  Vào Shop 💎
                </div>
              </Link>
            </div>
          </div>

          {/* 2. GAME GIẢI TRÍ */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
              <h2 className="text-lg sm:text-xl font-black text-emerald-400 tracking-wider uppercase flex items-center gap-2">
                <img src="/assets/home/shenron.png" alt="Game" className="w-5 h-5 object-contain" /> Game Giải Trí
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Link
                href="/poker"
                className="bg-slate-900/90 border-2 border-emerald-500/60 rounded-2xl p-4 active:scale-[0.98] transition block group shadow-lg shadow-emerald-950/40 relative overflow-hidden hover:border-emerald-400 hover:shadow-emerald-500/20"
              >
                <div className="absolute right-4 bottom-2 opacity-15">
                  <img src="/assets/home/dragon-ball-7.png" alt="Poker" className="w-24 h-24 object-contain" />
                </div>
                <div className="flex items-center gap-2">
                  <img src="/assets/home/dragonball.png" alt="Card" className="w-6 h-6 object-contain" />
                  <h3 className="text-base font-black text-emerald-400">Poker Texas Hold'em</h3>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold uppercase ml-auto animate-pulse">Phòng VIP</span>
                </div>
                <p className="text-slate-300 text-xs mt-1.5">Sát phạt Poker Multiplayer 6 ghế, nhà cái Whis chia bài tự động. Đặt cược bằng Ki!</p>
                <div className="mt-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 text-slate-950 font-black py-2.5 px-3 rounded-xl text-center text-xs shadow-md shadow-emerald-500/20 group-hover:brightness-110">
                  VÀO SÒNG POKER ♠️
                </div>
              </Link>
            </div>
          </div>

        </div>

        {/* BẢNG XẾP HẠNG TOP 5 (ĐÃ BỐ TRÍ: [HUY CHƯƠNG] ➔ [AVATAR] ➔ [TÊN & CẤP ĐỘ]) */}
        <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-4 shadow-xl space-y-4 h-fit lg:sticky lg:top-[85px]">
          <div className="flex items-center justify-between border-l-4 border-orange-500 pl-3">
            <h2 className="text-base sm:text-lg font-black text-orange-400 tracking-wider uppercase">
              🏆 Top 5 Võ Đạo Vũ Trụ
            </h2>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
              <img src="/assets/home/dragonball.png" alt="Ball" className="w-3.5 h-3.5 object-contain" /> Săn Ngọc Rồng
            </span>
          </div>
          <div className="space-y-2.5">
            {leaderboard.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-6">Đang cập nhật bảng xếp hạng...</div>
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
                      {/* 1. Huy chương */}
                      <span className="text-base shrink-0">{medals[index]}</span>
                      
                      {/* 2. Avatar chiến binh */}
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-400/60 shrink-0">
                        <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
                      </div>

                      {/* 3. Tên & Cấp độ */}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs sm:text-sm text-slate-200 truncate max-w-[100px]">
                          {item.full_name} {isMe && "(Tôi)"}
                        </span>
                        <span className="text-[9px] text-amber-300 font-semibold">{userLvl.name.split(" - ")[1]}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-amber-400 font-black shrink-0">
                      <img src="/assets/home/dausenzu.png" alt="Ki" className="w-3.5 h-3.5 object-contain" />
                      <span>{item.balance?.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </main>

      {/* POPUP HỒ SƠ & SƯU TẬP NGỌC RỒNG */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-amber-500/60 w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h3 className="text-base sm:text-lg font-black text-amber-400">HỒ SƠ & SƯU TẬP NGỌC RỒNG</h3>
              </div>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm px-2 py-1 cursor-pointer"
              >
                ✖
              </button>
            </div>

            {/* Thông tin chiến binh */}
            <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-400 shadow-md shrink-0">
                <img src={avatarUrl || DEFAULT_AVATARS[0].url} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-white truncate">{displayName}</h4>
                <div className={`inline-block text-[10px] font-black px-2 py-0.5 rounded border ${currentLevel.color}`}>
                  {currentLevel.name}
                </div>
                <div className="flex items-center gap-3 text-xs text-amber-400 font-bold pt-1">
                  <span className="flex items-center gap-1"><img src="/assets/home/dausenzu.png" alt="Ki" className="w-3.5 h-3.5 object-contain" /> {points.toLocaleString()} Ki</span>
                  <span className="flex items-center gap-1"><img src="/assets/home/capsule.png" alt="Ticket" className="w-3.5 h-3.5 object-contain" /> {luckySpins} Lượt</span>
                </div>
              </div>
            </div>

            {/* KHO SƯU TẬP 7 VIÊN NGỌC RỒNG */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/40 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                  <img src="/assets/home/dragonball.png" alt="Ball" className="w-4 h-4 object-contain" /> Kho Sưu Tập Ngọc Rồng ({dragonBallsCount}/7 Viên)
                </h4>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Top Tuần Nhận Ngọc
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 py-2">
                {[1, 2, 3, 4, 5, 6, 7].map((starNum) => {
                  const isUnlocked = starNum <= dragonBallsCount;
                  const ballImageSrc = `/assets/home/dragon-ball-${starNum}.png`;
                  return (
                    <div
                      key={starNum}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                        isUnlocked
                          ? "bg-gradient-to-t from-amber-600 to-yellow-400 border-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.6)] scale-105"
                          : "bg-slate-900 border-slate-800 opacity-40 grayscale"
                      }`}
                      title={`Viên ${starNum} Sao ${isUnlocked ? '(Đã sở hữu)' : '(Chưa mở khóa)'}`}
                    >
                      <img src={ballImageSrc} alt={`${starNum} Star`} className="w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow" />
                      <span className={`text-[9px] font-black mt-1 ${isUnlocked ? 'text-slate-950 font-extrabold' : 'text-slate-500'}`}>
                        {starNum}⭐
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleExchangeBalls('single')}
                  className="bg-slate-900 hover:bg-slate-800 border border-emerald-500/50 text-emerald-400 font-bold text-xs py-2 rounded-xl transition cursor-pointer"
                >
                  Đổi 1 Viên = 10k VNĐ 💵
                </button>
                <button
                  type="button"
                  onClick={() => handleExchangeBalls('all')}
                  className={`font-black text-xs py-2 rounded-xl transition cursor-pointer shadow ${
                    dragonBallsCount >= 7
                      ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 animate-pulse"
                      : "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed"
                  }`}
                >
                  Đủ 7 Viên Ước 100k VNĐ 🌟
                </button>
              </div>
            </div>

            {/* Form đổi tên & avatar */}
            <form onSubmit={handleUpdateProfile} className="space-y-4 pt-1">
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
                <label className="text-xs font-bold text-amber-400 ml-1">Chọn Avatar Dragon Ball (Tổng 30 Mẫu)</label>
                <div className="grid grid-cols-5 gap-2 pt-1 max-h-48 overflow-y-auto pr-1 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                  {DEFAULT_AVATARS.map((av, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setAvatarUrl(av.url)}
                      className={`w-12 h-12 rounded-xl overflow-hidden border-2 cursor-pointer transition shrink-0 ${
                        avatarUrl === av.url ? "border-amber-400 scale-105 shadow-lg shadow-amber-500/30" : "border-slate-700 opacity-60 hover:opacity-100"
                      }`}
                      title={av.name}
                    >
                      <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={updatingProfile}
                className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs py-3 rounded-xl cursor-pointer hover:brightness-110 transition active:scale-95 shadow-md disabled:opacity-50"
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