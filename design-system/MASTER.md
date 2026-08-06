# DakRoSa UI Design System

> Nguồn chuẩn duy nhất cho UI mới của DakRoSa. Không tạo quy tắc riêng theo từng trang; khi cần thiết kế hoặc chỉnh sửa, áp dụng tài liệu này cùng hướng dẫn UI UX Pro Max.

## Mục tiêu

- Phong cách: **Enterprise Tech & SaaS** tối giản, đáng tin cậy, ưu tiên thao tác vận hành.
- Đối tượng: người dùng doanh nghiệp làm việc lâu trên màn hình desktop 1024px trở lên; tối ưu ở 1920×1080 và 2560×1440.
- Ưu tiên: thông tin rõ ràng, mật độ hợp lý, trạng thái dễ nhận biết, không làm thay đổi bố cục khi người dùng thao tác.
- Giữ phông chữ hiện có của ứng dụng (`Nunito Sans`) để nhất quán; không tải phông chữ mới riêng cho từng trang.

## Nền tảng trực quan

| Vai trò | Token đề xuất | Sử dụng |
| --- | --- | --- |
| Nền workspace | `slate-50` | Bề mặt bao quanh, vùng canvas |
| Surface | `white` | Card, panel, bảng dữ liệu |
| Border | `slate-200` | Phân vùng, bảng, input |
| Chữ chính | `slate-900` | Tiêu đề và nội dung quan trọng |
| Chữ phụ | `slate-500` | Hướng dẫn, metadata |
| Hành động chính | `blue-700` / `blue-600` | Lưu, tạo, công bố |
| Thành công | `emerald-700` / `emerald-50` | Hoàn tất, hợp lệ |
| Cảnh báo | `amber-700` / `amber-50` | Nháp, cần chú ý |
| Nguy hiểm | `red-700` / `red-50` | Xóa, lỗi |

Không dùng gradient, màu neon, bóng đổ lớn hoặc hiệu ứng trang trí trong khu vực vận hành. Dùng `shadow-sm` rất nhẹ cho surface nổi; phân cấp chính dựa vào nền, đường viền và khoảng trắng.

## Bố cục desktop

- Thanh công cụ luôn nêu được: đối tượng đang làm việc, trạng thái, hành động chính.
- Workspace có panel tách rõ bằng `border`, không dùng nhiều card lồng nhau.
- 1536px trở lên: ba vùng (danh sách / vùng làm việc / cấu hình).
- 1280–1535px: giảm panel danh sách xuống khoảng 240px, vùng canvas được ưu tiên.
- 1024–1279px: giữ danh sách và canvas; cấu hình chuyển sang drawer/dialog bên phải thay vì bóp hẹp canvas.
- Dùng header hoặc footer `sticky` cho thao tác lưu khi bảng/canvas có thể cuộn. Dành sẵn chiều cao cho chip, nút và validation để tránh layout jump.

## Thành phần

### Nút và trạng thái

- Một hành động chính duy nhất trong mỗi cụm; dùng xanh dương đậm.
- Hành động phụ là outline hoặc ghost. Hành động phá hủy luôn outline/đỏ và có xác nhận.
- Nháp dùng badge amber; công bố/hợp lệ dùng emerald; lỗi dùng red. Mỗi badge đi kèm chữ, không chỉ dựa vào màu.
- Hiển thị disabled rõ ràng và giữ kích thước nút ổn định lúc đang lưu.

### Bảng dữ liệu và Ma trận

- Header và cột định danh được sticky khi cuộn ngang/dọc.
- Ô có nhiều lựa chọn sử dụng chip kích thước cố định; chỉ hiển thị `+N` khi thực sự hết chỗ, không để dropdown thay đổi chiều cao ô.
- Hàng được chọn có nền xanh dương rất nhạt, không thay đổi kích thước/độ đậm gây nhảy layout.

### Biểu mẫu và panel cấu hình

- Chia field theo nhóm có nhãn rõ: Cơ bản, Giao việc, Thời gian xử lý, Biểu mẫu, Hành động.
- Dùng disclosure/collapse cho nhóm phụ, không ẩn trường quan trọng đang có dữ liệu.
- Label nằm trên control; có helper text ngắn cho khái niệm nghiệp vụ.

## Khả năng sử dụng và chuyển động

- Văn bản thường đạt tương phản tối thiểu 4.5:1; luôn có focus ring nhìn thấy được.
- Tất cả icon dùng Lucide và cần `aria-label` khi không có nhãn chữ.
- Transition chỉ dùng `opacity`, `background-color`, `border-color`, tối đa 150–200ms. Không scale/translate làm thay đổi bố cục.
- Tôn trọng `prefers-reduced-motion`; không dùng animation bắt buộc để truyền tải trạng thái.
- Giữ vùng thao tác tối thiểu 32px, tooltip/chú thích cho icon chỉ có biểu tượng.

## Danh sách kiểm trước khi bàn giao

- [ ] Không thay đổi API, dữ liệu hoặc quyền nghiệp vụ chỉ để đổi UI.
- [ ] Không có layout shift khi chọn chip, mở menu hoặc chuyển trạng thái lưu.
- [ ] Canvas/bảng dữ liệu không bị che bởi thanh thao tác sticky.
- [ ] Kiểm tra ở 1024px, 1280px, 1920px và 2560px.
- [ ] Có trạng thái loading, empty, error và focus keyboard cho luồng chính.
