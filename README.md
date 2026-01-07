# Nami Nail - Hệ thống quản lý và đặt lịch online cho salon nail

Ứng dụng full-stack được xây dựng với Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma ORM, và PostgreSQL.

## Tính năng

- ✅ **Authentication**: Đăng ký/đăng nhập cho chủ salon (owner) và thợ nail (staff) với NextAuth.js
- ✅ **Quản lý salon**: Owner tạo salon, thêm dịch vụ, thêm thợ nail
- ✅ **Đặt lịch online**: Khách đặt lịch qua trang public `/booking/[salon-slug]` (không cần đăng nhập)
- ✅ **Quản lý lịch hẹn**: Owner/staff xem, xác nhận, hủy, chỉnh sửa lịch hẹn qua dashboard
- ✅ **Responsive design**: Giao diện đẹp, mobile-friendly với tông màu pastel hồng-trắng-vàng nhạt

## Công nghệ sử dụng

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Form handling**: React Hook Form
- **Validation**: Zod

## Cài đặt

### 1. Clone repository và cài đặt dependencies

```bash
npm install
```

### 2. Thiết lập database

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Cập nhật `DATABASE_URL` trong file `.env` với thông tin database PostgreSQL của bạn:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/nami_nail?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-change-this-in-production"
```

**Lưu ý**: Thay đổi `NEXTAUTH_SECRET` thành một chuỗi ngẫu nhiên bảo mật trong production.

### 3. Chạy Prisma migrations

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push
```

Hoặc nếu muốn sử dụng migrations:

```bash
npm run db:migrate
```

### 4. Chạy ứng dụng

```bash
npm run dev
```

Ứng dụng sẽ chạy tại [http://localhost:3000](http://localhost:3000)

## Cấu trúc database

### Models

- **User**: Người dùng (OWNER/STAFF)
- **Salon**: Salon nail
- **Service**: Dịch vụ của salon
- **Staff**: Thợ nail
- **Appointment**: Lịch hẹn

## Hướng dẫn sử dụng

### 1. Đăng ký tài khoản

- Truy cập `/auth/register`
- Chọn vai trò: OWNER (chủ salon) hoặc STAFF (thợ nail)
- Điền thông tin và đăng ký

### 2. Tạo salon (chỉ OWNER)

- Đăng nhập với tài khoản OWNER
- Vào Dashboard → Tạo salon mới
- Điền thông tin salon (tên, slug, địa chỉ, số điện thoại)
- Slug sẽ là URL để khách đặt lịch: `/booking/[slug]`

### 3. Thêm dịch vụ và thợ nail

- Vào trang chi tiết salon
- Thêm dịch vụ (tên, giá, thời gian)
- Thêm thợ nail (tên, số điện thoại)

### 4. Đặt lịch (khách hàng)

- Truy cập `/booking/[salon-slug]`
- Điền thông tin và chọn dịch vụ, thợ, ngày giờ
- Hệ thống sẽ kiểm tra thời gian khả dụng tự động

### 5. Quản lý lịch hẹn

- Vào Dashboard → Chọn salon → Xem lịch hẹn
- Xác nhận, hủy, hoặc đánh dấu hoàn thành lịch hẹn

## Scripts

- `npm run dev`: Chạy development server
- `npm run build`: Build production
- `npm run start`: Chạy production server
- `npm run db:push`: Push Prisma schema to database
- `npm run db:studio`: Mở Prisma Studio để xem/chỉnh sửa database
- `npm run db:generate`: Generate Prisma Client
- `npm run db:migrate`: Tạo migration mới

## Lưu ý

- Đảm bảo PostgreSQL đang chạy trước khi start ứng dụng
- Trong production, cần cấu hình `NEXTAUTH_SECRET` và `NEXTAUTH_URL` đúng
- Database sẽ tự động tạo các bảng khi chạy `db:push` hoặc `db:migrate`

## License

MIT

