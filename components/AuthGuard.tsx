"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Kiểm tra session hiện tại khi load trang (tự động nhận token từ URL nếu mới redirect từ Google)
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Lỗi xác thực AuthGuard:", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // 2. Lắng nghe sự thay đổi trạng thái Auth (Đăng nhập / Đăng xuất / OAuth Callback)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-amber-400 font-black tracking-widest animate-pulse">
        ⚡ ĐANG XÁC THỰC VŨ TRỤ SAIYAN...
      </div>
    );
  }

  return <>{children}</>;
}