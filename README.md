# Chùa An Yên

Không gian chính điện 3D có nhân vật chibi và phòng nhiều người chơi. React, TypeScript, Three.js; máy chủ Node.js dùng HTTP/SSE. Hình ảnh được dựng bằng code.

## Chạy local

Node.js 20.19+ hoặc 22.12+:

```bash
npm install
npm run dev:all
```

Mở địa chỉ Vite in trong terminal. Mặc định http://127.0.0.1:5173, có thể là 5174 nếu cổng đang dùng. Lệnh trên chạy cả giao diện lẫn máy chủ phòng; Ctrl+C dừng cả hai. Không chạy thêm máy chủ khác trên cổng 3001.

Có thể chạy riêng `npm run server` và `npm run dev` trong hai terminal. Khi máy chủ chưa bật, giao diện dùng chế độ cá nhân và tự thử kết nối lại.

## Chơi cùng Wi-Fi

```bash
npm run build
npm run play:lan
```

Máy chủ mở cổng **4173**, phục vụ cả web và API phòng. Terminal in địa chỉ IP của máy, ví dụ `http://192.168.1.10:4173/?room=an-yen`. Mọi người, kể cả người chạy máy chủ, mở **cùng địa chỉ và mã phòng** trên điện thoại/laptop cùng Wi-Fi. Không dùng link localhost/Vite 5173 hoặc 5174 để tham gia phòng LAN này vì đó là máy chủ riêng.

- Giữ máy chủ thức, nối mạng và giữ tiến trình chạy. Ctrl+C dừng phòng.
- Nếu macOS hỏi quyền nhận kết nối đến cho Node.js, cho phép để thiết bị khác vào được.
- Nếu trang không mở, kiểm tra cùng Wi-Fi, tường lửa, VPN và chế độ cách ly thiết bị của Wi-Fi khách. Không cần mở cổng router ra Internet.
- Địa chỉ IP có thể thay đổi khi đổi mạng. Lấy lại liên kết được in khi khởi động.
- Trên HTTP nội bộ, nút chia sẻ có thể mở cài đặt thay vì sao chép tự động: chạm ô **Liên kết phòng hiện tại**, rồi sao chép thủ công.
- Sau khi sửa code, chạy lại `npm run build`; máy chủ đọc bản trong `dist/`, không dùng hot reload.
- Giới hạn hiện tại là 24 người/phòng. Đây là giới hạn phần mềm, chưa phải kết quả kiểm thử tải trên 24 thiết bị.

Có thể đổi cổng bằng `PORT=4180 npm run play:lan`. `npm start` chạy web/API trên loopback cổng 3001 mặc định; dùng `HOST` và `PORT` khi cần cấu hình riêng.

## Không gian

Chính điện có ba tượng Phật tọa thiền (tượng giữa lớn hơn), rộng hơn bản đầu 40% theo chiều ngang và 35% theo chiều sâu; các đệm được giãn ra để có lối đi rộng. Kiến trúc có cột gỗ trên chân đá, mái dốc và xà, hoành phi tiếng Việt, hai bảng chữ, đèn treo, bàn lễ với hoa/quả/nến. Qua cửa nhìn ra sân gạch, đèn đá, hồ sen, cây, nhà mái ngói và cổng. Nút **Ra sân** đưa khách đến sân bằng vị trí do máy chủ xác nhận, trả đệm đang giữ và quay camera ra vườn. Khách cũng có thể đi qua cửa chính ra sân gạch, dạo hai bên chùa, đến hồ sen, chòi an tịnh và cổng tam quan. Có cây hoa hồng nhạt, tán cây phân lớp, hàng cây bụi, đồi xa, sân lát đá có dải dẫn đường, tiểu cảnh đá, hồ sen với gợn nước và chòi nghỉ có ghế gỗ/đèn treo; thanh đầu trang hiển thị khu vực hiện tại. Dùng WASD/phím mũi tên hoặc cụm nút trên điện thoại; kéo để xoay camera. Tường bên chính điện, hồ sen và bồn hoa có va chạm dùng chung trên trình duyệt và máy chủ. Muốn chọn đệm, quay lại chính điện qua cửa chính trước.

## Điều khiển

- WASD / phím mũi tên: đi theo hướng camera. Điện thoại có cụm nút cảm ứng.
- Kéo trên cảnh để xoay camera, cuộn để thu/phóng. Nút camera đưa về góc ban đầu.
- Chọn đệm trong cảnh hoặc mở bảng **Chọn đệm** có đánh số để giữ chỗ và tự đi đến ngồi. Bảng hỗ trợ Tab/Enter và thể hiện chỗ đã có người giữ. Đệm màu nâu đang có người giữ, màu vàng là chỗ của bạn.
- Đi bằng tay hoặc đứng dậy để trả đệm. Khi rời phòng hoặc phiên hết hạn, máy chủ tự trả chỗ.
- Thỉnh chuông bằng nút hoặc bát chuông trong cảnh: người cùng phòng nhận thông báo; ai bật âm nền sẽ nghe chuông. Chuông có thời gian chờ 4 giây chung cho cả phòng. Trình duyệt cần thao tác người dùng để bật âm thanh.
- Thắp/tắt hương bằng nút hoặc lư hương trong cảnh: khói chuyển động và trạng thái đồng bộ cả phòng, kể cả người vào sau.
- Thanh dưới: lạy, ngồi thiền, tràng hạt và đứng dậy. Tràng hạt có chuỗi hạt 3D.
- Thời thiền 1/3/5 phút có tạm dừng/tiếp tục. Chỉ thời thiền hoàn thành mới lưu vào lịch sử trên thiết bị (tối đa 100 thời). Đồng hồ dùng thời gian thực; trình duyệt có thể phát chuông trễ nếu tab bị tạm ngưng.
- Thanh trên: danh sách người, âm nền, camera, sao chép liên kết phòng, toàn màn hình và cài đặt.
- Cài đặt: tên, mã phòng và chất lượng hình ảnh; chế độ nhẹ tắt bóng đổ và giảm độ phân giải.

## Thử nhiều người

Mở hai cửa sổ (có thể dùng ẩn danh), vào cùng mã phòng qua ⚙ hoặc liên kết `?room=an-yen`. Mỗi tab là một người. Người mới xuất hiện ở các vị trí tách nhau, không chồng ngay tại cửa. Tối đa 24 người/phòng; tối đa 240 phiên/máy chủ. Khi nhiều người chọn một đệm, máy chủ chỉ chấp nhận người đầu tiên. Hai phòng có thể dùng cùng số đệm.

Liên kết localhost chỉ dùng được trên chính máy đang chạy. Chia sẻ qua Internet cần triển khai máy chủ và giao diện lên cùng một địa chỉ truy cập được.

## Kiểm tra

```bash
npm run build
npm run test:server
```

Kiểm tra máy chủ bao gồm SSE, phân phòng, dữ liệu không hợp lệ, giới hạn tốc độ di chuyển, hạn mức yêu cầu, tranh chấp đệm, trả đệm, phiên không hợp lệ, sức chứa 24 người, vị trí xuất hiện tách nhau và chuông/hương theo phòng. Cần quyền mở cổng localhost.

Kiểm tra giao diện không cần cài thêm thư viện, dùng Chrome với hồ sơ tạm:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --remote-debugging-port=9223 --user-data-dir=/tmp/chua-review-chrome --no-first-run --no-default-browser-check --enable-unsafe-swiftshader --use-angle=swiftshader about:blank
```

Sau đó, trong terminal khác khi app và máy chủ đang chạy:

```bash
TEST_URL=http://127.0.0.1:5174 node scripts/browser-smoke.mjs
```

Script tạo phòng test riêng, kiểm tra lễ nghi, hộp thoại, thiền, hai trình duyệt chọn/nhả đệm và đi đến ngồi, chuông/hương đồng bộ, layout mobile và tự vào lại sau khi phiên hết hạn. Ảnh kiểm tra lưu tại `/tmp/chua-desktop.png` và `/tmp/chua-mobile.png`. Đóng tiến trình Chrome test khi xong; hồ sơ trình duyệt cá nhân không được sử dụng.

## Cấu trúc

- `src/main.tsx`: giao diện, phòng và cài đặt.
- `src/world/layout.json`: kích thước kiến trúc, vị trí đệm, điểm vào phòng và giới hạn dùng chung cho máy chủ/trình duyệt.
- `src/world/World.tsx`: điều khiển, camera, áp dụng hiệu chỉnh vị trí từ máy chủ.
- `src/world/Altar.tsx`: bát chuông, lư hương và khói chuyển động.
- `src/world/Hall.tsx`: chính điện, ánh sáng và đệm tương tác.
- `src/world/TempleDecor.tsx`: kiến trúc gỗ, bảng chữ và đồ lễ.
- `src/world/TempleGarden.tsx`: sân gạch có thể đi dạo, cây cao, bồn hoa, hồ sen, đèn đá, chòi nghỉ, biển chỉ dẫn và cổng.
- `src/world/GardenScenery.tsx`: cây hoa, cụm lá/hoa dùng instancing, hồ sen, gợn nước, ghế gỗ, tiểu cảnh đá, hàng cây và bầu trời chuyển sắc.
- `src/world/navigation.mjs`: di chuyển và va chạm dùng chung giữa trình duyệt và máy chủ.
- `src/world/Character.tsx`: nhân vật, chuỗi hạt, animation, nội suy chuyển động.
- `src/world/network.ts`: phiên ẩn danh, SSE, tự vào lại, hàng đợi giữ/trả đệm.
- `src/world/BuddhaStatue.tsx`: tượng tọa thiền, nếp áo, đài sen và hào quang.
- `src/world/assets.tsx`: âm thanh tổng hợp.
- `src/hooks/useMeditation.ts`: đồng hồ thiền và lịch sử local.
- `server/index.mjs`: web/API chung một cổng, phòng, kiểm tra di chuyển và giữ chỗ.
- `server/static.mjs`: chỉ phục vụ file từ `dist/`, không mở thư mục mã nguồn.
- `scripts/lan.mjs`: khởi động chế độ cùng Wi-Fi và hiển thị địa chỉ tham gia.

## Phạm vi và bước tiếp theo

Đây là bản thử nghiệm local/LAN, chưa phải dịch vụ công khai. Chưa có tài khoản, database, chat, thanh toán, giọng nói hoặc model/texture chuyên nghiệp như ảnh tham chiếu. Người chơi đi xuyên nhau; va chạm hiện giới hạn khuôn viên, tường chính điện, hồ sen và bồn hoa, chưa có physics đầy đủ cho cây, cột và đồ trang trí. Giữ đệm chưa có thời hạn riêng: sẽ được trả khi đứng dậy, rời phòng hoặc phiên hết hạn sau 20 giây không gửi dữ liệu.

Máy chủ giới hạn di chuyển bằng ngân sách theo thời gian và gửi trạng thái tối đa 10 lần/giây/phòng. Người chơi áp dụng độ lệch máy chủ trả về, giữ chuyển động đầu vào trong thời gian chờ. Đây chưa phải hệ thống chống gian lận hoàn chỉnh. Kết nối chập chờn có thể khiến nhân vật được hiệu chỉnh về vị trí máy chủ hoặc vào lại tại cửa.

Để triển khai công khai: phục vụ `dist/`, chạy Node sau HTTPS reverse proxy, định tuyến `/api` và tắt buffering cho SSE; bổ sung xác thực, chống spam theo IP, kiểm tra Origin, lưu dữ liệu, giám sát và kiểm thử tải. Proxy Vite chỉ dùng trong dev; `npm run preview` không cung cấp API phòng. Nhiều máy chủ cần kho trạng thái phòng dùng chung.
