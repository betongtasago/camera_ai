# CamerAI - Hệ thống Giám sát Camera IP & Nhận diện Biển số Xe AI

Hệ thống giám sát Camera IP thông minh cho bãi cân, trạm trộn bê tông và cổng an ninh doanh nghiệp. Trang bị AI tự động phát hiện phương tiện di chuyển từ xa lại gần camera, zoom phóng to vùng biển số (ANPR/LPR), và tự động đối soát theo danh sách xe do tài khoản Admin cung cấp (Biển số, Tên tài xế, Loại xe).

---

## Tính Năng Nổi Bật

1. **Giám sát Camera IP Thời Gian Thực & AI Bãi Cân**:
   - Khung hình mô phỏng chân thực bãi cân / trạm trộn bê tông (xe bồn Howo Bê Tông Xanh Sài Gòn, khu sửa chữa `CAN - KHU SUA CHUA`, timestamp thời gian thực).
   - Hỗ trợ kết nối luồng RTSP / MJPEG camera IP trực tiếp, hoặc sử dụng Webcam máy tính/điện thoại.
   - **AI phát hiện xe từ xa lại gần**: Bounding box xanh neon bám theo xe, đo khoảng cách (~25m đến 8m) và ước tính tốc độ.
   - **Tự động Zoom vùng biển số**: Ô chữ nhật màu đỏ góc trên bên trái màn hình (`BIEN SO ZOOM`) phóng to biển số rõ nét như trên ảnh thực tế.

2. **Quản lý Danh Mục Xe Đăng Ký (Fleet Registry - Quyền Admin)**:
   - Thêm xe mới vào hệ thống: **Biển số xe**, **Tên tài xế**, **Loại xe**, **Đơn vị / Đội xe**, **Số điện thoại**, **Trạng thái cấp phép** (Hợp lệ / Tạm giữ / Danh sách đen).
   - Chỉnh sửa, xóa và tìm kiếm nhanh theo từ khóa.
   - Xuất dữ liệu danh mục xe ra file Excel/CSV.

3. **Thông Báo Tức Thì Qua Telegram Bot (Kênh / Nhóm Quản Lý)**:
   - Tự động gửi tin nhắn báo cáo qua Telegram ngay khi camera AI phát hiện xe đi qua:
     - Biển số xe nhận dạng (kèm độ chính xác OCR %)
     - Tên tài xế, loại xe, đơn vị phụ trách
     - Vị trí camera (`CAN - KHU SUA CHUA`) & thời gian thực
     - Trạng thái: **ĐÃ ĐĂNG KÝ** hoặc **NGOÀI DANH MỤC**
   - Hỗ trợ nút gửi lại báo cáo Telegram bằng tay trong nhật ký và màn hình trực tiếp.
   - Hướng dẫn cấu hình Bot Token & Chat ID trực quan ngay trong ứng dụng.

4. **Đăng Nhập / Đăng Xuất Bảo Mật Phân Quyền**:
   - Sử dụng JWT stateless mã hóa trong `httpOnly` cookie an toàn.
   - Phân quyền rõ ràng:
     - **Admin** (`admin@camerai.vn`): Toàn quyền thêm, sửa, xóa danh mục xe, cài đặt camera IP, cấu hình Telegram và Supabase.
     - **Operator** (`operator@camerai.vn`): Giám sát trực tiếp xe qua camera, xem nhật ký, gửi thông báo Telegram.

5. **Bảo Mật Cấu Hình Camera & Tích Hợp Supabase**:
   - Mật khẩu và tài khoản RTSP camera IP được lưu trữ và bảo mật độc lập ở nơi khác (ví dụ: Supabase PostgreSQL với Row Level Security).
   - Giao diện trực quan để kiểm tra kết nối Supabase Cloud.

6. **Tối Ưu Hoàn Hảo Cho Mobile & PC**:
   - Giao diện đáp ứng (responsive) độc lập, không ép hiển thị giao diện PC trên màn hình điện thoại.
   - Trên điện thoại: Tích hợp thanh điều hướng Bottom Navigation Bar với các phím bấm lớn, thẻ hiển thị gọn gàng, hỗ trợ cảm ứng mượt mà.

---

## Hướng Dẫn Cấu Hình & Deploy Qua Vercel

### 1. Triển Khai Nhanh Lên Vercel (1-Click Deploy)
1. Push mã nguồn lên GitHub/GitLab repository của bạn.
2. Đăng nhập vào [Vercel Dashboard](https://vercel.com) và chọn **Add New Project**.
3. Import repository dự án.
4. Cấu hình biến môi trường trong mục **Environment Variables** (xem bên dưới).
5. Nhấn **Deploy**. Vercel sẽ tự động build với Next.js 16 và cấp tên miền `https://ten-du-an.vercel.app`.

### 2. Các Biến Môi Trường Cần Thiết (.env)
Sao chép `.env.example` thành `.env.local`:
```bash
# Khóa bảo mật ký session đăng nhập (bắt buộc)
JWT_SECRET=camerai_super_secret_jwt_key_32_characters_minimum!

# API Key Google Gemini (tùy chọn - dùng cho tính năng AI Vision phân tích ảnh thực tế)
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase (tùy chọn - lưu trữ đám mây bảo mật cấu hình camera & danh mục xe)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Telegram Bot (tùy chọn - gửi báo cáo xe qua Telegram)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_from_botfather
TELEGRAM_CHAT_ID=your_telegram_chat_or_group_id
```

### 3. Chạy Thử Nghiệm Ở Máy Cục Bộ (Local)
```bash
# Cài đặt thư viện
npm install

# Kiểm tra build sản phẩm
npm run build

# Khởi động dịch vụ
npm start
```
Truy cập: `http://localhost:3000`

---

## Tài Khoản Đăng Nhập Mẫu

| Tài khoản | Email | Mật khẩu | Quyền hạn |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@camerai.vn` | `Admin@123456` | Toàn quyền Thêm/Sửa/Xóa xe & Cài đặt hệ thống |
| **Giám sát viên (Operator)** | `operator@camerai.vn` | `Operator@123456` | Giám sát camera, kiểm tra xe, mở Barie |

*(Có sẵn 2 nút đăng nhập nhanh 1-click ngay trong hộp thoại Đăng nhập để kiểm tra tiện lợi).*
