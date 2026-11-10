"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const WHEEL_CONFIG = {
  earth: {
    id: "earth",
    name: "RỒNG THẦN TRÁI ĐẤT",
    icon: "/assets/wheel/shenron.png",
    jackpotKi: 1000000000,
    beverage: "nuoc_suoi",
    beverageName: "Chai Nước Suối",
    taunts: [
      "🐉 Shenron Trái Đất: 'Yếu ớt thế này mà đòi húp Jackpot à? Gồng mạnh tay lên con giời!'",
      "🐉 Shenron Trái Đất: 'Tay chân bủn rủn thế này thì xác định hụt đi là vừa keke!'",
      "🐉 Shenron Trái Đất: 'Hít sâu gồng Ki vào! Đừng để ta thất vọng như lần Sơ Cấp nhé!'",
      "🐉 Shenron Trái Đất: 'Quay hụt nữa đi cho chừa cái tật lười tu luyện!'"
    ]
  },
  namek: {
    id: "namek",
    name: "RỒNG THẦN NAMEK",
    icon: "/assets/wheel/shenronnamek.png",
    jackpotKi: 10000000000,
    beverage: "nuoc_ngot",
    beverageName: "Chai Nước Ngọt",
    taunts: [
      "🐲 Porunga Namek: 'Ngươi tưởng 10 tỷ Ki dễ ăn lắm sao? Gồng gãy tay may ra mới trúng!'",
      "🐲 Porunga Namek: 'Lại hụt nữa rồi! Vận khí của ngươi mỏng như tờ giấy lụa vậy.'",
      "🐲 Porunga Namek: 'Đứng dậy luyện tập thêm 100 năm nữa rồi quay lại đây húp nước ngọt nhé!'",
      "🐲 Porunga Namek: 'Hahaha, tay bén thế mà quay toàn trúng không khí thế à?'"
    ]
  }
};

const getWeekNumber = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};
const getTodayString = () => new Date().toISOString().split("T")[0];

export default function WheelPage() {
  const [user, setUser] = useState<any>(null);
  const [points, setPoints] = useState<number>(0);
  const [luckySpins, setLuckySpins] = useState<number>(0);
  const [inventory, setInventory] = useState<{ [key: string]: number }>({});
  const [avatarUrl, setAvatarUrl] = useState<string>("/assets/avatar/xtra1.ico");
  
  const [activeWheelId, setActiveWheelId] = useState<"earth" | "namek">("earth");
  const activeWheel = WHEEL_CONFIG[activeWheelId];

  const [isSpinning, setIsSpinning] = useState(false);
  const [power, setPower] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [currentTaunt, setCurrentTaunt] = useState("");

  const [floatingOrbs, setFloatingOrbs] = useState<{ id: number; x: number; y: number; star: number; size: number }[]>([]);
  const [history, setHistory] = useState<{ [key: string]: { time: string; prize: string; wheel: string }[] }>({ earth: [], namek: [] });

  const [popupData, setPopupData] = useState<{ show: boolean; title: string; message: string; type: string; prizeLabel?: string } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentAngleRef = useRef(0);
  const chargeIntervalRef = useRef<any>(null);

  useEffect(() => {
    async function loadUserProfile(currentUser: any) {
      if (!currentUser) return;
      setUser(currentUser);
      const { data } = await supabase.from("profiles").select("*").eq("id", currentUser.id).single();
      if (data) {
        setPoints(data.balance ?? 0);
        setLuckySpins(data.lucky_spins ?? 0);
        setInventory(data.inventory ?? {});
        setAvatarUrl(data.avatar_url || "/assets/avatar/xtra1.ico");
      }
      const savedHistory = localStorage.getItem(`wheel_history_separated_${currentUser.id}`);
      if (savedHistory) {
        try { setHistory(JSON.parse(savedHistory)); } catch(e) {}
      }
    }
    supabase.auth.getSession().then(({ data: { session } }) => loadUserProfile(session?.user));
    const { data: authListener } = supabase.auth.onAuthStateChange((_e, session) => loadUserProfile(session?.user));
    return () => authListener.subscription.unsubscribe();
  }, []);

  // --- VẼ RADAR RỒNG THẦN (CHỈ QUÉT KHUNG, GIỮ TÂM TRỐNG ĐỂ ĐẶT RỒNG CỐ ĐỊNH) ---
  const drawWheel = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 12;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    // Nền Radar tối thẳm
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#020617";
    ctx.fill();

    // Vòng tròn đồng tâm Radar
    for (let r = radius * 0.75; r > 50; r -= radius * 0.25) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.strokeStyle = activeWheelId === "earth" ? "rgba(245, 158, 11, 0.25)" : "rgba(16, 185, 129, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Các đường trục chéo Radar
    ctx.beginPath();
    ctx.moveTo(-radius, 0); ctx.lineTo(radius, 0);
    ctx.moveTo(0, -radius); ctx.lineTo(0, radius);
    ctx.strokeStyle = activeWheelId === "earth" ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    // Viền khung ngoài Radar rực rỡ
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = activeWheelId === "earth" ? "#f59e0b" : "#10b981";
    ctx.lineWidth = 6;
    ctx.stroke();
  };

  useEffect(() => {
    drawWheel(currentAngleRef.current);
  }, [activeWheelId]);

  // --- GỒNG LỰC ---
  const startCharging = () => {
    if (isSpinning) return;
    if (luckySpins <= 0) {
      setPopupData({ show: true, title: "HẾT LƯỢT QUAY", message: "Chiến binh đã hết lượt quay! Hãy về trang chủ Tụ Ki để nhận thêm.", type: "error" });
      return;
    }
    setIsCharging(true);
    setPower(0);
    setFloatingOrbs([]);
    const taunts = activeWheel.taunts;
    setCurrentTaunt(taunts[Math.floor(Math.random() * taunts.length)]);

    chargeIntervalRef.current = setInterval(() => {
      setPower((prev) => {
        if (prev >= 100) return 100;
        return prev + 4;
      });
    }, 40);
  };

  const releaseCharging = () => {
    if (!isCharging || isSpinning) return;
    setIsCharging(false);
    if (chargeIntervalRef.current) clearInterval(chargeIntervalRef.current);
    executeSpin();
  };

  // --- THUẬT TOÁN TỈ LỆ ---
  const rollPrize = (hasWonJackpotToday: boolean, hasWonBeverageThisWeek: boolean) => {
    const rand = Math.random() * 100;

    if (rand < 0.03 && !hasWonJackpotToday) {
      return { type: "jackpot", label: "JACKPOT", value: activeWheel.jackpotKi, index: 7 };
    }
    if (rand >= 0.03 && rand < 0.032 && !hasWonBeverageThisWeek) {
      return { type: "beverage", label: activeWheel.beverageName, value: 1, index: 6 };
    }
    if (rand >= 5 && rand < 15) {
      const sub = Math.random() * 10;
      if (sub < 6) return { type: "spin", label: "Thêm 2 Lượt", value: 2, index: 2 };
      return { type: "spin", label: "Thêm 1 Lượt", value: 1, index: 5 };
    }
    if (rand >= 15 && rand < 45) {
      const kiVals = activeWheelId === "earth" ? [10000, 50000, 100000, 500000] : [100000, 500000, 1000000, 5000000];
      const val = kiVals[Math.floor(Math.random() * kiVals.length)];
      const idxs = [0, 1, 3, 4];
      const idx = idxs[Math.floor(Math.random() * idxs.length)];
      return { type: "ki", label: `+${val.toLocaleString()} Ki`, value: val, index: idx };
    }
    return { type: "miss", label: "Quay Hụt", value: 0, index: 3 };
  };

  // --- HIỆN NGỌC RỒNG VÒNG QUAY BAO QUANH TÂM (KHÔNG ĐÈ LÊN RỒNG) ---
  const executeSpin = async () => {
    setIsSpinning(true);
    const newSpinsBefore = luckySpins - 1;
    setLuckySpins(newSpinsBefore);

    const targetOrbCount = power > 50 ? Math.floor(Math.random() * 4) + 4 : Math.floor(Math.random() * 2) + 2;

    let addedCount = 0;
    const sequentialOrbTimer = setInterval(() => {
      if (addedCount < targetOrbCount) {
        // Tạo tọa độ nằm ở vùng vành khuyên xung quanh tâm (tránh vùng trung tâm x: 120-180, y: 120-180)
        let rx, ry;
        do {
          rx = Math.floor(Math.random() * 220) + 30;
          ry = Math.floor(Math.random() * 220) + 30;
        } while (Math.abs(rx - 145) < 55 && Math.abs(ry - 145) < 55); // Giữ tâm rỗng tuyệt đối cho con Rồng

        const newOrb = {
          id: Math.random(),
          x: rx,
          y: ry,
          star: Math.floor(Math.random() * 7) + 1,
          size: 22
        };
        setFloatingOrbs(prev => [...prev.slice(-4), newOrb]);
        addedCount++;
      } else {
        clearInterval(sequentialOrbTimer);
      }
    }, 450);

    const today = getTodayString();
    const currentWeek = getWeekNumber();
    const jackpotKey = `jackpot_${activeWheel.id}_${user.id}_${today}`;
    const beverageKey = `beverage_${activeWheel.id}_${user.id}_${currentWeek}`;

    const hasWonJackpotToday = localStorage.getItem(jackpotKey) === "true";
    const hasWonBeverageThisWeek = localStorage.getItem(beverageKey) === "true";

    const prize = rollPrize(hasWonJackpotToday, hasWonBeverageThisWeek);

    const sectors = 8;
    const arcSize = (Math.PI * 2) / sectors;
    const targetAngle = -(prize.index * arcSize + arcSize / 2);
    const extraSpins = 360 * Math.PI / 180 * (6 + (power / 15)); 
    const finalAngle = currentAngleRef.current + extraSpins + (targetAngle - (currentAngleRef.current % (Math.PI * 2)));

    const startTime = performance.now();
    const duration = 4000;

    const animateSpin = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const current = currentAngleRef.current + (finalAngle - currentAngleRef.current) * easeOut;
      drawWheel(current);

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        clearInterval(sequentialOrbTimer);
        setFloatingOrbs([]);
        currentAngleRef.current = finalAngle;
        setIsSpinning(false);
        setPower(0);
        processReward(prize, jackpotKey, beverageKey, hasWonBeverageThisWeek, newSpinsBefore);
      }
    };

    requestAnimationFrame(animateSpin);
  };

  const processReward = async (prize: any, jackpotKey: string, beverageKey: string, hasWonBeverageThisWeek: boolean, newSpinsBefore: number) => {
    let finalPoints = points;
    let finalSpins = newSpinsBefore;
    let finalInventory = { ...inventory };
    let msg = "";
    let title = "";
    let type = "success";

    if (prize.type === "ki") {
      finalPoints += prize.value;
      title = "THÀNH CÔNG VẬN KI";
      msg = `Rồng Thần ban phước! Húp trọn ${prize.label} vào tài khoản!`;
    } else if (prize.type === "spin") {
      finalSpins += prize.value;
      title = "TĂNG CƯỜNG LƯỢT";
      msg = `Nhận thêm ${prize.label} tiếp tục thăng hoa!`;
    } else if (prize.type === "miss") {
      title = "QUAY HỤT RỒI!";
      const taunts = activeWheel.taunts;
      msg = taunts[Math.floor(Math.random() * taunts.length)];
      type = "error";
    } else if (prize.type === "jackpot") {
      finalPoints += prize.value;
      localStorage.setItem(jackpotKey, "true");
      title = "🎉 ĐẠI HỶ NỔ JACKPOT RỒNG THẦN 🎉";
      msg = `CHÍ TÔN VÔ ĐỊCH! Nhận ngay +${prize.value.toLocaleString()} Ki từ Rồng Thần!`;
      type = "jackpot";
    } else if (prize.type === "beverage") {
      finalInventory[activeWheel.beverage] = (finalInventory[activeWheel.beverage] || 0) + 1;
      localStorage.setItem(beverageKey, "true");
      title = "🥤 SĂN ĐƯỢC VẬT PHẨM TUYỆT THẾ";
      msg = `Tuyệt đỉnh! Nhận ngay 1 ${activeWheel.beverageName} giới hạn tuần này vào kho!`;
      type = "jackpot";
    }

    await supabase.from("profiles").update({ 
      balance: finalPoints, 
      lucky_spins: finalSpins,
      inventory: finalInventory
    }).eq("id", user.id);

    setPoints(finalPoints);
    setLuckySpins(finalSpins);
    setInventory(finalInventory);
    setPopupData({ show: true, title, message: msg, type, prizeLabel: prize.label });

    // Lưu lịch sử riêng biệt theo từng vòng quay
    const newHistoryItem = {
      time: new Date().toLocaleTimeString(),
      prize: prize.label,
      wheel: activeWheel.name
    };
    const updatedWheelHistory = [newHistoryItem, ...(history[activeWheelId] || []).slice(0, 9)];
    const updatedFullHistory = { ...history, [activeWheelId]: updatedWheelHistory };
    
    setHistory(updatedFullHistory);
    if (user) {
      localStorage.setItem(`wheel_history_separated_${user.id}`, JSON.stringify(updatedFullHistory));
    }
  };

  const currentWheelHistory = history[activeWheelId] || [];

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 text-white font-sans select-none flex flex-col" style={{ touchAction: 'manipulation' }}>
      
      {/* HEADER ĐỒNG BỘ SẢNH */}
      <div className="bg-slate-900/95 border-b border-amber-500/40 px-3 sm:px-5 py-2 shadow-md shrink-0 z-20 flex justify-between items-center backdrop-blur-md">
        <Link href="/" className="bg-slate-800 border border-amber-500/40 text-amber-400 px-3 py-1.5 rounded-xl font-black text-xs shadow cursor-pointer active:scale-95 transition">
          ← Về Sảnh
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-amber-400 font-bold bg-slate-800 px-2 py-0.5 rounded border border-amber-500/30">
              Ki: {points.toLocaleString()}
            </span>
            <span className="text-[10px] text-purple-300 font-bold bg-slate-800 px-2 py-0.5 rounded border border-purple-500/30 mt-1">
              Lượt: {luckySpins}
            </span>
          </div>
          <img src={avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border-2 border-amber-400 shadow-md object-cover" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col items-center relative">
        
        <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 tracking-wider text-center drop-shadow mb-3 z-10 uppercase">
          RADAR RỒNG THẦN
        </h1>

        {/* TABS CHỌN RỒNG */}
        <div className="flex bg-slate-900 border border-slate-700 rounded-2xl p-1 mb-3 shadow-xl z-10 w-full max-w-xs">
          <button
            onClick={() => { if (!isSpinning) setActiveWheelId("earth"); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${
              activeWheelId === "earth" ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow" : "text-slate-400 hover:text-amber-300"
            }`}
          >
            <img src="/assets/wheel/shenron.png" className="w-4 h-4 object-contain" /> Trái Đất
          </button>
          <button
            onClick={() => { if (!isSpinning) setActiveWheelId("namek"); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${
              activeWheelId === "namek" ? "bg-gradient-to-r from-emerald-400 to-green-500 text-slate-950 shadow" : "text-slate-400 hover:text-emerald-300"
            }`}
          >
            <img src="/assets/wheel/shenronnamek.png" className="w-4 h-4 object-contain" /> Namek
          </button>
        </div>

        {/* CÂU KHỊA TỪ RỒNG THẦN */}
        {currentTaunt ? (
          <div className="mb-3 max-w-sm text-center bg-slate-900/90 border border-amber-500/40 px-3 py-1.5 rounded-xl text-[11px] text-amber-300 font-bold shadow-lg animate-pulse z-10">
            {currentTaunt}
          </div>
        ) : (
          <div className="mb-3 max-w-sm text-center px-3 py-1.5 text-[11px] text-slate-400 font-medium z-10 italic">
            💡 Giữ nút để gồng lực, thả tay ra để radar quét ngọc rồng!
          </div>
        )}

        {/* VÒNG QUAY RADAR (CỐ ĐỊNH RỒNG Ở TÂM, NGỌC BAO QUANH KHÔNG ĐÈ LÊN RỒNG) */}
        <div className="relative w-[270px] h-[270px] sm:w-[310px] sm:h-[310px] flex items-center justify-center z-10 my-2 overflow-hidden rounded-full border-4 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.25)] bg-slate-950">
          <canvas ref={canvasRef} width={320} height={320} className="w-full h-full" />
          
          {/* CON RỒNG CỐ ĐỊNH Ở TRUNG TÂM TUYỆT ĐỐI */}
          <div className="absolute z-20 w-16 h-16 rounded-full flex items-center justify-center border-2 border-amber-400 bg-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.8)] pointer-events-none">
            <img src={activeWheel.icon} alt="Shenron" className="w-12 h-12 object-contain" />
          </div>

          {/* CÁC VIÊN NGỌC RỒNG XUẤT HIỆN XUNG QUANH (VÙNG VÀNH KHUYÊN, KHÔNG ĐÈ RỒNG) */}
          {floatingOrbs.map((orb) => (
            <img
              key={orb.id}
              src={`/assets/home/dragon-ball-${orb.star}.png`}
              alt="Dragon Ball"
              className="absolute z-10 animate-pulse pointer-events-none drop-shadow-[0_0_6px_rgba(255,215,0,0.8)] transition-all duration-500"
              style={{
                left: `${orb.x}px`,
                top: `${orb.y}px`,
                width: `${orb.size}px`,
                height: `${orb.size}px`,
              }}
            />
          ))}
        </div>

        {/* THANH LỰC GỒNG */}
        <div className="mt-2 w-full max-w-xs bg-slate-900/90 border border-slate-700 h-3.5 rounded-full overflow-hidden p-0.5 z-10 shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 rounded-full transition-all duration-75 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
            style={{ width: `${power}%` }}
          ></div>
        </div>
        <span className="text-[10px] text-amber-300 font-bold mt-1 z-10">⚡ Lực Quét Radar: {power}%</span>

        {/* NÚT GỒNG & QUAY */}
        <button
          onMouseDown={startCharging}
          onMouseUp={releaseCharging}
          onMouseLeave={releaseCharging}
          onTouchStart={startCharging}
          onTouchEnd={releaseCharging}
          disabled={isSpinning}
          className={`mt-3 z-10 w-full max-w-xs py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all cursor-pointer ${
            isSpinning
              ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
              : activeWheelId === "earth"
                ? "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-slate-950 border border-amber-300 shadow-amber-500/40"
                : "bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500 text-slate-950 border border-emerald-300 shadow-emerald-500/40"
          }`}
        >
          {isSpinning ? "ĐANG QUÉT RADAR..." : "GIỮ ĐỂ QUÉT & VẬN KI ⚡"}
        </button>

        {/* BẢNG LỊCH SỬ RIÊNG BIỆT CHO TỪNG VÒNG QUAY */}
        <div className="mt-4 w-full max-w-sm bg-slate-900/90 border border-amber-500/30 rounded-2xl p-3 shadow-xl z-10 backdrop-blur-md">
          <h3 className="text-xs font-black text-amber-400 uppercase mb-2 flex items-center justify-between">
            <span>📜 Lịch Sử: {activeWheel.name}</span>
            <span className="text-[9px] text-slate-400">({currentWheelHistory.length} lượt gần nhất)</span>
          </h3>
          <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
            {currentWheelHistory.length === 0 ? (
              <p className="text-[10px] text-slate-500 text-center py-2">Chưa có lịch sử quay cho vòng này.</p>
            ) : (
              currentWheelHistory.map((item, index) => (
                <div key={index} className="flex justify-between items-center bg-slate-950 px-2.5 py-1.5 rounded-lg text-[10px] border border-slate-800">
                  <span className="text-slate-400">{item.time}</span>
                  <span className="text-cyan-400 font-bold truncate max-w-[120px]">{item.prize}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <p className="mt-3 text-[10px] text-slate-400 text-center z-10 max-w-xs pb-4">
          * Jackpot giới hạn 1 lần/ngày. Nước giải khát rớt tối đa 1 chai/tuần.
        </p>
      </div>

      {/* POPUP NHẬN THƯỞNG HOÀNH TRÁNG */}
      {popupData && popupData.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-lg animate-fadeIn">
          <div className={`relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 w-full max-w-md rounded-3xl p-6 text-center shadow-[0_0_60px_rgba(245,158,11,0.4)] ${
            popupData.type === 'jackpot' ? "border-red-500 shadow-[0_0_80px_rgba(239,68,68,0.7)] animate-bounce"
            : popupData.type === 'error' ? "border-slate-600"
            : "border-amber-500"
          }`}>
            
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex justify-center mb-3">
              <img src="/assets/home/dragonball.png" alt="Dragon Ball" className="w-14 h-14 object-contain animate-spin-slow drop-shadow-[0_0_15px_rgba(245,158,11,0.9)]" />
            </div>

            <h2 className={`text-xl sm:text-2xl font-black mb-2 tracking-wider uppercase ${
              popupData.type === 'jackpot' ? "text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]"
              : popupData.type === 'error' ? "text-slate-400"
              : "text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]"
            }`}>
              {popupData.title}
            </h2>

            {popupData.prizeLabel && (
              <div className="inline-block my-2 px-4 py-1.5 bg-amber-500/20 border border-amber-400/50 rounded-full text-amber-300 font-black text-lg tracking-wide shadow-inner">
                🎁 {popupData.prizeLabel}
              </div>
            )}

            <p className="text-slate-200 text-sm sm:text-base font-bold my-4 leading-relaxed px-2">
              {popupData.message}
            </p>

            <button
              onClick={() => setPopupData(null)}
              className="mt-2 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-slate-950 font-black py-3 px-8 rounded-2xl shadow-lg hover:brightness-110 transition active:scale-95 cursor-pointer uppercase tracking-widest text-sm border border-amber-300"
            >
              TIẾP TỤC CHINH PHỤC ⚡
            </button>
          </div>
        </div>
      )}
    </div>
  );
}