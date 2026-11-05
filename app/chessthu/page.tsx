"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, onSnapshot } from "firebase/firestore";

const BET_OPTIONS = [50, 100, 200, 500, 1000, 5000, 10000];

interface AnimalPiece {
  name: string;
  rank: number;
  color: 'r' | 'b';
  icon: string;
}

const ANIMAL_DATA: Record<string, AnimalPiece> = {
  rE: { name: 'Voi Đỏ', rank: 8, color: 'r', icon: '🐘' },
  rL: { name: 'Sư Tử Đỏ', rank: 7, color: 'r', icon: '🦁' },
  rT: { name: 'Hổ Đỏ', rank: 6, color: 'r', icon: '🐅' },
  rP: { name: 'Báo Đỏ', rank: 5, color: 'r', icon: '🐆' },
  rD: { name: 'Sói Đỏ', rank: 4, color: 'r', icon: '🐺' },
  rC: { name: 'Chó Đỏ', rank: 3, color: 'r', icon: '🐕' },
  rM: { name: 'Mèo Đỏ', rank: 2, color: 'r', icon: '🐈' },
  rR: { name: 'Chuột Đỏ', rank: 1, color: 'r', icon: '🐁' },

  bE: { name: 'Voi Xanh', rank: 8, color: 'b', icon: '🐘' },
  bL: { name: 'Sư Tử Xanh', rank: 7, color: 'b', icon: '🦁' },
  bT: { name: 'Hổ Xanh', rank: 6, color: 'b', icon: '🐅' },
  bP: { name: 'Báo Xanh', rank: 5, color: 'b', icon: '🐆' },
  bD: { name: 'Sói Xanh', rank: 4, color: 'b', icon: '🐺' },
  bC: { name: 'Chó Xanh', rank: 3, color: 'b', icon: '🐕' },
  bM: { name: 'Mèo Xanh', rank: 2, color: 'b', icon: '🐈' },
  bR: { name: 'Chuột Xanh', rank: 1, color: 'b', icon: '🐁' },
};

const INITIAL_COTHU_BOARD: string[][] = [
  ['rL', '', '', '', '', '', 'rT'],
  ['', 'rD', '', '', '', 'rC', ''],
  ['rR', '', 'rM', '', 'rP', '', 'rE'],
  ['', '', '', '', '', '', ''],
  ['', '', '', '', '', '', ''],
  ['', '', '', '', '', '', ''],
  ['bE', '', 'bP', '', 'bM', '', 'bR'],
  ['', 'bC', '', '', '', 'bD', ''],
  ['bT', '', '', '', '', '', 'bL'],
];

const TAUNT_MESSAGES = [
  "Lần này ta đã phân biệt rõ hang nhà và hang địch rồi nhé! Chuẩn bị mất điểm đi! 🦁🔥",
  "Đội hình ta đang tiến thẳng xuống hang (8,3) của cậu đấy! ⚡",
  "Đừng hòng cản đường ta xông vào hang chiến thắng! 🏴‍☠️",
  "Trận này ta quyết san bằng hang của cậu! 💀"
];

export default function ChessthuPage() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [currentBet, setCurrentBet] = useState<number>(50);
  const [gameMode, setGameMode] = useState<'pvp' | 'ai'>('pvp');
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [screen, setScreen] = useState<'menu' | 'game'>('menu');

  const [roomCode, setRoomCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [playerRole, setPlayerRole] = useState<'r' | 'b'>('r');

  const [board, setBoard] = useState<string[][]>(INITIAL_COTHU_BOARD);
  const [turn, setTurn] = useState<'r' | 'b'>('r');
  const [selectedSquare, setSelectedSquare] = useState<{ r: number; c: number } | null>(null);
  const [validMoves, setValidMoves] = useState<{ r: number; c: number }[]>([]);

  const [aiTaunt, setAiTaunt] = useState<string>("AI đã tỉnh táo lại! Sẵn sàng chiến đấu chuẩn luật!");
  const [modal, setModal] = useState<{ open: boolean; win: boolean; msg: string }>({
    open: false,
    win: false,
    msg: '',
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setPoints(userSnap.data().points || 0);
          }
        } catch (err) {
          console.error("Lỗi lấy thông tin user:", err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const updatePointsInDB = async (newPoints: number) => {
    if (!user) return;
    try {
      setPoints(newPoints);
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { points: newPoints });
    } catch (err) {
      console.error("Lỗi cập nhật điểm:", err);
    }
  };

  const handleSelectBet = (amount: number) => {
    if (points < amount) {
      alert('Bạn không đủ điểm cược!');
      return;
    }
    setCurrentBet(amount);
  };

  const handleCreateRoom = async () => {
    if (!auth.currentUser) {
      alert("Bạn chưa đăng nhập!");
      return;
    }
    if (points < currentBet) {
      alert('Bạn không đủ điểm cược!');
      return;
    }

    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const roomRef = doc(db, "chessthuRooms", code);

      await setDoc(roomRef, {
        board: JSON.stringify(INITIAL_COTHU_BOARD),
        turn: 'r',
        bet: currentBet,
        hostUid: auth.currentUser.uid,
        status: 'playing'
      });

      setGameMode('pvp');
      setRoomCode(code);
      setPlayerRole('r');
      setBoard(INITIAL_COTHU_BOARD.map(r => [...r]));
      setTurn('r');
      setSelectedSquare(null);
      setValidMoves([]);
      setScreen('game');
    } catch (err: any) {
      alert("Lỗi tạo phòng: " + (err.message || "Không xác định"));
    }
  };

  const handleJoinRoom = async () => {
    if (inputCode.length < 6) {
      alert('Vui lòng nhập mã phòng 6 chữ số!');
      return;
    }
    if (points < currentBet) {
      alert('Bạn không đủ điểm cược!');
      return;
    }

    try {
      const roomRef = doc(db, "chessthuRooms", inputCode);
      const roomSnap = await getDoc(roomRef);

      if (!roomSnap.exists()) {
        alert('Phòng không tồn tại hoặc đã hết hạn!');
        return;
      }

      const data = roomSnap.data();
      if (data.board) setBoard(JSON.parse(data.board));
      if (data.turn) setTurn(data.turn);

      setGameMode('pvp');
      setRoomCode(inputCode);
      setPlayerRole('b');
      setScreen('game');
    } catch (err: any) {
      alert("Không thể kết nối vào phòng: " + err.message);
    }
  };

  const startAiGame = () => {
    if (points < currentBet) {
      alert('Bạn không đủ điểm cược!');
      return;
    }
    setGameMode('ai');
    setRoomCode('');
    setPlayerRole('r');
    setBoard(INITIAL_COTHU_BOARD.map(r => [...r]));
    setTurn('r');
    setSelectedSquare(null);
    setValidMoves([]);
    setAiTaunt("Trận chiến AI tấn công hang địch bắt đầu! Sẵn sàng chưa? 🦁");
    setScreen('game');
  };

  useEffect(() => {
    if (screen !== 'game' || gameMode !== 'pvp' || !roomCode) return;

    const roomRef = doc(db, "chessthuRooms", roomCode);
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.board) setBoard(JSON.parse(data.board));
        if (data.turn) setTurn(data.turn);
        if (data.winner) {
          if (data.winner === playerRole) {
            endGame(true, "Đối thủ đã rời trận/đầu hàng! Bạn thắng cược!");
          } else {
            endGame(false, "Bạn đã thua cuộc!");
          }
        }
      }
    });

    return () => unsubscribe();
  }, [screen, gameMode, roomCode, playerRole]);

  useEffect(() => {
    if (screen === 'game' && gameMode === 'ai' && turn === 'b' && !modal.open) {
      const timer = setTimeout(() => {
        makeAiMove();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [screen, gameMode, turn, board, modal.open]);

  const isWater = (r: number, c: number) => {
    return (r >= 3 && r <= 5) && (c === 1 || c === 2 || c === 4 || c === 5);
  };

  const isTrap = (r: number, c: number, color: 'r' | 'b') => {
    if (color === 'r') {
      return (r === 7 && (c === 2 || c === 4)) || (r === 8 && (c === 2 || c === 4));
    } else {
      return (r === 1 && (c === 2 || c === 4)) || (r === 0 && (c === 2 || c === 4));
    }
  };

  const isDen = (r: number, c: number, color: 'r' | 'b') => {
    if (color === 'r') return r === 8 && c === 3; // Hang Đỏ
    return r === 0 && c === 3; // Hang Xanh
  };

  const getPieceMoves = (r: number, c: number, currentBoard: string[][]) => {
    const moves: { r: number; c: number }[] = [];
    const p = currentBoard[r][c];
    if (!p) return moves;

    const animal = ANIMAL_DATA[p];
    const color = animal.color;
    const rank: number = animal.rank;

    const steps = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    steps.forEach(([dr, dc]) => {
      let nr = r + dr;
      let nc = c + dc;

      if (nr >= 0 && nr < 9 && nc >= 0 && nc < 7) {
        // Không được bước vào hang của chính mình
        if (isDen(nr, nc, color)) return;

        const target = currentBoard[nr][nc];
        const targetAnimal = target ? ANIMAL_DATA[target] : null;

        if (isWater(nr, nc)) {
          if (rank !== 1) {
            if (rank === 6 || rank === 7) {
              if (dr !== 0) {
                let jumpR = r + dr;
                let blocked = false;
                let mouseInRiver = false;
                while (jumpR >= 3 && jumpR <= 5) {
                  const midPiece = currentBoard[jumpR][nc];
                  if (midPiece) {
                    if (ANIMAL_DATA[midPiece].rank === 1) mouseInRiver = true;
                    blocked = true;
                    break;
                  }
                  jumpR += dr;
                }
                if (!blocked && !mouseInRiver && jumpR >= 0 && jumpR < 9) {
                  const landTarget = currentBoard[jumpR][nc];
                  const landAnimal = landTarget ? ANIMAL_DATA[landTarget] : null;
                  if (!landTarget || landAnimal?.color !== color) {
                    const targetRank = landAnimal ? landAnimal.rank : 0;
                    const enemyColor = color === 'r' ? 'b' : 'r';
                    const inEnemyTrap = isTrap(jumpR, nc, enemyColor);
                    if (inEnemyTrap || !landTarget || rank >= targetRank) {
                      moves.push({ r: jumpR, c: nc });
                    }
                  }
                }
              } else if (dc !== 0) {
                let jumpC = c + dc;
                let blocked = false;
                let mouseInRiver = false;
                while (jumpC >= 1 && jumpC <= 5) {
                  const midPiece = currentBoard[nr][jumpC];
                  if (midPiece) {
                    if (ANIMAL_DATA[midPiece].rank === 1) mouseInRiver = true;
                    blocked = true;
                    break;
                  }
                  jumpC += dc;
                }
                if (!blocked && !mouseInRiver && jumpC >= 0 && jumpC < 7) {
                  const landTarget = currentBoard[nr][jumpC];
                  const landAnimal = landTarget ? ANIMAL_DATA[landTarget] : null;
                  if (!landTarget || landAnimal?.color !== color) {
                    const targetRank = landAnimal ? landAnimal.rank : 0;
                    const enemyColor = color === 'r' ? 'b' : 'r';
                    const inEnemyTrap = isTrap(nr, jumpC, enemyColor);
                    if (inEnemyTrap || !landTarget || rank >= targetRank) {
                      moves.push({ r: nr, c: jumpC });
                    }
                  }
                }
              }
            }
            return;
          }
        }

        if (isWater(r, c) && !isWater(nr, nc) && rank === 1) {
          if (target && targetAnimal && targetAnimal.rank === 8 && targetAnimal.color !== color) {
            // Không được ăn Voi từ nước lên cạn
          } else if (!target || targetAnimal?.color !== color) {
            moves.push({ r: nr, c: nc });
          }
          return;
        }

        const enemyColor = color === 'r' ? 'b' : 'r';
        const targetInTrap = isTrap(nr, nc, enemyColor);

        if (!target) {
          moves.push({ r: nr, c: nc });
        } else {
          if (targetAnimal?.color !== color) {
            let canEat = false;
            const tRank = targetAnimal?.rank ?? 0;
            const curRankNum: number = rank;

            if (targetInTrap) {
              canEat = true;
            } else {
              if (curRankNum === 1 && tRank === 8) canEat = true;
              else if (curRankNum === 8 && tRank === 1) canEat = false;
              else if (curRankNum >= tRank) canEat = true;
            }

            if (canEat) {
              moves.push({ r: nr, c: nc });
            }
          }
        }
      }
    });

    return moves;
  };

  const handleSquareClick = async (r: number, c: number) => {
    if (turn !== playerRole) return;

    const piece = board[r][c];

    if (selectedSquare) {
      const isValid = validMoves.some((m) => m.r === r && m.c === c);
      if (isValid) {
        await executeMove(selectedSquare.r, selectedSquare.c, r, c);
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }
    }

    if (piece && ANIMAL_DATA[piece].color === turn) {
      setSelectedSquare({ r, c });
      setValidMoves(getPieceMoves(r, c, board));
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const executeMove = async (fromR: number, fromC: number, toR: number, toC: number) => {
    const newBoard = board.map((row) => [...row]);
    const movingPiece = newBoard[fromR][fromC];

    newBoard[toR][toC] = movingPiece;
    newBoard[fromR][fromC] = '';

    const nextTurn = turn === 'r' ? 'b' : 'r';
    setBoard(newBoard);
    setTurn(nextTurn);

    if (gameMode === 'pvp' && roomCode) {
      try {
        const roomRef = doc(db, "chessthuRooms", roomCode);
        await updateDoc(roomRef, {
          board: JSON.stringify(newBoard),
          turn: nextTurn
        });
      } catch (err) {
        console.error("Lỗi PvP:", err);
      }
    }

    // LUẬT THẮNG CHUẨN XÁC 100%:
    // - Quân Đỏ (r) bước vào Hang Xanh (0, 3) -> Bạn Thắng!
    // - Quân Xanh (b) bước vào Hang Đỏ (8, 3) -> AI Thắng!
    if (movingPiece.startsWith('r') && toR === 0 && toC === 3) {
      endGame(true, "Bạn đã xông vào chiếm hang địch và thắng cược!");
    } else if (movingPiece.startsWith('b') && toR === 8 && toC === 3) {
      endGame(false, "AI đã xông vào chiếm mất hang của bạn! Thất bại!");
    }
  };

  const makeAiMove = () => {
    const allMoves: { fromR: number; fromC: number; toR: number; toC: number; score: number }[] = [];

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 7; c++) {
        const p = board[r][c];
        if (p && ANIMAL_DATA[p].color === 'b') {
          const moves = getPieceMoves(r, c, board);
          moves.forEach((m) => {
            let score = 0;
            const targetPiece = board[m.r][m.c];

            // 1. AI Xanh (b) ưu tiên TỐI ĐA xông vào Hang Đỏ (8, 3) để thắng
            if (m.r === 8 && m.c === 3) {
              score += 100000;
            }

            // 2. Ưu tiên ăn quân địch
            if (targetPiece) {
              const targetRank = ANIMAL_DATA[targetPiece].rank;
              score += targetRank * 300;
            }

            // 3. Khuyến khích tiến xuống sân của bạn (hàng số tăng dần)
            score += m.r * 25;

            score += Math.random() * 20;

            allMoves.push({ fromR: r, fromC: c, toR: m.r, toC: m.c, score });
          });
        }
      }
    }

    if (allMoves.length === 0) {
      endGame(true, "AI bị kẹt hoàn toàn! Bạn thắng!");
      return;
    }

    allMoves.sort((a, b) => b.score - a.score);
    const chosenMove = allMoves[0];

    const randomTaunt = TAUNT_MESSAGES[Math.floor(Math.random() * TAUNT_MESSAGES.length)];
    setAiTaunt(randomTaunt);

    executeMove(chosenMove.fromR, chosenMove.fromC, chosenMove.toR, chosenMove.toC);
  };

  const handleSurrender = async () => {
    if (!confirm('Bạn có chắc chắn muốn ĐẦU HÀNG và mất điểm cược?')) return;
    endGame(false, "Bạn đã đầu hàng và bị trừ điểm cược!");
  };

  const endGame = async (isWin: boolean, msg: string) => {
    let newPts = points;
    if (isWin) {
      newPts += currentBet;
    } else {
      newPts = Math.max(0, newPts - currentBet);
    }
    await updatePointsInDB(newPts);
    setModal({ open: true, win: isWin, msg });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-2 sm:p-4 font-sans select-none">
      <header className="w-full max-w-xl flex justify-between items-center mb-3 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shadow-lg">
        <Link href="/" className="text-xs font-bold text-amber-400 hover:text-amber-300 transition flex items-center gap-1">
          ← Trang chủ
        </Link>
        <h1 className="text-lg font-black tracking-wider text-emerald-400 uppercase flex items-center gap-1">
          🦁 CỜ THÚ CHUẨN XÁC
        </h1>
        <div className="text-xs bg-slate-800 px-3 py-1.5 rounded-xl border border-amber-500/30 font-bold text-amber-400">
          🪙 {points.toLocaleString()} PTS
        </div>
      </header>

      {screen === 'menu' && (
        <div className="w-full max-w-md flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-center shadow-xl">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Chọn mức cược PTS</label>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {BET_OPTIONS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleSelectBet(amt)}
                  className={`py-2 text-xs font-extrabold rounded-xl border transition cursor-pointer ${
                    currentBet === amt
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-md'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col gap-3 shadow-xl">
            <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider">⚔️ Đấu Online 2 Người</label>
            <button
              onClick={handleCreateRoom}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black rounded-xl shadow-lg hover:brightness-110 transition cursor-pointer text-sm"
            >
              🚀 Tạo Phòng Online (Cược {currentBet})
            </button>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="NHẬP MÃ PHÒNG"
                maxLength={6}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center tracking-widest font-mono text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
              <button
                onClick={handleJoinRoom}
                className="px-5 bg-slate-800 hover:bg-slate-700 font-bold text-xs rounded-xl transition cursor-pointer border border-slate-700"
              >
                Vào Phòng
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col gap-3 shadow-xl">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-wider">🤖 Đấu AI Chuẩn Tọa Độ Hang</label>
            <button
              onClick={startAiGame}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black rounded-xl shadow-lg hover:brightness-110 transition cursor-pointer text-sm"
            >
              🎮 Chiến AI Ngay
            </button>
          </div>
        </div>
      )}

      {screen === 'game' && (
        <div className="flex flex-col items-center w-full max-w-lg">
          <div className="w-full flex justify-between items-center bg-slate-900 px-4 py-2.5 rounded-t-2xl border border-slate-800 text-xs font-bold">
            <span className="text-emerald-400 flex items-center gap-1">
              ⚡ Lượt: {turn === 'r' ? 'Đỏ (Bạn)' : 'Xanh'} {turn === playerRole ? '(Đến lượt bạn!)' : ''}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-slate-400">
                {gameMode === 'pvp' ? `Phòng #${roomCode}` : `AI (Chuẩn Xác)`}
              </span>
              <button
                onClick={() => setScreen('menu')}
                className="bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/40 px-2 py-0.5 rounded-md text-[10px] transition cursor-pointer"
              >
                Thoát ✖
              </button>
            </div>
          </div>

          {gameMode === 'ai' && (
            <div className="w-full bg-slate-900/90 border-t border-b border-amber-500/30 px-4 py-2 flex items-center gap-2 text-xs text-amber-300 font-medium">
              <span className="text-lg">🤖</span>
              <div className="flex-1 italic">&quot;{aiTaunt}&quot;</div>
            </div>
          )}

          <div className="grid grid-cols-7 grid-rows-9 w-full aspect-[7/9] border-4 border-amber-900/80 rounded-b-2xl shadow-2xl bg-[#52796f] p-1 gap-0.5 relative overflow-hidden">
            {board.map((row, r) =>
              row.map((piece, c) => {
                const isW = isWater(r, c);
                const isTrapR = isTrap(r, c, 'r');
                const isTrapB = isTrap(r, c, 'b');
                const isDenRed = isDen(r, c, 'r');
                const isDenBlue = isDen(r, c, 'b');
                const isSelected = selectedSquare?.r === r && selectedSquare?.c === c;
                const isValidMove = validMoves.some((m) => m.r === r && m.c === c);
                const animal = piece ? ANIMAL_DATA[piece] : null;

                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleSquareClick(r, c)}
                    className={`relative flex flex-col items-center justify-center cursor-pointer transition-all rounded-md ${
                      isW
                        ? 'bg-gradient-to-b from-blue-600 via-cyan-600 to-blue-700 shadow-inner border border-cyan-400/30'
                        : isDenRed || isDenBlue
                        ? 'bg-amber-800/90 border-2 border-yellow-500/80 shadow-lg'
                        : isTrapR || isTrapB
                        ? 'bg-amber-900/50 border border-amber-700/60'
                        : 'bg-[#84a98c] border border-black/10 hover:brightness-105'
                    } ${isSelected ? 'ring-4 ring-yellow-400 z-10 scale-95 shadow-xl' : ''}`}
                  >
                    {isW && <span className="absolute text-[10px] opacity-30 select-none">🌊</span>}
                    {isDenRed && <span className="absolute text-[8px] text-yellow-300 font-black top-0.5">HANG ĐỎ</span>}
                    {isDenBlue && <span className="absolute text-[8px] text-yellow-300 font-black bottom-0.5">HANG XANH</span>}
                    {(isTrapR || isTrapB) && <span className="absolute text-[8px] text-amber-200/60 font-bold">BẪY</span>}

                    {animal && (
                      <div className={`flex flex-col items-center justify-center w-11/12 h-11/12 rounded-full shadow-md border-2 ${
                        animal.color === 'r' 
                          ? 'bg-gradient-to-br from-red-500 to-rose-700 border-yellow-400 text-white' 
                          : 'bg-gradient-to-br from-blue-500 to-indigo-700 border-cyan-300 text-white'
                      }`}>
                        <span className="text-xl sm:text-2xl drop-shadow">{animal.icon}</span>
                        <span className="text-[9px] font-black tracking-tighter leading-none mt-0.5 drop-shadow">
                          {animal.name.split(' ')[0]}
                        </span>
                      </div>
                    )}

                    {isValidMove && (
                      <div className="absolute w-4 h-4 bg-yellow-400/90 rounded-full z-20 pointer-events-none animate-ping border-2 border-white" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="w-full flex gap-3 mt-4">
            <button
              onClick={handleSurrender}
              className="w-full py-3 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 font-extrabold text-white rounded-xl shadow-lg transition active:scale-95 cursor-pointer text-xs uppercase tracking-wider"
            >
              🏳️ Đầu Hàng (-{currentBet} PTS)
            </button>
          </div>
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center max-w-xs w-full flex flex-col gap-4 shadow-2xl">
            <h2 className={`text-2xl font-black ${modal.win ? 'text-emerald-400' : 'text-rose-500'}`}>
              {modal.win ? '🎉 CHIẾN THẮNG!' : '💀 THẤT BẠI!'}
            </h2>
            <p className="text-xs text-slate-300 font-medium">{modal.msg}</p>
            <button
              onClick={() => {
                setModal({ open: false, win: false, msg: '' });
                setScreen('menu');
              }}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 font-extrabold text-slate-950 rounded-xl hover:brightness-110 transition cursor-pointer text-xs"
            >
              Về Menu Chính
            </button>
          </div>
        </div>
      )}
    </div>
  );
}