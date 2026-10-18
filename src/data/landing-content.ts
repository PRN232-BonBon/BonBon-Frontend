export const locations = [
  { name: "TP. Hồ Chí Minh", count: "600+ xe", image: "/assets/locations/ho-chi-minh.jpg" },
  { name: "Hà Nội", count: "300+ xe", image: "/assets/locations/ha-noi.jpg" },
  { name: "Đà Nẵng", count: "180+ xe", image: "/assets/locations/da-nang.jpg" },
  { name: "Bình Dương", count: "120+ xe", image: "/assets/locations/binh-duong.jpg" },
  { name: "Đà Lạt", count: "90+ xe", image: "/assets/locations/da-lat.jpg" },
  { name: "Hạ Long", count: "70+ xe", image: "/assets/locations/ha-long.jpg" },
] as const;

export const advantages = [
  {
    title: "Xe được kiểm duyệt",
    description: "Thông tin xe được chủ xe cung cấp và gửi duyệt trước khi xuất hiện trên BonBon.",
    image: "/assets/advantages/verified-car.webp",
  },
  {
    title: "An tâm đặt xe",
    description: "Lịch xe và chi phí được hiển thị rõ ràng, giúp bạn chủ động xác nhận và an tâm trước mỗi chuyến đi.",
    image: "/assets/advantages/transparent-booking.webp",
  },
  {
    title: "Thủ tục đơn giản",
    description: "Chỉ cần ảnh chụp giấy phép lái xe còn hiệu lực để hoàn tất xác minh và bắt đầu thuê xe trên BonBon.",
    image: "/assets/advantages/simple-paperwork.webp",
  },
  {
    title: "Thanh toán thuận tiện",
    description: "Thanh toán nhanh qua tài khoản ATM hoặc ví điện tử.",
    image: "/assets/advantages/easy-payment.webp",
  },
  {
    title: "Đa dạng dòng xe",
    description: "Hơn 50 dòng xe cho bạn tùy ý lựa chọn, phù hợp với mọi nhu cầu và hành trình.",
    image: "/assets/advantages/vehicle-choice.webp",
  },
] as const;

export const rentalSteps = [
  {
    title: "Đặt xe trên web BonBon",
    image: "/assets/how-it-works/search-book.webp",
  },
  {
    title: "Nhận xe",
    image: "/assets/how-it-works/receive-car.webp",
  },
  {
    title: "Bắt đầu hành trình",
    image: "/assets/how-it-works/start-trip.webp",
  },
  {
    title: "Trả xe và kết thúc chuyến đi",
    image: "/assets/how-it-works/return-car.webp",
  },
] as const;
