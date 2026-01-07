# Hướng dẫn Quản lý Chia ca Realtime

## Tính năng đã triển khai

### 1. Database Schema
- ✅ Thêm status `IN_PROGRESS` vào AppointmentStatus
- ✅ Thêm model `StaffPriority` để quản lý thứ tự ưu tiên
- ✅ Thêm model `ShiftHistory` để lưu lịch sử thay đổi
- ✅ Thêm `startedAt` và `completedAt` vào Appointment

### 2. API Routes
- ✅ `/api/shift/priority` - Quản lý thứ tự ưu tiên nhân viên
- ✅ `/api/shift/assign` - Gán lịch hẹn cho nhân viên
- ✅ `/api/shift/start` - Bắt đầu dịch vụ (quản lý bấm)
- ✅ `/api/shift/complete` - Hoàn thành dịch vụ (quản lý bấm)
- ✅ `/api/shift/status` - Lấy trạng thái realtime (tự động start khi đến giờ)

### 3. WebSocket Server
- ✅ Custom server.js với socket.io
- ✅ Realtime updates cho appointment changes
- ✅ Realtime updates cho priority changes
- ✅ Realtime updates cho assignment changes

### 4. UI Components
- ✅ Trang `/dashboard/shift-management` với Kanban board
- ✅ Component `StaffCard` hiển thị trạng thái nhân viên
- ✅ Component `QueueList` hiển thị hàng đợi lịch hẹn
- ✅ Thống kê realtime (số khách, doanh thu, giờ làm)
- ✅ Notification system cho lịch hẹn mới
- ✅ Fullscreen mode cho TV display

## Cách sử dụng

### 1. Chạy Database Migration
```bash
npm run db:generate
npm run db:push
```

### 2. Chạy Server
```bash
npm run dev
```

Lưu ý: Server sẽ chạy trên port 3000 với cả Next.js và Socket.io

### 3. Truy cập
- Vào `/dashboard/shift-management`
- Chọn salon
- Quản lý chia ca realtime

## Tính năng chính

### Sắp xếp nhân viên
- Tự động sắp xếp theo thứ tự ưu tiên (do quản lý set)
- Nếu cùng ưu tiên, sắp xếp theo doanh số (cao/thấp)
- Có thể tăng/giảm ưu tiên bằng nút mũi tên

### Gán lịch hẹn
- Lịch hẹn mới sẽ xuất hiện trong hàng đợi
- Quản lý chọn nhân viên từ dropdown để gán
- Tự động kiểm tra trùng lịch

### Bắt đầu/Hoàn thành
- Khi đến giờ, lịch hẹn tự động chuyển sang "Đang làm"
- Quản lý có thể bấm "Bắt đầu" sớm nếu khách đến sớm
- Quản lý bấm "Hoàn thành" khi xong dịch vụ

### Realtime Updates
- WebSocket cập nhật realtime khi có thay đổi
- Tự động refresh mỗi 5 giây
- Hiển thị trạng thái kết nối

### Thống kê
- Số khách đã phục vụ hôm nay
- Doanh thu từ đầu tháng
- Thời gian làm việc (tính từ startedAt đến completedAt)

## Lưu ý

1. **Custom Server**: Ứng dụng sử dụng custom server.js để chạy cả Next.js và Socket.io
2. **Port**: Mặc định chạy trên port 3000
3. **Environment**: Có thể set `NEXT_PUBLIC_SOCKET_URL` trong .env nếu cần
4. **Production**: Cần setup WebSocket server riêng hoặc sử dụng service như Pusher/Supabase Realtime

