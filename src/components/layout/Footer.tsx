import { FacebookLogo, TiktokLogo } from "@phosphor-icons/react";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <img src="/assets/brand/bonbon-logo-cropped.png" alt="BonBon" />
          <p>Kết nối khách thuê với chủ xe để mỗi hành trình tự lái trở nên chủ động hơn.</p>
          <div className="social-links" aria-label="Mạng xã hội">
            <a href="#top" aria-label="Facebook BonBon"><FacebookLogo size={22} /></a>
            <a href="#top" aria-label="TikTok BonBon"><TiktokLogo size={22} /></a>
          </div>
        </div>

        <div>
          <h3>Khám phá</h3>
          <a href="#top">Thuê xe</a>
          <a href="#dia-diem">Địa điểm</a>
          <a href="#huong-dan">Hướng dẫn thuê xe</a>
        </div>
        <div>
          <h3>Dành cho chủ xe</h3>
          <a href="#dich-vu">Đăng xe trên BonBon</a>
          <a href="#uu-diem">Quy trình vận hành</a>
        </div>
        <div>
          <h3>Hỗ trợ</h3>
          <a href="#huong-dan">Câu hỏi thường gặp</a>
          <a href="#top">Điều khoản sử dụng</a>
          <a href="#top">Chính sách bảo mật</a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 BonBon. Dự án PRN232.</span>
        <span>Thuê xe tự lái, chủ động mọi hành trình.</span>
      </div>
    </footer>
  );
}
