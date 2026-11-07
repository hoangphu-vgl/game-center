"use client";

import React, { useState, useRef } from "react";
import { Trophy, Maximize, Minimize, Play } from "lucide-react";

type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
  color: string;
}

interface Player {
  id: number;
  name: string;
  avatar: string;
  chips: number;
  cards: Card[];
  currentBet: number;
  folded: boolean;
  isHero: boolean;
  actionText?: string;
}

type GamePhase = 'IDLE' | 'DEALING' | 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

const INITIAL_PLAYERS: Player[] = [
  { id: 0, name: "Broly AI", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Broly", chips: 5000, cards: [], currentBet: 0, folded: false, isHero: false },
  { id: 1, name: "Vegeta AI", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Vegeta", chips: 5000, cards: [], currentBet: 0, folded: false, isHero: false },
  { id: 2, name: "Piccolo AI", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Piccolo", chips: 5000, cards: [], currentBet: 0, folded: false, isHero: false },
  { id: 3, name: "Goku (Bạn)", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Goku", chips: 10000, cards: [], currentBet: 0, folded: false, isHero: true },
  { id: 4, name: "Gohan AI", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Gohan", chips: 5000, cards: [], currentBet: 0, folded: false, isHero: false },
  { id: 5, name: "Trunks AI", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Trunks", chips: 5000, cards: [], currentBet: 0, folded: false, isHero: false },
];

export default function PokerGame() {
  const [deck, setDeck] = useState<Card[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [pot, setPot] = useState(0);
  const [phase, setPhase] = useState<GamePhase>('IDLE');
  const [dealerIndex, setDealerIndex] = useState(0);
  const [currentHighBet, setCurrentHighBet] = useState(0);
  const [raiseAmount, setRaiseAmount] = useState(200);
  const [dealerActionText, setDealerActionText] = useState("Sẵn sàng chia bài!");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const createDeck = (): Card[] => {
    const newDeck: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        newDeck.push({
          suit,
          rank,
          value: RANK_VALUES[rank],
          color: (suit === '♥' || suit === '♦') ? 'text-red-500' : 'text-slate-900'
        });
      }
    }
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
  };

  const startNewHand = async () => {
    if (phase !== 'IDLE' && phase !== 'SHOWDOWN') return;

    const newDeck = createDeck();
    setCommunityCards([]);
    setPot(0);
    setPhase('DEALING');
    setDealerActionText("Nhà cái đang xáo bài...");

    const nextDealer = (dealerIndex + 1) % 6;
    setDealerIndex(nextDealer);

    const sbIndex = (nextDealer + 1) % 6;
    const bbIndex = (nextDealer + 2) % 6;

    const smallBlind = 50;
    const bigBlind = 100;

    // Tạo bản sao deep copy đảm bảo mảng cards luôn hợp lệ
    const updatedPlayers: Player[] = players.map((p, idx) => {
      let b = 0;
      let c = p.chips;
      if (idx === sbIndex) {
        b = Math.min(smallBlind, c);
        c -= b;
      }
      if (idx === bbIndex) {
        b = Math.min(bigBlind, c);
        c -= b;
      }
      return {
        ...p,
        cards: [],
        currentBet: b,
        chips: c,
        folded: false,
        actionText: idx === sbIndex ? `Small Blind (${b})` : idx === bbIndex ? `Big Blind (${b})` : undefined
      };
    });

    setPot(smallBlind + bigBlind);
    setCurrentHighBet(bigBlind);
    setPlayers(updatedPlayers);

    await new Promise(res => setTimeout(res, 600));
    setDealerActionText("Nhà cái đang chia 2 lá tẩy...");

    // SỬA LỖI TYPESCRIPT TẠI ĐÂY: DÙNG CASTING "as Card"
    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < 6; i++) {
        await new Promise(res => setTimeout(res, 80));
        const card = newDeck.pop();
        if (card) {
          const currentCards = updatedPlayers[i].cards;
          updatedPlayers[i] = {
            ...updatedPlayers[i],
            cards: [...currentCards, card as Card]
          };
          setPlayers([...updatedPlayers]);
        }
      }
    }

    setDeck(newDeck);
    setPhase('PREFLOP');
    setDealerActionText("Cược Pre-flop: Đợi người chơi hành động...");
  };

  const advanceToNextPhase = async (currentDeck: Card[], currentCards: Card[]) => {
    const resetBetPlayers = players.map(p => ({ ...p, currentBet: 0, actionText: undefined }));
    setPlayers(resetBetPlayers);
    setCurrentHighBet(0);

    const tempDeck = [...currentDeck];
    const tempCommunity = [...currentCards];

    if (phase === 'PREFLOP') {
      setDealerActionText("Nhà cái đang chia 3 lá bài chung (FLOP)...");
      await new Promise(res => setTimeout(res, 600));
      const c1 = tempDeck.pop();
      const c2 = tempDeck.pop();
      const c3 = tempDeck.pop();
      if (c1 && c2 && c3) tempCommunity.push(c1 as Card, c2 as Card, c3 as Card);
      setCommunityCards(tempCommunity);
      setDeck(tempDeck);
      setPhase('FLOP');
    } else if (phase === 'FLOP') {
      setDealerActionText("Nhà cái chia lá bài thứ 4 (TURN)...");
      await new Promise(res => setTimeout(res, 600));
      const c4 = tempDeck.pop();
      if (c4) tempCommunity.push(c4 as Card);
      setCommunityCards(tempCommunity);
      setDeck(tempDeck);
      setPhase('TURN');
    } else if (phase === 'TURN') {
      setDealerActionText("Nhà cái chia lá bài cuối cùng (RIVER)...");
      await new Promise(res => setTimeout(res, 600));
      const c5 = tempDeck.pop();
      if (c5) tempCommunity.push(c5 as Card);
      setCommunityCards(tempCommunity);
      setDeck(tempDeck);
      setPhase('RIVER');
    } else if (phase === 'RIVER') {
      setPhase('SHOWDOWN');
      setDealerActionText("Mở bài! Nhà cái đang tính toán người chiến thắng...");
      handleShowdown();
    }
  };

  const handleShowdown = () => {
    const activePlayers = players.filter(p => !p.folded);
    if (activePlayers.length === 0) return;

    const winner = activePlayers[Math.floor(Math.random() * activePlayers.length)];
    setDealerActionText(`🎉 Chúc mừng ${winner.name} thắng ${pot} Ki!`);

    setPlayers(prev => prev.map(p => p.id === winner.id ? { ...p, chips: p.chips + pot } : p));
  };

  const handlePlayerAction = (action: 'fold' | 'check' | 'call' | 'raise') => {
    const hero = players[3];
    if (hero.folded || phase === 'IDLE' || phase === 'SHOWDOWN') return;

    let updated = [...players];
    let newPot = pot;
    let newHighBet = currentHighBet;

    if (action === 'fold') {
      updated[3].folded = true;
      updated[3].actionText = "Fold";
    } else if (action === 'check') {
      updated[3].actionText = "Check";
    } else if (action === 'call') {
      const diff = currentHighBet - hero.currentBet;
      const amount = Math.min(diff, hero.chips);
      updated[3].chips -= amount;
      updated[3].currentBet += amount;
      newPot += amount;
      updated[3].actionText = `Call ${amount}`;
    } else if (action === 'raise') {
      const totalBet = raiseAmount;
      const diff = totalBet - hero.currentBet;
      const amount = Math.min(diff, hero.chips);
      updated[3].chips -= amount;
      updated[3].currentBet += amount;
      newHighBet = totalBet;
      newPot += amount;
      updated[3].actionText = `Raise ${totalBet}`;
    }

    setPot(newPot);
    setCurrentHighBet(newHighBet);
    setPlayers(updated);

    advanceToNextPhase(deck, communityCards);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-screen bg-slate-950 text-white flex flex-col items-center justify-between p-2 select-none overflow-hidden font-sans">
      
      {/* Top Bar */}
      <div className="w-full flex justify-between items-center bg-slate-900/80 backdrop-blur px-4 py-2 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <span className="font-bold text-yellow-400 text-sm md:text-base">POKER DRAGON BALL</span>
        </div>
        <div className="text-xs md:text-sm bg-slate-800 px-3 py-1 rounded-full text-emerald-400 font-mono">
          Tổng Pot: <span className="text-white font-bold">{pot} Ki</span>
        </div>
        <button 
          onClick={toggleFullscreen}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Poker Table Area */}
      <div className="relative w-full max-w-4xl flex-1 my-2 bg-emerald-800 rounded-[100px] border-[12px] border-amber-900 shadow-2xl flex flex-col justify-between items-center p-4 overflow-hidden">
        <div className="absolute inset-2 border-2 border-emerald-600/50 rounded-[90px] pointer-events-none" />

        {/* NPC Nhà Cái (Whis / Dealer) */}
        <div className="flex flex-col items-center z-10">
          <div className="relative w-14 h-14 rounded-full border-2 border-yellow-400 overflow-hidden bg-indigo-950 shadow-lg">
            <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Whis" alt="Dealer" className="w-full h-full object-cover" />
          </div>
          <span className="text-[10px] bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold mt-1">NHÀ CÁI WHIS</span>
          <div className="text-xs bg-black/60 text-yellow-200 px-3 py-1 rounded-full mt-1 border border-yellow-500/30">
            {dealerActionText}
          </div>
        </div>

        {/* Community Cards */}
        <div className="flex flex-col items-center gap-2 z-10">
          <div className="flex gap-2 min-h-[64px] items-center">
            {communityCards.length === 0 ? (
              <span className="text-xs text-emerald-200/60 italic">Đợi lật bài chung...</span>
            ) : (
              communityCards.map((card, idx) => (
                <div key={idx} className="w-10 h-14 md:w-12 md:h-16 bg-white rounded-md flex flex-col justify-between p-1 shadow-md text-black font-bold text-xs md:text-sm">
                  <span className={card.color}>{card.rank}</span>
                  <span className={`text-center text-base ${card.color}`}>{card.suit}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Players Seats */}
        <div className="w-full grid grid-cols-3 md:grid-cols-6 gap-2 z-10">
          {players.map((player) => (
            <div 
              key={player.id} 
              className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                player.isHero ? 'bg-amber-950/60 border border-amber-500' : 'bg-slate-900/60'
              } ${player.folded ? 'opacity-40' : ''}`}
            >
              <div className="relative w-10 h-10 rounded-full overflow-hidden border border-slate-700 bg-slate-800">
                <img src={player.avatar} alt={player.name} className="w-full h-full" />
              </div>
              <span className="text-[10px] font-bold text-slate-200 truncate max-w-[70px] mt-1">{player.name}</span>
              <span className="text-[10px] text-yellow-400 font-mono">{player.chips} Ki</span>

              <div className="flex gap-1 mt-1">
                {player.cards.map((c, i) => (
                  <div key={i} className="w-6 h-8 bg-white rounded flex items-center justify-center text-[10px] font-bold text-black">
                    {player.isHero || phase === 'SHOWDOWN' ? `${c.rank}${c.suit}` : '🎴'}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-full bg-slate-900 p-3 rounded-2xl border border-slate-800 flex flex-col gap-2">
        {phase === 'IDLE' || phase === 'SHOWDOWN' ? (
          <button 
            onClick={startNewHand}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold rounded-xl shadow-lg hover:brightness-110 flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-current" /> BẮT ĐẦU VÁN BÀI MỚI (CHIA BÀI)
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Cược: {raiseAmount} Ki</span>
              <input 
                type="range" 
                min={currentHighBet + 100} 
                max={players[3].chips} 
                step={100}
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(Number(e.target.value))}
                className="flex-1 accent-amber-500"
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              <button 
                onClick={() => handlePlayerAction('fold')}
                className="py-2.5 bg-rose-600 hover:bg-rose-500 font-bold rounded-lg text-xs md:text-sm"
              >
                ÚP BÀI
              </button>
              <button 
                onClick={() => handlePlayerAction('check')}
                className="py-2.5 bg-slate-700 hover:bg-slate-600 font-bold rounded-lg text-xs md:text-sm"
              >
                XEM BÀI
              </button>
              <button 
                onClick={() => handlePlayerAction('call')}
                className="py-2.5 bg-blue-600 hover:bg-blue-500 font-bold rounded-lg text-xs md:text-sm"
              >
                THEO
              </button>
              <button 
                onClick={() => handlePlayerAction('raise')}
                className="py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs md:text-sm"
              >
                TĂNG CƯỢC
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}