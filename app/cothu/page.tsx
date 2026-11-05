"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, onSnapshot } from "firebase/firestore";

const BET_OPTIONS = [50, 100, 200, 500, 1000, 5000, 10000];

// Định nghĩa các quân thú: Điện tích lớn hơn ăn được điện tích nhỏ hơn (Chuột = 1, Voi = 8)
// Red (Player 1) vs Blue (Player 2)
interface AnimalPiece {
  name: string;
  rank: number; // 1 đến 8
  color: 'r' | 'b'; // r: Đỏ, b: Xanh
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

// Bàn cờ 9 hàng x 7 cột
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

export default function CoThuPage() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [currentBet, setCurrentBet] = useState<number>(50);
  const [screen, setScreen] = useState<'menu' | 'online' | 'game'>('menu');
  
  const [roomCode, setRoomCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [playerRole, setPlayerRole] = useState<'r' | 'b'>('r');

  const [board, setBoard] = useState<string[][]>(INITIAL_COTHU_BOARD);
  const [turn, setTurn] = useState<'r' | 'b'>('r');
  const [selectedSquare, setSelectedSquare] = useState<{ r: number; c: number } | null>(null);
  const [validMoves, setValidMoves] = useState<{ r: number; c: number }[]>([]);
  
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
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("Bạn chưa đăng nhập!");
      return;
    }
    if (points < currentBet) {
      alert('Bạn không đủ điểm cược!');
      return;
    }

    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const roomRef = doc(db, "cothuRooms", code);
      
      await setDoc(roomRef, {
        board: JSON.stringify(INITIAL_COTHU_BOARD),
        turn: 'r',
        bet: currentBet,
        hostUid: currentUser.uid
      });

      setRoomCode(code);
      setPlayerRole('r');
      setBoard(INITIAL_COTHU_BOARD.map(r => [...r]));
      setTurn('r');
      setSelectedSquare(null);
      setValidMoves([]);
      setScreen('game');
    } catch (err: any) {
      console.error("Lỗi tạo phòng:", err);
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
      const roomRef = doc(db, "cothuRooms", inputCode);
      const roomSnap = await getDoc(roomRef);

      if (!roomSnap.exists()) {
        alert('Phòng không tồn tại hoặc đã hết hạn!');
        return;
      }

      const data = roomSnap.data();
      if (data.board) setBoard(JSON.parse(data.board));
      if (data.turn) setTurn(data.turn);

      setRoomCode(inputCode);
      setPlayerRole('b');
      setScreen('game');
    } catch (err: any) {
      console.error("Lỗi vào phòng:", err);
      alert("Không thể kết nối vào phòng: " + err.message);
    }
  };

  useEffect(() => {
    if (screen !== 'game' || !roomCode) return;

    const roomRef = doc(db, "cothuRooms", roomCode);
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.board) setBoard(JSON.parse(data.board));
        if (data.turn) setTurn(data.turn);
      }
    }, (error) => {
      console.error("Lỗi sync realtime:", error);
    });

    return () => unsubscribe();
  }, [screen, roomCode]);

  // Kiểm tra ô sông (Water)
  const isWater = (r: number, c: number) => {
    // Hàng 3, 4, 5 và cột 1, 2 và 4, 5
    return (r >= 3 && r <= 5) && (c === 1 || c === 2 || c === 4 || c === 5);
  };

  // Kiểm tra ô bẫy / hang (Trap / Den)
  // Hang Đỏ: (8, 3), Bẫy Đỏ: (8, 2), (8, 4), (7, 3)
  // Hang Xanh: (0, 3), Bẫy Xanh: (0, 2), (0, 4), (1, 3)
  const isDen = (r: number, c: number, color: 'r' | 'b') => {
    if (color === 'r') return r === 8 && c === 3;
    return r === 0 && c === 3;
  };

  const getPieceMoves = (r: number, c: number, currentBoard: string[][]) => {
    const moves: { r: number; c: number }[] = [];
    const p = currentBoard[r][c];
    if (!p) return moves;

    const animal = ANIMAL_DATA[p];
    const color = animal.color;
    const rank = animal.rank;

    const steps = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    steps.forEach(([dr, dc]) => {
      let nr = r + dr;
      let nc = c + dc;

      if (nr >= 0 && nr < 9 && nc >= 0 && nc < 7) {
        // Không được vào hang của chính mình
        if (isDen(nr, nc, color)) return;

        const target = currentBoard[nr][nc];
        const targetAnimal = target ? ANIMAL_DATA[target] : null;

        // Xử lý sông (Chỉ Chuột - rank 1 mới được vào sông)
        if (isWater(nr, nc)) {
          if (rank !== 1) {
            // Các con thú khác không được bước xuống nước
            // Ngoại lệ: Sư Tử (7) và Hổ (6) có thể nhảy qua sông theo chiều dọc/ngang nếu không có chuột cản ở giữa sông
            if (rank === 6 || rank === 7) {
              // Kiểm tra nhảy sông
              if (dr !== 0) { // Nhảy dọc qua 3 ô sông
                let jumpR = r + dr;
                let blocked = false;
                while (jumpR >= 3 && jumpR <= 5) {
                  if (currentBoard[jumpR][nc]) { blocked = true; break; }
                  jumpR += dr;
                }
                if (!blocked && jumpR >= 0 && jumpR < 9) {
                  const landTarget = currentBoard[jumpR][nc];
                  const landAnimal = landTarget ? ANIMAL_DATA[landTarget] : null;
                  if (!landTarget || landAnimal?.color !== color) {
                    if (!landTarget || rank >= landAnimal!.rank || (rank === 8 && landAnimal!.rank === 1)) {
                      moves.push({ r: jumpR, c: nc });
                    }
                  }
                }
              } else if (dc !== 0) { // Nhảy ngang qua 2 ô sông
                let jumpC = c + dc;
                let blocked = false;
                while (jumpC >= 1 && jumpC <= 5) {
                  if (currentBoard[nr][jumpC]) { blocked = true; break; }
                  jumpC += dc;
                }
                if (!blocked && jumpC >= 0 && jumpC < 7) {
                  const landTarget = currentBoard[nr][jumpC];
                  const landAnimal = landTarget ? ANIMAL_DATA[landTarget] : null;
                  if (!landTarget || landAnimal?.color !== color) {
                    if (!landTarget || rank >= landAnimal!.rank || (rank === 8 && landAnimal!.rank === 1)) {
                      moves.push({ r: nr, c: jumpC });
                    }
                  }
                }
              }
            }
            return;
          } else {
            // Chuột ở trong nước không được ăn voi trên cạn và ngược lại
            // Chuột ăn chuột dưới nước bình thường
          }
        }

        // Kiểm tra ăn quân thông thường
        if (!target) {
          moves.push({ r: nr, c: nc });
        } else {
          if (targetAnimal?.color !== color) {
            // Quy luật ăn quân Cờ Thú: Quân lớn ăn quân nhỏ. 
            // Ngoại lệ: Chuột (1) ăn được Voi (8). Voi (8) không ăn được Chuột (1).
            // Nếu quân địch đứng ở ô bẫy (Trap) của đối phương, lực lượng bị giảm về 0 (bất kỳ con nào cũng ăn được)
            let canEat = false;
            if (rank === 1 && targetAnimal?.rank === 8) canEat = true; // Chuột ăn Voi
            else if (rank === 8 && targetAnimal?.rank === 1) canEat = false; // Voi không ăn Chuột
            else if (rank >= targetAnimal!.rank) canEat = true;

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
    if (turn !== playerRole) {
      alert("Chưa tới lượt của ní!");
      return;
    }

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
    const target = newBoard[toR][toC];

    newBoard[toR][toC] = movingPiece;
    newBoard[fromR][fromC] = '';

    const nextTurn = turn === 'r' ? 'b' : 'r';

    try {
      const roomRef = doc(db, "cothuRooms", roomCode);
      await updateDoc(roomRef, {
        board: JSON.stringify(newBoard),
        turn: nextTurn
      });

      // Kiểm tra thắng khi vào hang địch hoặc ăn hết thú
      // Hang Đỏ: (8,3), Hang Xanh: (0,3)
      if (movingPiece.startsWith('r') && toR === 0 && toC === 3) {
        endGame(playerRole === 'r', playerRole === 'r' ? "Bạn đã chiếm hang địch và thắng cược!" : "Bạn đã thua cuộc!");
      } else if (movingPiece.startsWith('b') && toR === 8 && toC === 3) {
        endGame(playerRole === 'b', playerRole === 'b' ? "Bạn đã chiếm hang địch và thắng cược!" : "Bạn đã thua cuộc!");
      } else if (target === 'rE' || target === 'bE') {
        // Hoặc kiểm tra nếu tiêu diệt hết quân địch
      }
    } catch (err) {
      console.error("Lỗi cập nhật nước đi cờ thú:", err);
    }
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
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center p-4 select-none">
      <header className="text-center mb-4 w-full max-w-md">
        <div className="flex justify-between items-center mb-2">
          <Link href="/" className="text-xs text-amber-400 hover:underline">← Về Trang Chủ</Link>
          <div className="text-xs bg-neutral-800 px-3 py-1 rounded-lg border border-amber-500/30">
            🪙 <span className="font-bold text-amber-400">{points.toLocaleString()}</span> PTS
          </div>
        </div>
        <h1 className="text-2xl font-black text-emerald-400 tracking-wider uppercase">
          🦁 Đấu Trường Cờ Thú 🐅
        </h1>
      </header>

      {/* MENU CHÍNH */}
      {screen === 'menu' && (
        <div className="w-full max-w-sm flex flex-col gap-4">
          <div className="bg-neutral-800 p-4 rounded-xl border border-neutral-700 text-center">
            <label className="text-sm font-semibold text-gray-300">Chọn mức cược phòng đấu:</label>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {BET_OPTIONS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleSelectBet(amt)}
                  className={`py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                    currentBet === amt
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                      : 'border-neutral-700 bg-neutral-900 text-gray-300 hover:bg-neutral-700'
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-neutral-800 p-4 rounded-xl border border-neutral-700 flex flex-col gap-3">
            <button
              onClick={handleCreateRoom}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-neutral-950 font-bold rounded-lg shadow hover:opacity-90 active:scale-95 transition cursor-pointer"
            >
              🚀 Tạo Phòng Online (Cược {currentBet})
            </button>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                placeholder="NHẬP MÃ PHÒNG"
                maxLength={6}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="w-full p-3 bg-neutral-900 border border-neutral-700 rounded-lg text-center tracking-widest font-mono text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
              <button
                onClick={handleJoinRoom}
                className="px-5 bg-neutral-700 font-bold text-xs rounded-lg hover:bg-neutral-600 transition cursor-pointer"
              >
                Vào
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BÀN CỜ THÚ GAME */}
      {screen === 'game' && (
        <div className="flex flex-col items-center w-full max-w-md">
          <div className="w-full flex justify-between items-center bg-neutral-800 px-4 py-2 rounded-t-lg text-sm border-b border-neutral-700">
            <span className="font-semibold text-emerald-400">
              Lượt: {turn === 'r' ? 'Đỏ' : 'Xanh'} {turn === playerRole ? '(Đến lượt bạn!)' : ''}
            </span>
            <span className="text-xs text-gray-400">
              Phòng #{roomCode} ({playerRole === 'r' ? 'Đội Đỏ' : 'Đội Xanh'})
            </span>
          </div>

          <div className="grid grid-cols-7 grid-rows-9 w-full aspect-[7/9] border-4 border-emerald-800 shadow-2xl bg-[#d4b483]">
            {board.map((row, r) =>
              row.map((piece, c) => {
                const isW = isWater(r, c);
                const isSelected = selectedSquare?.r === r && selectedSquare?.c === c;
                const isValidMove = validMoves.some((m) => m.r === r && m.c === c);
                const animal = piece ? ANIMAL_DATA[piece] : null;

                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleSquareClick(r, c)}
                    className={`relative flex flex-col items-center justify-center cursor-pointer transition-all border border-black/10 ${
                      isW ? 'bg-[#5b92e5]/70' : (r === 0 || r === 8) && c === 3 ? 'bg-amber-600/80' : 'bg-[#e6ccb2]'
                    } ${isSelected ? 'ring-4 ring-yellow-400 inset-0 z-10' : ''}`}
                  >
                    {animal && (
                      <div className="flex flex-col items-center">
                        <span className="text-2xl sm:text-3xl drop-shadow-md">{animal.icon}</span>
                        <span className={`text-[9px] font-black ${animal.color === 'r' ? 'text-red-600' : 'text-blue-700'}`}>
                          {animal.name.split(' ')[0]}
                        </span>
                      </div>
                    )}
                    {isValidMove && (
                      <div className="absolute w-3 h-3 bg-green-500 rounded-full z-20 pointer-events-none animate-ping" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <button
            onClick={() => {
              if (confirm('Bạn có chắc muốn đầu hàng và mất điểm cược?')) {
                endGame(false, "Bạn đã đầu hàng!");
              }
            }}
            className="w-full mt-4 py-3 bg-red-600/80 hover:bg-red-600 font-bold rounded-lg transition cursor-pointer text-xs"
          >
            Thoát / Đầu Hàng (-{currentBet} PTS)
          </button>
        </div>
      )}

      {/* POPUP KẾT QUẢ */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-800 border border-neutral-700 p-6 rounded-xl text-center max-w-xs w-full flex flex-col gap-4">
            <h2 className={`text-xl font-extrabold ${modal.win ? 'text-green-400' : 'text-red-500'}`}>
              {modal.win ? 'CHIẾN THẮNG!' : 'THẤT BẠI!'}
            </h2>
            <p className="text-sm text-gray-300">{modal.msg}</p>
            <button
              onClick={() => {
                setModal({ open: false, win: false, msg: '' });
                setScreen('menu');
              }}
              className="w-full py-2 bg-emerald-500 font-bold text-neutral-950 rounded-lg hover:bg-emerald-400 transition cursor-pointer"
            >
              Về Menu Chính
            </button>
          </div>
        </div>
      )}
    </div>
  );
}