"use client";

import "./globals.css";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface ChatMessage {
  id: number;
  user_email: string;
  message: string;
  created_at?: any;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("Chiến Binh");
  
  // Chat States & Draggable Position
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Tọa độ kéo thả khung chat nổi
  const [chatPosition, setChatPosition] = useState({ x: 20, y: 100 });
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Kiểm tra user hiện tại & lấy tên hiển thị
  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", session.user.id)
          .single();
        if (profile?.full_name) {
          setDisplayName(profile.full_name);
        } else if (session.user.user_metadata?.username) {
          setDisplayName(session.user.user_metadata.username);
        }
      }
    }
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user?.user_metadata?.username) {
        setDisplayName(session.user.user_metadata.username);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Lắng nghe Chat Realtime toàn cục tối ưu tốc độ (Chỉ 1 luồng duy nhất)
  useEffect(() => {
    if (!user) return;

    async function fetchInitialChat() {
      const { data, error } = await supabase
        .from("global_chat")
        .select("*")
        .order("id", { ascending: true })
        .limit(50);
      
      if (!error && data) {
        setMessages(data);
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    }
    fetchInitialChat();

    const channel = supabase
      .channel("global_chat_layout_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "global_chat" },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Xử lý kéo thả khung chat trên màn hình
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - chatPosition.x,
      y: e.clientY - chatPosition.y,
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      isDraggingRef.current = true;
      dragOffsetRef.current = {
        x: e.touches[0].clientX - chatPosition.x,
        y: e.touches[0].clientY - chatPosition.y,
      };
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      setChatPosition({
        x: Math.max(5, Math.min(window.innerWidth - 320, e.clientX - dragOffsetRef.current.x)),
        y: Math.max(5, Math.min(window.innerHeight - 400, e.clientY - dragOffsetRef.current.y)),
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length === 0) return;
      setChatPosition({
        x: Math.max(5, Math.min(window.innerWidth - 320, e.touches[0].clientX - dragOffsetRef.current.x)),
        y: Math.max(5, Math.min(window.innerHeight - 400, e.touches[0].clientY - dragOffsetRef.current.y)),
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, []);

  // Gửi tin nhắn siêu tốc
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    const textToSend = newMessage.trim();
    setNewMessage("");

    const userIdentifier = displayName || user.email || "Chiến Binh";

    try {
      const { error } = await supabase.from("global_chat").insert([
        {
          user_email: userIdentifier,
          message: textToSend,
        },
      ]);
      if (error) throw error;
    } catch (err: any) {
      console.error("Lỗi chat:", err.message);
      alert("Không thể gửi tin nhắn: " + err.message);
    }
  };

  return (
    <html lang="vi">
      <body className="antialiased bg-slate-950 text-white relative min-h-screen">
        {children}

        {/* KHUNG CHAT NỔI TOÀN CỤC */}
        {user && (
          <div className="fixed z-50 select-none" style={{ left: `${chatPosition.x}px`, top: `${chatPosition.y}px` }}>
            {!chatOpen ? (
              <button
                onClick={() => setChatOpen(true)}
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black p-3.5 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center gap-2 cursor-pointer active:scale-95 border-2 border-amber-300 hover:scale-110 transition"
                title="Mở Chat Vũ Trụ"
              >
                <span className="text-xl">💬</span>
                <span className="text-xs tracking-wider hidden sm:inline">CHAT VŨ TRỤ</span>
              </button>
            ) : (
              <div className="bg-slate-900/95 border-2 border-amber-500/70 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] w-[300px] sm:w-[350px] h-[380px] sm:h-[420px] flex flex-col overflow-hidden backdrop-blur-xl">
                
                {/* THANH TIÊU ĐỀ KÉO THẢ */}
                <div
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  className="bg-slate-800/95 border-b border-amber-500/30 p-2.5 flex justify-between items-center cursor-move select-none"
                  title="Nhấn và kéo để di chuyển khung chat"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">✥</span>
                    <span className="font-black text-xs text-amber-400 tracking-wider uppercase">
                      CHAT VŨ TRỤ (NỔI)
                    </span>
                  </div>
                  <button
                    onClick={() => setChatOpen(false)}
                    className="text-slate-400 hover:text-white font-bold text-xs px-2 py-0.5 rounded cursor-pointer"
                  >
                    ✖
                  </button>
                </div>

                {/* DANH SÁCH TIN NHẮN */}
                <div className="flex-1 p-2.5 overflow-y-auto space-y-2 text-xs">
                  {messages.length === 0 ? (
                    <div className="text-center text-slate-500 py-12 text-[11px]">
                      Chưa có tin nhắn. Hãy phát tín hiệu Ki đầu tiên!
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.user_email === displayName || msg.user_email === user?.email;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          <span className="text-[9px] text-amber-400/80 mb-0.5 px-1 font-bold">
                            {msg.user_email}
                          </span>
                          <div
                            className={`max-w-[85%] px-2.5 py-1.5 rounded-xl text-[11px] break-words font-medium shadow-sm ${
                              isMe
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold rounded-tr-none"
                                : "bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none"
                            }`}
                          >
                            {msg.message}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Ô NHẬP TIN NHẮN */}
                <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-800 bg-slate-950 flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Nhập thông điệp vũ trụ..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 text-[11px] text-white px-2.5 py-2 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] px-3 py-2 rounded-xl cursor-pointer active:scale-95 shadow"
                  >
                    Gửi
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </body>
    </html>
  );
}