"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-amber-400 font-black tracking-widest animate-pulse">
        🔮 ĐANG XÁC THỰC VÕ ĐẠO...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white px-4 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-amber-500/40 p-8 rounded-3xl shadow-2xl space-y-6">
          <div className="text-5xl animate-bounce">🐲</div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
            DRAGON GAMING ARENA
          </h1>
          <p className="text-slate-400 text-sm">
            Chiến binh cần phải đăng nhập tài khoản Google để bước vào thế giới Supabase Realtime!
          </p>
          <button
            onClick={handleLogin}
            className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black py-3 px-6 rounded-xl hover:brightness-110 transition shadow-lg active:scale-95 cursor-pointer"
          >
            Đăng Nhập Google Ngay 🚀
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}