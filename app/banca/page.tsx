"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

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
  { level: 1, cost: 1, name: "Đạn 1đ", damage: 1, speed: 18, size: 5, color: '#a855f7' },
  { level: 2, cost: 10, name: "Đạn 10đ", damage: 6, speed: 16, size: 6, color: '#38bdf8' },
  { level: 3, cost: 20, name: "Đạn 20đ", damage: 12, speed: 15, size: 7, color: '#22d3ee' },
  { level: 4, cost: 50, name: "Đạn 50đ", damage: 28, speed: 14, size: 8, color: '#4ade80' },
  { level: 5, cost: 100, name: "Đạn 100đ", damage: 55, speed: 13, size: 9, color: '#facc15' },
  { level: 6, cost: 200, name: "Đạn 200đ", damage: 110, speed: 12, size: 10, color: '#f97316' },
  { level: 7, cost: 500, name: "Đạn 500đ", damage: 260, speed: 11, size: 12, color: '#ec4899' },
  { level: 8, cost: 1000, name: "Đạn 1.000đ", damage: 550, speed: 10, size: 14, color: '#8b5cf6' },
  { level: 9, cost: 2000, name: "Đạn 2.000đ", damage: 1100, speed: 9, size: 17, color: '#ef4444' }
];

const FISH_TYPES_BASE = [
  { id: 's1', name: 'Cá Nhỏ 1', emoji: '🐟', width: 55, height: 35, speedMin: 2.2, speedMax: 4.8, hpMin: 3, hpMax: 10, rewardMin: 10, rewardMax: 50, category: 'small' },
  { id: 's2', name: 'Cá Nhỏ 2', emoji: '🐠', width: 60, height: 38, speedMin: 2.5, speedMax: 5.0, hpMin: 5, hpMax: 12, rewardMin: 10, rewardMax: 50, category: 'small' },
  { id: 's3', name: 'Tôm Sống', emoji: '🦐', width: 45, height: 30, speedMin: 2.8, speedMax: 5.5, hpMin: 2, hpMax: 8, rewardMin: 10, rewardMax: 50, category: 'small' },
  
  { id: 'm1', name: 'Cá Nóc', emoji: '🐡', width: 85, height: 55, speedMin: 1.2, speedMax: 2.8, hpMin: 35, hpMax: 85, rewardMin: 100, rewardMax: 500, category: 'medium' },
  { id: 'm2', name: 'Cá Heo', emoji: '🐬', width: 100, height: 65, speedMin: 1.4, speedMax: 3.0, hpMin: 45, hpMax: 110, rewardMin: 100, rewardMax: 500, category: 'medium' },
  
  { id: 'l1', name: 'Cá Mập Boss', emoji: '🦈', width: 160, height: 100, speedMin: 0.6, speedMax: 1.8, hpMin: 450, hpMax: 1100, rewardMin: 1000, rewardMax: 5000, category: 'large' },
  { id: 'l2', name: 'Nàng Tiên Cá', emoji: '🧜‍♀️', width: 130, height: 90, speedMin: 0.7, speedMax: 2.0, hpMin: 700, hpMax: 1600, rewardList: [10000, 20000, 50000, 70000, 100000], category: 'mermaid' },
  { id: 'l3', name: 'Rồng Biển', emoji: '🐉', width: 180, height: 115, speedMin: 0.5, speedMax: 1.5, hpMin: 900, hpMax: 2000, rewardMin: 1000, rewardMax: 5000, category: 'large' }
];

export default function BanCaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(1000);
  const [jackpotPool, setJackpotPool] = useState<number>(650000);
  
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

  const [comboCount, setComboCount] = useState<number>(0);
  const [comboMultiplier, setComboMultiplier] = useState<number>(1);
  const [dbAuraText, setDbAuraText] = useState<string | null>(null);
  const comboTimerRef = useRef<any>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isHoldingRef = useRef<boolean>(false);
  const lastShootTimeRef = useRef<number>(0);

  const fishesRef = useRef<FishData[]>([]);
  const bulletsRef = useRef<any[]>([]);
  const explosionsRef = useRef<any[]>([]);
  const floatingTextsRef = useRef<any[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const roomPlayersRef = useRef<{ [key: string]: { active: boolean; email: string; angle?: number } }>({
    'bottom-right': { active: false, email: 'Trống' },
    'bottom-left': { active: false, email: 'Trống' },
    'top-left': { active: false, email: 'Trống' },
    'top-right': { active: false, email: 'Trống' }
  });

  const activeRoomRefData = useRef<{ roomId: string | null; corner: string; pve: boolean }>({
    roomId: null,
    corner: 'bottom-right',
    pve: true
  });

  useEffect(() => {
    activeRoomRefData.current = { roomId: activeRoomId, corner: myCorner, pve: isPVE };
  }, [activeRoomId, myCorner, isPVE]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const { roomId, corner, pve } = activeRoomRefData.current;
      if (roomId && !pve) {
        const roomRef = doc(db, "banca_rooms", roomId);
        const currentPlayers = { ...roomPlayersRef.current };
        if (currentPlayers[corner]) {
          currentPlayers[corner] = { active: false, email: 'Trống', angle: -Math.PI / 2 };
          setDoc(roomRef, { players: currentPlayers }, { merge: true });
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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
        } catch (e) {}
      }
    });

    const jpRef = doc(db, "gameSettings", "bancaJackpot");
    const unsubJp = onSnapshot(jpRef, (docSnap) => {
      if (docSnap.exists()) {
        setJackpotPool(docSnap.data().amount || 650000);
      } else {
        setDoc(jpRef, { amount: 650000 });
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

  const showDbAura = (text: string) => {
    setDbAuraText(text);
    setTimeout(() => setDbAuraText(null), 2500);
  };

  const updatePointsInFirestore = async (newPts: number) => {
    setPoints(newPts);
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { points: newPts }, { merge: true });
    } catch (e) {}
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
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      } catch (e) {}
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
      const startFreq = reward >= 1000 ? 523.25 : 392.00;
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

  // Lắng nghe realtime phòng PVP
  useEffect(() => {
    if (!activeRoomId || isPVE) return;
    const roomRef = doc(db, "banca_rooms", activeRoomId);
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.players) {
          roomPlayersRef.current = data.players;
        }

        const players = data.players || {};
        const activeCorners = Object.keys(players).filter(c => players[c] && players[c].active && players[c].email && players[c].email !== 'Trống');
        if (activeCorners.length > 0) {
          const firstPlayerEmail = players[activeCorners[0]].email;
          if (user && user.email === firstPlayerEmail) {
            setIsHost(true);
          }
        }

        if (!isHost && data.fishes && Array.isArray(data.fishes)) {
          fishesRef.current = data.fishes;
        }
      }
    });
    return () => unsubscribe();
  }, [activeRoomId, isPVE, isHost, user]);

  // Đồng bộ góc súng thời gian thực cho PVP
  useEffect(() => {
    if (!activeRoomId || isPVE) return;
    const interval = setInterval(async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.width;
      const h = canvas.height;

      let startX = w - 60, startY = h - 60;
      if (myCorner === 'bottom-left') { startX = 60; startY = h - 60; }
      else if (myCorner === 'top-left') { startX = 60; startY = 60; }
      else if (myCorner === 'top-right') { startX = w - 60; startY = 60; }

      const angle = Math.atan2(pointerPosRef.current.y - startY, pointerPosRef.current.x - startX);
      const roomRef = doc(db, "banca_rooms", activeRoomId);
      
      try {
        const currentPlayers = { ...roomPlayersRef.current };
        if (currentPlayers[myCorner]) {
          currentPlayers[myCorner].angle = angle;
          await setDoc(roomRef, { players: currentPlayers }, { merge: true });
        }
      } catch (e) {}
    }, 300);

    return () => clearInterval(interval);
  }, [activeRoomId, isPVE, myCorner]);

  // Vòng lặp bắn liên tục khi giữ chuột / chạm
  useEffect(() => {
    if (screenMode !== 'game') return;
    const interval = setInterval(() => {
      if (isHoldingRef.current && !isPaused) {
        const now = Date.now();
        if (now - lastShootTimeRef.current > 160) {
          lastShootTimeRef.current = now;
          handleShoot(pointerPosRef.current.x, pointerPosRef.current.y);
        }
      }
    }, 40);
    return () => clearInterval(interval);
  }, [screenMode, isPaused, currentGunIndex, points]);

  // Game Loop Render Canvas cực kỳ nhẹ nhàng và nhiều cá
  useEffect(() => {
    if (screenMode !== 'game') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (pointerPosRef.current.x === 0) {
        pointerPosRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const isMobile = window.innerWidth < 768;
    const scaleFactor = isMobile ? 0.8 : 1.0;

    const spawnFish = async (w: number, h: number) => {
      // Tăng số lượng cá tối đa lên 22 con để màn hình sinh động, nhiều cá bơi lội hơn nhưng vẫn giữ 0% giật lag
      if ((isPVE || isHost) && fishesRef.current.length < 22 && Math.random() < 0.28) {
        const randWeight = Math.random() * 100;
        let template;

        if (randWeight < 3.5) {
          const rareFish = FISH_TYPES_BASE.filter(f => f.category === 'mermaid' || f.category === 'large');
          template = rareFish[Math.floor(Math.random() * rareFish.length)];
        } else if (randWeight < 48) {
          const medFish = FISH_TYPES_BASE.filter(f => f.category === 'medium');
          template = medFish[Math.floor(Math.random() * medFish.length)];
        } else {
          const smallFish = FISH_TYPES_BASE.filter(f => f.category === 'small');
          template = smallFish[Math.floor(Math.random() * smallFish.length)];
        }

        if (template) {
          const dir = Math.floor(Math.random() * 4);
          let x = 0, y = 0, vx = 0, vy = 0;
          const randomSpeed = (Math.random() * (template.speedMax - template.speedMin) + template.speedMin) * scaleFactor;

          if (dir === 0) {
            x = -template.width * scaleFactor; y = Math.random() * h;
            vx = (Math.random() * 0.5 + 0.8) * randomSpeed; vy = (Math.random() - 0.5) * randomSpeed;
          } else if (dir === 1) {
            x = w + template.width * scaleFactor; y = Math.random() * h;
            vx = -(Math.random() * 0.5 + 0.8) * randomSpeed; vy = (Math.random() - 0.5) * randomSpeed;
          } else if (dir === 2) {
            x = Math.random() * w; y = -template.height * scaleFactor;
            vx = (Math.random() - 0.5) * randomSpeed; vy = (Math.random() * 0.5 + 0.8) * randomSpeed;
          } else {
            x = Math.random() * w; y = h + template.height * scaleFactor;
            vx = (Math.random() - 0.5) * randomSpeed; vy = -(Math.random() * 0.5 + 0.8) * randomSpeed;
          }

          const hp = Math.floor(Math.random() * (template.hpMax - template.hpMin + 1)) + template.hpMin;
          let calculatedReward = 0;
          if (template.rewardList) {
            calculatedReward = template.rewardList[Math.floor(Math.random() * template.rewardList.length)];
          } else if (template.rewardMin && template.rewardMax) {
            calculatedReward = Math.floor(Math.random() * (template.rewardMax - template.rewardMin + 1)) + template.rewardMin;
          }

          const fishObj: FishData = {
            id: 'f_' + Math.random().toString(36).substring(2, 9),
            typeId: template.id,
            name: template.name,
            emoji: template.emoji,
            width: template.width * scaleFactor,
            height: template.height * scaleFactor,
            speed: randomSpeed,
            hp,
            maxHp: hp,
            reward: calculatedReward,
            category: template.category,
            x, y, vx, vy,
            hitTimer: 0
          };

          fishesRef.current.push(fishObj);

          if (!isPVE && activeRoomId) {
            try {
              await setDoc(doc(db, "banca_rooms", activeRoomId), { fishes: fishesRef.current }, { merge: true });
            } catch (e) {}
          }
        }
      }
    };

    const render = () => {
      if (!isPaused) {
        const w = canvas.width;
        const h = canvas.height;

        // 1. Background đơn giản siêu nhẹ
        ctx.fillStyle = '#06284a';
        ctx.fillRect(0, 0, w, h);

        // 2. Đạn & Hiệu ứng
        bulletsRef.current.forEach(b => {
          b.x += b.vx;
          b.y += b.vy;
          if (b.x < -30 || b.x > w + 30 || b.y < -30 || b.y > h + 30) {
            b.alive = false;
          }
        });
        bulletsRef.current = bulletsRef.current.filter(b => b.alive);

        explosionsRef.current.forEach(ex => {
          ex.radius += 5;
          ex.alpha -= 0.15;
        });
        explosionsRef.current = explosionsRef.current.filter(ex => ex.alpha > 0);

        floatingTextsRef.current.forEach(ft => {
          ft.y += ft.vy;
          ft.alpha -= 0.04;
        });
        floatingTextsRef.current = floatingTextsRef.current.filter(ft => ft.alpha > 0);

        // 3. Cá bơi
        fishesRef.current.forEach(f => {
          f.x += f.vx;
          f.y += f.vy;
          if (f.hitTimer > 0) f.hitTimer--;
        });
        fishesRef.current = fishesRef.current.filter(f => f.x > -350 && f.x < w + 350 && f.y > -350 && f.y < h + 350);

        // Va chạm
        bulletsRef.current.forEach(bullet => {
          if (!bullet.alive) return;
          fishesRef.current.forEach(fish => {
            if (!bullet.alive || fish.dead) return;
            const dist = Math.hypot(bullet.x - fish.x, bullet.y - fish.y);
            if (dist < bullet.radius + fish.width / 2.3) {
              bullet.alive = false;
              explosionsRef.current.push({ x: bullet.x, y: bullet.y, radius: 10, color: bullet.color, alpha: 1 });

              let finalDamage = bullet.damage;
              const isCrit = Math.random() < 0.12;
              if (isCrit) {
                finalDamage *= 3;
                floatingTextsRef.current.push({ text: `CRIT! -${finalDamage}`, x: fish.x, y: fish.y - 15, alpha: 1, vy: -1.8, color: '#ef4444' });
              }

              fish.hp -= finalDamage;
              fish.hitTimer = 4;

              if (fish.hp <= 0 && !fish.dead) {
                fish.dead = true;
                let baseReward = fish.reward;

                setComboCount(prev => {
                  const nextCount = prev + 1;
                  let mult = 1;
                  let auraStr = "";
                  if (nextCount >= 25) { mult = 10; auraStr = "⚡ ULTRA INSTINCT (BẢN NĂNG VÔ CỰC)! ⚡"; }
                  else if (nextCount >= 18) { mult = 8; auraStr = "🔥 SUPER SAIYAN BLUE! 🔥"; }
                  else if (nextCount >= 12) { mult = 5; auraStr = "💥 SUPER SAIYAN 3! 💥"; }
                  else if (nextCount >= 7) { mult = 3; auraStr = "🌟 SUPER SAIYAN 2! 🌟"; }
                  else if (nextCount >= 3) { mult = 2; auraStr = "⚡ SIÊU SAYAN LEVEL 1! ⚡"; }
                  
                  if (auraStr) showDbAura(auraStr);
                  setComboMultiplier(mult);
                  return nextCount;
                });

                if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
                comboTimerRef.current = setTimeout(() => {
                  setComboCount(0);
                  setComboMultiplier(1);
                }, 3500);

                let finalReward = baseReward * comboMultiplier;
                let isJackpot = false;

                const jackpotChance = 0.0002 + (bullet.cost * 0.000003);
                if (Math.random() < jackpotChance) {
                  finalReward += jackpotPool;
                  isJackpot = true;
                  updateJackpotInFirestore(650000);
                }

                setPoints(prev => {
                  const updated = prev + finalReward;
                  updatePointsInFirestore(updated);
                  return updated;
                });

                playCatchSound(finalReward);

                if (isJackpot) {
                  showToast(`👑 NỔ HŨ JACKPOT RỒNG THẦN CỰC KHỦNG +${finalReward.toLocaleString()}đ!`);
                  showDbAura("🐉 RỒNG THẦN XUẤT HIỆN! ƯỚC ĐI NÍ!");
                  floatingTextsRef.current.push({ text: `JACKPOT +${finalReward}`, x: fish.x, y: fish.y, alpha: 1, vy: -1.5, color: '#f59e0b' });
                } else if (fish.category === 'mermaid' || fish.category === 'large') {
                  showDbAura("🔥 HAKAI! SĂN THÀNH CÔNG THỦ LĨNH KHỦNG!");
                  floatingTextsRef.current.push({ text: `+${finalReward}đ (SĂN BOSS)`, x: fish.x, y: fish.y, alpha: 1, vy: -1.5, color: '#ec4899' });
                } else {
                  floatingTextsRef.current.push({ text: `+${finalReward}đ`, x: fish.x, y: fish.y, alpha: 1, vy: -1.5, color: '#facc15' });
                }
              }
            }
          });
        });
        fishesRef.current = fishesRef.current.filter(f => !f.dead);

        spawnFish(w, h);

        // 4. VẼ EMOJI CÁ NGUYÊN BẢN (Sắc nét, rõ ràng)
        fishesRef.current.forEach(f => {
          ctx.save();
          ctx.translate(f.x, f.y);
          if (f.vx < 0) ctx.scale(-1, 1);

          if (f.hitTimer > 0) {
            ctx.filter = 'brightness(2.0)';
          }

          ctx.font = `${f.height}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(f.emoji, 0, 0);

          ctx.restore();
        });

        // 5. Vẽ Đạn
        bulletsRef.current.forEach(b => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.fillStyle = b.color;
          ctx.fill();
          ctx.restore();
        });

        // 6. Vẽ Nổ & Chữ thưởng
        explosionsRef.current.forEach(ex => {
          if (ex.alpha <= 0) return;
          ctx.save();
          ctx.globalAlpha = Math.max(0, ex.alpha);
          ctx.beginPath();
          ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
          ctx.strokeStyle = ex.color;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        });

        floatingTextsRef.current.forEach(ft => {
          ctx.save();
          ctx.globalAlpha = Math.max(0, ft.alpha);
          ctx.font = '900 15px Fredoka, sans-serif';
          ctx.fillStyle = ft.color;
          ctx.fillText(ft.text, ft.x, ft.y);
          ctx.restore();
        });

        // 7. Vẽ Súng / Pháo thủ
        if (isPVE) {
          const x = w / 2;
          const y = h - 50;
          const angle = Math.atan2(pointerPosRef.current.y - y, pointerPosRef.current.x - x);

          ctx.save();
          ctx.translate(x, y);
          ctx.beginPath();
          ctx.arc(0, 0, 38, 0, Math.PI * 2);
          ctx.fillStyle = '#0f172a';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#38bdf8';
          ctx.stroke();

          ctx.rotate(angle);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(0, -10, 45, 20);
          ctx.restore();

          ctx.font = "bold 12px Fredoka, sans-serif";
          ctx.fillStyle = "#facc15";
          ctx.textAlign = 'center';
          ctx.fillText("P1 (Solo)", x, y + 42);
        } else {
          const drawTurretAtCorner = (cornerKey: string, label: string) => {
            let x = w - 60, y = h - 60;
            if (cornerKey === 'bottom-left') { x = 60; y = h - 60; }
            else if (cornerKey === 'top-left') { x = 60; y = 60; }
            else if (cornerKey === 'top-right') { x = w - 60; y = 60; }

            ctx.save();
            ctx.translate(x, y);
            const pData = roomPlayersRef.current[cornerKey];
            const isActive = pData && pData.active && pData.email && pData.email !== 'Trống' && pData.email !== '';

            let angle = -Math.PI / 2;
            if (isActive) {
              if (cornerKey === myCorner) {
                angle = Math.atan2(pointerPosRef.current.y - y, pointerPosRef.current.x - x);
              } else if (pData.angle !== undefined) {
                angle = pData.angle;
              }
            }

            ctx.beginPath();
            ctx.arc(0, 0, 34, 0, Math.PI * 2);
            ctx.fillStyle = isActive ? '#0f172a' : '#1e293b';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = isActive ? '#38bdf8' : '#475569';
            ctx.stroke();

            ctx.rotate(angle);
            ctx.fillStyle = isActive ? '#f59e0b' : '#475569';
            ctx.fillRect(0, -9, 40, 18);
            ctx.restore();

            if (isActive) {
              ctx.font = "bold 11px Fredoka, sans-serif";
              ctx.fillStyle = "#facc15";
              ctx.textAlign = 'center';
              ctx.fillText(`${label}: ${pData.email.split('@')[0]}`, x, y + (y > h / 2 ? 42 : 32));
            }
          };

          drawTurretAtCorner('top-left', 'P2');
          drawTurretAtCorner('top-right', 'P3');
          drawTurretAtCorner('bottom-left', 'P4');
          drawTurretAtCorner('bottom-right', 'P1');
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [screenMode, isPaused, isPVE, activeRoomId, jackpotPool, isMuted, myCorner, isHost, comboMultiplier]);

  const handleShoot = async (clientX: number, clientY: number) => {
    if (!isPVE) {
      const pData = roomPlayersRef.current[myCorner];
      if (!pData || !pData.active || !pData.email || pData.email === 'Trống') {
        return;
      }
    }

    initAudio();
    const gun = GUN_TYPES[currentGunIndex];
    if (points < gun.cost) {
      showToast("Ví của bạn không đủ điểm để bắn mức đạn này!");
      isHoldingRef.current = false;
      return;
    }

    const newPts = points - gun.cost;
    updatePointsInFirestore(newPts);
    updateJackpotInFirestore(jackpotPool + Math.round(gun.cost * 0.2));

    const w = window.innerWidth;
    const h = window.innerHeight;
    let startX = w / 2, startY = h - 50;

    if (!isPVE) {
      startX = w - 60; startY = h - 60;
      if (myCorner === 'bottom-left') { startX = 60; startY = h - 60; }
      else if (myCorner === 'top-left') { startX = 60; startY = 60; }
      else if (myCorner === 'top-right') { startX = w - 60; startY = 60; }
    }

    const angle = Math.atan2(clientY - startY, clientX - startX);
    
    if (!isPVE && activeRoomId) {
      try {
        const roomRef = doc(db, "banca_rooms", activeRoomId);
        const currentPlayers = { ...roomPlayersRef.current };
        if (currentPlayers[myCorner]) {
          currentPlayers[myCorner].angle = angle;
          await setDoc(roomRef, { players: currentPlayers }, { merge: true });
        }
      } catch (e) {}
    }

    bulletsRef.current.push({
      x: startX,
      y: startY,
      radius: gun.size,
      color: gun.color,
      damage: gun.damage,
      cost: gun.cost,
      vx: Math.cos(angle) * gun.speed,
      vy: Math.sin(angle) * gun.speed,
      alive: true
    });

    playShootSound();
  };

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
    setIsPVE(false);
    setIsHost(true);
    setMyCorner('bottom-right');

    const userEmail = user?.email || 'Chủ phòng';

    const newPlayers = {
      'bottom-right': { active: true, email: userEmail, angle: -Math.PI / 2 },
      'bottom-left': { active: false, email: 'Trống', angle: -Math.PI / 2 },
      'top-left': { active: false, email: 'Trống', angle: -Math.PI / 2 },
      'top-right': { active: false, email: 'Trống', angle: -Math.PI / 2 }
    };
    roomPlayersRef.current = newPlayers;

    await setDoc(doc(db, "banca_rooms", roomId), {
      creator: userEmail,
      status: 'playing',
      players: newPlayers,
      fishes: []
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
    setIsPVE(false);

    const players = data.players || {};
    const userEmail = user?.email || 'Thành viên';

    Object.keys(players).forEach((k) => {
      if (players[k] && players[k].email === userEmail) {
        players[k] = { active: false, email: 'Trống', angle: -Math.PI / 2 };
      }
    });

    let corner = '';
    const priorityCorners = ['bottom-left', 'top-left', 'top-right', 'bottom-right'];
    for (const c of priorityCorners) {
      if (!players[c] || !players[c].active || players[c].email === 'Trống') {
        corner = c;
        break;
      }
    }

    if (!corner) {
      showToast("Phòng đã đầy (4/4 người chơi)!");
      setIsPVE(true);
      setActiveRoomId(null);
      return;
    }

    setMyCorner(corner);
    players[corner] = { active: true, email: userEmail, angle: -Math.PI / 2 };
    roomPlayersRef.current = players;

    await setDoc(roomRef, { players }, { merge: true });

    setScreenMode('game');
    showToast(`🎉 Vào phòng ${roomId} thành công ở vị trí ${corner}!`);
  };

  const handleLeaveRoom = async () => {
    isHoldingRef.current = false;
    if (activeRoomId && !isPVE) {
      const roomRef = doc(db, "banca_rooms", activeRoomId);
      try {
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) {
          const currentData = roomSnap.data();
          const currentPlayers = currentData.players || {};
          const userEmail = user?.email || 'Thành viên';
          
          Object.keys(currentPlayers).forEach((k) => {
            if (currentPlayers[k] && (k === myCorner || currentPlayers[k].email === userEmail)) {
              currentPlayers[k] = { active: false, email: 'Trống', angle: -Math.PI / 2 };
            }
          });

          await setDoc(roomRef, { players: currentPlayers }, { merge: true });
        }
      } catch (e) {}
    }
    setActiveRoomId(null);
    setIsPVE(true);
    setIsHost(false);
    setScreenMode('lobby');
    showToast("Đã rời phòng, ghế đã được giải phóng sạch sẽ.");
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-slate-950 font-sans select-none flex flex-col">
      {screenMode === 'lobby' ? (
        <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950">
          <div className="bg-slate-900/90 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl backdrop-blur-xl text-center space-y-5">
            <div className="text-4xl animate-bounce">🦈 🌊 🪙</div>
            <div>
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 uppercase tracking-wide">
                BẮN CÁ KI-BLAST
              </h1>
              <p className="text-xs text-slate-400 mt-1">Săn cá đại dương, nổ hũ Jackpot & tạo phòng chiến PVP!</p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-2.5 text-amber-300 text-xs font-bold animate-pulse">
              👑 HŨ JACKPOT: {jackpotPool.toLocaleString()} đ 🪙
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { setIsPVE(true); setIsHost(true); setScreenMode('game'); }}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:brightness-110 text-slate-950 font-black rounded-2xl shadow-lg transition uppercase text-xs tracking-wider cursor-pointer"
              >
                🛡️ CHƠI ĐƠN (SOLO PVE)
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-slate-500 text-[10px] font-bold uppercase">Chế Độ PVP Bạn Bè</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <button
                onClick={handleCreateRoom}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-lg transition uppercase text-xs tracking-wider cursor-pointer"
              >
                ✨ TẠO PHÒNG MỚI
              </button>

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="NHẬP MÃ PHÒNG (VD: ABCXYZ)"
                  maxLength={6}
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-2xl text-xs text-center font-bold uppercase text-amber-300 outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleJoinRoom}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-2xl shadow transition cursor-pointer uppercase tracking-wider"
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
        <div className="relative w-full h-full overflow-hidden flex flex-col bg-slate-950">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-crosshair touch-none object-contain"
            onMouseDown={(e) => {
              isHoldingRef.current = true;
              pointerPosRef.current = { x: e.clientX, y: e.clientY };
              handleShoot(e.clientX, e.clientY);
            }}
            onMouseMove={(e) => {
              pointerPosRef.current = { x: e.clientX, y: e.clientY };
            }}
            onMouseUp={() => {
              isHoldingRef.current = false;
            }}
            onMouseLeave={() => {
              isHoldingRef.current = false;
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              isHoldingRef.current = true;
              if (e.touches.length > 0) {
                const touch = e.touches[0];
                pointerPosRef.current = { x: touch.clientX, y: touch.clientY };
                handleShoot(touch.clientX, touch.clientY);
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length > 0) {
                const touch = e.touches[0];
                pointerPosRef.current = { x: touch.clientX, y: touch.clientY };
              }
            }}
            onTouchEnd={() => {
              isHoldingRef.current = false;
            }}
            onTouchCancel={() => {
              isHoldingRef.current = false;
            }}
          />

          {/* Top HUD Header */}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-center z-25 pointer-events-none">
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

            <div className="flex items-center gap-1.5 pointer-events-auto">
              {!isPVE && activeRoomId && (
                <div className="bg-amber-950/80 backdrop-blur-md border border-amber-500/50 text-amber-200 px-2.5 py-1.5 rounded-xl text-[11px] font-bold shadow-md">
                  #{activeRoomId} ({myCorner}) {isHost ? '👑' : ''}
                </div>
              )}

              <button
                onClick={toggleFullscreen}
                className="w-8 h-8 bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-300 text-xs shadow-md"
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
                onClick={handleLeaveRoom}
                className="bg-red-950/80 backdrop-blur-md border border-red-500/50 hover:bg-red-900 text-red-200 px-2.5 py-1.5 rounded-xl text-[11px] font-bold shadow-md transition"
              >
                Thoát ✕
              </button>
            </div>
          </div>

          {/* Hũ Jackpot & Hiệu ứng Aura Dragon Ball */}
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-1">
            <div className="bg-gradient-to-b from-amber-950/90 to-slate-950/90 backdrop-blur-md border border-amber-400/80 px-4 py-1 rounded-xl text-center shadow-xl animate-pulse">
              <div className="text-[8px] text-amber-300 font-extrabold uppercase tracking-widest">
                👑 JACKPOT RỒNG THẦN 👑
              </div>
              <div className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-orange-400">
                {jackpotPool.toLocaleString()} đ
              </div>
            </div>

            {dbAuraText && (
              <div className="bg-gradient-to-r from-amber-500 via-red-500 to-purple-600 text-white font-black px-4 py-1 rounded-2xl text-xs shadow-2xl animate-bounce tracking-wider border border-yellow-300">
                {dbAuraText}
              </div>
            )}
          </div>

          {/* Thanh chọn đạn to rõ ở góc trái dưới - Đã fix sự kiện click/touch chuẩn 100% */}
          <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2.5 pointer-events-auto bg-slate-900/95 backdrop-blur-md border-2 border-cyan-400/60 px-3.5 py-2.5 rounded-3xl shadow-2xl">
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                isHoldingRef.current = false;
                setCurrentGunIndex((prev) => (prev - 1 + GUN_TYPES.length) % GUN_TYPES.length);
              }}
              className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white border border-cyan-300 flex items-center justify-center font-black text-lg hover:scale-110 active:scale-95 transition shadow-lg cursor-pointer"
            >
              -
            </button>
            <div className="text-center min-w-[100px]">
              <div className="text-xs text-cyan-300 font-black uppercase tracking-wider">{GUN_TYPES[currentGunIndex].name}</div>
              <div className="text-[9px] text-yellow-300 font-bold mt-0.5">
                {isPVE ? "Solo PVE" : `Phòng #${activeRoomId}`}
              </div>
            </div>
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                isHoldingRef.current = false;
                setCurrentGunIndex((prev) => (prev + 1) % GUN_TYPES.length);
              }}
              className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white border border-cyan-300 flex items-center justify-center font-black text-lg hover:scale-110 active:scale-95 transition shadow-lg cursor-pointer"
            >
              +
            </button>
          </div>

          {toastMsg && (
            <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 bg-red-950/90 border border-red-500/60 text-red-200 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xl animate-bounce pointer-events-none">
              ⚠️ {toastMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}