"use client";

import { useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, onAuthStateChanged, User } from "firebase/auth";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-amber-400 font-bold">
        ĐANG KIỂM TRA ĐĂNG NHẬP...
      </div>
    );
  }

  // Chưa đăng nhập -> Hiện popup yêu cầu đăng nhập
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="bg-slate-900 border border-amber-500/30 p-8 rounded-2xl max-w-sm w-full flex flex-col gap-6 shadow-xl">
          <div className="text-5xl">🔒</div>
          <h1 className="text-2xl font-black text-amber-400">YÊU CẦU ĐĂNG NHẬP</h1>
          <p className="text-sm text-slate-400">
            Ní cần phải đăng nhập bằng tài khoản Google để trải nghiệm các trò chơi và bảo toàn điểm cược!
          </p>
          <button
            onClick={() => signInWithPopup(auth, googleProvider)}
            className="w-full py-3 bg-amber-400 text-slate-950 font-bold rounded-xl hover:bg-amber-300 transition cursor-pointer"
          >
            Đăng Nhập Ngay 🚀
          </button>
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300">
            ← Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  // Đã đăng nhập -> Cho phép chơi game
  return <>{children}</>;
}