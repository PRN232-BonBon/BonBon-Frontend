# BonBon Frontend

Landing page cho nền tảng thuê xe BonBon thuộc dự án PRN232.

## Công nghệ

- React 19, TypeScript và Vite
- Tailwind CSS 4
- Motion for React
- Manrope Variable và Phosphor Icons

## Chạy dự án

```bash
npm install
npm run dev
```

Mặc định Vite chuyển tiếp mọi request `/api` tới backend đang chạy tại
`http://localhost:5188`. Có thể đổi API hoặc bật Google Sign-In bằng cách sao
chép `.env.example` thành `.env.local` và cập nhật:

```env
VITE_API_URL=/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

Các popup tài khoản đang dùng trực tiếp các endpoint `/api/auth/register`,
`/api/auth/login`, `/api/auth/google-login`, `/api/auth/refresh` và
`/api/auth/logout`.

Build production:

```bash
npm run build
```
