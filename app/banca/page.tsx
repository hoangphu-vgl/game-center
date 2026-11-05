"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, onSnapshot } from "firebase/firestore";

interface GunConfig {
  level: number;
  cost: number;
  name: string;
  damage: number;
  speed: number;
  size: number;
  color: string;
}

interface FishData {
  id: string;
  typeId: string;
  name: string;
  emoji: string;
  width: number;
  height: number;
  speed: number;
  hp: number;
  maxHp: number;
  reward: number;
  category: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hitTimer: number;
  dead?: boolean;
}

const GUN_TYPES: GunConfig[] = [
  { level: 1, cost: 1, name: "Đạn 1đ (Dame: 1)", damage: 1, speed: 12, size: 4, color: '#a855f7' },
  { level: 2, cost: 10, name: "Đạn 10đ (Dame: 10)", damage: 10, speed: 13, size: 5, color: '#38bdf8' },
  { level: 3, cost: 20, name: "Đạn 20đ (Dame: 20)", damage: 20, speed: 14, size: 6, color: '#22d3ee' },
  { level: 4, cost: 50, name: "Đạn 50đ (Dame: 50)", damage: 50, speed: 15, size: 7, color: '#facc15' },
  { level: 5, cost: 100, name: "Đạn 100đ (Dame: 100)", damage: 100, speed: 16, size: 8, color: '#f97316' },
  { level: 6, cost: 200, name: "Đạn 200đ (Dame: 200)", damage: 200, speed: 17, size: 9, color: '#ec4899' },
  { level: 7, cost: 500, name: "Đạn 500đ (Dame: 500)", damage: 500, speed: 19, size: 10, color: '#ef4444' }
];

// Tăng lượng máu (HP) và phần thưởng cho cá trâu hơn để thử thách độ khó
const FISH_TYPES_BASE = [
  { id: 's1', name: 'Cá Nhỏ 1', emoji: '🐟', width: 90, height: 56, speed: 3.2, hpMin: 3, hpMax: 8, reward: 15, category: 'small' },
  { id: 's2', name: 'Cá Nhỏ 2', emoji: '🐠', width: 100, height: 60, speed: 3.0, hpMin: 4, hpMax: 10, reward: 20, category: 'small' },
  { id: 's3', name: 'Cá Nhỏ 3', emoji: '🦐', width: 80, height: 48, speed: 3.5, hpMin: 3, hpMax: 8, reward: 12, category: 'small' },
  { id: 'm1', name: 'Cá Trung 1', emoji: '🐡', width: 180, height: 116, speed: 2.0, hpMin: 40, hpMax: 90, reward: 80, category: 'medium' },
  { id: 'm2', name: 'Cá Trung 2', emoji: '🐬', width: 210, height: 126, speed: 1.8, hpMin: 60, hpMax: 150, reward: 120, category: 'medium' },
  { id: 'l1', name: 'Cá Mập Boss', emoji: '🦈', width: 440, height: 280, speed: 1.1, hpMin: 500, hpMax: 1200, reward: 600, category: 'large' },
  { id: 'l2', name: 'Nàng Tiên Cá', emoji: '🧜‍♀️', width: 360, height: 240, speed: 1.2, hpMin: 400, hpMax: 1000, reward: 500, category: 'large' },
  { id: 'l3', name: 'Rồng Biển Trâu', emoji: '🐉', width: 520, height: 320, speed: 0.9, hpMin: 800, hpMax: 1800, reward: 1000, category: 'large' }
];

export default function BanCaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(1000);
  const [jackpotPool, setJackpotPool] = useState<number>(20000); // Khởi điểm 20.000đ tích lũy
  
  // Trạng thái phòng & chế độ
  const [screenMode, setScreenMode] = useState<'lobby' | 'game'>('lobby');
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [isPVE, setIsPVE] = useState<boolean>(true);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [myCorner, setMyCorner] = useState<string>('bottom-right');

  const [currentGunIndex, setCurrentGunIndex] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const fishesRef = useRef<FishData[]>([]);
  const bulletsRef = useRef<any[]>([]);
  const explosionsRef = useRef<any[]>([]);
  const floatingTextsRef = useRef<any[]>([]);
  const bubblesRef = useRef<any[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const roomPlayersRef = useRef<{ [key: string]: { active: boolean; email: string } }>({
    'top-left': { active: false, email: 'Trống' },
    'top-right': { active: false, email: 'Trống' },
    'bottom-left': { active: false, email: 'Trống' },
    'bottom-right': { active: true, email: 'Bạn' }
  });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setPoints(userSnap.data().points || 1000);
          }
        } catch (e) {
          console.error("Lỗi lấy điểm user:", e);
        }
      }
    });

    // Lắng nghe hũ Jackpot realtime
    const jpRef = doc(db, "gameSettings", "bancaJackpot");
    const unsubJp = onSnapshot(jpRef, (docSnap) => {
      if (docSnap.exists()) {
        setJackpotPool(docSnap.data().amount || 20000);
      } else {
        setDoc(jpRef, { amount: 20000 });
      }
    });

    return () => {
      unsubAuth();
      unsubJp();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const updatePointsInFirestore = async (newPts: number) => {
    setPoints(newPts);
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { points: newPts });
    } catch (e) {
      console.error("Lỗi lưu điểm:", e);
    }
  };

  const updateJackpotInFirestore = async (newAmount: number) => {
    setJackpotPool(newAmount);
    try {
      const jpRef = doc(db, "gameSettings", "bancaJackpot");
      await setDoc(jpRef, { amount: newAmount }, { merge: true });
    } catch (e) {}
  };

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
  };

  const playShootSound = () => {
    if (isMuted || !audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  };

  const playCatchSound = (reward: number) => {
    if (isMuted || !audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const startFreq = reward >= 150 ? 523.25 : 392.00;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 1.5, now + 0.15);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.2);
    } catch (e) {}
  };

  // Khởi tạo bong bóng nước nền
  useEffect(() => {
    const bubbles = [];
    for (let i = 0; i < 35; i++) {
      bubbles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: Math.random() * 5 + 2,
        speed: Math.random() * 1.2 + 0.4,
        opacity: Math.random() * 0.3 + 0.1
      });
    }
    bubblesRef.current = bubbles;
  }, []);

  // Lắng nghe phòng Realtime qua Firestore (giống Xì Dách)
  useEffect(() => {
    if (!activeRoomId || isPVE) return;

    const roomRef = doc(db, "banca_rooms", activeRoomId);
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.players) {
          roomPlayersRef.current = data.players;
        }
      }
    });

    return () => unsubscribe();
  }, [activeRoomId, isPVE]);

  // Main Canvas Loop
  useEffect(() => {
    if (screenMode !== 'game') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const spawnFish = (w: number, h: number) => {
      if (fishesRef.current.length < 24 && Math.random() < 0.3) {
        const rand = Math.random();
        let template;
        if (rand < 0.05) {
          const lg = FISH_TYPES_BASE.filter(f => f.category === 'large');
          template = lg[Math.floor(Math.random() * lg.length)];
        } else if (rand < 0.30) {
          const med = FISH_TYPES_BASE.filter(f => f.category === 'medium');
          template = med[Math.floor(Math.random() * med.length)];
        } else {
          const sm = FISH_TYPES_BASE.filter(f => f.category === 'small');
          template = sm[Math.floor(Math.random() * sm.length)];
        }

        if (template) {
          const dir = Math.floor(Math.random() * 4);
          let x = 0, y = 0, vx = 0, vy = 0;
          const speed = template.speed;

          if (dir === 0) {
            x = -template.width; y = Math.random() * h;
            vx = (Math.random() * 0.5 + 0.8) * speed; vy = (Math.random() - 0.5) * speed;
          } else if (dir === 1) {
            x = w + template.width; y = Math.random() * h;
            vx = -(Math.random() * 0.5 + 0.8) * speed; vy = (Math.random() - 0.5) * speed;
          } else if (dir === 2) {
            x = Math.random() * w; y = -template.height;
            vx = (Math.random() - 0.5) * speed; vy = (Math.random() * 0.5 + 0.8) * speed;
          } else {
            x = Math.random() * w; y = h + template.height;
            vx = (Math.random() - 0.5) * speed; vy = -(Math.random() * 0.5 + 0.8) * speed;
          }

          const hp = Math.floor(Math.random() * (template.hpMax - template.hpMin + 1)) + template.hpMin;
          const fishObj: FishData = {
            id: 'f_' + Math.random().toString(36).substring(2, 9),
            typeId: template.id,
            name: template.name,
            emoji: template.emoji,
            width: template.width,
            height: template.height,
            speed: template.speed,
            hp,
            maxHp: hp,
            reward: template.reward,
            category: template.category,
            x, y, vx, vy,
            hitTimer: 0
          };
          fishesRef.current.push(fishObj);
        }
      }
    };

    const render = () => {
      if (!isPaused) {
        const w = canvas.width;
        const h = canvas.height;

        bubblesRef.current.forEach(b => {
          b.y -= b.speed;
          if (b.y < -10) { b.y = h + 10; b.x = Math.random() * w; }
        });

        bulletsRef.current.forEach(b => {
          b.x += b.vx;
          b.y += b.vy;
          if (b.x < -20 || b.x > w + 20 || b.y < -20 || b.y > h + 20) {
            b.alive = false;
          }
        });
        bulletsRef.current = bulletsRef.current.filter(b => b.alive);

        explosionsRef.current.forEach(ex => {
          ex.radius += 4;
          ex.alpha -= 0.06;
        });
        explosionsRef.current = explosionsRef.current.filter(ex => ex.alpha > 0);

        floatingTextsRef.current.forEach(ft => {
          ft.y += ft.vy;
          ft.alpha -= 0.02;
        });
        floatingTextsRef.current = floatingTextsRef.current.filter(ft => ft.alpha > 0);

        fishesRef.current.forEach(f => {
          f.x += f.vx;
          f.y += f.vy;
          if (f.hitTimer > 0) f.hitTimer--;
        });
        fishesRef.current = fishesRef.current.filter(f => f.x > -300 && f.x < w + 300 && f.y > -300 && f.y < h + 300);

        bulletsRef.current.forEach(bullet => {
          if (!bullet.alive) return;
          fishesRef.current.forEach(fish => {
            if (!bullet.alive || fish.dead) return;
            const dist = Math.hypot(bullet.x - fish.x, bullet.y - fish.y);
            if (dist < bullet.radius + fish.width / 2.5) {
              bullet.alive = false;
              explosionsRef.current.push({ x: bullet.x, y: bullet.y, radius: 10, maxRadius: 75, color: bullet.color, alpha: 1 });

              fish.hp -= bullet.damage;
              fish.hitTimer = 4;

              if (fish.hp <= 0 && !fish.dead) {
                fish.dead = true;
                let reward = fish.reward;
                let isJackpot = false;

                if (fish.category === 'large' && Math.random() < 0.12) {
                  reward += jackpotPool;
                  isJackpot = true;
                  updateJackpotInFirestore(20000); // Reset về 20.000đ
                }

                setPoints(prev => {
                  const updated = prev + reward;
                  updatePointsInFirestore(updated);
                  return updated;
                });

                playCatchSound(reward);

                if (isJackpot) {
                  showToast(`🎉 NỔ HŨ JACKPOT LỚN +${reward.toLocaleString()}đ!`);
                  floatingTextsRef.current.push({ text: `JACKPOT +${reward}`, x: fish.x, y: fish.y, alpha: 1, vy: -1.5, color: '#f59e0b' });
                } else {
                  floatingTextsRef.current.push({ text: `+${reward}đ`, x: fish.x, y: fish.y, alpha: 1, vy: -1.5, color: '#facc15' });
                }
              }
            }
          });
        });
        fishesRef.current = fishesRef.current.filter(f => !f.dead);

        if (isPVE || isHost) {
          spawnFish(w, h);
        }

        ctx.clearRect(0, 0, w, h);

        bubblesRef.current.forEach(b => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${b.opacity})`;
          ctx.fill();
          ctx.restore();
        });

        fishesRef.current.forEach(f => {
          ctx.save();
          ctx.translate(f.x, f.y);
          if (f.vx < 0) ctx.scale(-1, 1);
          if (f.hitTimer > 0) ctx.filter = 'brightness(2.2)';
          ctx.font = `${f.height}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(f.emoji, 0, 0);
          ctx.restore();
        });

        bulletsRef.current.forEach(b => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius + 6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius + 3, 0, Math.PI * 2);
          ctx.fillStyle = b.color;
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 22;
          ctx.fill();
          ctx.restore();
        });

        explosionsRef.current.forEach(ex => {
          if (ex.alpha <= 0) return;
          ctx.save();
          ctx.globalAlpha = Math.max(0, ex.alpha);
          ctx.beginPath();
          ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
          ctx.strokeStyle = ex.color;
          ctx.lineWidth = 5;
          ctx.shadowColor = ex.color;
          ctx.shadowBlur = 25;
          ctx.stroke();
          ctx.restore();
        });

        floatingTextsRef.current.forEach(ft => {
          ctx.save();
          ctx.globalAlpha = Math.max(0, ft.alpha);
          ctx.font = '900 20px Fredoka, sans-serif';
          ctx.fillStyle = ft.color;
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 6;
          ctx.fillText(ft.text, ft.x, ft.y);
          ctx.restore();
        });

        // Vẽ các vị trí súng 4 góc phòng PVP / PVE
        const drawTurret = (x: number, y: number, cornerKey: string, label: string) => {
          ctx.save();
          ctx.translate(x, y);
          const pData = roomPlayersRef.current[cornerKey];
          let angle = -Math.PI / 2;
          if (pData && pData.active) {
            angle = Math.atan2(mousePosRef.current.y - y, mousePosRef.current.x - x);
          }
          ctx.beginPath();
          ctx.arc(0, 0, 48, 0, Math.PI * 2);
          ctx.fillStyle = pData && pData.active ? '#0f172a' : '#1e293b';
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = pData && pData.active ? '#38bdf8' : '#475569';
          ctx.stroke();

          ctx.rotate(angle);
          ctx.fillStyle = pData && pData.active ? '#f59e0b' : '#64748b';
          ctx.fillRect(0, -16, 60, 32);
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#ffffff';
          ctx.strokeRect(0, -16, 60, 32);
          ctx.fillStyle = '#b45309';
          ctx.fillRect(52, -20, 10, 40);
          ctx.restore();

          ctx.font = "bold 11px Fredoka, sans-serif";
          ctx.fillStyle = pData && pData.active ? "#facc15" : "#94a3b8";
          ctx.textAlign = 'center';
          ctx.fillText(pData && pData.active ? `${label}: ${pData.email.split('@')[0]}` : "Đang trống", x, y + (y > h / 2 ? 55 - 4 : 45));
        };

        if (!isPVE) {
          drawTurret(70, 70, 'top-left', 'P2');
          drawTurret(w - 70, 70, 'top-right', 'P3');
          drawTurret(70, h - 70, 'bottom-left', 'P4');
        }
        drawTurret(w - 70, h - 70, 'bottom-right', isPVE ? 'P1 (Solo)' : 'P1 (Bạn)');
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [screenMode, isPaused, isPVE, isHost, activeRoomId, jackpotPool, isMuted]);

  const handleShoot = () => {
    initAudio();
    const gun = GUN_TYPES[currentGunIndex];
    if (points < gun.cost) {
      showToast("Ví của bạn không đủ điểm để bắn mức đạn này!");
      return;
    }

    const newPts = points - gun.cost;
    updatePointsInFirestore(newPts);
    updateJackpotInFirestore(jackpotPool + Math.round(gun.cost * 0.2));

    const w = window.innerWidth;
    const h = window.innerHeight;
    let startX = w - 70, startY = h - 70;
    if (myCorner === 'bottom-left') { startX = 70; startY = h - 70; }
    else if (myCorner === 'top-left') { startX = 70; startY = 70; }
    else if (myCorner === 'top-right') { startX = w - 70; startY = 70; }

    const angle = Math.atan2(mousePosRef.current.y - startY, mousePosRef.current.x - startX);
    bulletsRef.current.push({
      x: startX,
      y: startY,
      radius: gun.size,
      color: gun.color,
      damage: gun.damage,
      vx: Math.cos(angle) * gun.speed,
      vy: Math.sin(angle) * gun.speed,
      alive: true
    });

    playShootSound();
  };

  // Tính năng phóng to toàn màn hình (Fullscreen) cho mobile màn hình ngang
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const handleCreateRoom = async () => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setActiveRoomId(roomId);
    setIsHost(true);
    setIsPVE(false);
    setMyCorner('bottom-right');

    const newPlayers = {
      'top-left': { active: false, email: 'Trống' },
      'top-right': { active: false, email: 'Trống' },
      'bottom-left': { active: false, email: 'Trống' },
      'bottom-right': { active: true, email: user?.email || 'Chủ phòng' }
    };
    roomPlayersRef.current = newPlayers;

    await setDoc(doc(db, "banca_rooms", roomId), {
      creator: user?.email || 'Host',
      status: 'playing',
      players: newPlayers
    });

    setScreenMode('game');
    showToast(`✨ Tạo phòng thành công! Mã phòng: ${roomId}`);
  };

  const handleJoinRoom = async () => {
    const roomId = roomCodeInput.trim().toUpperCase();
    if (!roomId) {
      showToast("Vui lòng nhập mã phòng!");
      return;
    }

    const roomRef = doc(db, "banca_rooms", roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      showToast("Phòng không tồn tại!");
      return;
    }

    const data = roomSnap.data();
    setActiveRoomId(roomId);
    setIsHost(false);
    setIsPVE(false);

    const players = data.players || {};
    let corner = 'bottom-right';
    if (!players['bottom-left'] || !players['bottom-left'].active) corner = 'bottom-left';
    else if (!players['top-left'] || !players['top-left'].active) corner = 'top-left';
    else if (!players['top-right'] || !players['top-right'].active) corner = 'top-right';

    setMyCorner(corner);
    players[corner] = { active: true, email: user?.email || 'Thành viên' };
    roomPlayersRef.current = players;

    await updateDoc(roomRef, { players });

    setScreenMode('game');
    showToast(`🎉 Vào phòng ${roomId} thành công!`);
  };

  const handleLeaveRoom = async () => {
    if (activeRoomId && !isPVE) {
      const roomRef = doc(db, "banca_rooms", activeRoomId);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const players = roomSnap.data().players || {};
        if (players[myCorner]) {
          players[myCorner] = { active: false, email: 'Trống' };
          await updateDoc(roomRef, { players });
        }
      }
    }
    setActiveRoomId(null);
    setIsPVE(true);
    setIsHost(false);
    setScreenMode('lobby');
    showToast("Đã rời phòng về sảnh chính.");
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-slate-950 font-sans select-none flex flex-col">
      {screenMode === 'lobby' ? (
        /* SẢNH CHỜ VÀO PHÒNG / MÃ PHÒNG (REALTIME Y CHANG XÌ DÁCH) */
        <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950">
          <div className="bg-slate-900/90 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl backdrop-blur-xl text-center space-y-6">
            <div className="text-5xl animate-bounce">🦈 🌊 🪙</div>
            <div>
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 uppercase tracking-wide">
                ĐẠI DƯƠNG BẮN CÁ KI-BLAST
              </h1>
              <p className="text-xs text-slate-400 mt-1">Chơi đơn Solo hoặc kết nối phòng Realtime cùng bạn bè!</p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-amber-300 text-xs font-bold animate-pulse">
              👑 HŨ JACKPOT: {jackpotPool.toLocaleString()} đ 🪙
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { setIsPVE(true); setScreenMode('game'); }}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 font-black rounded-2xl shadow-lg transition uppercase text-xs tracking-wider cursor-pointer"
              >
                ⚡ CHƠI ĐƠN (SOLO PVE)
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-slate-500 text-[10px] font-bold uppercase">Hoặc Phòng PVP</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <button
                onClick={handleCreateRoom}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-md transition text-xs cursor-pointer"
              >
                ✨ Tạo Phòng Mới
              </button>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="NHẬP MÃ PHÒNG (VD: AB12)"
                  maxLength={6}
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-2xl text-xs text-center font-bold uppercase text-amber-300 outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleJoinRoom}
                  className="px-5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-2xl shadow transition cursor-pointer"
                >
                  Vào Phòng
                </button>
              </div>
            </div>

            <div>
              <Link href="/" className="text-xs font-semibold text-slate-400 hover:text-amber-400 transition">
                ← Quay lại Trang Chủ
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* GIAO DIỆN TRONG GAME (MÀN HÌNH NGANG MOBILE TỐI ƯU) */
        <div className="relative w-full h-full overflow-hidden flex flex-col">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
            onMouseMove={(e) => { mousePosRef.current = { x: e.clientX, y: e.clientY }; }}
            onTouchMove={(e) => {
              if (e.touches.length > 0) {
                mousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
              }
            }}
            onClick={handleShoot}
            onTouchStart={(e) => {
              if (e.touches.length > 0) {
                mousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
              }
              handleShoot();
            }}
          />

          {/* Top HUD Header */}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-center z-20 pointer-events-none">
            {/* Ví Điểm */}
            <div className="bg-slate-900/90 backdrop-blur-md border border-yellow-500/30 rounded-2xl px-3 py-1.5 flex items-center gap-2 pointer-events-auto shadow-lg">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-300 flex items-center justify-center text-yellow-950 font-black text-xs shadow-md">
                🪙
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-yellow-200/70 font-bold">Ví Điểm</div>
                <div className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-orange-400">
                  {points.toLocaleString()} đ
                </div>
              </div>
            </div>

            {/* Các nút điều khiển & Phóng to */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {!isPVE && activeRoomId && (
                <button
                  onClick={handleLeaveRoom}
                  className="bg-amber-950/80 backdrop-blur-md border border-amber-500/50 hover:bg-amber-900 text-amber-200 px-2.5 py-1.5 rounded-xl text-[11px] font-bold shadow-md transition"
                >
                  Phòng: #{activeRoomId} (Rời)
                </button>
              )}

              <button
                onClick={toggleFullscreen}
                className="w-8 h-8 bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-300 text-xs shadow-md"
                title="Phóng to màn hình"
              >
                {isFullscreen ? '🗗' : '⛶'}
              </button>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="w-8 h-8 bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 rounded-xl flex items-center justify-center text-cyan-300 text-xs shadow-md"
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="w-8 h-8 bg-slate-900/90 backdrop-blur-md border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-300 text-xs shadow-md"
              >
                {isPaused ? '▶' : '⏸'}
              </button>
              <button
                onClick={() => setScreenMode('lobby')}
                className="bg-red-950/80 backdrop-blur-md border border-red-500/50 hover:bg-red-900 text-red-200 px-2.5 py-1.5 rounded-xl text-[11px] font-bold shadow-md transition"
              >
                Thoát ✕
              </button>
            </div>
          </div>

          {/* Hũ Jackpot tích lũy ở giữa */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="bg-gradient-to-b from-amber-950/90 to-slate-950/90 backdrop-blur-md border border-amber-400/80 px-4 py-1 rounded-xl text-center shadow-xl animate-pulse">
              <div className="text-[8px] text-amber-300 font-extrabold uppercase tracking-widest">
                👑 JACKPOT RỒNG THẦN 👑
              </div>
              <div className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-orange-400">
                {jackpotPool.toLocaleString()} đ
              </div>
            </div>
          </div>

          {/* Thanh công cụ súng dưới góc (tối ưu mobile ngang) */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 pointer-events-auto">
            <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-400/30 px-3 py-1.5 rounded-2xl flex items-center gap-2.5 shadow-xl">
              <button
                onClick={() => setCurrentGunIndex((prev) => (prev - 1 + GUN_TYPES.length) % GUN_TYPES.length)}
                className="w-6 h-6 rounded-full bg-slate-800 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-xs hover:bg-slate-700 transition cursor-pointer"
              >
                -
              </button>
              <div className="text-center min-w-[120px]">
                <div className="text-[11px] text-cyan-300 font-bold uppercase tracking-wider">{GUN_TYPES[currentGunIndex].name}</div>
                <div className="text-[9px] text-yellow-300 font-semibold">
                  {isPVE ? "Solo Đại Dương" : `Phòng #${activeRoomId} (${myCorner})`}
                </div>
              </div>
              <button
                onClick={() => setCurrentGunIndex((prev) => (prev + 1) % GUN_TYPES.length)}
                className="w-6 h-6 rounded-full bg-slate-800 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-xs hover:bg-slate-700 transition cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {toastMsg && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-red-950/90 border border-red-500/60 text-red-200 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xl animate-bounce pointer-events-none">
              ⚠️ {toastMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}