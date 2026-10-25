import { ArrowLeft, Camera, CarProfile, CheckCircle, ClipboardText } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";

const ownerSteps = [
  { icon: ClipboardText, label: "Điền thông tin xe" },
  { icon: Camera, label: "Đăng tải hình ảnh xe" },
  { icon: CheckCircle, label: "BonBon kiểm tra và duyệt xe" },
  { icon: CarProfile, label: "Bắt đầu cho thuê" },
];

export function OwnerLandingPage() {
  const reduceMotion = useReducedMotion();

  return (
    <main className="owner-page owner-intro-page">
      <div className="owner-container">
        <div className="owner-page-heading">
          <a href="/" aria-label="Quay lại trang chủ"><ArrowLeft size={21} weight="bold" /> Quay lại</a>
          <h1>Đăng ký xe</h1>
        </div>

        <motion.section
          className="owner-intro"
          initial={reduceMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .55, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.img
            src="/assets/owner/empty-register-car.webp"
            alt="Đăng ký xe tự lái trên BonBon"
            initial={reduceMotion ? false : { opacity: 0, scale: .96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: .65, delay: .08, ease: [0.16, 1, 0.3, 1] }}
          />
          <a className="owner-primary-button" href="/owner/register">Đăng ký xe tự lái</a>
          <h2>Gia tăng thu nhập hàng tháng cùng BonBon!</h2>

          <div className="owner-process-card">
            <strong>Thủ tục đăng ký đơn giản và nhanh chóng:</strong>
            <ol>
              {ownerSteps.map(({ icon: Icon, label }, index) => (
                <motion.li
                  key={label}
                  initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: .35, delay: reduceMotion ? 0 : .2 + index * .07 }}
                >
                  <span><Icon size={17} weight="duotone" /></span>{label}
                </motion.li>
              ))}
            </ol>
          </div>
          <p className="owner-policy-note"><CheckCircle size={18} weight="fill" /> BonBon chỉ hiển thị xe sau khi thông tin được kiểm tra.</p>
        </motion.section>
      </div>
    </main>
  );
}
