"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function CauCaPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [score, setScore] = useState<number>(1000);
  const [userAvatar, setUserAvatar] = useState<string>("/assets/avatar/xtra1.ico");
  const [selectedBait, setSelectedBait] = useState<number>(50);
  const [rarePopup, setRarePopup] = useState<{ show: boolean; name: string; points: number; jackpotMsg?: string } | null>(null);

  const [jackpot, setJackpot] = useState({
    minor: 100000,
    major: 500000,
    grand: 2000000
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 🌟 ĐỒNG BỘ USER PROFILE VÀ AVATAR CHUẨN TỪ SUPABASE
  useEffect(() => {
    async function getProfile(currentUser: any) {
      if (!currentUser) return;
      setUser(currentUser);
      const { data } = await supabase
        .from('profiles')
        .select('balance, avatar_url')
        .eq('id', currentUser.id)
        .single();
      
      if (data) {
        if (data.balance !== undefined) {
          setScore(data.balance);
          (window as any).currentGameScore = data.balance;
        }
        if (data.avatar_url) {
          setUserAvatar(data.avatar_url);
        }
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) getProfile(session.user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) getProfile(session.user);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const syncScoreToSupabase = async (newScore: number) => {
    setScore(newScore);
    (window as any).currentGameScore = newScore;
    if (user) {
      await supabase
        .from('profiles')
        .update({ balance: newScore })
        .eq('id', user.id);
    }
  };

  useEffect(() => {
    async function fetchInitialJackpot() {
      const { data } = await supabase
        .from('cauca_jackpot')
        .select('*')
        .eq('id', 'global')
        .single();
      if (data) {
        setJackpot({ minor: data.minor, major: data.major, grand: data.grand });
      }
    }
    fetchInitialJackpot();

    const channel = supabase
      .channel('public:cauca_jackpot')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cauca_jackpot' }, (payload) => {
        if (payload.new) {
          setJackpot({
            minor: payload.new.minor,
            major: payload.new.major,
            grand: payload.new.grand
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const statusEl = document.getElementById('status');
    const powerContainer = document.getElementById('power-container');
    const powerBar = document.getElementById('power-bar');

    const fishDatabase = [
      { filename: "Amphiprion_ocellaris.png", vnName: "Cá hề Nemo", sizeScale: 0.8, basePoints: 15, multiplier: 1, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Abudefduf_saxatilis.png", vnName: "Cá thia vằn sọc", sizeScale: 0.9, basePoints: 20, multiplier: 1, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Chromis_chromis.png", vnName: "Cá thia xanh", sizeScale: 0.7, basePoints: 15, multiplier: 1, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Carassius_auratus.png", vnName: "Cá vàng cảnh", sizeScale: 0.9, basePoints: 20, multiplier: 1, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Campostoma_anomalum.png", vnName: "Cá tuế suối", sizeScale: 0.8, basePoints: 15, multiplier: 1, layer: "top", struggleWeight: 0, isRare: false },
      { filename: "Abudefduf_sordidus.png", vnName: "Cá thia xám", sizeScale: 1.0, basePoints: 22, multiplier: 1, layer: "top", struggleWeight: 0, isRare: false },

      { filename: "Acanthurus_coerulus.png", vnName: "Cá đuôi gai xanh", sizeScale: 1.3, basePoints: 50, multiplier: 1.2, layer: "mid", struggleWeight: 0.3, isRare: false },
      { filename: "Oreochromis_niloticus.png", vnName: "Cá rô phi vằn", sizeScale: 1.5, basePoints: 60, multiplier: 1.2, layer: "mid", struggleWeight: 0.4, isRare: false },
      { filename: "Micropterus_salmoides.png", vnName: "Cá vược miệng rộng", sizeScale: 1.6, basePoints: 80, multiplier: 1.3, layer: "mid", struggleWeight: 0.45, isRare: false },
      { filename: "Lates_calcarifer.png", vnName: "Cá chẽm lớn", sizeScale: 2.0, basePoints: 120, multiplier: 1.5, layer: "mid", struggleWeight: 0.5, isRare: false },
      { filename: "Perca_flavescens.png", vnName: "Cá vược vàng", sizeScale: 1.3, basePoints: 55, multiplier: 1.2, layer: "mid", struggleWeight: 0.35, isRare: false },
      { filename: "Cyprinus_carpio.png", vnName: "Cá chép vàng", sizeScale: 1.8, basePoints: 90, multiplier: 1.4, layer: "mid", struggleWeight: 0.45, isRare: false },
      { filename: "Carophi.png", vnName: "Cá rô phi", sizeScale: 1.4, basePoints: 55, multiplier: 1.2, layer: "mid", struggleWeight: 0.35, isRare: false },
      { filename: "Canham.png", vnName: "Cá nhám", sizeScale: 1.7, basePoints: 100, multiplier: 1.5, layer: "mid", struggleWeight: 0.5, isRare: false },

      { filename: "Aetobatus_ocellatus.png", vnName: "Cá đuối đốm đại dương", sizeScale: 3.2, basePoints: 250, multiplier: 2.0, layer: "bottom", struggleWeight: 0.8, isRare: true, requiredTaps: 12 },
      { filename: "Carcharhinus_melanopterus.png", vnName: "Cá mập vây đen", sizeScale: 3.5, basePoints: 350, multiplier: 2.2, layer: "bottom", struggleWeight: 0.85, isRare: true, requiredTaps: 16 },
      { filename: "Carcharias_taurus.png", vnName: "Cá mập cát khổng lồ", sizeScale: 4.0, basePoints: 500, multiplier: 2.5, layer: "bottom", struggleWeight: 0.9, isRare: true, requiredTaps: 22 },
      { filename: "Mola_mola.png", vnName: "Cá mặt trăng khổng lồ", sizeScale: 4.2, basePoints: 600, multiplier: 2.8, layer: "bottom", struggleWeight: 0.92, isRare: true, requiredTaps: 26 },
      { filename: "Sphyrna_zygaena.png", vnName: "Cá mập đầu búa", sizeScale: 3.8, basePoints: 450, multiplier: 2.4, layer: "bottom", struggleWeight: 0.9, isRare: true, requiredTaps: 20 },
      { filename: "Xiphias_gladius.png", vnName: "Cá kiếm đại dương", sizeScale: 4.2, basePoints: 700, multiplier: 3.0, layer: "bottom", struggleWeight: 0.95, isRare: true, requiredTaps: 30 }
    ];

    const loadedFishObjects = fishDatabase.map((item) => {
      const img = new Image();
      img.src = `/assets/cauca/${item.filename}`;
      return { img, info: item };
    });

    let width: number, height: number, waterY: number, rodBaseX: number, rodBaseY: number, rodTipX: number, rodTipY: number;
    let bottomTimer: NodeJS.Timeout | null = null;

    (window as any).updateGameScore = (newScore: number) => {
      syncScoreToSupabase(newScore);
    };

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      waterY = height * 0.3; 
      rodBaseX = width * 0.12;
      rodBaseY = waterY - 45;
      rodTipX = width * 0.22; 
      rodTipY = waterY - 110;
    }
    window.addEventListener('resize', resize);
    resize();

    class Fish {
      direction!: number;
      size!: number;
      y!: number;
      points!: number;
      speed!: number;
      struggleChance!: number;
      struggleDecay!: number;
      requiredTaps!: number;
      x!: number;
      isCaught!: boolean;
      fishData!: typeof fishDatabase[0];
      animFrame!: number;
      fishObj!: typeof loadedFishObjects[0];
      layer!: string;

      constructor(forcedLayer?: string) {
        this.spawn(forcedLayer);
      }
      spawn(forcedLayer?: string) {
        this.direction = Math.random() > 0.5 ? 1 : -1;
        
        let availableFish = fishDatabase;
        if (forcedLayer) {
          availableFish = fishDatabase.filter(f => f.layer === forcedLayer);
          if (availableFish.length === 0) availableFish = fishDatabase;
        }

        const chosenInfo = availableFish[Math.floor(Math.random() * availableFish.length)];
        this.fishObj = loadedFishObjects.find(f => f.info.filename === chosenInfo.filename) || loadedFishObjects[0];
        this.fishData = this.fishObj.info;
        this.layer = this.fishData.layer;

        this.size = (Math.random() * 12 + 20) * this.fishData.sizeScale;
        this.points = Math.round(this.fishData.basePoints * this.fishData.multiplier);
        this.struggleChance = (this.fishData as any).struggleWeight ?? 0.2;
        this.requiredTaps = (this.fishData as any).requiredTaps ?? 10;
        this.struggleDecay = 0.35;
        this.animFrame = Math.random() * 100;

        const waterHeight = height - waterY;
        if (this.layer === "top") {
          this.y = waterY + 20 + Math.random() * (waterHeight * 0.3);
          this.speed = (Math.random() * 1.0 + 0.6) * this.direction;
        } else if (this.layer === "mid") {
          this.y = waterY + (waterHeight * 0.3) + Math.random() * (waterHeight * 0.35);
          this.speed = (Math.random() * 0.6 + 0.3) * this.direction;
        } else {
          this.y = waterY + (waterHeight * 0.65) + Math.random() * (waterHeight * 0.3);
          this.speed = (Math.random() * 0.3 + 0.15) * this.direction;
        }

        this.x = this.direction === 1 ? -this.size * 2 : width + this.size * 2;
        this.isCaught = false;
      }
      update() {
        if (this.isCaught) return;
        this.x += this.speed;
        this.animFrame += 0.08;
        
        if ((this.direction === 1 && this.x > width + this.size * 2) || 
            (this.direction === -1 && this.x < -this.size * 2)) {
          this.spawn(this.layer);
        }
      }
      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        const gentleSwim = Math.sin(this.animFrame) * 0.04;
        ctx.rotate(gentleSwim);

        if (this.direction === 1) {
          ctx.scale(-1, 1);
        }
        
        const img = this.fishObj.img;
        if (img && img.complete && img.naturalWidth !== 0) {
          ctx.drawImage(img, -this.size, -this.size * 0.6, this.size * 2.2, this.size * 1.2);
        }

        ctx.restore();
      }
    }

    class Hook {
      x!: number;
      y!: number;
      state!: string;
      power!: number;
      targetWaterX!: number;
      maxDepthY!: number;
      castStartX!: number;
      castStartY!: number;
      castProgress!: number;
      caughtFish: Fish | null = null;
      currentTaps!: number;
      targetTaps!: number;
      baitPrice!: number;

      constructor() {
        this.reset();
      }
      reset() {
        this.x = rodTipX;
        this.y = rodTipY;
        this.state = 'IDLE'; 
        this.power = 0;
        this.targetWaterX = 0;
        this.maxDepthY = 0;
        this.castStartX = 0;
        this.castStartY = 0;
        this.castProgress = 0;
        this.caughtFish = null;
        this.currentTaps = 0;
        this.targetTaps = 10;
        if (bottomTimer) { clearTimeout(bottomTimer); bottomTimer = null; }

        if (statusEl) {
          statusEl.innerText = "Sẵn sàng (Đè giữ màn hình để gồng lực quăng)";
          statusEl.style.color = "white";
        }
        if (powerContainer) powerContainer.style.display = 'none';
        const struggleUi = document.getElementById('struggle-ui');
        if (struggleUi) struggleUi.style.display = 'none';
      }

      startCharging(selectedBaitCost: number) {
        if (this.state !== 'IDLE') return;
        const currentActiveScore = (window as any).currentGameScore ?? 1000;
        if (currentActiveScore < selectedBaitCost) {
          alert("⚡ Điểm không đủ để mua mồi này! Hãy tích lũy thêm điểm nhé!");
          return;
        }
        this.baitPrice = selectedBaitCost;
        this.state = 'CHARGING';
        this.power = 0;
        if (powerContainer) powerContainer.style.display = 'block';
        if (statusEl) statusEl.innerText = "Đang gồng lực... (Giữ lâu để lực căng tối đa)";
      }

      releaseCharging(pointerX: number) {
        if (this.state !== 'CHARGING') return;

        const currentActiveScore = (window as any).currentGameScore ?? 1000;
        const newScore = currentActiveScore - this.baitPrice;
        syncScoreToSupabase(newScore);

        async function contributeJackpot(baitCost: number) {
          const { data } = await supabase.from('cauca_jackpot').select('*').eq('id', 'global').single();
          if (data) {
            let addMinor = 0;
            let addMajor = 0;
            let addGrand = Math.round(baitCost * 0.1); 

            if (baitCost >= 10 && baitCost <= 1000) {
              addMinor = Math.round(baitCost * 0.2); 
            } else if (baitCost >= 2000 && baitCost <= 100000) {
              addMajor = Math.round(baitCost * 0.2); 
            }

            await supabase.from('cauca_jackpot').update({
              minor: data.minor + addMinor,
              major: data.major + addMajor,
              grand: data.grand + addGrand
            }).eq('id', 'global');
          }
        }
        contributeJackpot(this.baitPrice);

        const totalWaterHeight = height - waterY;
        let maxAllowedDepthRatio = 0.3; 
        if (this.baitPrice >= 10000) maxAllowedDepthRatio = 1.0; 
        else if (this.baitPrice >= 5000) maxAllowedDepthRatio = 0.9;
        else if (this.baitPrice >= 1000) maxAllowedDepthRatio = 0.75;
        else if (this.baitPrice >= 500) maxAllowedDepthRatio = 0.6;
        else if (this.baitPrice >= 100) maxAllowedDepthRatio = 0.45;
        else if (this.baitPrice >= 50) maxAllowedDepthRatio = 0.38;

        const powerRatio = this.power / 100;
        const effectiveRatio = Math.min(1.0, maxAllowedDepthRatio * (0.5 + 0.5 * powerRatio));
        
        this.maxDepthY = waterY + totalWaterHeight * effectiveRatio;
        this.targetWaterX = Math.max(rodTipX + 80, Math.min(pointerX, width - 40));
        
        this.state = 'CASTING';
        this.castStartX = rodTipX;
        this.castStartY = rodTipY;
        this.castProgress = 0;
        
        if (powerContainer) powerContainer.style.display = 'none';
        if (statusEl) statusEl.innerText = "Đang quăng mồi câu xuống nước...";
      }

      tapStruggle() {
        if (this.state === 'STRUGGLING') {
          this.currentTaps += 1;
          const progressPercent = Math.min(100, (this.currentTaps / this.targetTaps) * 100);
          const struggleBar = document.getElementById('struggle-bar');
          if (struggleBar) struggleBar.style.width = progressPercent + '%';

          if (this.currentTaps >= this.targetTaps) {
            this.state = 'REELING_HORIZ';
            const struggleUi = document.getElementById('struggle-ui');
            if (struggleUi) struggleUi.style.display = 'none';
            if (statusEl) {
              statusEl.innerText = `Đã thu phục ${this.caughtFish?.fishData.vnName}! Kéo lên thuyền...`;
              statusEl.style.color = "#FFEB3B";
            }
          }
        }
      }

      update() {
        if (this.state === 'CHARGING') {
          this.power += 1.8; 
          if (this.power > 100) this.power = 100;
          if (powerBar) powerBar.style.width = this.power + '%';
        }
        else if (this.state === 'CASTING') {
          const sinkSpeedMultiplier = this.baitPrice >= 1000 ? 0.025 : 0.04;
          this.castProgress += sinkSpeedMultiplier; 
          
          if (this.castProgress >= 1) {
            this.castProgress = 1;
            this.state = 'SINKING';
            if (statusEl) statusEl.innerText = "Mồi đang lơ lửng chờ cá táp...";
          }
          
          let t = this.castProgress;
          this.x = this.castStartX + (this.targetWaterX - this.castStartX) * t;
          let linearY = this.castStartY + (waterY - this.castStartY) * t;
          let arc = Math.sin(t * Math.PI) * 70; 
          this.y = linearY - arc;
        }
        else if (this.state === 'SINKING') {
          const sinkRate = Math.min(2.5, 1.2 + (this.baitPrice / 2000));
          this.y += sinkRate; 
          
          for (let f of fishes) {
            if (f.isCaught) continue;
            
            let mouthX = f.direction === 1 ? f.x + f.size * 0.7 : f.x - f.size * 0.7;
            let mouthY = f.y - f.size * 0.15; 
            
            let dx = this.x - mouthX;
            let dy = this.y - mouthY;
            let dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 18 + 5) { 
              this.catchFish(f);
              break;
            }
          }

          if (this.state === 'SINKING' && this.y >= this.maxDepthY) {
            const isAtVeryBottom = this.y >= height - 80;

            if (isAtVeryBottom && !bottomTimer) {
              if (statusEl) {
                statusEl.innerText = "Mồi đã chạm đáy! Chờ 3 giây không cá ăn sẽ mất mồi...";
                statusEl.style.color = "#F44336";
              }
              bottomTimer = setTimeout(() => {
                if (this.state === 'SINKING') {
                  this.state = 'REELING_HORIZ';
                  if (statusEl) {
                    statusEl.innerText = `Quá 3 giây không cá táp! Mất mồi (-${this.baitPrice} điểm)`;
                    statusEl.style.color = "#F44336";
                  }
                }
              }, 3000);
            } else if (!isAtVeryBottom) {
              this.state = 'REELING_HORIZ';
              if (statusEl) {
                statusEl.innerText = "Mồi hết tầm chìm, thu dây về (Không mất mồi)";
                statusEl.style.color = "#aaa";
              }
            }
          }
        }
        else if (this.state === 'STRUGGLING') {
          if (!this.caughtFish) return;
          this.currentTaps -= 0.04;
          if (this.currentTaps < 0) this.currentTaps = 0;
          
          const progressPercent = (this.currentTaps / this.targetTaps) * 100;
          const struggleBar = document.getElementById('struggle-bar');
          if (struggleBar) struggleBar.style.width = Math.max(0, progressPercent) + '%';

          if (this.currentTaps <= 0) {
            this.caughtFish.isCaught = false; 
            this.caughtFish = null;
            this.state = 'REELING_HORIZ';
            const struggleUi = document.getElementById('struggle-ui');
            if (struggleUi) struggleUi.style.display = 'none';
            if (statusEl) {
              statusEl.innerText = "Đứt dây! Cá sổng mất rồi!";
              statusEl.style.color = "#F44336";
            }
          }
        }
        else if (this.state === 'REELING_HORIZ') {
          if (bottomTimer) { clearTimeout(bottomTimer); bottomTimer = null; }
          let dx = rodTipX - this.x;
          let speed = this.caughtFish ? 5 : 12;
          
          if (Math.abs(dx) < speed) {
            this.x = rodTipX;
            this.state = 'REELING_VERT';
            if (this.caughtFish && statusEl) statusEl.innerText = "Thu thẳng lên mạn thuyền!";
          } else {
            this.x += Math.sign(dx) * speed;
            if (this.caughtFish) {
              let mouthOffsetX = this.caughtFish.direction === 1 ? this.caughtFish.size * 0.7 : -this.caughtFish.size * 0.7;
              let mouthOffsetY = -this.caughtFish.size * 0.15;
              this.caughtFish.x = this.x - mouthOffsetX;
              this.caughtFish.y = this.y - mouthOffsetY;
            }
          }
        }
        else if (this.state === 'REELING_VERT') {
          let dy = rodTipY - this.y;
          let speed = 25; 
          
          if (Math.abs(dy) < speed) {
            if (this.caughtFish) {
              let earnedPoints = this.caughtFish.points;

              if (this.caughtFish.fishData.isRare) {
                const randChance = Math.random();
                if (randChance < 0.25) { 
                  async function triggerJackpotWin(baitCost: number) {
                    const { data } = await supabase.from('cauca_jackpot').select('*').eq('id', 'global').single();
                    if (data) {
                      let wonAmount = 0;
                      let hũName = "";

                      if (baitCost >= 10 && baitCost <= 1000) {
                        wonAmount = data.minor;
                        hũName = "Cá Trái Đất (Minor)";
                        await supabase.from('cauca_jackpot').update({ minor: 100000 }).eq('id', 'global'); 
                      } else if (baitCost >= 2000 && baitCost <= 100000) {
                        wonAmount = data.major;
                        hũName = "Cá Namek (Major)";
                        await supabase.from('cauca_jackpot').update({ major: 500000 }).eq('id', 'global'); 
                      } else {
                        wonAmount = data.grand;
                        hũName = "Cá Siêu Cấp (Grand)";
                        await supabase.from('cauca_jackpot').update({ grand: 2000000 }).eq('id', 'global'); 
                      }

                      earnedPoints += wonAmount;
                      window.dispatchEvent(new CustomEvent('showRarePopup', { 
                        detail: { 
                          name: fish.fishData.vnName, 
                          points: earnedPoints, 
                          jackpotMsg: `🎉 NỔ HŨ THÀNH CÔNG HŨ ${hũName}! +${wonAmount.toLocaleString()} 🪙` 
                        } 
                      }));
                    }
                  }
                  triggerJackpotWin(this.baitPrice);
                } else {
                  window.dispatchEvent(new CustomEvent('showRarePopup', { 
                    detail: { name: this.caughtFish.fishData.vnName, points: earnedPoints } 
                  }));
                }
              }

              const currentActiveScore = (window as any).currentGameScore ?? 1000;
              const finalScore = currentActiveScore + earnedPoints;
              syncScoreToSupabase(finalScore);

              let idx = fishes.indexOf(this.caughtFish);
              if (idx > -1) {
                fishes.splice(idx, 1);
                fishes.push(new Fish());
              }
            }
            this.reset();
          } else {
            this.y += Math.sign(dy) * speed;
            if (this.caughtFish) {
              let mouthOffsetX = this.caughtFish.direction === 1 ? this.caughtFish.size * 0.7 : -this.caughtFish.size * 0.7;
              let mouthOffsetY = -this.caughtFish.size * 0.15;
              this.caughtFish.x = this.x - mouthOffsetX;
              this.caughtFish.y = this.y - mouthOffsetY;
              this.caughtFish.x += (Math.random() - 0.5) * 6; 
            }
          }
        }
      }

      catchFish(fish: Fish) {
        if (bottomTimer) { clearTimeout(bottomTimer); bottomTimer = null; }
        this.caughtFish = fish;
        fish.isCaught = true;
        
        ctx.fillStyle = 'white';
        for(let i=0; i<10; i++) {
          ctx.beginPath();
          ctx.arc(this.x + (Math.random()-0.5)*20, this.y + (Math.random()-0.5)*20, Math.random()*4+2, 0, Math.PI*2);
          ctx.fill();
        }
        
        const willStruggle = Math.random() <= fish.struggleChance;

        if (willStruggle) {
          this.state = 'STRUGGLING';
          this.targetTaps = fish.requiredTaps; 
          this.currentTaps = this.targetTaps * 0.4; 
          
          const struggleUi = document.getElementById('struggle-ui');
          const struggleBar = document.getElementById('struggle-bar');
          if (struggleUi) struggleUi.style.display = 'block';
          if (struggleBar) struggleBar.style.width = '40%';
          if (statusEl) {
            statusEl.innerText = `Dính ${fish.fishData.vnName} KHỔNG LỒ! NHẤP LIÊN TỤC (${this.targetTaps} LẦN)!!!`;
            statusEl.style.color = "#FF5252";
          }
        } else {
          this.state = 'REELING_HORIZ';
          if (statusEl) {
            statusEl.innerText = `Dính ${fish.fishData.vnName}! Kéo lên thuyền...`;
            statusEl.style.color = "#FFEB3B";
          }
        }
      }

      draw() {
        let drawX = this.x;
        let drawY = this.y;
        
        if (this.state === 'STRUGGLING') {
          drawX += (Math.random() - 0.5) * 14;
          drawY += (Math.random() - 0.5) * 14;
        }

        ctx.beginPath();
        ctx.moveTo(rodTipX, rodTipY);
        if (this.state === 'IDLE' || this.state === 'CHARGING') {
          let extraBend = this.state === 'CHARGING' ? (this.power / 100) * 20 : 0;
          ctx.quadraticCurveTo(rodTipX + 15 + extraBend, rodTipY + 45 + extraBend, rodTipX, rodTipY + 75);
          ctx.strokeStyle = 'rgba(255,255,255,0.75)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          this.drawHookAndBait(rodTipX, rodTipY + 75);
        } else {
          let controlX = (rodTipX + drawX) / 2;
          let controlY = Math.min(rodTipY, drawY) - 30;
          ctx.quadraticCurveTo(controlX, controlY, drawX, drawY);
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          this.drawHookAndBait(drawX, drawY);
        }
      }

      drawHookAndBait(hx: number, hy: number) {
        ctx.fillStyle = '#FF9800'; 
        ctx.beginPath(); 
        ctx.arc(hx, hy - 6, 6, 0, Math.PI * 2); 
        ctx.fill();
        ctx.strokeStyle = '#E65100';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.strokeStyle = '#B0BEC5';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(hx, hy + 6, 5, 0, Math.PI, false);
        ctx.moveTo(hx + 5, hy + 6);
        ctx.lineTo(hx + 5, hy);
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(hx - 2, hy + 4, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    }

    const fishes: Fish[] = [];
    for (let i = 0; i < 6; i++) fishes.push(new Fish("top"));
    for (let i = 0; i < 6; i++) fishes.push(new Fish("mid"));
    for (let i = 0; i < 6; i++) fishes.push(new Fish("bottom"));

    const hook = new Hook();

    let activeBaitCost = 50;
    const updateBaitListener = (e: any) => { activeBaitCost = e.detail; };
    window.addEventListener('changeBait', updateBaitListener);

    let isHolding = false;
    let holdClientX = canvas.width / 2;

    const handleDown = (clientX: number) => {
      if (hook.state === 'STRUGGLING') {
        hook.tapStruggle();
      } else if (hook.state === 'IDLE') {
        isHolding = true;
        holdClientX = clientX;
        hook.startCharging(activeBaitCost);
      }
    };

    const handleMove = (clientX: number) => {
      if (isHolding && hook.state === 'CHARGING') {
        holdClientX = clientX;
      }
    };

    const handleUp = () => {
      if (isHolding && hook.state === 'CHARGING') {
        isHolding = false;
        if (powerContainer) powerContainer.style.display = 'none';
        hook.releaseCharging(holdClientX);
      }
    };

    const onMouseDown = (e: MouseEvent) => handleDown(e.clientX);
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onMouseUp = () => handleUp();

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      handleDown(e.touches[0].clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleUp();
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    canvas.addEventListener('touchstart', onTouchStart, {passive: false});
    canvas.addEventListener('touchmove', onTouchMove, {passive: false});
    window.addEventListener('touchend', onTouchEnd);

    function drawBackground() {
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, width, waterY);
      
      ctx.fillStyle = '#FFEB3B';
      ctx.beginPath(); ctx.arc(width*0.8, height*0.1, 40, 0, Math.PI*2); ctx.fill();

      ctx.fillStyle = '#5D4037';
      ctx.fillRect(0, waterY - 35, width * 0.28, 35); 
      ctx.fillStyle = '#3E2723';
      ctx.fillRect(width * 0.22 - 12, waterY, 18, height - waterY); 

      ctx.fillStyle = '#212121'; 
      ctx.fillRect(rodBaseX - 10, rodBaseY - 15, 22, 55); 
      
      // 🌟 HIỆN THÊM CÁI ĐẦU (AVATAR) NGAY TRÊN CẦN CÂU
      const avatarImg = new Image();
      avatarImg.src = userAvatar;
      if (avatarImg.complete && avatarImg.naturalWidth !== 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(rodBaseX + 1, rodBaseY + 12, 14, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, rodBaseX - 13, rodBaseY - 2, 28, 28);
        ctx.restore();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rodBaseX + 1, rodBaseY + 12, 14, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath(); ctx.arc(rodBaseX + 1, rodBaseY + 12, 12, 0, Math.PI * 2); ctx.fill();
      }

      let bendOffset = hook.state === 'CHARGING' ? (hook.power / 100) * 18 : 0;
      ctx.strokeStyle = '#8D6E63';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(rodBaseX, rodBaseY);
      ctx.quadraticCurveTo(rodBaseX + 45 + bendOffset, rodBaseY - 45 - bendOffset, rodTipX, rodTipY);
      ctx.stroke();

      ctx.strokeStyle = '#D7CCC8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rodBaseX, rodBaseY - 2);
      ctx.quadraticCurveTo(rodBaseX + 45 + bendOffset, rodBaseY - 47 - bendOffset, rodTipX, rodTipY - 2);
      ctx.stroke();

      let grad = ctx.createLinearGradient(0, waterY, 0, height);
      grad.addColorStop(0, '#0288D1'); 
      grad.addColorStop(1, '#000A1F'); 
      ctx.fillStyle = grad;
      ctx.fillRect(0, waterY, width, height - waterY);
      
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(0, waterY, width, 4);
    }

    let animationFrameId: number;
    function gameLoop() {
      ctx.clearRect(0, 0, width, height);
      drawBackground();
      
      for (let f of fishes) {
        f.update();
        f.draw();
      }
      
      hook.update();
      hook.draw();

      animationFrameId = requestAnimationFrame(gameLoop);
    }

    gameLoop();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('changeBait', updateBaitListener);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMounted, userAvatar]);

  useEffect(() => {
    const handleRarePopup = (e: any) => {
      setRarePopup({ 
        show: true, 
        name: e.detail.name, 
        points: e.detail.points,
        jackpotMsg: e.detail.jackpotMsg 
      });
      setTimeout(() => setRarePopup(null), 4000);
    };
    window.addEventListener('showRarePopup', handleRarePopup);

    return () => {
      window.removeEventListener('showRarePopup', handleRarePopup);
    };
  }, []);

  const handleBaitChange = (cost: number) => {
    setSelectedBait(cost);
    window.dispatchEvent(new CustomEvent('changeBait', { detail: cost }));
  };

  const baitList = [
    { cost: 10, label: "Mồi Sơ Cấp (10🪙)" },
    { cost: 20, label: "Mồi Thường (20🪙)" },
    { cost: 50, label: "Mồi Tiêu Chuẩn (50🪙)" },
    { cost: 100, label: "Mồi Khá (100🪙)" },
    { cost: 500, label: "Mồi Thơm (500🪙)" },
    { cost: 1000, label: "Mồi Xịn (1,000🪙)" },
    { cost: 5000, label: "Mồi Cao Cấp (5,000🪙)" },
    { cost: 10000, label: "Mồi Quái Vật (10,000🪙)" }
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#87CEEB] select-none touch-none font-sans fixed inset-0">
      
      <div className="absolute top-3 left-3 z-20 flex items-center space-x-2">
        <Link href="/" className="bg-slate-900/90 text-amber-400 hover:underline px-3 py-2 rounded-xl text-xs font-black border border-amber-500/40 shadow">
          ← Về Cổng Game
        </Link>
        <div className="bg-black/80 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm border border-amber-500/40 shadow flex items-center gap-2">
          <img src={userAvatar} alt="Avatar" className="w-6 h-6 rounded-full border border-amber-400 object-cover" />
          <span>Balance: <span id="score" className="text-[#FFEB3B] font-black">{isMounted ? score.toLocaleString() : "..."}</span> 🪙</span>
        </div>
      </div>

      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-slate-950/90 border border-amber-500/60 px-4 py-1.5 rounded-2xl shadow-2xl flex items-center space-x-4 pointer-events-none">
        <div className="text-center">
          <span className="text-[9px] font-bold text-slate-300 block">CÁ TRÁI ĐẤT (10-1k)</span>
          <span className="text-xs sm:text-sm font-black text-amber-300">{isMounted ? jackpot.minor.toLocaleString('en-US') : "..."} 🪙</span>
        </div>
        <div className="h-6 w-[1px] bg-amber-500/30"></div>
        <div className="text-center">
          <span className="text-[9px] font-bold text-red-400 block">CÁ SIÊU CẤP (TẤT CẢ)</span>
          <span className="text-xs sm:text-sm font-black text-red-500 animate-pulse">{isMounted ? jackpot.grand.toLocaleString('en-US') : "..."} 🪙</span>
        </div>
        <div className="h-6 w-[1px] bg-amber-500/30"></div>
        <div className="text-center">
          <span className="text-[9px] font-bold text-blue-400 block">CÁ NAMEK (2k-100k)</span>
          <span className="text-xs sm:text-sm font-black text-cyan-400">{isMounted ? jackpot.major.toLocaleString('en-US') : "..."} 🪙</span>
        </div>
      </div>

      <div className="absolute top-3 right-3 z-20 bg-slate-900/95 border border-amber-500/50 p-2 rounded-2xl shadow-2xl flex flex-col items-center space-y-1 max-w-[260px] sm:max-w-sm">
        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
          🪱 CHỌN LOẠI MỒI CÂU
        </span>
        <div className="flex flex-wrap justify-center gap-1">
          {baitList.map((bait) => (
            <button
              key={bait.cost}
              onClick={() => handleBaitChange(bait.cost)}
              className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-black transition cursor-pointer shadow ${
                selectedBait === bait.cost
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 scale-105 ring-2 ring-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {bait.label}
            </button>
          ))}
        </div>
      </div>

      {rarePopup && rarePopup.show && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none animate-bounce text-center bg-slate-950/90 border-4 border-amber-400 px-6 py-4 rounded-3xl shadow-[0_0_50px_rgba(251,191,36,0.6)] space-y-1">
          <p className="text-amber-300 font-black text-xs sm:text-sm tracking-widest uppercase">
            🔥 SĂN THÀNH CÔNG QUÁI VẬT 🔥
          </p>
          <h2 className="text-white font-black text-xl sm:text-3xl drop-shadow-[2px_2px_0_#000]">
            {rarePopup.name}
          </h2>
          {rarePopup.jackpotMsg && (
            <p className="text-rose-400 font-black text-sm sm:text-base animate-pulse bg-black/60 px-3 py-1 rounded-xl border border-rose-500/50">
              {rarePopup.jackpotMsg}
            </p>
          )}
          <p className="text-yellow-400 font-black text-base sm:text-lg mt-1">
            +{rarePopup.points.toLocaleString('en-US')} Điểm Thưởng! 🪙
          </p>
        </div>
      )}

      <div id="power-container" className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[250px] h-[24px] bg-black/70 rounded-xl border-2 border-white hidden pointer-events-none overflow-hidden shadow-lg z-10">
        <div id="power-bar" className="w-[0%] h-full bg-gradient-to-r from-[#4CAF50] via-[#FFEB3B] to-[#F44336] transition-all duration-75"></div>
      </div>

      <div id="struggle-ui" className="hidden absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-30">
        <h1 className="text-red-500 font-black text-xl sm:text-3xl mb-2 drop-shadow-[2px_2px_0_#000] animate-pulse">
          CÁ KHỦNG KÉO DÂY! NHẤP LIÊN TỤC ĐI NÍ ƠI!!!
        </h1>
        <div className="w-[280px] h-[22px] bg-black/80 border-2 border-white rounded-xl overflow-hidden mx-auto shadow-lg">
          <div id="struggle-bar" className="w-[40%] h-full bg-[#F44336] transition-all duration-75"></div>
        </div>
      </div>

      <canvas id="gameCanvas" className="block w-full h-full"></canvas>
    </div>
  );
}