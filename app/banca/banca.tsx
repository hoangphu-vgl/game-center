"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, onValue, set, push, remove } from "firebase/database";

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

const FISH_TYPES_BASE = [
  { id: 's1', name: 'Cá Nhỏ 1', emoji: '🐟', width: 90, height: 56, speed: 3.2, hpMin: 2, hpMax: 5, reward: 15, category: 'small' },
  { id: 's2', name: 'Cá Nhỏ 2', emoji: '🐠', width: 100, height: 60, speed: 3.0, hpMin: 2, hpMax: 5, reward: 20, category: 'small' },
  { id: 's3', name: 'Cá Nhỏ 3', emoji: '🦐', width: 80, height: 48, speed: 3.5, hpMin: 2, hpMax: 4, reward: 12, category: 'small' },
  { id: 'm1', name: 'Cá Trung 1', emoji: '🐡', width: 180, height: 116, speed: 2.0, hpMin: 20, hpMax: 50, reward: 80, category: 'medium' },
  { id: 'm2', name: 'Cá Trung 2', emoji: '🐬', width: 210, height: 126, speed: 1.8, hpMin: 30, hpMax: 80, reward: 120, category: 'medium' },
  { id: 'l1', name: 'Cá Mập Boss', emoji: '🦈', width: 440, height: 280, speed: 1.1, hpMin: 300, hpMax: 800, reward: 600, category: 'large' },
  { id: 'l2', name: 'Nàng Tiên Cá', emoji: '🧜‍♀️', width: 360, height: 240, speed: 1.2, hpMin: 200, hpMax: 600, reward: 500, category: 'large' },
  { id: 'l3', name: 'Rồng Biển Trâu', emoji: '🐉', width: 520, height: 320, speed: 0.9, hpMin: 500, hpMax: 1000, reward: 1000, category: 'large' }
];

export default function BanCaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(1000);
  const [jackpotPool, setJackpotPool] = useState<number>(258900);
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [isPVE, setIsPVE] = useState<boolean>(true);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [myCorner, setMyCorner] = useState<string>('bottom-right');
  
  const [currentGunIndex, setCurrentGunIndex] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const fishesRef = useRef<FishData[]>([]);
  const bulletsRef = useRef<any[]>([]);
  const explosionsRef = useRef<any[]>([]);
  const floatingTextsRef = useRef<any[]>([]);
  const bubblesRef = useRef<any[]>([]);

  const roomPlayersRef = useRef<{ [key: string]: { active: boolean; email: string } }>({
    'top-left': { active: false, email: 'Trống' },
    'top-right': { active: false, email: 'Trống' },
    'bottom-left': { active: false, email: 'Trống' },
    'bottom-right': { active: true, email: 'Bạn' }
  });

  const audioCtxRef = useRef<AudioContext | null>(null);

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

    const jpRef = ref(db, 'banca_pvp_jackpot');
    const unsubJp = onValue(jpRef, (snapshot) => {
      if (snapshot.exists()) {
        setJackpotPool(snapshot.val());
      } else {
        set(jpRef, 258900);
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

  // Main Canvas Loop
  useEffect(() => {
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
      if (fishesRef.current.length < 22 && Math.random() < 0.28) {
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
            reward: isPVE ? Math.round(template.reward * 0.7) : template.reward,
            category: template.category,
            x, y, vx, vy,
            hitTimer: 0
          };

          if (isPVE) {
            fishesRef.current.push(fishObj);
          } else if (isHost && activeRoomId) {
            const newRef = push(ref(db, `banca_rooms/${activeRoomId}/fishes`));
            fishObj.id = newRef.key as string;
            set(newRef, fishObj);
          }
        }
      }
    };

    const render = () => {
      if (!isPaused) {
        const w = canvas.width;
        const h = canvas.height;

        // Cập nhật bong bóng
        bubblesRef.current.forEach(b => {
          b.y -= b.speed;
          if (b.y < -10) { b.y = h + 10; b.x = Math.random() * w; }
        });

        // Cập nhật đạn
        bulletsRef.current.forEach(b => {
          b.x += b.vx;
          b.y += b.vy;
          if (b.x < -20 || b.x > w + 20 || b.y < -20 || b.y > h + 20) {
            b.alive = false;
          }
        });
        bulletsRef.current = bulletsRef.current.filter(b => b.alive);

        // Cập nhật hiệu ứng nổ
        explosionsRef.current.forEach(ex => {
          ex.radius += 4;
          ex.alpha -= 0.06;
        });
        explosionsRef.current = explosionsRef.current.filter(ex => ex.alpha > 0);

        // Cập nhật chữ nổi
        floatingTextsRef.current.forEach(ft => {
          ft.y += ft.vy;
          ft.alpha -= 0.02;
        });
        floatingTextsRef.current = floatingTextsRef.current.filter(ft => ft.alpha > 0);

        // Cập nhật cá
        fishesRef.current.forEach(f => {
          f.x += f.vx;
          f.y += f.vy;
          if (f.hitTimer > 0) f.hitTimer--;
        });
        fishesRef.current = fishesRef.current.filter(f => f.x > -300 && f.x < w + 300 && f.y > -300 && f.y < h + 300);

        // Va chạm đạn & cá
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

              if (activeRoomId && !isPVE) {
                set(ref(db, `banca_rooms/${activeRoomId}/fishes/${fish.id}/hp`), fish.hp);
              }

              if (fish.hp <= 0 && !fish.dead) {
                fish.dead = true;
                let reward = fish.reward;
                let isJackpot = false;

                if (fish.category === 'large' && Math.random() < 0.15) {
                  reward += jackpotPool;
                  isJackpot = true;
                  set(ref(db, 'banca_pvp_jackpot'), 20000);
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

                if (activeRoomId && !isPVE) {
                  remove(ref(db, `banca_rooms/${activeRoomId}/fishes/${fish.id}`));
                }
              }
            }
          });
        });
        fishesRef.current = fishesRef.current.filter(f => !f.dead);

        if (isPVE || isHost) {
          spawnFish(w, h);
        }

        // --- DRAW SECTION ---
        ctx.clearRect(0, 0, w, h);

        // Vẽ bong bóng
        bubblesRef.current.forEach(b => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${b.opacity})`;
          ctx.fill();
          ctx.restore();
        });

        // Vẽ cá
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

        // Vẽ đạn
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

        // Vẽ nổ
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

        // Vẽ chữ điểm nổi
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

        // Vẽ các góc súng người chơi
        const drawTurret = (x: number, y: number, cornerKey: string, label: string) => {
          ctx.save();
          ctx.translate(x, y);
          const pData = roomPlayersRef.current[cornerKey];
          let angle = -Math.PI / 2;
          if (pData.active) {
            angle = Math.atan2(mousePosRef.current.y - y, mousePosRef.current.x - x);
          }
          ctx.beginPath();
          ctx.arc(0, 0, 52, 0, Math.PI * 2);
          ctx.fillStyle = pData.active ? '#0f172a' : '#1e293b';
          ctx.fill();
          ctx.lineWidth = 5;
          ctx.strokeStyle = pData.active ? '#38bdf8' : '#475569';
          ctx.stroke();

          ctx.rotate(angle);
          ctx.fillStyle = pData.active ? '#f59e0b' : '#64748b';
          ctx.fillRect(0, -18, 68, 36);
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#ffffff';
          ctx.strokeRect(0, -18, 68, 36);
          ctx.fillStyle = '#b45309';
          ctx.fillRect(60, -22, 10, 44);
          ctx.restore();

          ctx.font = "bold 13px Fredoka, sans-serif";
          ctx.fillStyle = pData.active ? "#facc15" : "#94a3b8";
          ctx.textAlign = 'center';
          ctx.fillText(pData.active ? label : "Đang trống", x, y + (y > h / 2 ? 62 : -48));
        };

        if (!isPVE) {
          drawTurret(80, 80, 'top-left', 'P2');
          drawTurret(w - 80, 80, 'top-right', 'P3');
          drawTurret(80, h - 80, 'bottom-left', 'P4');
        }
        drawTurret(w - 90, h - 90, 'bottom-right', isPVE ? 'P1 (Solo PVE)' : 'P1 (Bạn)');
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isPaused, isPVE, isHost, activeRoomId, jackpotPool, isMuted]);

  // Bắn đạn
  const handleShoot = () => {
    initAudio();
    const gun = GUN_TYPES[currentGunIndex];
    if (points < gun.cost) {
      showToast("Ví của bạn không đủ điểm để bắn mức đạn này!");
      return;
    }

    const newPts = points - gun.cost;
    updatePointsInFirestore(newPts);

    set(ref(db, 'banca_pvp_jackpot'), jackpotPool + Math.round(gun.cost * 0.2));

    const w = window.innerWidth;
    const h = window.innerHeight;
    let startX = w - 90, startY = h - 90;
    if (myCorner === 'bottom-left') { startX = 80; startY = h - 80; }
    else if (myCorner === 'top-left') { startX = 80; startY = 80; }
    else if (myCorner === 'top-right') { startX = w - 80; startY = 80; }

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

    playShootShootSound();

    if (activeRoomId && !isPVE) {
      push(ref(db, `banca_rooms/${activeRoomId}/shots`), {
        corner: myCorner, x: startX, y: startY, angle, gunLevel: gun.level
      });
    }
  };

  const playShootShootSound = () => {
    playShootSound();
  };

  const handleCreateRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setActiveRoomId(roomId);
    setIsHost(true);
    setIsPVE(false);
    setMyCorner('bottom-right');

    roomPlayersRef.current['bottom-right'].active = true;
    roomPlayersRef.current['bottom-right'].email = user?.email || 'Chủ phòng';

    set(ref(db, 'banca_rooms/' + roomId), {
      creator: user?.email || 'Host',
      status: 'playing',
      players: {
        'bottom-right': { email: user?.email || 'Host' }
      }
    });

    showToast(`✨ Tạo phòng thành công! Mã phòng: ${roomId}`);
  };

  const handleJoinRoom = () => {
    const roomId = roomCodeInput.trim().toUpperCase();
    if (!roomId) {
      showToast("Vui lòng nhập mã phòng!");
      return;
    }

    const roomRef = ref(db, 'banca_rooms/' + roomId);
    getDoc(doc(db, 'dummy', 'dummy')).then(() => {
      // Dùng rtdb get
    });

    // Simple RTDB check
    import('firebase/database').then(({ get, child }) => {
      get(child(ref(db), `banca_rooms/${roomId}`)).then((snapshot) => {
        if (!snapshot.exists()) {
          showToast("Phòng không tồn tại!");
          return;
        }
        const data = snapshot.val();
        setActiveRoomId(roomId);
        setIsHost(false);
        setIsPVE(false);

        const players = data.players || {};
        let corner = 'bottom-right';
        if (!players['bottom-left']) corner = 'bottom-left';
        else if (!players['top-left']) corner = 'top-left';
        else if (!players['top-right']) corner = 'top-right';

        setMyCorner(corner);
        roomPlayersRef.current[corner].active = true;
        roomPlayersRef.current[corner].email = user?.email || 'Thành viên';

        set(ref(db, `banca_rooms/${roomId}/players/${corner}`), {
          email: user?.email || 'Thành viên'
        });

        showToast(`🎉 Vào phòng ${roomId} thành công!`);
      });
    });
  };

  const handleLeaveRoom = () => {
    if (activeRoomId && !isPVE) {
      remove(ref(db, `banca_rooms/${activeRoomId}/players/${myCorner}`));
    }
    setActiveRoomId(null);
    setIsPVE(true);
    setIsHost(false);
    fishesRef.current = [];
    bulletsRef.current = [];
    showToast("Đã rời phòng, chuyển về chế độ Solo PVE.");
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-slate-950 font-sans select-none flex flex-col">
      {/* Canvas Game */}
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
        <div className="bg-slate-900/90 backdrop-blur-md border border-yellow-500/30 rounded-2xl px-3 py-1.5 flex items-center gap-2.5 pointer-events-auto shadow-lg">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-300 flex items-center justify-center text-yellow-950 font-black shadow-md ring-2 ring-yellow-200">
            🪙
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-yellow-200/70 font-bold">Ví Điểm VIP</div>
            <div className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-orange-400">
              {points.toLocaleString()} đ
            </div>
          </div>
        </div>

        {/* Nút điều hướng & phòng */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <Link
            href="/"
            className="bg-red-950/80 backdrop-blur-md border border-red-500/50 hover:bg-red-900 text-red-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition"
          >
            ← Trang chủ
          </Link>

          {!isPVE && activeRoomId && (
            <button
              onClick={handleLeaveRoom}
              className="bg-amber-950/80 backdrop-blur-md border border-amber-500/50 hover:bg-amber-900 text-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold shadow-md transition"
            >
              Phòng: #{activeRoomId} (Rời)
            </button>
          )}

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-9 h-9 bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 rounded-xl flex items-center justify-center text-cyan-300 shadow-md"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="w-9 h-9 bg-slate-900/90 backdrop-blur-md border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-300 shadow-md"
          >
            {isPaused ? '▶' : '⏸'}
          </button>
        </div>
      </div>

      {/* Hũ Jackpot ở giữa */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="bg-gradient-to-b from-amber-950/90 to-slate-950/90 backdrop-blur-md border border-amber-400/80 px-6 py-1.5 rounded-2xl text-center shadow-xl animate-pulse">
          <div className="text-[9px] text-amber-300 font-extrabold uppercase tracking-widest">
            👑 JACKPOT CHUNG 👑
          </div>
          <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-orange-400">
            {jackpotPool.toLocaleString()} đ
          </div>
        </div>
      </div>

      {/* Thanh công cụ súng và chế độ phòng ở góc dưới */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col sm:flex-row items-center gap-2 pointer-events-auto">
        {/* Chọn Súng */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-400/30 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-xl">
          <button
            onClick={() => setCurrentGunIndex((prev) => (prev - 1 + GUN_TYPES.length) % GUN_TYPES.length)}
            className="w-7 h-7 rounded-full bg-slate-800 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold hover:bg-slate-700 transition"
          >
            -
          </button>
          <div className="text-center min-w-[140px]">
            <div className="text-xs text-cyan-300 font-bold uppercase tracking-wider">{GUN_TYPES[currentGunIndex].name}</div>
            <div className="text-[10px] text-yellow-300 font-semibold">
              {isPVE ? "Chế độ: Solo PVE" : `Phòng: #${activeRoomId} (${myCorner})`}
            </div>
          </div>
          <button
            onClick={() => setCurrentGunIndex((prev) => (prev + 1) % GUN_TYPES.length)}
            className="w-7 h-7 rounded-full bg-slate-800 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold hover:bg-slate-700 transition"
          >
            +
          </button>
        </div>

        {/* Nút Tạo / Vào Phòng PVP nhanh */}
        {isPVE && (
          <div className="bg-slate-900/90 backdrop-blur-md border border-purple-500/40 px-3 py-2 rounded-2xl flex items-center gap-2 shadow-xl">
            <button
              onClick={handleCreateRoom}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-2 rounded-xl shadow transition"
            >
              ✨ Tạo Phòng PVP
            </button>
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Mã phòng"
                maxLength={6}
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                className="w-24 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-center font-bold uppercase text-amber-300 outline-none"
              />
              <button
                onClick={handleJoinRoom}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow transition"
              >
                Vào
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast thông báo */}
      {toastMsg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-red-950/90 border border-red-500/60 text-red-200 px-4 py-2 rounded-2xl text-xs font-bold shadow-2xl animate-bounce pointer-events-none">
          ⚠️ {toastMsg}
        </div>
      )}
    </div>
  );
}