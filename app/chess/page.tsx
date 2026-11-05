"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, onSnapshot } from "firebase/firestore";

const BET_OPTIONS = [50, 100, 500, 1000, 5000];

const PIECES: Record<string, string> = {
  wP: '♙', wN: '♘', wB: '♗', wR: '♖', wQ: '♕', wK: '♔',
  bP: '♟', bN: '♞', bB: '♝', bR: '♜', bQ: '♛', bK: '♚',
};

const INITIAL_BOARD = [
  ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
  ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
  ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR'],
];

export default function ChessPage() {
  const [user, setUser] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [currentBet, setCurrentBet] = useState<number>(50);
  const [screen, setScreen] = useState<'menu' | 'online' | 'game'>('menu');
  const [gameMode, setGameMode] = useState<'ai' | 'online'>('ai');
  
  const [roomCode, setRoomCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [playerRole, setPlayerRole] = useState<'w' | 'b'>('w');

  const [board, setBoard] = useState<string[][]>(INITIAL_BOARD);
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [selectedSquare, setSelectedSquare] = useState<{ r: number; c: number } | null>(null);
  const [validMoves, setValidMoves] = useState<{ r: number; c: number }[]>([]);
  
  const [modal, setModal] = useState<{ open: boolean; win: boolean; msg: string }>({
    open: false,
    win: false,
    msg: '',
  });

  // Lấy thông tin user & điểm số từ Firebase
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

  const startVsAI = () => {
    if (points < currentBet) {
      alert('Bạn không đủ điểm cược!');
      return;
    }
    setGameMode('ai');
    setBoard(INITIAL_BOARD.map(r => [...r]));
    setTurn('w');
    setSelectedSquare(null);
    setValidMoves([]);
    setScreen('game');
  };

  // Tạo phòng Online Realtime trên Firestore (dùng JSON.stringify để tránh lỗi nested arrays)
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
      const roomRef = doc(db, "chessRooms", code);
      
      await setDoc(roomRef, {
        board: JSON.stringify(INITIAL_BOARD),
        turn: 'w',
        bet: currentBet,
        hostUid: currentUser.uid
      });

      setRoomCode(code);
      setGameMode('online');
      setPlayerRole('w');
      setBoard(INITIAL_BOARD.map(r => [...r]));
      setTurn('w');
      setSelectedSquare(null);
      setValidMoves([]);
      setScreen('game');
    } catch (err: any) {
      console.error("CHI TIẾT LỖI TẠO PHÒNG:", err);
      alert("Lỗi tạo phòng: " + (err.message || "Không xác định"));
    }
  };

  // Vào phòng Online bằng mã
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
      const roomRef = doc(db, "chessRooms", inputCode);
      const roomSnap = await getDoc(roomRef);

      if (!roomSnap.exists()) {
        alert('Phòng không tồn tại hoặc đã hết hạn!');
        return;
      }

      const data = roomSnap.data();
      if (data.board) {
        setBoard(JSON.parse(data.board));
      }
      if (data.turn) {
        setTurn(data.turn);
      }

      setRoomCode(inputCode);
      setGameMode('online');
      setPlayerRole('b');
      setScreen('game');
    } catch (err: any) {
      console.error("Lỗi vào phòng:", err);
      alert("Không thể kết nối vào phòng: " + err.message);
    }
  };

  // Lắng nghe realtime từ Firestore cho phòng Online
  useEffect(() => {
    if (gameMode !== 'online' || !roomCode) return;

    const roomRef = doc(db, "chessRooms", roomCode);
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.board) {
          setBoard(JSON.parse(data.board));
        }
        if (data.turn) {
          setTurn(data.turn);
        }
      }
    }, (error) => {
      console.error("Lỗi sync realtime phòng cờ:", error);
    });

    return () => unsubscribe();
  }, [gameMode, roomCode]);

  const getBasicMoves = (r: number, c: number, currentBoard: string[][]) => {
    const moves: { r: number; c: number }[] = [];
    const p = currentBoard[r][c];
    if (!p) return moves;
    
    const color = p[0];
    const type = p[1];
    const dir = color === 'w' ? -1 : 1;

    if (type === 'P') {
      const nextR = r + dir;
      if (nextR >= 0 && nextR < 8 && !currentBoard[nextR][c]) {
        moves.push({ r: nextR, c });
        const startRow = color === 'w' ? 6 : 1;
        const doubleR = r + dir * 2;
        if (r === startRow && !currentBoard[doubleR][c]) {
          moves.push({ r: doubleR, c });
        }
      }
      [-1, 1].forEach((dc) => {
        const nc = c + dc;
        const nr = r + dir;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const target = currentBoard[nr][nc];
          if (target && target[0] !== color) {
            moves.push({ r: nr, c: nc });
          }
        }
      });
    } else if (type === 'N') {
      const knights = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ];
      knights.forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const target = currentBoard[nr][nc];
          if (!target || target[0] !== color) moves.push({ r: nr, c: nc });
        }
      });
    } else {
      const steps = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1],
      ];
      steps.forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const target = currentBoard[nr][nc];
          if (!target || target[0] !== color) moves.push({ r: nr, c: nc });
        }
      });
    }
    return moves;
  };

  const handleSquareClick = async (r: number, c: number) => {
    if (gameMode === 'ai' && turn === 'b') return;
    if (gameMode === 'online' && turn !== playerRole) {
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

    if (piece && piece.startsWith(turn)) {
      setSelectedSquare({ r, c });
      setValidMoves(getBasicMoves(r, c, board));
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const executeMove = async (fromR: number, fromC: number, toR: number, toC: number) => {
    const newBoard = board.map((row) => [...row]);
    const captured = newBoard[toR][toC];

    newBoard[toR][toC] = newBoard[fromR][fromC];
    newBoard[fromR][fromC] = '';

    const nextTurn = turn === 'w' ? 'b' : 'w';

    if (gameMode === 'ai') {
      setBoard(newBoard);
      setTurn(nextTurn);
      if (captured === 'bK') {
        endGame(true, 'Bạn đã hạ gục Vua Đen và chiến thắng!');
      } else if (captured === 'wK') {
        endGame(false, 'Vua Trắng của bạn đã bị tiêu diệt!');
      }
    } else if (gameMode === 'online') {
      try {
        const roomRef = doc(db, "chessRooms", roomCode);
        await updateDoc(roomRef, {
          board: JSON.stringify(newBoard),
          turn: nextTurn
        });

        if (captured === 'bK' || captured === 'wK') {
          const isWin = (captured === 'bK' && playerRole === 'w') || (captured === 'wK' && playerRole === 'b');
          endGame(isWin, isWin ? "Bạn đã chiến thắng ván cược!" : "Bạn đã thua cuộc!");
        }
      } catch (err) {
        console.error("Lỗi cập nhật nước đi online:", err);
      }
    }
  };

  // AI đánh trả
  useEffect(() => {
    if (gameMode === 'ai' && turn === 'b' && !modal.open) {
      const timer = setTimeout(() => {
        const allAiMoves: { fromR: number; fromC: number; toR: number; toC: number }[] = [];
        
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            if (board[r][c].startsWith('b')) {
              const mvs = getBasicMoves(r, c, board);
              mvs.forEach((m) => allAiMoves.push({ fromR: r, fromC: c, toR: m.r, toC: m.c }));
            }
          }
        }

        if (allAiMoves.length > 0) {
          const attackMove = allAiMoves.find((m) => board[m.toR][m.toC] !== '');
          const chosen = attackMove || allAiMoves[Math.floor(Math.random() * allAiMoves.length)];
          
          const newBoard = board.map((row) => [...row]);
          const captured = newBoard[chosen.toR][chosen.toC];
          newBoard[chosen.toR][chosen.toC] = newBoard[chosen.fromR][chosen.fromC];
          newBoard[chosen.fromR][chosen.fromC] = '';
          
          setBoard(newBoard);
          setTurn('w');

          if (captured === 'wK') {
            endGame(false, 'Vua Trắng của bạn đã bị tiêu diệt!');
          }
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [turn, gameMode, board, modal.open]);

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
        <h1 className="text-2xl font-black text-amber-500 tracking-wider uppercase">
          ♚ Cờ Vua Quyết Liệt ♛
        </h1>
      </header>

      {/* MENU CHÍNH */}
      {screen === 'menu' && (
        <div className="w-full max-w-sm flex flex-col gap-4">
          <div className="bg-neutral-800 p-4 rounded-xl border border-neutral-700 text-center">
            <label className="text-sm font-semibold text-gray-300">Chọn mức cược ván đấu:</label>
            <div className="grid grid-cols-5 gap-2 mt-3">
              {BET_OPTIONS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleSelectBet(amt)}
                  className={`py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                    currentBet === amt
                      ? 'border-amber-500 bg-amber-500/20 text-amber-400'
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
              onClick={startVsAI}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 font-bold rounded-lg shadow hover:opacity-90 active:scale-95 transition cursor-pointer"
            >
              🤖 Đấu Với AI (Thông Minh)
            </button>
            <button
              onClick={() => setScreen('online')}
              className="w-full py-3 bg-neutral-700 border border-neutral-600 font-bold rounded-lg hover:bg-neutral-600 active:scale-95 transition cursor-pointer"
            >
              🌐 Phòng Online Realtime
            </button>
          </div>
        </div>
      )}

      {/* MÀN HÌNH ONLINE */}
      {screen === 'online' && (
        <div className="w-full max-w-sm bg-neutral-800 p-5 rounded-xl border border-neutral-700 flex flex-col gap-4">
          <h3 className="text-center font-bold text-lg text-amber-400">Phòng Realtime</h3>
          <button
            onClick={handleCreateRoom}
            className="w-full py-3 bg-amber-500 text-neutral-950 font-bold rounded-lg hover:bg-amber-400 transition cursor-pointer"
          >
            Tạo Phòng Mới (Cược {currentBet})
          </button>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="NHẬP MÃ PHÒNG"
              maxLength={6}
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="w-full p-3 bg-neutral-900 border border-neutral-700 rounded-lg text-center tracking-widest font-mono text-white focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleJoinRoom}
              className="px-5 bg-neutral-700 font-bold rounded-lg hover:bg-neutral-600 transition cursor-pointer"
            >
              Vào
            </button>
          </div>
          <button
            onClick={() => setScreen('menu')}
            className="w-full py-2 bg-neutral-900 border border-neutral-700 text-sm text-gray-400 rounded-lg hover:text-white transition cursor-pointer"
          >
            Quay Lại
          </button>
        </div>
      )}

      {/* BÀN CỜ GAME */}
      {screen === 'game' && (
        <div className="flex flex-col items-center w-full max-w-md">
          <div className="w-full flex justify-between items-center bg-neutral-800 px-4 py-2 rounded-t-lg text-sm border-b border-neutral-700">
            <span className="font-semibold text-amber-400">
              Lượt: {turn === 'w' ? 'Trắng' : 'Đen'} {gameMode === 'online' && turn === playerRole ? '(Đến lượt bạn!)' : ''}
            </span>
            <span className="text-xs text-gray-400">
              {gameMode === 'ai' ? `Đấu AI` : `Phòng #${roomCode} (${playerRole === 'w' ? 'Quân Trắng' : 'Quân Đen'})`}
            </span>
          </div>

          <div className="grid grid-cols-8 grid-rows-8 w-full aspect-square border-4 border-neutral-800 shadow-2xl">
            {board.map((row, r) =>
              row.map((piece, c) => {
                const isLight = (r + c) % 2 === 0;
                const isSelected = selectedSquare?.r === r && selectedSquare?.c === c;
                const isValidMove = validMoves.some((m) => m.r === r && m.c === c);

                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleSquareClick(r, c)}
                    className={`relative flex items-center justify-center text-3xl sm:text-4xl cursor-pointer transition-all ${
                      isLight ? 'bg-[#f0d9b5] text-black' : 'bg-[#b58863] text-black'
                    } ${isSelected ? 'ring-4 ring-yellow-400 inset-0 z-10' : ''}`}
                  >
                    {piece ? PIECES[piece] : ''}
                    {isValidMove && (
                      <div className="absolute w-4 h-4 bg-green-500/60 rounded-full z-20 pointer-events-none" />
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
            className="w-full mt-4 py-3 bg-red-600/80 hover:bg-red-600 font-bold rounded-lg transition cursor-pointer"
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
              className="w-full py-2 bg-amber-500 font-bold text-neutral-950 rounded-lg hover:bg-amber-400 transition cursor-pointer"
            >
              Về Menu Chính
            </button>
          </div>
        </div>
      )}
    </div>
  );
}