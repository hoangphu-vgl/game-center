"use client";

import { useEffect, useRef } from "react";

export default function GamePhaser() {
  // Biến này để trỏ tới cái <div> chứa game
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: any;

    // Load Phaser động để không bị lỗi Server-Side Rendering của Next.js
    import("phaser").then((Phaser) => {
      
      // 1. CẤU HÌNH GAME
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 800, // Chiều ngang khung game
        height: 500, // Chiều dọc khung game
        parent: gameRef.current, // Gắn game vào thẻ div
        transparent: true, // Xóa nền đen để thấy nền web Next.js phía sau
        scene: {
          preload: preload,
          create: create,
          update: update,
        },
      };

      game = new Phaser.Game(config);

      // 2. TẢI TÀI NGUYÊN (Hình ảnh, âm thanh)
      function preload(this: Phaser.Scene) {
        // Ní thay đường dẫn này bằng hình thật trong thư mục public/assets/ của ní
        // this.load.image("cardBack", "/assets/card-back.png");
      }

      // 3. VẼ RA MÀN HÌNH & TẠO HIỆU ỨNG
      function create(this: Phaser.Scene) {
        // Ví dụ: In chữ test với hiệu ứng màu mè thay vì Emoji
        const text = this.add.text(400, 250, '🔥 KHUNG GAME PHASER 60FPS 🔥', {
          fontSize: '32px',
          color: '#facc15',
          fontStyle: 'bold'
        }).setOrigin(0.5); // Căn giữa

        // Nếu ní có hình thì xài dòng này:
        // const card = this.add.image(400, 250, "cardBack");
        
        // Thêm hiệu ứng bay lên bay xuống (Animation)
        this.tweens.add({
          targets: text, // thay text bằng card nếu dùng hình
          y: 220,
          duration: 1000,
          yoyo: true, // Bay lên xong tự rớt xuống
          repeat: -1, // Lặp lại vĩnh viễn
          ease: 'Sine.easeInOut'
        });
      }

      // 4. VÒNG LẶP GAME (Chạy 60 lần/giây để xử lý logic nhanh)
      function update(this: Phaser.Scene) {
        // Chỗ này thường để xử lý nhân vật di chuyển
      }
    });

    // Dọn dẹp bộ nhớ: Khi người dùng chuyển trang, phải tắt game đi
    return () => {
      if (game) {
        game.destroy(true);
      }
    };
  }, []);

  return (
    <div className="flex justify-center w-full my-4">
      {/* Khung chứa game, có thể thêm border, shadow bằng Tailwind */}
      <div 
        ref={gameRef} 
        className="rounded-3xl overflow-hidden border-4 border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.4)]"
      />
    </div>
  );
}