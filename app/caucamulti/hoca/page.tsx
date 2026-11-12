"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

// --- CẤU HÌNH SUPABASE ---
const supabaseUrl = "https://iaejbvlibjfpdwuqfszp.supabase.co";
const supabaseKey = "sb_publishable_Bf1jY3-FAjFRij0LMn5FLQ_nLrw2MUE";
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// --- HỆ THỐNG ARENA STATS (ĐỒNG BỘ TỪ CODE CÂU CÁ) ---
function generateArenaStats(weight: number) {
  const rand = Math.random() * 100;
  let rank = "D";
  let statMult = 1.0;

  if (rand < 5) {
    rank = "S";
    statMult = 4.0;
  } else if (rand < 15) {
    rank = "A";
    statMult = 2.5;
  } else if (rand < 30) {
    rank = "B";
    statMult = 1.8;
  } else if (rand < 60) {
    rank = "C";
    statMult = 1.2;
  } else {
    rank = "D";
    statMult = 0.8;
  }

  const baseVal = Math.max(10, Math.sqrt(weight) * 15);
  return {
    rank: rank,
    power: Math.floor(baseVal * statMult * (0.8 + Math.random() * 0.4)),
    defense: Math.floor(baseVal * statMult * (0.8 + Math.random() * 0.4)),
    arenaHp: Math.floor(baseVal * statMult * (1.5 + Math.random() * 0.5) * 5),
  };
}

// --- CÁC LOẠI THỨC ĂN TRONG HỒ ---
const FEED_TYPES = [
  {
    id: "normal",
    name: "Cám Thường",
    price: 10,
    nutrition: 15,
    minFishWeight: 0,
    maxFishWeight: 99999999,
    sizeRadius: 3.5,
    color: "#FFB300",
    emoji: "🍚",
    desc: "Cám cơ bản (+15 độ no/hạt)",
  },
  {
    id: "super",
    name: "Cám Siêu Dưỡng Chất",
    price: 50,
    nutrition: 120,
    minFishWeight: 0,
    maxFishWeight: 99999999,
    sizeRadius: 5.5,
    color: "#FF5252",
    emoji: "🥩",
    desc: "Đạm cao (+120 độ no/hạt)",
  },
  {
    id: "god",
    name: "Thức Ăn Thượng Cổ",
    price: 200,
    nutrition: 1200,
    minFishWeight: 0,
    maxFishWeight: 99999999,
    sizeRadius: 8.0,
    color: "#00E5FF",
    emoji: "🌟",
    desc: "Siêu dinh dưỡng (+1.200 độ no/hạt)",
  },
];

const FULLNESS_DURATION_SEC = 3600;
const HUNGER_THRESHOLD_RATIO = 0.3;
const STARVING_MIN_GROWTH = 5;
const STARVATION_DEATH_MS = 3 * 24 * 60 * 60 * 1000;

const getStomachCapacity = (weight: number) => {
  if (weight > 500) return Math.round(weight * 1.8);
  if (weight >= 50) return Math.round(weight * 1.0);
  return Math.max(30, Math.round(weight * 0.8));
};

const getGrowthDurationSec = (baseWeight: number) => {
  if (baseWeight < 50) return 600;
  if (baseWeight <= 500) return 1800;
  return 3600;
};

export default function HoCaPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [score, setScore] = useState<number>(0);
  const [inventory, setInventory] = useState<any>({});
  const [aquarium, setAquarium] = useState<any[]>([]);

  const [interactionMode, setInteractionMode] = useState<"pet" | "feed" | "breed">("pet");
  const [selectedFeedId, setSelectedFeedId] = useState<string>("normal");
  const [selectedFishInfo, setSelectedFishInfo] = useState<any | null>(null);
  const [, setUiTick] = useState<number>(0);
  const [toastBanner, setToastBanner] = useState<{ title: string; message: string; type?: string } | null>(null);

  const [isFishBagOpen, setIsFishBagOpen] = useState<boolean>(false);
  const [isAuctionOpen, setIsAuctionOpen] = useState<boolean>(false);
  const [realtimeAuctions, setRealtimeAuctions] = useState<any[]>([]);
  const [shopNotification] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const userRef = useRef<any>(null);
  const scoreRef = useRef<number>(0);
  const inventoryRef = useRef<any>({});
  const aquariumRef = useRef<any[]>([]);
  const fishInvRef = useRef<any[]>([]);
  const activeFishEntitiesRef = useRef<any[]>([]);
  const isDataLoadedRef = useRef<boolean>(false);
  const isSavingRef = useRef<boolean>(false);
  const lastLocalWriteAtRef = useRef<number>(0);

  useEffect(() => {
    let timer: any = null;
    const handlePopup = (e: any) => {
      const detail = e?.detail;
      if (!detail) return;
      setToastBanner(detail);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setToastBanner(null), 3000);
    };
    window.addEventListener("showPopupBanner", handlePopup);
    return () => {
      window.removeEventListener("showPopupBanner", handlePopup);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Hàm xử lý & đồng bộ dữ liệu từ Supabase (dùng chung cho lúc mới mở, khi focus lại tab, hoặc khi DB thay đổi từ caucamulti)
  const hydrateFromProfileData = async (userId: string, forceRenderEntities = true) => {
    if (isSavingRef.current) return;
    const { data } = await supabase.from("profiles").select("balance, inventory").eq("id", userId).single();
    if (!data) return;

    const loadedBalance = Number(data.balance ?? 0);
    const loadedInventory = data.inventory || {};

    setScore(loadedBalance);
    scoreRef.current = loadedBalance;
    (window as any).currentGameScore = loadedBalance;

    setInventory(loadedInventory);
    inventoryRef.current = loadedInventory;

    const now = Date.now();
    const rawAquarium = Array.isArray(loadedInventory?.aquarium) ? loadedInventory.aquarium : [];
    const latestFishBag = Array.isArray(loadedInventory?.fish_inventory) ? loadedInventory.fish_inventory : [];
    const deadFishNames: string[] = [];
    const processedAq: any[] = [];

    for (const f of rawAquarium) {
      const initW = f.initialWeight || f.weight;
      const maxW = f.maxWeight || Number((initW * 3).toFixed(1));
      const curW = f.currentWeight !== undefined ? f.currentWeight : initW;
      const capacity = getStomachCapacity(curW);

      const lastUpdate = f.lastUpdateTime || f.lastFedTime || now;
      const elapsedSec = Math.max(0, (now - lastUpdate) / 1000);
      const savedFood = f.currentFood !== undefined ? f.currentFood : 0;
      const drainRate = capacity / FULLNESS_DURATION_SEC;
      const hungerThresholdFood = capacity * HUNGER_THRESHOLD_RATIO;

      const growthDuration = getGrowthDurationSec(initW);
      const growthRatePerSec = 100 / growthDuration;
      let currentGrowth = f.growth !== undefined ? f.growth : 0;
      let starvingSince: number | null = f.starvingSince || null;

      if (savedFood >= hungerThresholdFood) {
        const secAboveThreshold =
          drainRate > 0 ? Math.min(elapsedSec, (savedFood - hungerThresholdFood) / drainRate) : elapsedSec;
        currentGrowth = Math.min(100, currentGrowth + secAboveThreshold * growthRatePerSec);

        const secBelowThreshold = Math.max(0, elapsedSec - secAboveThreshold);
        if (secBelowThreshold > 0) {
          if (currentGrowth > STARVING_MIN_GROWTH) {
            currentGrowth = Math.max(STARVING_MIN_GROWTH, currentGrowth - secBelowThreshold * growthRatePerSec);
          }
          const crossedAt = lastUpdate + secAboveThreshold * 1000;
          starvingSince = starvingSince || crossedAt;
        } else {
          starvingSince = null;
        }
      } else {
        if (currentGrowth > STARVING_MIN_GROWTH) {
          currentGrowth = Math.max(STARVING_MIN_GROWTH, currentGrowth - elapsedSec * growthRatePerSec);
        }
        starvingSince = starvingSince || lastUpdate;
      }

      const remainingFood = Math.max(0, savedFood - drainRate * elapsedSec);

      if (starvingSince && now - starvingSince >= STARVATION_DEATH_MS) {
        deadFishNames.push(f.vnName || "Cá");
        continue;
      }

      const updatedWeight = Number((initW + (maxW - initW) * (currentGrowth / 100)).toFixed(1));
      const arenaStats =
        f.rank && f.power !== undefined
          ? { rank: f.rank, power: f.power, defense: f.defense, arenaHp: f.arenaHp }
          : generateArenaStats(updatedWeight);

      processedAq.push({
        ...f,
        initialWeight: initW,
        maxWeight: maxW,
        currentWeight: updatedWeight,
        growth: Number(currentGrowth.toFixed(3)),
        currentFood: Number(remainingFood.toFixed(2)),
        stomachCapacity: getStomachCapacity(updatedWeight),
        starvingSince,
        lastUpdateTime: now,
        fedCount: f.fedCount || 0,
        gender: f.gender || (Math.random() > 0.5 ? "Đực" : "Cái"),
        lastFedTime: f.lastFedTime || now,
        breedState: f.breedState || "normal",
        breedTimer: f.breedTimer || 0,
        ...arenaStats,
      });
    }

    setAquarium(processedAq);
    aquariumRef.current = processedAq;
    fishInvRef.current = latestFishBag;
    isDataLoadedRef.current = true;

    if (forceRenderEntities) {
      window.dispatchEvent(new CustomEvent("aquariumDataReady"));
    }

    if (deadFishNames.length > 0) {
      await syncToDB(processedAq, latestFishBag);
      window.dispatchEvent(
        new CustomEvent("showPopupBanner", {
          detail: {
            title: "💀 CÁ ĐÃ CHẾT ĐÓI!",
            message: `${deadFishNames.join(", ")} đã nhịn đói quá 3 ngày và biến mất khỏi hồ!`,
            type: "beerus",
          },
        })
      );
    }
  };

  useEffect(() => {
    setIsMounted(true);
    let profileChannel: any = null;

    async function loadData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        userRef.current = session.user;
        await hydrateFromProfileData(session.user.id, true);

        // Lắng nghe thay đổi Realtime trên bảng profiles (khi bán/câu cá bên caucamulti thì Hồ Cá tự cập nhật ngay, không bao giờ hồi sinh cá đã bán)
        profileChannel = supabase
          .channel(`profile_sync_hoca_${session.user.id}`)
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${session.user.id}` },
            () => {
              if (Date.now() - lastLocalWriteAtRef.current < 1500) return;
              hydrateFromProfileData(session.user.id, true);
            }
          )
          .subscribe();
      }
    }
    loadData();

    // Khi quay lại tab / chuyển trang từ caucamulti về hoca -> tải lại ngay bản mới nhất từ DB
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible" && userRef.current?.id) {
        hydrateFromProfileData(userRef.current.id, true);
      }
    };
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    async function fetchAuctions() {
      const { data } = await supabase.from("auctions").select("*").order("created_at", { ascending: false });
      if (data) setRealtimeAuctions(data);
    }
    fetchAuctions();

    const auctionChannel = supabase
      .channel("public:auctions")
      .on("postgres_changes", { event: "*", schema: "public", table: "auctions" }, () => {
        fetchAuctions();
      })
      .subscribe();

    return () => {
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      if (profileChannel) supabase.removeChannel(profileChannel);
      supabase.removeChannel(auctionChannel);
    };
  }, []);

  useEffect(() => {
    if (!selectedFishInfo) return;
    const interval = setInterval(() => {
      const liveFish = aquariumRef.current.find((f) => f.id === selectedFishInfo.id);
      if (liveFish) {
        setSelectedFishInfo({ ...liveFish });
      } else {
        setSelectedFishInfo(null);
      }
      setUiTick((t) => t + 1);
    }, 500);
    return () => clearInterval(interval);
  }, [selectedFishInfo?.id]);

  // Lưu an toàn: Fetch inventory mới nhất trên DB trước khi ghi để KHÔNG BAO GIỜ ghi đè mất dữ liệu từ caucamulti
  const syncToDB = async (newAq: any[], newFishInv: any[], newScore?: number, skipReadBeforeWrite = false) => {
    const activeUser = userRef.current || user;
    if (!activeUser || !isDataLoadedRef.current || isSavingRef.current) return;

    isSavingRef.current = true;
    lastLocalWriteAtRef.current = Date.now();

    try {
      let latestDbInv = inventoryRef.current || {};
      if (!skipReadBeforeWrite) {
        const { data: freshProfile } = await supabase
          .from("profiles")
          .select("inventory")
          .eq("id", activeUser.id)
          .single();
        if (freshProfile?.inventory) {
          latestDbInv = freshProfile.inventory;
        }
      }

      setAquarium(newAq);
      aquariumRef.current = newAq;
      fishInvRef.current = newFishInv;

      const mergedInv = {
        ...latestDbInv,
        aquarium: newAq,
        fish_inventory: newFishInv,
      };
      setInventory(mergedInv);
      inventoryRef.current = mergedInv;

      const updatePayload: any = { inventory: mergedInv };
      if (typeof newScore === "number" && !Number.isNaN(newScore)) {
        setScore(newScore);
        scoreRef.current = newScore;
        (window as any).currentGameScore = newScore;
        updatePayload.balance = newScore;
      }

      await supabase.from("profiles").update(updatePayload).eq("id", activeUser.id);
    } finally {
      lastLocalWriteAtRef.current = Date.now();
      isSavingRef.current = false;
    }
  };

  useEffect(() => {
    if (!isMounted || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let width = window.innerWidth;
    let height = window.innerHeight;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.scale(dpr, dpr);
    }
    window.addEventListener("resize", resize);
    resize();

    const bubbles: { x: number; y: number; r: number; s: number; offset: number }[] = [];
    for (let i = 0; i < 35; i++)
      bubbles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 3 + 1,
        s: Math.random() * 1 + 0.5,
        offset: Math.random() * 100,
      });

    const planktons: { x: number; y: number; s: number; a: number }[] = [];
    for (let i = 0; i < 50; i++)
      planktons.push({
        x: Math.random() * width,
        y: Math.random() * height,
        s: Math.random() * 0.5 + 0.2,
        a: Math.random() * Math.PI * 2,
      });

    const godRays: { x: number; w: number; a: number; speed: number }[] = [];
    for (let i = 0; i < 5; i++)
      godRays.push({
        x: Math.random() * width,
        w: Math.random() * 150 + 100,
        a: Math.random() * 100,
        speed: Math.random() * 0.02 + 0.01,
      });

    const foodFlakes: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      feedId: string;
      nutrition: number;
      minFishWeight: number;
      maxFishWeight: number;
      sizeRadius: number;
      color: string;
      active: boolean;
    }[] = [];
    const hearts: { x: number; y: number; life: number }[] = [];
    const floatingTexts: { x: number; y: number; text: string; color: string; life: number }[] = [];

    const fishImageCache: { [filename: string]: HTMLImageElement } = {};
    const getFishImage = (filename: string) => {
      if (!filename) return null;
      if (fishImageCache[filename]) return fishImageCache[filename];
      const img = new Image();
      img.src = `/assets/cauca/${filename}`;
      fishImageCache[filename] = img;
      return img;
    };

    class FishEntity {
      dbData: any;
      x: number;
      y: number;
      vx: number;
      vy: number;
      direction: number;
      animFrame: number;
      targetFood: any | null = null;
      loveMode: boolean = false;
      reactTimer: number = 0;
      isDead: boolean = false;

      constructor(dbData: any) {
        this.dbData = dbData;
        if (this.dbData.initialWeight === undefined) this.dbData.initialWeight = this.dbData.weight;
        if (this.dbData.maxWeight === undefined) this.dbData.maxWeight = Number((this.dbData.initialWeight * 3).toFixed(1));
        if (this.dbData.currentWeight === undefined) this.dbData.currentWeight = this.dbData.initialWeight;
        if (this.dbData.growth === undefined) this.dbData.growth = 0;
        if (this.dbData.currentFood === undefined) this.dbData.currentFood = 0;
        this.dbData.stomachCapacity = getStomachCapacity(this.dbData.currentWeight);

        if (!this.dbData.rank || this.dbData.power === undefined) {
          const stats = generateArenaStats(this.dbData.currentWeight);
          this.dbData.rank = stats.rank;
          this.dbData.power = stats.power;
          this.dbData.defense = stats.defense;
          this.dbData.arenaHp = stats.arenaHp;
        }

        this.x = Math.random() * (width - 100) + 50;
        this.y = Math.random() * (height - 150) + 100;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.direction = this.vx >= 0 ? 1 : -1;
        this.animFrame = Math.random() * 100;
        this.checkHungerState();
      }

      getFullnessRatio(): number {
        const cap = this.dbData.stomachCapacity || getStomachCapacity(this.dbData.currentWeight || this.dbData.weight);
        return cap > 0 ? (this.dbData.currentFood || 0) / cap : 0;
      }

      isFull(): boolean {
        return this.getFullnessRatio() >= 1;
      }

      isHungry(): boolean {
        return this.getFullnessRatio() < HUNGER_THRESHOLD_RATIO;
      }

      canEatFood(food: any): boolean {
        const curW = this.dbData.currentWeight || this.dbData.weight;
        return curW >= (food.minFishWeight || 0) && curW <= (food.maxFishWeight || 99999999);
      }

      checkHungerState() {
        this.loveMode = this.isHungry();
      }

      update(dtSec: number) {
        if (this.isDead) return;
        if (this.reactTimer > 0) this.reactTimer--;

        const now = Date.now();
        const curW = this.dbData.currentWeight || this.dbData.weight;
        const initW = this.dbData.initialWeight || this.dbData.weight;
        const maxW = this.dbData.maxWeight || Number((initW * 3).toFixed(1));
        const capacity = getStomachCapacity(curW);
        this.dbData.stomachCapacity = capacity;

        const drainRate = capacity / FULLNESS_DURATION_SEC;
        if ((this.dbData.currentFood || 0) > 0) {
          this.dbData.currentFood = Math.max(0, this.dbData.currentFood - drainRate * dtSec);
        }

        const fullnessRatio = this.getFullnessRatio();
        const growthDuration = getGrowthDurationSec(initW);
        const ratePerSec = 100 / growthDuration;

        if (fullnessRatio >= HUNGER_THRESHOLD_RATIO) {
          this.dbData.starvingSince = null;
          if ((this.dbData.growth || 0) < 100) {
            this.dbData.growth = Math.min(100, (this.dbData.growth || 0) + ratePerSec * dtSec);
            this.dbData.currentWeight = Number((initW + (maxW - initW) * (this.dbData.growth / 100)).toFixed(1));

            if (this.dbData.isBaby && this.dbData.growth >= 30) {
              this.dbData.isBaby = false;
            }
          }
        } else {
          if (!this.dbData.starvingSince) {
            this.dbData.starvingSince = now;
          }

          if ((this.dbData.growth || 0) > STARVING_MIN_GROWTH) {
            this.dbData.growth = Math.max(STARVING_MIN_GROWTH, (this.dbData.growth || 0) - ratePerSec * dtSec);
            this.dbData.currentWeight = Number((initW + (maxW - initW) * (this.dbData.growth / 100)).toFixed(1));
          }

          if (now - this.dbData.starvingSince >= STARVATION_DEATH_MS) {
            this.isDead = true;
            return;
          }
        }

        this.dbData.lastUpdateTime = now;
        this.checkHungerState();

        if (this.dbData.breedState === "fertilizing") {
          if (now - this.dbData.breedStartTime >= 600000) {
            this.dbData.breedState = "ready_to_spawn";
            window.dispatchEvent(
              new CustomEvent("showPopupBanner", {
                detail: {
                  title: "THỤ TINH THÀNH CÔNG!",
                  message: `${this.dbData.vnName} đã qua 10p thụ tinh, chuẩn bị đẻ!`,
                  type: "rare",
                },
              })
            );
          }
        } else if (this.dbData.breedState === "ready_to_spawn") {
          if (now - this.dbData.breedReadyTime >= 1800000) {
            this.dbData.breedState = "normal";
            const babyW = Number((this.dbData.weight * 0.1).toFixed(1));
            const babyArena = generateArenaStats(babyW);
            const babyData = {
              id: `fish_baby_${Math.random().toString(36).substring(2, 9)}`,
              filename: this.dbData.filename,
              vnName: `${this.dbData.vnName} (Con)`,
              weight: babyW,
              initialWeight: babyW,
              currentWeight: babyW,
              maxWeight: this.dbData.maxWeight,
              basePoints: Math.floor(this.dbData.basePoints * 0.1),
              baseValue: Math.floor((this.dbData.baseValue || 1000) * 0.1),
              caughtAt: now,
              isBaby: true,
              growth: 0,
              currentFood: getStomachCapacity(babyW),
              stomachCapacity: getStomachCapacity(babyW),
              starvingSince: null,
              lastUpdateTime: now,
              fedCount: 0,
              gender: Math.random() > 0.5 ? "Đực" : "Cái",
              lastFedTime: now,
              breedState: "normal",
              ...babyArena,
            };
            aquariumRef.current = [...aquariumRef.current, babyData];
            activeFishEntitiesRef.current.push(new FishEntity(babyData));
            window.dispatchEvent(new CustomEvent("triggerSaveAquariumNow"));
            window.dispatchEvent(
              new CustomEvent("showPopupBanner", {
                detail: {
                  title: "🎉 CÁ ĐÃ ĐẺ CON!",
                  message: `Quá trình 30p hoàn tất! Đã sinh ra 1 Baby ${babyData.vnName}!`,
                  type: "rare",
                },
              })
            );
          }
        }

        if (this.isFull() || (this.dbData.growth || 0) >= 100) {
          this.targetFood = null;
        } else {
          if (this.targetFood && (!this.targetFood.active || !this.canEatFood(this.targetFood))) {
            this.targetFood = null;
          }
          if (!this.targetFood) {
            let closestDist = 99999;
            for (let f of foodFlakes) {
              if (f.active && this.canEatFood(f)) {
                let d = Math.hypot(f.x - this.x, f.y - this.y);
                if (d < closestDist && d < 650) {
                  closestDist = d;
                  this.targetFood = f;
                }
              }
            }
          }
        }

        if (this.targetFood && !this.isFull() && (this.dbData.growth || 0) < 100) {
          let dx = this.targetFood.x - this.x;
          let dy = this.targetFood.y - this.y;
          let dist = Math.hypot(dx, dy);
          if (dist < 22) {
            this.dbData.currentFood = Math.min(capacity, (this.dbData.currentFood || 0) + this.targetFood.nutrition);
            if (this.getFullnessRatio() >= HUNGER_THRESHOLD_RATIO) {
              this.dbData.starvingSince = null;
            }
            this.dbData.lastFedTime = Date.now();
            this.dbData.lastUpdateTime = Date.now();
            this.dbData.fedCount = (this.dbData.fedCount || 0) + 1;

            this.targetFood.active = false;
            this.targetFood = null;
            hearts.push({ x: this.x, y: this.y - 30, life: 60 });

            const nowFull = this.isFull();
            const pctNow = Math.round((this.dbData.currentFood / capacity) * 100);
            floatingTexts.push({
              x: this.x,
              y: this.y - 40,
              text: nowFull ? "💤 Đã no căng!" : `😋 ${pctNow}% No`,
              color: nowFull ? "#69F0AE" : "#FFD54F",
              life: 60,
            });

            this.checkHungerState();
            const idx = aquariumRef.current.findIndex((f) => f.id === this.dbData.id);
            if (idx > -1) aquariumRef.current[idx] = this.dbData;
            window.dispatchEvent(new CustomEvent("triggerSaveAquarium"));
          } else {
            this.vx = (dx / dist) * 2.2;
            this.vy = (dy / dist) * 2.2;
          }
        } else {
          if (Math.random() < 0.01) this.vx += Math.random() - 0.5;
          if (Math.random() < 0.01) this.vy += (Math.random() - 0.5) * 0.5;

          const maxSpeed = this.dbData.isBaby ? 1.5 : 0.8;
          if (this.vx > maxSpeed) this.vx = maxSpeed;
          if (this.vx < -maxSpeed) this.vx = -maxSpeed;
          if (this.vy > maxSpeed * 0.5) this.vy = maxSpeed * 0.5;
          if (this.vy < -maxSpeed * 0.5) this.vy = -maxSpeed * 0.5;
        }

        this.x += this.vx;
        this.y += this.vy;
        if (this.vx !== 0) this.direction = this.vx > 0 ? 1 : -1;
        this.animFrame += 0.05;

        if (this.x < 30) {
          this.x = 30;
          this.vx *= -1;
        }
        if (this.x > width - 30) {
          this.x = width - 30;
          this.vx *= -1;
        }
        if (this.y < 100) {
          this.y = 100;
          this.vy *= -1;
        }
        if (this.y > height - 50) {
          this.y = height - 50;
          this.vy *= -1;
        }
      }

      draw() {
        if (this.isDead) return;
        ctx!.save();
        ctx!.translate(this.x, this.y);
        if (this.reactTimer > 0) ctx!.scale(1.2, 1.2);
        ctx!.rotate(Math.sin(this.animFrame) * 0.05);
        if (this.direction === 1) ctx!.scale(-1, 1);

        let curW = this.dbData.currentWeight || this.dbData.weight;
        let maxW = this.dbData.maxWeight || this.dbData.weight * 3;
        let growthRatio = Math.min(1, (this.dbData.growth || 0) / 100);
        let sizeScaleRatio = 0.45 + 0.75 * Math.max(curW / maxW, growthRatio);

        let baseScale = this.dbData.isBaby ? 0.3 : 0.6 * sizeScaleRatio;
        if (curW > 1000) baseScale *= 1.5;

        const img = getFishImage(this.dbData.filename);
        let fw = 40;
        let fh = 25;
        if (img && img.complete && img.naturalWidth !== 0) {
          fw = img.naturalWidth * baseScale * 0.2;
          fh = img.naturalHeight * baseScale * 0.2;
          if (fw > 250) {
            fh = fh * (250 / fw);
            fw = 250;
          }
          ctx!.drawImage(img, -fw / 2, -fh / 2, fw, fh);
        } else {
          ctx!.fillStyle = "red";
          ctx!.beginPath();
          ctx!.arc(0, 0, 15, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.restore();

        const foodRatio = Math.min(1, Math.max(0, this.getFullnessRatio()));
        const isHungryNow = foodRatio < HUNGER_THRESHOLD_RATIO;
        const isMaxed = (this.dbData.growth || 0) >= 100;
        const topOffset = Math.max(30, fh / 2 + 12);
        const bobY = Math.sin(this.animFrame) * 3;

        ctx!.save();
        ctx!.textAlign = "center";

        if (isMaxed) {
          ctx!.font = "900 11px sans-serif";
          ctx!.fillStyle = "#FFD700";
          ctx!.strokeStyle = "#000";
          ctx!.lineWidth = 3;
          const harvestLabel = `[${this.dbData.rank || "D"}] ${this.dbData.gender === "Đực" ? "♂️" : "♀️"} ✨ MAX KÝ - THU HOẠCH ✨`;
          ctx!.strokeText(harvestLabel, this.x, this.y - topOffset + bobY);
          ctx!.fillText(harvestLabel, this.x, this.y - topOffset + bobY);
        } else {
          const barW = 48;
          const barH = 4;
          const barX = this.x - barW / 2;
          const growthBarY = this.y - topOffset + bobY;

          ctx!.fillStyle = "rgba(0,0,0,0.65)";
          ctx!.fillRect(barX, growthBarY, barW, barH);
          ctx!.fillStyle = !isHungryNow
            ? "#00E676"
            : (this.dbData.growth || 0) > STARVING_MIN_GROWTH
            ? "#FB7185"
            : "#64748B";
          ctx!.fillRect(barX, growthBarY, barW * growthRatio, barH);

          const foodBarY = growthBarY + 6;
          ctx!.fillStyle = "rgba(0,0,0,0.65)";
          ctx!.fillRect(barX, foodBarY, barW, barH);
          ctx!.fillStyle = foodRatio >= 1 ? "#38BDF8" : !isHungryNow ? "#FBBF24" : "#F43F5E";
          ctx!.fillRect(barX, foodBarY, barW * foodRatio, barH);
          ctx!.fillStyle = "#FFFFFF";
          ctx!.fillRect(barX + barW * 0.3, foodBarY, 1, barH);

          ctx!.font = "bold 11px Arial";
          ctx!.fillStyle = isHungryNow ? "#FDA4AF" : "#FFFFFF";
          ctx!.strokeStyle = "rgba(0,0,0,0.85)";
          ctx!.lineWidth = 2.5;
          let statusText = `[${this.dbData.rank || "D"}] ${this.dbData.gender === "Đực" ? "♂️" : "♀️"}`;
          if (isHungryNow) statusText += ` 😭 Than đói!`;
          else if (foodRatio >= 1) statusText += " 💤 No (100%)";
          else statusText += ` ⚡ Lớn (${Math.round(foodRatio * 100)}%)`;

          if (this.dbData.breedState === "fertilizing") statusText += " 💕 (10p)";
          if (this.dbData.breedState === "ready_to_spawn") statusText += " 🥚 (30p)";

          ctx!.strokeText(statusText, this.x, growthBarY - 4);
          ctx!.fillText(statusText, this.x, growthBarY - 4);
        }

        if (this.dbData.isBaby) {
          ctx!.font = "12px Arial";
          ctx!.fillText("🍼", this.x, this.y - topOffset - 16 + bobY);
        }
        ctx!.restore();
      }
    }

    const initFishes = () => {
      activeFishEntitiesRef.current = aquariumRef.current.map((dbf) => new FishEntity(dbf));
    };
    initFishes();
    window.addEventListener("aquariumDataReady", initFishes);

    let saveTimeout: any = null;
    const handleTriggerSave = () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        syncToDB(aquariumRef.current, fishInvRef.current);
      }, 2500);
    };
    const handleTriggerSaveNow = () => syncToDB(aquariumRef.current, fishInvRef.current);
    window.addEventListener("triggerSaveAquarium", handleTriggerSave);
    window.addEventListener("triggerSaveAquariumNow", handleTriggerSaveNow);

    // Chỉ tự lưu định kỳ khi tab đang mở (visible) và chỉ khi có cá trong hồ để tránh ghi đè dữ liệu từ tab khác
    const autoSyncInterval = setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        isDataLoadedRef.current &&
        aquariumRef.current.length > 0
      ) {
        syncToDB(aquariumRef.current, fishInvRef.current);
      }
    }, 20000);

    let lastTouchTimestamp = 0;
    const handleTap = (e: MouseEvent | TouchEvent) => {
      let cx = 0,
        cy = 0;
      if (e.type.startsWith("touch")) {
        lastTouchTimestamp = Date.now();
        const te = e as TouchEvent;
        const touch = te.touches?.[0] || te.changedTouches?.[0];
        if (!touch) return;
        cx = touch.clientX;
        cy = touch.clientY;
      } else {
        if (Date.now() - lastTouchTimestamp < 400) return;
        cx = (e as MouseEvent).clientX;
        cy = (e as MouseEvent).clientY;
      }

      const currentMode = (window as any).currentInteractionMode || "pet";
      const feedId = (window as any).currentFeedId || "normal";
      const selectedFeedObj = FEED_TYPES.find((f) => f.id === feedId) || FEED_TYPES[0];
      const entities = activeFishEntitiesRef.current;

      if (currentMode === "feed") {
        const currentScore = scoreRef.current;
        if (currentScore >= selectedFeedObj.price) {
          (window as any).updateGameScore(currentScore - selectedFeedObj.price);
          let amount = Math.floor(Math.random() * 2) + 3;
          for (let i = 0; i < amount; i++) {
            foodFlakes.push({
              x: cx + (Math.random() - 0.5) * 45,
              y: cy + (Math.random() - 0.5) * 20,
              vx: (Math.random() - 0.5) * 1,
              vy: Math.random() * 1 + 0.8,
              feedId: selectedFeedObj.id,
              nutrition: selectedFeedObj.nutrition,
              minFishWeight: selectedFeedObj.minFishWeight,
              maxFishWeight: selectedFeedObj.maxFishWeight,
              sizeRadius: selectedFeedObj.sizeRadius,
              color: selectedFeedObj.color,
              active: true,
            });
          }

          const hasAnyNotFullFish = entities.some((f) => !f.isFull() && (f.dbData.growth || 0) < 100);
          if (!hasAnyNotFullFish && entities.length > 0) {
            window.dispatchEvent(
              new CustomEvent("showPopupBanner", {
                detail: {
                  title: "CÁ ĐÃ NO 100%!",
                  message: "Cá đang no căng hoặc đạt Max ký, mồi sẽ chìm từ từ chờ cá đói.",
                  type: "rare",
                },
              })
            );
          }
        } else {
          window.dispatchEvent(
            new CustomEvent("showPopupBanner", {
              detail: {
                title: "HẾT XU",
                message: `Cần ${selectedFeedObj.price}🪙 để mua ${selectedFeedObj.name}!`,
                type: "beerus",
              },
            })
          );
        }
      } else {
        let found = false;
        for (let f of entities) {
          let d = Math.hypot(cx - f.x, cy - f.y);
          if (d < 55) {
            f.reactTimer = 20;
            hearts.push({ x: f.x, y: f.y - 30, life: 60 });
            setSelectedFishInfo({ ...f.dbData });
            found = true;
            break;
          }
        }
        if (!found) setSelectedFishInfo(null);
      }
    };
    canvas.addEventListener("mousedown", handleTap);
    canvas.addEventListener("touchstart", handleTap, { passive: true });

    let animId: number;
    let lastTick = performance.now();

    function render(now: number) {
      const dtSec = Math.min(0.5, Math.max(0, (now - lastTick) / 1000));
      lastTick = now;

      let grad = ctx!.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "#0288D1");
      grad.addColorStop(0.5, "#01579B");
      grad.addColorStop(1, "#001A33");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, width, height);

      for (let ray of godRays) {
        ray.a += ray.speed;
        ctx!.save();
        ctx!.globalAlpha = (Math.sin(ray.a) + 1) * 0.15;
        ctx!.fillStyle = "#E0F7FA";
        ctx!.beginPath();
        ctx!.moveTo(ray.x, -50);
        ctx!.lineTo(ray.x + ray.w, -50);
        ctx!.lineTo(ray.x + ray.w + 200, height);
        ctx!.lineTo(ray.x - 200, height);
        ctx!.fill();
        ctx!.restore();
      }

      ctx!.fillStyle = "rgba(255,255,255,0.3)";
      for (let b of bubbles) {
        b.y -= b.s;
        b.x += Math.sin(b.y * 0.02 + b.offset) * 1;
        if (b.y < -20) {
          b.y = height + 20;
          b.x = Math.random() * width;
        }
        ctx!.beginPath();
        ctx!.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      for (let p of planktons) {
        p.a += 0.02;
        p.y -= p.s;
        p.x += Math.sin(p.a) * 0.5;
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        ctx!.fillStyle = `rgba(100, 255, 200, ${Math.abs(Math.sin(p.a)) * 0.8})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx!.fill();
      }

      for (let i = foodFlakes.length - 1; i >= 0; i--) {
        let f = foodFlakes[i];
        if (f.active) {
          f.x += f.vx;
          f.y += f.vy;
          ctx!.fillStyle = f.color;
          ctx!.beginPath();
          ctx!.arc(f.x, f.y, f.sizeRadius, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.strokeStyle = "rgba(255,255,255,0.7)";
          ctx!.lineWidth = 1;
          ctx!.stroke();
          if (f.y > height) f.active = false;
        } else {
          foodFlakes.splice(i, 1);
        }
      }

      const entities = activeFishEntitiesRef.current;
      const newlyDeadFishes: any[] = [];
      for (let i = 0; i < entities.length; i++) {
        const f = entities[i];
        if (!f) continue;
        f.update(dtSec);
        if (f.isDead) {
          newlyDeadFishes.push(f.dbData);
        } else {
          f.draw();
        }
      }

      if (newlyDeadFishes.length > 0) {
        const deadIds = new Set(newlyDeadFishes.map((d) => d.id));
        activeFishEntitiesRef.current = activeFishEntitiesRef.current.filter((e) => !deadIds.has(e.dbData.id));
        const survivingAq = aquariumRef.current.filter((f) => !deadIds.has(f.id));
        aquariumRef.current = survivingAq;
        setAquarium(survivingAq);
        setSelectedFishInfo((prev: any) => (prev && deadIds.has(prev.id) ? null : prev));
        syncToDB(survivingAq, fishInvRef.current);
        window.dispatchEvent(
          new CustomEvent("showPopupBanner", {
            detail: {
              title: "💀 CÁ ĐÃ CHẾT ĐÓI!",
              message: `${newlyDeadFishes.map((d) => d.vnName).join(", ")} đã nhịn đói đủ 3 ngày và biến mất khỏi hồ!`,
              type: "beerus",
            },
          })
        );
      }

      ctx!.font = "20px Arial";
      for (let i = hearts.length - 1; i >= 0; i--) {
        let h = hearts[i];
        h.life--;
        h.y -= 1;
        ctx!.globalAlpha = h.life / 60;
        ctx!.fillText("❤️", h.x, h.y);
        ctx!.globalAlpha = 1;
        if (h.life <= 0) hearts.splice(i, 1);
      }

      ctx!.font = "bold 11px sans-serif";
      ctx!.textAlign = "center";
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.life--;
        ft.y -= 0.7;
        ctx!.globalAlpha = Math.max(0, ft.life / 60);
        ctx!.fillStyle = ft.color;
        ctx!.strokeStyle = "#000";
        ctx!.lineWidth = 2.5;
        ctx!.strokeText(ft.text, ft.x, ft.y);
        ctx!.fillText(ft.text, ft.x, ft.y);
        ctx!.globalAlpha = 1;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
      }

      animId = requestAnimationFrame(render);
    }
    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(autoSyncInterval);
      window.removeEventListener("resize", resize);
      window.removeEventListener("aquariumDataReady", initFishes);
      window.removeEventListener("triggerSaveAquarium", handleTriggerSave);
      window.removeEventListener("triggerSaveAquariumNow", handleTriggerSaveNow);
      canvas.removeEventListener("mousedown", handleTap);
      canvas.removeEventListener("touchstart", handleTap);
      if (saveTimeout) clearTimeout(saveTimeout);
    };
  }, [isMounted]);

  useEffect(() => {
    (window as any).currentInteractionMode = interactionMode;
    (window as any).currentFeedId = selectedFeedId;
    (window as any).currentGameScore = score;
    (window as any).updateGameScore = (newScore: number) => {
      if (!isDataLoadedRef.current) return;
      lastLocalWriteAtRef.current = Date.now();
      setScore(newScore);
      scoreRef.current = newScore;
      const activeUser = userRef.current || user;
      if (activeUser) supabase.from("profiles").update({ balance: newScore }).eq("id", activeUser.id);
    };
  }, [interactionMode, selectedFeedId, score, user]);

  const handleTakeFishBackToBag = async (fishId: string) => {
    const fishObj = aquariumRef.current.find((f) => f.id === fishId);
    if (!fishObj) return;

    const newAq = aquariumRef.current.filter((f) => f.id !== fishId);
    const newFishInv = [...fishInvRef.current, fishObj];
    aquariumRef.current = newAq;
    fishInvRef.current = newFishInv;
    activeFishEntitiesRef.current = activeFishEntitiesRef.current.filter((e) => e.dbData.id !== fishId);
    setAquarium(newAq);
    setSelectedFishInfo(null);

    await syncToDB(newAq, newFishInv);
    window.dispatchEvent(
      new CustomEvent("showPopupBanner", {
        detail: { title: "ĐÃ CẤT VÀO KHO", message: `Đã đưa ${fishObj.vnName} về lại kho cá!`, type: "rare" },
      })
    );
  };

  const handleSellFishFromHoca = async (fishId: string) => {
    const fishObj = aquariumRef.current.find((f) => f.id === fishId);
    if (!fishObj) return;

    let curW = fishObj.currentWeight || fishObj.weight;
    let maxW = fishObj.maxWeight || fishObj.weight * 3;
    let isMaxed = (fishObj.growth || 0) >= 100 || curW >= maxW;
    let ratio = curW / maxW;
    let earnedVal = isMaxed
      ? Math.floor((fishObj.baseValue || 1000) * 2.5)
      : Math.floor((fishObj.baseValue || 1000) * (0.5 + ratio * 1.5));

    // Đọc số dư mới nhất từ DB trước khi cộng tiền bán cá để không lệch với caucamulti
    let latestBalance = scoreRef.current;
    const activeUser = userRef.current || user;
    if (activeUser?.id) {
      const { data: fresh } = await supabase.from("profiles").select("balance").eq("id", activeUser.id).single();
      if (fresh && typeof fresh.balance === "number") {
        latestBalance = Number(fresh.balance);
      }
    }

    const newAq = aquariumRef.current.filter((f) => f.id !== fishId);
    const newScore = latestBalance + earnedVal;
    aquariumRef.current = newAq;
    activeFishEntitiesRef.current = activeFishEntitiesRef.current.filter((e) => e.dbData.id !== fishId);
    setAquarium(newAq);
    setScore(newScore);
    scoreRef.current = newScore;
    setSelectedFishInfo(null);

    await syncToDB(newAq, fishInvRef.current, newScore);
    window.dispatchEvent(
      new CustomEvent("showPopupBanner", {
        detail: {
          title: isMaxed ? "🌾 THU HOẠCH MAX KÝ THÀNH CÔNG!" : "BÁN THÀNH CÔNG",
          message: `${isMaxed ? "Thu hoạch" : "Bán"} ${fishObj.vnName} (${curW}kg) thu được ${earnedVal.toLocaleString()}🪙`,
          type: "rare",
        },
      })
    );
  };

  const handleBreedFish = async (targetFish: any) => {
    if (targetFish.gender !== "Cái") {
      window.dispatchEvent(
        new CustomEvent("showPopupBanner", {
          detail: { title: "THÔNG BÁO", message: "Hãy chọn con cá Cái để tiến hành phối giống!", type: "beerus" },
        })
      );
      return;
    }
    const malePartner = aquariumRef.current.find((f) => f.gender === "Đực" && f.id !== targetFish.id);
    if (!malePartner) {
      window.dispatchEvent(
        new CustomEvent("showPopupBanner", {
          detail: { title: "THIẾU CÁ ĐỰC", message: "Hồ không có con đực nào! 2 con đực thì nhịn nhé ní!", type: "beerus" },
        })
      );
      return;
    }

    const updatedAq = aquariumRef.current.map((f) => {
      if (f.id === targetFish.id) {
        return { ...f, breedState: "fertilizing", breedStartTime: Date.now(), breedReadyTime: Date.now() + 600000 };
      }
      return f;
    });

    await syncToDB(updatedAq, fishInvRef.current);
    setSelectedFishInfo(null);
    window.dispatchEvent(
      new CustomEvent("showPopupBanner", {
        detail: {
          title: "💕 ĐÃ GHÉP ĐÔI THÀNH CÔNG!",
          message: `Đã phối giống ${targetFish.vnName} (♀️) với ${malePartner.vnName} (♂️). Đang thụ tinh (10 phút)!`,
          type: "rare",
        },
      })
    );
  };

  const handleMoveToAquarium = async (fishIds: string[]) => {
    const activeUser = userRef.current || user;
    if (!activeUser?.id || fishIds.length === 0) return;

    // Fetch lại kho cá mới nhất từ DB trước khi thả vào hồ để tránh trường hợp con cá đó vừa bị bán ở caucamulti
    const { data: freshProfile } = await supabase
      .from("profiles")
      .select("inventory")
      .eq("id", activeUser.id)
      .single();

    const latestInv = freshProfile?.inventory || inventoryRef.current || {};
    const currentDbFishInv = Array.isArray(latestInv.fish_inventory) ? latestInv.fish_inventory : fishInvRef.current;
    const currentDbAq = Array.isArray(latestInv.aquarium) ? latestInv.aquarium : aquariumRef.current;

    const fishesToMove = currentDbFishInv.filter((f: any) => fishIds.includes(f.id));
    if (fishesToMove.length === 0) {
      fishInvRef.current = currentDbFishInv;
      aquariumRef.current = currentDbAq;
      setAquarium(currentDbAq);
      setIsFishBagOpen(false);
      return;
    }

    const newFishInv = currentDbFishInv.filter((f: any) => !fishIds.includes(f.id));

    const formattedFishes = fishesToMove.map((f: any) => {
      const cap = getStomachCapacity(f.weight);
      const arenaStats =
        f.rank && f.power !== undefined
          ? { rank: f.rank, power: f.power, defense: f.defense, arenaHp: f.arenaHp }
          : generateArenaStats(f.weight);
      return {
        ...f,
        initialWeight: f.weight,
        maxWeight: Number((f.weight * 3).toFixed(1)),
        currentWeight: f.weight,
        growth: 0,
        currentFood: 0,
        stomachCapacity: cap,
        starvingSince: Date.now(),
        lastUpdateTime: Date.now(),
        fedCount: 0,
        gender: f.gender || (Math.random() > 0.5 ? "Đực" : "Cái"),
        lastFedTime: Date.now(),
        breedState: "normal",
        ...arenaStats,
      };
    });

    const newAq = [...currentDbAq, ...formattedFishes];
    await syncToDB(newAq, newFishInv, undefined, true);
    window.dispatchEvent(new CustomEvent("aquariumDataReady"));
    setIsFishBagOpen(false);
  };

  const selectedFishStats = (() => {
    if (!selectedFishInfo) return null;
    const initW = selectedFishInfo.initialWeight || selectedFishInfo.weight;
    const curW = selectedFishInfo.currentWeight || selectedFishInfo.weight;
    const maxW = selectedFishInfo.maxWeight || Number((initW * 3).toFixed(1));
    const cap = selectedFishInfo.stomachCapacity || getStomachCapacity(curW);
    const curFood = Math.max(0, selectedFishInfo.currentFood || 0);
    const fullnessPct = Math.min(100, Math.round((curFood / cap) * 100));
    const growthPct = Math.min(100, Math.round(selectedFishInfo.growth || 0));

    const drainRate = cap / FULLNESS_DURATION_SEC;
    const hungerThresholdFood = cap * HUNGER_THRESHOLD_RATIO;
    const secUntilHungryThreshold =
      drainRate > 0 && curFood > hungerThresholdFood ? Math.ceil((curFood - hungerThresholdFood) / drainRate) : 0;
    const minsLeft = Math.floor(secUntilHungryThreshold / 60);
    const secsLeft = secUntilHungryThreshold % 60;

    const starvingSince = selectedFishInfo.starvingSince || Date.now();
    const remainDeathMs = Math.max(0, STARVATION_DEATH_MS - (Date.now() - starvingSince));
    const remainHoursTotal = Math.floor(remainDeathMs / (1000 * 60 * 60));
    const deathDaysLeft = Math.floor(remainHoursTotal / 24);
    const deathHoursLeft = remainHoursTotal % 24;

    const growthDurationMin = Math.round(getGrowthDurationSec(initW) / 60);
    const isHungryNow = fullnessPct < 30;
    const isMaxed = growthPct >= 100 || curW >= maxW;

    return {
      curW,
      maxW,
      cap,
      curFood,
      fullnessPct,
      growthPct,
      secUntilHungryThreshold,
      minsLeft,
      secsLeft,
      deathDaysLeft,
      deathHoursLeft,
      growthDurationMin,
      isHungryNow,
      isMaxed,
    };
  })();

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-slate-950 select-none font-sans pointer-events-auto" style={{ touchAction: "none" }}>
      {toastBanner && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[80] bg-slate-900/95 border-2 border-amber-400 px-4 py-2 rounded-2xl shadow-2xl text-center max-w-xs sm:max-w-md pointer-events-none animate-bounce">
          <div className="text-xs font-black text-amber-300 uppercase">{toastBanner.title}</div>
          <div className="text-[11px] font-bold text-white mt-0.5">{toastBanner.message}</div>
        </div>
      )}

      {isFishBagOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 pointer-events-auto">
          <div className="bg-slate-950 border-2 border-sky-500/60 w-full max-w-4xl max-h-[85vh] rounded-3xl p-4 sm:p-6 shadow-[0_0_40px_rgba(14,165,233,0.3)] flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h2 className="text-base sm:text-xl font-black text-sky-400 uppercase tracking-wider flex items-center gap-2">
                🐟 Kho Cá (Quản lý &amp; Thả vào hồ)
              </h2>
              <button
                onClick={() => setIsFishBagOpen(false)}
                className="bg-slate-800 hover:bg-rose-600 text-white font-black w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer shadow text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-2 pr-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {!fishInvRef.current || fishInvRef.current.length === 0 ? (
                <div className="col-span-full text-center text-slate-500 py-10 font-bold text-sm">
                  Kho cá trống trơn! Hãy ra khơi câu thêm nhé.
                </div>
              ) : (
                fishInvRef.current.map((fish: any) => (
                  <div key={fish.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-between shadow-lg">
                    <img src={`/assets/cauca/${fish.filename}`} alt={fish.vnName} className="h-14 object-contain mb-2 drop-shadow-md" />
                    <h4 className="text-[10px] font-black text-amber-300 text-center w-full truncate">
                      [{fish.rank || "D"}] {fish.vnName} ({fish.gender === "Đực" ? "♂️ Đực" : "♀️ Cái"})
                    </h4>
                    <div className="w-full space-y-1 mt-1 border-t border-slate-800 pt-1 text-[9px] font-bold text-slate-400 flex justify-between">
                      <span>Cân nặng:</span> <span className="text-white">{fish.weight} kg</span>
                    </div>
                    <div className="w-full flex justify-around text-[8px] text-slate-400 font-bold my-1">
                      <span className="text-rose-400">⚔️ {fish.power || 10}</span>
                      <span className="text-blue-400">🛡️ {fish.defense || 10}</span>
                      <span className="text-emerald-400">❤️ {fish.arenaHp || 50}</span>
                    </div>
                    <button
                      onClick={() => handleMoveToAquarium([fish.id])}
                      className="mt-2 w-full bg-sky-500 hover:bg-sky-400 text-slate-950 py-1.5 rounded-xl font-black text-[10px] uppercase shadow cursor-pointer"
                    >
                      🌊 Thả Vào Hồ (Hiện ngay)
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {isAuctionOpen && (
        <div className="absolute inset-0 z-[70] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 rounded-3xl animate-fadeIn">
          <div className="bg-slate-900 border-2 border-blue-500 w-full max-w-3xl max-h-[85vh] rounded-2xl p-6 shadow-[0_0_30px_rgba(59,130,246,0.4)] relative flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-xl font-black text-blue-400 uppercase tracking-wider">⚖️ Sàn Đấu Giá Trực Tuyến</h3>
              <button
                onClick={() => setIsAuctionOpen(false)}
                className="bg-slate-800 hover:bg-rose-600 text-white font-black w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer shadow text-xs"
              >
                ✕
              </button>
            </div>
            {shopNotification && (
              <div className="my-1 bg-blue-500 text-white px-3 py-1.5 rounded-xl font-black text-xs text-center animate-bounce shadow">
                {shopNotification}
              </div>
            )}

            <div className="flex-1 overflow-y-auto mt-2 pr-1 space-y-3">
              {realtimeAuctions.length === 0 ? (
                <div className="text-center text-slate-500 py-10 font-bold text-xs">Chưa có vật phẩm đấu giá nào.</div>
              ) : (
                realtimeAuctions.map((item) => (
                  <div key={item.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 p-1 text-2xl">
                        <img src={item.item_image} className="max-h-full object-contain" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-amber-300">{item.item_name}</h4>
                        <p className="text-[10px] text-slate-400">
                          Người bán: <span className="text-blue-400 font-bold">{item.seller_name}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Giá hiện tại: <span className="text-emerald-400 font-bold">{item.current_bid.toLocaleString()}🪙</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const nextBid = Math.floor(item.current_bid * 1.1);
                        if (scoreRef.current < nextBid) {
                          alert("Không đủ xu đấu giá!");
                          return;
                        }
                        const newScore = scoreRef.current - nextBid;
                        setScore(newScore);
                        scoreRef.current = newScore;
                        await supabase
                          .from("auctions")
                          .update({
                            current_bid: nextBid,
                            highest_bidder_id: user.id,
                            highest_bidder_name: user.email?.split("@")[0],
                          })
                          .eq("id", item.id);
                        await supabase.from("profiles").update({ balance: newScore }).eq("id", user.id);
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-black bg-blue-600 text-white hover:bg-blue-500 shadow"
                    >
                      Ra Giá {Math.floor(item.current_bid * 1.1).toLocaleString()}🪙
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-50 pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          <button
  onClick={async () => {
    // 1. Ép lưu trạng thái cá và độ no xuống Supabase trước khi rời trang
    if (typeof syncToDB === "function" && aquariumRef.current) {
      await syncToDB(aquariumRef.current, fishInvRef.current, scoreRef.current, true);
    }
    // 2. Trả về đúng màn hình chèo thuyền câu cá ngoài khơi (Hình trái)
    // Nếu game của ní có kèm roomId (ví dụ /caucamulti?room=room_1), ní thay cho đúng nhé:
    window.location.href = "/caucamulti"; 
  }}
  className="bg-slate-900/80 hover:bg-slate-800 text-sky-400 px-3 py-1.5 rounded-xl font-black text-xs shadow-lg border border-sky-500/40 backdrop-blur transition active:scale-95 cursor-pointer"
>
  ← Ra Khơi
</button>
          <Link
            href="/caucamulti/hoca/arenaca"
            className="bg-gradient-to-r from-amber-500 to-rose-600 text-white px-3 py-1.5 rounded-xl font-black text-xs shadow-lg border border-amber-300/40 backdrop-blur transition active:scale-95"
          >
            ⚔️ Đấu Trường
          </Link>
          <button
            onClick={() => setIsFishBagOpen(true)}
            className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-3 py-1.5 rounded-xl font-black text-xs shadow-lg border border-sky-400/40 backdrop-blur transition active:scale-95"
          >
            🐟 Kho Cá ({fishInvRef.current.length})
          </button>
        </div>

        <div className="bg-black/70 text-white px-3 py-1.5 rounded-xl font-bold text-xs border border-amber-500/40 shadow-lg backdrop-blur flex flex-col items-end pointer-events-auto">
          <span className="text-[#FFEB3B] font-black">{score.toLocaleString()}🪙</span>
          <span className="text-[9px] text-sky-300 font-bold">{aquarium.length} sinh vật trong hồ</span>
        </div>
      </div>

      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full -z-10 cursor-crosshair"></canvas>

      {selectedFishInfo && selectedFishStats && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-sky-400 p-4 rounded-2xl shadow-[0_0_25px_rgba(56,189,248,0.5)] backdrop-blur-md z-40 w-80 animate-fadeIn pointer-events-auto text-center space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-amber-300 uppercase truncate">
              [{selectedFishInfo.rank || "D"}] {selectedFishInfo.vnName} ({selectedFishInfo.gender === "Đực" ? "♂️ Đực" : "♀️ Cái"})
            </h3>
            <button onClick={() => setSelectedFishInfo(null)} className="text-slate-400 hover:text-white text-xs font-black px-1.5">
              ✕
            </button>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-left space-y-2">
            <div className="flex justify-between text-[10px] text-slate-300">
              <span>Cân nặng hiện tại:</span>
              <span className="text-emerald-400 font-black">{selectedFishStats.curW} kg</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-300">
              <span>Chỉ số Arena:</span>
              <span className="text-amber-400 font-bold">
                <span className="text-rose-400">⚔️{selectedFishInfo.power || 10}</span> |{" "}
                <span className="text-blue-400">🛡️{selectedFishInfo.defense || 10}</span> |{" "}
                <span className="text-emerald-400">❤️{selectedFishInfo.arenaHp || 50}</span>
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-300">
              <span>Gợi ý mồi nhanh no:</span>
              <span className="text-sky-300 font-bold">
                {selectedFishStats.curW <= 500
                  ? "🍚 Cám Thường / 🥩 Siêu Dưỡng"
                  : selectedFishStats.curW <= 5000
                  ? "🥩 Siêu Dưỡng Chất / 🌟 Thượng Cổ"
                  : "🌟 Thức Ăn Thượng Cổ"}
              </span>
            </div>

            <div className="space-y-0.5 pt-1 border-t border-slate-800/80">
              <div className="flex justify-between text-[9px] font-bold">
                <span className={selectedFishStats.isHungryNow ? "text-rose-400" : "text-amber-300"}>
                  {selectedFishStats.isHungryNow
                    ? `😭 THAN ĐÓI! (${selectedFishStats.fullnessPct}% < 30%)`
                    : selectedFishStats.fullnessPct >= 100
                    ? "💤 Đã No Căng (100%)"
                    : `⏳ Độ No: ${selectedFishStats.fullnessPct}%`}
                </span>
                <span className={selectedFishStats.isHungryNow ? "text-rose-400" : "text-slate-400"}>
                  {selectedFishStats.secUntilHungryThreshold > 0
                    ? `Đói sau ${selectedFishStats.minsLeft}p${selectedFishStats.secsLeft}s`
                    : `💀 Chết sau ${selectedFishStats.deathDaysLeft}n ${selectedFishStats.deathHoursLeft}h`}
                </span>
              </div>
              <div className="relative w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    selectedFishStats.fullnessPct >= 100
                      ? "bg-sky-400"
                      : !selectedFishStats.isHungryNow
                      ? "bg-amber-400"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${selectedFishStats.fullnessPct}%` }}
                ></div>
                <div className="absolute top-0 bottom-0 left-[30%] w-0.5 bg-white/80"></div>
              </div>
            </div>

            <div className="space-y-0.5 pt-1">
              <div className="flex justify-between text-[9px] font-bold">
                <span className="text-sky-300">
                  Sinh trưởng: {selectedFishStats.growthPct}% ({selectedFishStats.growthDurationMin}p)
                </span>
                <span
                  className={
                    selectedFishStats.isMaxed
                      ? "text-yellow-400"
                      : !selectedFishStats.isHungryNow
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }
                >
                  {selectedFishStats.isMaxed
                    ? "✨ Đạt Max Ký!"
                    : !selectedFishStats.isHungryNow
                    ? "⚡ Đang lớn..."
                    : selectedFishStats.growthPct > 5
                    ? "📉 Tụt về 5%..."
                    : "🛑 Dừng ở 5% (Đói)"}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    !selectedFishStats.isHungryNow
                      ? "bg-gradient-to-r from-sky-500 to-emerald-400"
                      : "bg-gradient-to-r from-rose-600 to-amber-500"
                  }`}
                  style={{ width: `${selectedFishStats.growthPct}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            {selectedFishStats.isMaxed && (
              <button
                onClick={() => handleSellFishFromHoca(selectedFishInfo.id)}
                className="w-full bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-black py-2 rounded-xl text-[11px] uppercase shadow-lg cursor-pointer animate-pulse"
              >
                🌾 Thu Hoạch Max Ký (+{Math.floor((selectedFishInfo.baseValue || 1000) * 2.5).toLocaleString()}🪙)
              </button>
            )}
            <button
              onClick={() => handleBreedFish(selectedFishInfo)}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-black py-2 rounded-xl text-[10px] uppercase shadow cursor-pointer"
            >
              💕 Phối Giống Sinh Sản (Bấm vào con cái)
            </button>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleTakeFishBackToBag(selectedFishInfo.id)}
                className="bg-slate-800 hover:bg-slate-700 text-sky-300 font-black py-1.5 rounded-lg text-[9px] uppercase shadow cursor-pointer"
              >
                📦 Cất Kho
              </button>
              <button
                onClick={() => handleSellFishFromHoca(selectedFishInfo.id)}
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black py-1.5 rounded-lg text-[9px] uppercase shadow cursor-pointer"
              >
                {selectedFishStats.isMaxed ? "🌾 Thu Hoạch" : "💰 Bán Ngay"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-auto">
        {interactionMode === "feed" && (
          <div className="flex flex-wrap justify-center gap-1.5 bg-black/75 p-1.5 rounded-2xl border border-white/20 backdrop-blur-md shadow-xl animate-fadeIn">
            {FEED_TYPES.map((feed) => (
              <button
                key={feed.id}
                onClick={() => setSelectedFeedId(feed.id)}
                className={`px-3 py-1.5 rounded-xl font-black text-[10px] flex items-center gap-1 transition cursor-pointer ${
                  selectedFeedId === feed.id
                    ? "bg-amber-500 text-slate-950 scale-105 shadow-lg"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span>{feed.emoji}</span>
                <span>
                  {feed.name} (-{feed.price}🪙)
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 bg-black/60 p-1.5 rounded-2xl border border-white/20 backdrop-blur-md shadow-2xl">
          <button
            onClick={() => {
              setInteractionMode("pet");
              setSelectedFishInfo(null);
            }}
            className={`px-4 py-2.5 rounded-xl font-black text-[11px] sm:text-xs transition shadow cursor-pointer flex items-center gap-1.5 ${
              interactionMode === "pet"
                ? "bg-sky-500 text-slate-950 scale-105"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            <span className="text-base">✋</span> Nựng / Xem Cá
          </button>

          <button
            onClick={() => {
              setInteractionMode("feed");
              setSelectedFishInfo(null);
            }}
            className={`px-4 py-2.5 rounded-xl font-black text-[11px] sm:text-xs transition shadow cursor-pointer flex items-center gap-1.5 ${
              interactionMode === "feed"
                ? "bg-amber-500 text-slate-950 scale-105"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            <span className="text-base">🍔</span> Cho Cá Ăn (No 1h)
          </button>
        </div>
      </div>

      <div id="popup-root"></div>
    </div>
  );
}