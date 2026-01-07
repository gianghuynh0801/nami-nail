# Hướng dẫn Seed Dữ liệu Test cho Chức năng Chia ca

## Cài đặt

Nếu chưa có `tsx`, bạn có thể cài đặt:
```bash
npm install -D tsx
```

Hoặc sử dụng `npx tsx` (đã được cấu hình trong script).

## Chạy Seed

```bnpm run db:seed:shift
```

## Dữ liệu sẽ được tạo

### 1. User & Salon
- **Owner**: 
  - Email: `owner@salon.com`
  - Password: `123456`
- **Salon**: Nami Nail Salon
  - Slug: `nami-nail-salon`
  - Giờ làm việc: Thứ 2 - Chủ nhật (9:00 - 18:00)

### 2. Staff (4 nhân viên)
- Nguyễn Thị Lan (0901111111)
- Trần Văn Hùng (0902222222)
- Lê Thị Mai (0903333333)
- Phạm Văn Đức (0904444444)

Mỗi nhân viên có:
- Lịch làm việc: Thứ 2 - Thứ 6 (9:00 - 18:00, nghỉ trưa 12:00 - 13:00)
- Thứ tự ưu tiên: 1, 2, 3, 4
- Có thể làm tất cả các dịch vụ

### 3. Services (5 dịch vụ)
- Cắt móng tay (50,000đ - 30 phút)
- Sơn móng tay (100,000đ - 45 phút)
- Vẽ móng nghệ thuật (200,000đ - 60 phút)
- Chăm sóc móng tay (150,000đ - 90 phút)
- Đắp móng gel (300,000đ - 120 phút)

### 4. Customers (5 khách hàng)
- Nguyễn Văn A (0911111111)
- Trần Thị B (0922222222)
- Lê Văn C (0933333333)
- Phạm Thị D (0944444444)
- Hoàng Văn E (0955555555)

### 5. Appointments

#### Hôm nay:
- **2 PENDING** (chưa xác nhận): 14:00, 15:00
- **2 CONFIRMED** (đã xác nhận, chưa đến giờ): 16:00, 17:00
- **1 IN_PROGRESS** (đang làm): 10:00 (đã bắt đầu 30 phút trước)
- **3 COMPLETED** (đã hoàn thành): 9:00, 10:00, 11:00 (có hóa đơn)

#### Ngày mai:
- **3 CONFIRMED**: 10:00, 12:00, 14:00

### 6. Invoices
- 3 hóa đơn đã thanh toán cho các appointment đã hoàn thành

## Sử dụng

1. Chạy seed:
   ```bash
   npm run db:seed:shift
   ```

2. Đăng nhập với tài khoản owner:
   - Email: `owner@salon.com`
   - Password: `123456`

3. Truy cập trang chia ca:
   - Vào `/dashboard/shift-management`
   - Chọn salon "Nami Nail Salon"

4. Test các tính năng:
   - Xem danh sách nhân viên với thứ tự ưu tiên
   - Xem hàng đợi lịch hẹn (PENDING)
   - Xem lịch hẹn đang làm (IN_PROGRESS)
   - Xem thống kê (số khách, doanh thu, giờ làm)
   - Thay đổi thứ tự ưu tiên
   - Gán lịch hẹn cho nhân viên
   - Bắt đầu/hoàn thành dịch vụ

## Lưu ý

- Script sử dụng `upsert` và `findFirst` để tránh tạo dữ liệu trùng lặp
- Có thể chạy lại script nhiều lần mà không bị lỗi
- Dữ liệu được tạo dựa trên thời gian hiện tại (hôm nay và ngày mai)

