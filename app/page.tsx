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
  updateDoc,
} from "firebase/firestore";

interface ChatMessage {
  id: string;
  uid: string;
  name: string;
  photoURL?: string;
  text: string;
  createdAt?: any;
}

interface Fish {
  id: number;
  type: 'small' | 'medium' | 'large' | 'boss' | 'rare';
  name: string;
  icon: string;
  x: number;
  y: number;
  speed: number;
  hp: number;
  maxHp: number;
  reward: number;
  size: number;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  bet: number;
}

const BET_LEVELS = [1, 10, 20, 50, 100, 1000];

const FISH_TYPES = [
  { type: 'small', name: 'Cá Vàng', icon: '🐠', hp: 2, reward: 5, size: 40, speed: 2 },
  { type: 'small', name: 'Cá Hề', icon: '🐟', hp: 3, reward: 8, size: 45, speed: 2.2 },
  { type: 'medium', name: 'Cá Mập Con', icon: '🐬', hp: 10, reward: 25, size: 65, speed: 1.5 },
  { type: 'large', name: 'Rùa Biển', icon: '🐢', hp: 25, reward: 60, size: 80, speed: 1 },
  { type: 'boss', name: 'Cá Mập Bự', icon: '🦈', hp: 60, reward: 150, size: 110, speed: 0.8 },
  { type: 'rare', name: 'Cá Voi Vàng (Jackpot)', icon: '🐳', hp: 120, reward: 400, size: 140, speed: 0.6 },
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [lastCheckIn, setLastCheckIn] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Bắn Cá Ki-Blast States
  const [fishGameOpen, setFishGameOpen] = useState(false);
  const [fishScreen, setFishScreen] = useState<'lobby' | 'game'>('lobby');
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [activeRoom, setActiveRoom] = useState<string>('PHÒNG CHUNG #888');
  const [seatIndex, setSeatIndex] = useState<number>(0);
  const [currentBet, setCurrentBet] = useState<number>(10);
  const [isBigGun, setIsBigGun] = useState<boolean>(false);
  const [jackpot, setJackpot] = useState<number>(258900);
  const [fishes, setFishes] = useState<Fish[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [effects, setEffects] = useState<{ id: number; text: string; x: number; y: number; color: string }[]>([]);
  const [cannonAngle, setCannonAngle] = useState<number>(0);

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

  // Fish Game Loop
  useEffect(() => {
    if (!fishGameOpen || fishScreen !== 'game') return;

    const spawnInterval = setInterval(() => {
      setFishes(prev => {
        if (prev.length > 14) return prev;
        const template = FISH_TYPES[Math.floor(Math.random() * FISH_TYPES.length)];
        const newFish: Fish = {
          id: Date.now() + Math.random(),
          type: template.type as any,
          name: template.name,
          icon: template.icon,
          x: -100,
          y: Math.random() * 420 + 40,
          speed: template.speed + Math.random() * 0.5,
          hp: template.hp,
          maxHp: template.hp,
          reward: template.reward,
          size: template.size
        };
        return [...prev, newFish];
      });
    }, 2200);

    const gameLoop = setInterval(() => {
      setFishes(prev => prev.map(f => {
        let nextX = f.x + f.speed;
        if (nextX > 880) {
          return { ...f, x: -100, y: Math.random() * 420 + 40 };
        }
        return { ...f, x: nextX };
      }));

      setBullets(prevBullets => {
        const nextBullets: Bullet[] = [];
        prevBullets.forEach(b => {
          const dx = b.targetX - b.x;
          const dy = b.targetY - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 15) {
            triggerExplosion(b.targetX, b.targetY, b.damage, b.bet);
          } else {
            const nx = b.x + (dx / dist) * b.speed;
            const ny = b.y + (dy / dist) * b.speed;
            nextBullets.push({ ...b, x: nx, y: ny });
          }
        });
        return nextBullets;
      });

      setJackpot(prev => prev + 1);
    }, 50);

    return () => {
      clearInterval(spawnInterval);
      clearInterval(gameLoop);
    };
  }, [fishGameOpen, fishScreen]);

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

  const updatePoints = async (newPts: number) => {
    setPoints(newPts);
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { points: newPts });
    } catch (err) {
      console.error("Lỗi cập nhật điểm:", err);
    }
  };

  const handleQuickJoin = () => {
    if (points < currentBet) {
      alert("Bạn không đủ điểm để tham gia bắn cá!");
      return;
    }
    setActiveRoom("PHÒNG CHUNG #888");
    setSeatIndex(Math.floor(Math.random() * 4));
    setFishScreen('game');
  };

  const handleJoinCustomRoom = () => {
    if (!roomCodeInput || roomCodeInput.length < 4) {
      alert("Vui lòng nhập mã phòng hợp lệ!");
      return;
    }
    setActiveRoom(`PHÒNG RIÊNG #${roomCodeInput.toUpperCase()}`);
    setSeatIndex(1);
    setFishScreen('game');
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (points < currentBet) {
      alert("Bạn đã hết điểm cược!");
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    updatePoints(points - currentBet);

    const gunX = rect.width / 2;
    const gunY = rect.height - 40;
    const angle = Math.atan2(clickY - gunY, clickX - gunX) * (180 / Math.PI);
    setCannonAngle(angle + 90);

    const newBullet: Bullet = {
      id: Date.now(),
      x: gunX,
      y: gunY,
      targetX: clickX,
      targetY: clickY,
      speed: 25,
      damage: currentBet * (isBigGun ? 1.5 : 1),
      bet: currentBet
    };

    setBullets(prev => [...prev, newBullet]);
  };

  const triggerExplosion = (x: number, y: number, damage: number, bet: number) => {
    setFishes(prevFishes => {
      const updated = prevFishes.map(f => {
        const radius = 60 + bet * 0.1;
        const dist = Math.sqrt((f.x - x) * (f.x - x) + (f.y - y) * (f.y - y));

        if (dist <= radius) {
          const isCrit = Math.random() < 0.2;
          const finalDmg = isCrit ? damage * 2 : damage;
          const newHp = f.hp - finalDmg;

          if (isCrit) {
            showFloatingText("💥 CRIT x2!", x, y, "#facc15");
          }

          if (newHp <= 0) {
            const earned = f.reward * (bet / 10 > 1 ? bet / 10 : 1);
            setPoints(current => {
              const updatedPts = current + earned;
              if (user) {
                updateDoc(doc(db, "users", user.uid), { points: updatedPts }).catch(console.error);
              }
              return updatedPts;
            });
            showFloatingText(`+${earned} PTS`, f.x, f.y, "#4ade80");

            if (f.type === 'rare') {
              const bonusJp = jackpot;
              setPoints(current => {
                const updatedPts = current + earned + bonusJp;
                if (user) {
                  updateDoc(doc(db, "users", user.uid), { points: updatedPts }).catch(console.error);
                }
                return updatedPts;
              });
              showFloatingText(`🎉 NỔ HŨ JACKPOT: +${bonusJp} PTS!`, 400, 200, "#ec4899");
              setJackpot(50000);
            }

            return null;
          }
          return { ...f, hp: newHp };
        }
        return f;
      }).filter(Boolean) as Fish[];

      return updated;
    });
  };

  const showFloatingText = (text: string, x: number, y: number, color: string) => {
    const id = Date.now() + Math.random();
    setEffects(prev => [...prev, { id, text, x, y, color }]);
    setTimeout(() => {
      setEffects(prev => prev.filter(e => e.id !== id));
    }, 1000);
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

              {/* Bắn Cá Ki-Blast (Mở Modal / Trực tiếp) */}
              <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-6 flex flex-col justify-between shadow-xl hover:border-cyan-400 transition">
                <div>
                  <div className="text-4xl mb-2">🎯</div>
                  <h3 className="text-xl font-bold text-cyan-300 mb-1">Bắn Cá Ki-Blast</h3>
                  <p className="text-slate-400 text-sm mt-1 mb-4">
                    Săn rồng biển đại dương bắn đạn chưởng nhận Ki, sát thương lan, crit x2 và nổ hũ Jackpot cực đỉnh!
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFishGameOpen(true);
                    setFishScreen('lobby');
                  }}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black py-2.5 rounded-xl text-center text-sm shadow-md hover:brightness-110 transition cursor-pointer"
                >
                  Vào Bàn Bắn Cá 🎯
                </button>
              </div>

            </div>
          </section>
        </main>

        {/* MODAL GAME BẮN CÁ KI-BLAST */}
        {fishGameOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-slate-900 border-2 border-cyan-500/60 rounded-3xl w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden shadow-2xl">
              
              {/* Header Modal */}
              <div className="bg-slate-800 border-b border-cyan-500/30 px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🦈</span>
                  <span className="font-black text-base text-cyan-400 tracking-wider">
                    BẮN CÁ KI-BLAST - ĐẠI DƯƠNG RỒNG THẦN
                  </span>
                </div>
                <button
                  onClick={() => setFishGameOpen(false)}
                  className="bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/40 px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Đóng ✖
                </button>
              </div>

              {/* Nội dung Modal: Sảnh hoặc Phòng Bắn Cá */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
                {fishScreen === 'lobby' ? (
                  <div className="w-full max-w-md flex flex-col gap-4 my-auto">
                    <div className="bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-500/30 p-6 rounded-3xl text-center shadow-2xl backdrop-blur-md">
                      <div className="text-4xl mb-2">🌊 🐠 🐋 🦈</div>
                      <h2 className="text-xl font-black text-cyan-300 mb-1">SẢNH BẮN CÁ NHIỀU NGƯỜI</h2>
                      <p className="text-xs text-slate-400 mb-6">Tự động ghép phòng hoặc tạo phòng riêng chiến cùng anh em!</p>

                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 mb-6 text-amber-300 text-xs font-bold animate-pulse">
                        🎁 HŨ JACKPOT HIỆN TẠI: {jackpot.toLocaleString()} PTS 🪙
                      </div>

                      <button
                        onClick={handleQuickJoin}
                        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black rounded-2xl shadow-lg hover:brightness-110 transition cursor-pointer text-sm mb-4 uppercase tracking-wider"
                      >
                        ⚡ CHƠI NGAY (Ghép Phòng Tự Động)
                      </button>

                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          placeholder="NHẬP MÃ PHÒNG (VD: 1234)"
                          maxLength={6}
                          value={roomCodeInput}
                          onChange={(e) => setRoomCodeInput(e.target.value)}
                          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-center tracking-widest font-mono text-white focus:outline-none focus:border-cyan-500 text-xs uppercase"
                        />
                        <button
                          onClick={handleJoinCustomRoom}
                          className="px-6 bg-slate-800 hover:bg-slate-700 font-bold text-xs rounded-2xl transition cursor-pointer border border-slate-700"
                        >
                          Vào Phòng
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center w-full max-w-3xl">
                    <div className="w-full flex justify-between items-center bg-slate-900 px-4 py-2 rounded-t-2xl border border-slate-800 text-xs font-bold">
                      <span className="text-cyan-400 flex items-center gap-1">
                        🌊 {activeRoom} | Ghế #{seatIndex + 1}
                      </span>
                      <span className="text-pink-400 font-black animate-bounce">
                        🎁 JACKPOT: {jackpot.toLocaleString()} PTS
                      </span>
                      <button
                        onClick={() => setFishScreen('lobby')}
                        className="bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/40 px-3 py-1 rounded-lg text-xs transition cursor-pointer"
                      >
                        Đổi Phòng ⇄
                      </button>
                    </div>

                    <div
                      onClick={handleCanvasClick}
                      className="relative w-full h-[420px] sm:h-[480px] bg-gradient-to-b from-blue-900 via-blue-950 to-slate-950 border-4 border-blue-800/80 rounded-b-3xl shadow-2xl overflow-hidden cursor-crosshair"
                    >
                      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] animate-pulse" />

                      {fishes.map(f => (
                        <div
                          key={f.id}
                          style={{ transform: `translate(${f.x}px, ${f.y}px)`, width: f.size, height: f.size }}
                          className="absolute transition-transform duration-75 flex flex-col items-center justify-center group select-none pointer-events-none"
                        >
                          <div className="text-3xl sm:text-4xl drop-shadow-[0_10px_8px_rgba(0,0,0,0.8)] animate-bounce">
                            {f.icon}
                          </div>
                          {f.hp < f.maxHp && (
                            <div className="w-10 bg-slate-800 h-1 rounded-full overflow-hidden border border-slate-700 mt-0.5">
                              <div
                                className="bg-emerald-400 h-full transition-all duration-200"
                                style={{ width: `${(f.hp / f.maxHp) * 100}%` }}
                              />
                            </div>
                          )}
                        </div>
                      ))}

                      {bullets.map(b => (
                        <div
                          key={b.id}
                          style={{ left: b.x, top: b.y }}
                          className="absolute w-3 h-3 bg-yellow-300 rounded-full shadow-[0_0_10px_#facc15] pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                        />
                      ))}

                      {effects.map(eff => (
                        <div
                          key={eff.id}
                          style={{ left: eff.x, top: eff.y, color: eff.color }}
                          className="absolute font-black text-sm sm:text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] pointer-events-none animate-fade-up transform -translate-x-1/2 -translate-y-1/2"
                        >
                          {eff.text}
                        </div>
                      ))}

                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex flex-col items-center pointer-events-none">
                        <div
                          style={{ transform: `rotate(${cannonAngle}deg)` }}
                          className="text-4xl sm:text-5xl transition-transform duration-100 drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]"
                        >
                          {isBigGun ? '🚀' : '🔫'}
                        </div>
                        <div className="bg-slate-900/80 border border-cyan-500/50 px-3 py-0.5 rounded-full text-[10px] text-cyan-300 font-bold mt-1">
                          Cược: {currentBet} PTS
                        </div>
                      </div>
                    </div>

                    <div className="w-full bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-2xl mt-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
                      <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center sm:text-left">
                          Chọn Cấp Cược Đạn (Sát thương lan rộng theo cược)
                        </span>
                        <div className="grid grid-cols-6 gap-1.5">
                          {BET_LEVELS.map(lvl => (
                            <button
                              key={lvl}
                              onClick={() => setCurrentBet(lvl)}
                              className={`py-2 px-2 text-xs font-black rounded-xl border transition cursor-pointer ${
                                currentBet === lvl
                                  ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-md scale-105'
                                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800'
                              }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => setIsBigGun(!isBigGun)}
                          className={`py-3 px-5 rounded-xl font-black text-xs transition cursor-pointer border shadow-md flex items-center gap-1.5 ${
                            isBigGun
                              ? 'bg-gradient-to-r from-pink-500 to-rose-600 border-pink-400 text-white animate-pulse'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <span>{isBigGun ? '🚀 SÚNG VIP (Kích hoạt)' : '🔭 Phóng to Súng'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

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
