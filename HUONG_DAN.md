# HƯỚNG DẪN CÀI APP QUẢN LÝ CĂN HỘ VÀO GOOGLE SHEET

Bộ cài gồm 2 file: **Code.gs** (phần chạy trên Google) và **Index.html** (giao diện app).
Dữ liệu nằm trong một Google Sheet của bạn → ai được bạn chia sẻ quyền chỉnh sửa Sheet thì mở được app và sửa.

---

## Bước 1 – Tạo Google Sheet
1. Vào https://sheets.google.com → tạo **Bảng tính trống**.
2. Đặt tên, ví dụ: `QUẢN LÝ CĂN HỘ`.

## Bước 2 – Dán code
1. Trong Sheet: menu **Tiện ích mở rộng → Apps Script**.
2. Ở file `Code.gs` có sẵn: xóa hết, dán toàn bộ nội dung file **Code.gs**.
3. Bấm dấu **+** cạnh “Tệp” → **HTML** → đặt tên đúng là `Index` (không gõ .html).
   Xóa nội dung mẫu, dán toàn bộ nội dung file **Index.html**.
4. Bấm biểu tượng 💾 **Lưu**.

## Bước 3 – Triển khai thành Web App
1. Góc trên bên phải: **Triển khai → Tùy chọn triển khai mới**.
2. Bấm bánh răng ⚙ cạnh “Chọn loại” → **Ứng dụng web**.
3. Điền:
   - **Thực thi với tư cách**: `Người dùng truy cập ứng dụng web` (User accessing the web app)
   - **Ai có quyền truy cập**: `Bất kỳ ai có Tài khoản Google` (Anyone with a Google account)
4. Bấm **Triển khai** → **Cấp quyền truy cập** → chọn tài khoản Google của bạn.
   - Nếu hiện “Google chưa xác minh ứng dụng này”: bấm **Nâng cao → Đi tới … (không an toàn)** → **Cho phép**. (Đây là script của chính bạn nên an toàn.)
5. Sao chép **URL ứng dụng web** (dạng `https://script.google.com/macros/s/…/exec`). Đây là link app.

> Mở link → nhập **tên nhà** → bấm **“Tạo với dữ liệu mẫu (bảng Excel)”** để có ngay 18 phòng như file Excel, hoặc “Tạo bảng trống”.
> Trong Sheet sẽ tự xuất hiện các trang: `<Tên nhà> - Phòng 2026-10`, `<Tên nhà> - Chi phí 2026-10`, `<Tên nhà> - Thu 2026-10`, `TỔNG HỢP`.

## Bước 4 – Cấp quyền cho người khác
1. Trong Google Sheet bấm **Chia sẻ** (góc trên phải).
2. Nhập Gmail của người cần cấp → chọn **Người chỉnh sửa** → Gửi.
3. Gửi cho họ **link app** (URL ở bước 3). Lần đầu mở, họ cũng bấm “Cho phép” giống bước 3.4.

- Người **không** được chia sẻ Sheet sẽ không mở được dữ liệu.
- Muốn thu hồi quyền: vào Chia sẻ → xóa người đó.
- App tự lưu sau ~1,5 giây khi bạn gõ. Nếu 2 người sửa cùng lúc, app sẽ báo và cho chọn “Tải bản mới nhất” hoặc “Ghi đè”. App cũng tự tải dữ liệu mới mỗi khi bạn quay lại app.

## Bước 5 – Thêm app ra màn hình điện thoại
Đăng nhập Gmail trên điện thoại trước, rồi mở link app:

**Android (Chrome)**: mở link → menu **⋮** → **Thêm vào màn hình chính** → Thêm.

**iPhone (Safari)**: mở link bằng **Safari** → nút **Chia sẻ** (ô vuông mũi tên lên) → **Thêm vào MH chính** → Thêm.

Biểu tượng mở ra đúng link app nên **mọi dữ liệu vẫn liên kết với Google Sheet** – sửa trên điện thoại thì máy tính và người khác đều thấy.

---

## Khi sửa code sau này
Sau khi sửa Code.gs / Index.html: **Triển khai → Quản lý các lượt triển khai → ✏ (Chỉnh sửa) → Phiên bản: Phiên bản mới → Triển khai**. Link app giữ nguyên.

## Cách dùng nhanh
| Việc | Làm thế nào |
|---|---|
| Thêm nhà | Nút **+ Nhà** trên cùng → nhập tên, tháng bắt đầu, chọn chép cấu trúc từ nhà đang xem / mặc định / dữ liệu mẫu |
| Chuyển nhà | Ô chọn **🏢 tên nhà** trên cùng |
| Xóa nhà | Nút **🗑 Nhà** → gõ đúng tên nhà để xác nhận (xóa mọi tháng của nhà đó, không hoàn tác) |
| Phiếu thu từng phòng | Tab **🧾 Phiếu thu** (hoặc nút 🧾 cuối mỗi dòng phòng). Số liệu tự lấy từ bảng Phòng: tiền phòng, số điện mới/cũ, tiền điện, nước, dịch vụ, chi phí thêm, tổng, số tiền bằng chữ |
| Gửi phiếu cho khách | **📋 Sao chép gửi Zalo** rồi dán vào Zalo, hoặc **🖨 In / Lưu PDF** (chọn “Lưu dưới dạng PDF”), **In tất cả** để in phiếu cả nhà |
| Số tài khoản ngân hàng | Nhập ở cuối tab Phiếu thu (mỗi nhà một tài khoản). Có thể bật mã QR VietQR: khách quét là điền sẵn số tiền + nội dung |
| Xem lãi tất cả các nhà | Tab **Lợi nhuận** → bảng “Tất cả các nhà” (khi có từ 2 nhà) |
| Sửa số | Bấm vào ô và gõ. Ô xám đậm = tự tính bằng công thức |
| Sửa riêng 1 ô công thức | Gõ đè số vào ô (ô thành màu vàng). Xóa trống ô để quay lại công thức |
| Đổi công thức cả cột | Bấm vào **tiêu đề cột** → sửa công thức → Áp dụng |
| Điền cả cột 1 giá trị (vd phí dịch vụ 200,000) | Bấm tiêu đề cột hoặc nút **⚡ Sửa hàng loạt** |
| Đổi giá điện / nước / xe | Tab **Cài đặt → Đơn giá** (cả tháng tự tính lại) |
| Thêm / xóa / đổi thứ tự cột | **+ Thêm cột** hoặc tab **Cài đặt → Các cột** |
| Thêm / xóa phòng | **+ Thêm phòng** / nút ✕ cuối dòng |
| Sang tháng mới | **+ Tháng mới**: tự chép phòng, giá, ĐIỆN CŨ = ĐIỆN MỚI tháng trước, chép chi phí cố định |
| Chi phí lấy từ bảng phòng (như TRẢ SALE) | Tab Chi phí → **🔗 Dòng lấy từ bảng phòng** |

Công thức mặc định:
- KW TIÊU THỤ = `MAX(DIEN_MOI - DIEN_CU, 0)` (không bị âm khi chưa nhập điện mới)
- TIỀN ĐIỆN = `KW_TIEU_THU * DON_GIA_DIEN` (4,000)
- TIỀN NƯỚC = `SO_NGUOI * DON_GIA_NUOC` (100,000)
- TIỀN XE = `SO_XE_THEM * DON_GIA_XE` (150,000)
- TỔNG THU = `GIA_THUE + TIEN_DIEN + TIEN_NUOC + TIEN_XE + PHI_DICH_VU + PHI_THEM`
