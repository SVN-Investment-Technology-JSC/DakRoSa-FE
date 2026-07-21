# DakRoSa Frontend

Frontend Next.js App Router cho Core Portal ĐăkRơSa, thiết kế theo phong cách công nghiệp hiện đại và ưu tiên thao tác rõ ràng trên desktop lẫn màn hình nhỏ.

## Quy ước giao diện

- Tailwind CSS là lớp styling chính; font Inter được áp dụng toàn cục.
- shadcn/ui là nền tảng cho các primitive dùng chung như `Button`, `Input`, `Label`, `Card`, `Alert`, `Dialog`.
- Component nghiệp vụ được ghép từ primitive trong `src/components/ui`; không sao chép style riêng lẻ giữa các màn hình.
- Ant Design chỉ dùng theo nhu cầu cho component dữ liệu phức tạp như table, tree table hoặc advanced picker; ưu tiên import theo component để kiểm soát bundle.
- Các route công khai liên quan đăng nhập đặt trong `src/app/(auth)`; các route cần phiên đăng nhập đặt trong `src/app/(portal)`.

## Chức năng hiện có

- Login/logout và khôi phục phiên bằng refresh-cookie `HttpOnly`.
- Access token chỉ giữ trong bộ nhớ của tab, không lưu `localStorage`/`sessionStorage`.
- Dashboard nền tảng.
- Quản lý người dùng, trạng thái, vai trò và đặt lại mật khẩu.
- Vai trò động và ma trận permission.
- Nhật ký thao tác quản trị.
- Trang 403 giữ nguyên phiên đăng nhập, không tự logout khi thiếu quyền.

## Chạy development

```powershell
Copy-Item .env.development.example .env.development
pnpm install
pnpm dev
```

Mặc định frontend chạy tại `http://localhost:3000` và gọi API `http://localhost:8080/api/v1`.

## RBAC frontend

`src/lib/navigation.ts` là nguồn cấu hình duy nhất cho:

- Sidebar.
- Đường dẫn đầu tiên user được phép truy cập.
- Cây permission trong màn hình vai trò.
- Nhãn quyền thao tác.

Quy tắc ma trận:

- `*.view` là quyền nền tảng.
- Chọn một action sẽ tự chọn `view`.
- Bỏ `view` sẽ xóa toàn bộ action cùng phân hệ.
- Payload gửi backend chỉ gồm permission key lá.
- Frontend chỉ ẩn/hiện UI; backend vẫn là nơi quyết định quyền cuối cùng.

## Build và kiểm tra

```powershell
pnpm lint
pnpm test
pnpm build
npx -y react-doctor@latest . --verbose --scope changed
```

Production build dùng Next.js standalone output và nhận `NEXT_PUBLIC_API_URL=/api/v1` để gọi API cùng origin qua Nginx.

## Thêm phân hệ mới

1. Thêm permission tương ứng ở backend và migration/seed catalog.
2. Thêm một mục vào `navigationConfig`.
3. Tạo route App Router.
4. Bảo vệ mọi API bằng permission backend; không dựa riêng vào guard giao diện.
5. Bổ sung test cho quy tắc permission nếu phân hệ có action mới.
