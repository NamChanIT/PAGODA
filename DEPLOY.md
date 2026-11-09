# Triển khai Render

Ứng dụng cần **Web Service Node**, chạy chung web và API; không chọn Static Site.

## Cấu hình đã chuẩn bị

`render.yaml` dùng vùng Singapore, Node 22, build bằng `npm ci --include=dev && npm run build`, chạy `npm start`, health check `/api/health` và `HOST=0.0.0.0`. Render cấp `PORT` tự động. Không cần database cho phòng khách hiện tại.

Gói free dùng để thử nghiệm. Kiểm tra giới hạn và giá trong tài khoản Render trước khi tạo dịch vụ. Không coi gói free hoặc giới hạn 240 phiên trong code là cam kết chịu tải.

## Đưa lên tài khoản

1. Đăng nhập Render và kết nối tài khoản GitHub của bạn.
2. Đưa thư mục dự án này lên repository GitHub riêng; không tải `node_modules`, `dist` hoặc `.env`.
3. Trong Render tạo Blueprint từ repository chứa `render.yaml`, kiểm tra gói dịch vụ rồi triển khai.
4. Khi Render báo Live, mở URL HTTPS được cấp. Kiểm tra `/api/health` trả `{"ok":true}`.
5. Mở URL `https://<ten-dich-vu>.onrender.com/?room=an-yen` trên hai thiết bị khác mạng; kiểm tra thấy nhau, giữ đệm, chuông và hương.

Chỉ chạy một instance: trạng thái phòng nằm trong RAM. Restart/redeploy làm mất phiên; trình duyệt sẽ thử vào lại. Chưa triển khai nhiều instance hoặc autoscale khi chưa có kho trạng thái chung.

Mỗi phòng tối đa 24 người. Với gần 50 người, chia ít nhất ba phòng bằng các link `?room=an-yen-1`, `?room=an-yen-2`, `?room=an-yen-3`. Chưa kiểm thử tải 50 người.

Trước khi mở rộng ngoài nhóm thử nghiệm, bổ sung chống spam đăng nhập phòng, kiểm tra Origin và kiểm thử tải. Mã phòng không phải mật khẩu: ai có mã đều có thể vào.
