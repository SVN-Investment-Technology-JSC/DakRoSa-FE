# Hướng dẫn sử dụng WorkflowEngine Enterprise Admin

> Tài liệu này được cập nhật liên tục theo tiến độ triển khai (xem `plan.md` để biết chi tiết kỹ thuật). Phần nào **chưa nối vào backend thật** sẽ được ghi chú rõ — dữ liệu ở các phần đó chỉ tồn tại tạm trong bộ nhớ trình duyệt (mock data), thao tác xong tải lại trang sẽ mất.

## 1. Chuẩn bị môi trường (chạy lần đầu)

### 1.1. Khởi động cơ sở dữ liệu

```bash
cd workflowengine-enterprise-admin
docker compose up -d
```

Postgres sẽ chạy ở container `workflowengine-postgres`, cổng host **5433** (không phải 5432 mặc định — cổng này đã bị một project khác trên máy chiếm).

Lệnh trên khởi động **2 dịch vụ**:
- **Postgres** — cổng host **5433**
- **MinIO** (lưu file báo cáo đính kèm) — API cổng **9000**, giao diện web **http://localhost:9001** (đăng nhập `workflowengine` / `workflowengine`)

### 1.2. Khởi động Backend (NestJS API)

```bash
cd backend
npm install          # chỉ cần lần đầu
npm run migration:run  # áp toàn bộ migration nếu là lần đầu / vừa pull code mới
npm run seed          # tạo tài khoản demo + dữ liệu mẫu (an toàn chạy lại nhiều lần)
npm run start:dev
```

Backend chạy ở `http://localhost:3001`. Kiểm tra nhanh: `curl http://localhost:3001/health`.

### 1.3. Khởi động Frontend (React + Vite)

```bash
# từ thư mục gốc repo
npm install           # chỉ cần lần đầu
npx vite --port=5173 --host=0.0.0.0
```

> **Lưu ý cổng:** script `npm run dev` mặc định trong `package.json` dùng cổng 3000, nhưng cổng này trên máy dev hiện bị một project Next.js khác chiếm. Dùng lệnh `npx vite --port=5173` ở trên để tránh xung đột.

Mở trình duyệt tại `http://localhost:5173`.

## 2. Tài khoản đăng nhập demo

Các tài khoản demo bên dưới (được tạo bởi `npm run seed`) dùng chung mật khẩu **`Password123!`**, **trừ tài khoản admin nhanh** có mật khẩu riêng.

> ⚠️ Không thể tạo đúng cặp `admin`/`admin` như yêu cầu — backend bắt buộc **email hợp lệ** (`admin` không phải email) và **mật khẩu tối thiểu 6 ký tự** (`admin` chỉ có 5 ký tự) ở tầng validate của `POST /auth/login`. Tài khoản gần nhất, dễ nhớ nhất được tạo thay thế:

| Email | Mật khẩu | Họ tên | Vai trò RBAC | Ghi chú |
|---|---|---|---|---|
| `admin@company.vn` | `admin123` | Quản trị viên (Admin) | `admin` | **Tài khoản admin nhanh** — toàn quyền (workflow.design + task.approve + org.manage) |
| `vp.eng@company.vn` | `Password123!` | Nguyễn Văn Tuấn | `approver`, `workflow_designer` | Trưởng Khối Kỹ thuật — có quyền thiết kế workflow/RACI |
| `lead.dev@company.vn` | `Password123!` | Trần Văn Hoàng | `approver` | Trưởng Ban Phát triển Phần mềm |
| `staff.dev@company.vn` | `Password123!` | Lê Văn Nam | `approver` | Trưởng Ban Hạ tầng & Vận hành |
| `officer@company.vn` | `Password123!` | Phạm Thị Hà | `approver` | Nhân viên Tổ QA |
| `auditor@company.vn` | `Password123!` | Đỗ Minh Khang | `approver`, `admin` | Trưởng Tổ Hạ tầng Mạng — có toàn quyền |
| `truong.co.dien@company.vn` | `Password123!` | Ngô Thanh Sơn | `approver`, `workflow_designer` | **Trưởng Ban Cơ điện** — nhận thông báo bảo trì của cả nhánh Cơ điện |
| `truong.van.hanh@company.vn` | `Password123!` | Đặng Hải Yến | `approver` | **Trưởng Tổ Cơ khí** — có 2 nhân viên, dùng để thử phân rã `E(x)` |
| `ky.thuat1@company.vn` | `Password123!` | Vũ Thị Mai | `approver` | Nhân viên Tổ Cơ khí — người nhận công việc con |
| `ky.thuat2@company.vn` | `Password123!` | Hoàng Đức Anh | `approver` | Nhân viên Tổ Cơ khí — người nhận công việc con |
| `dien.nuoc@company.vn` | `Password123!` | Bùi Quốc Việt | `approver` | Nhân viên Tổ Điện & Nước — **tổ này cố tình không có trưởng** |

### Thử nhanh tính năng thông báo

Tổ chức được seed sẵn để mỗi phiếu bảo trì rơi vào một người khác nhau. Vào **Bảng Bảo trì & Cảnh báo** bấm **Quét ngay**, rồi đăng nhập lần lượt và xem chuông:

| Đăng nhập bằng | Sẽ thấy thông báo về |
|---|---|
| `truong.co.dien@company.vn` | Máy phát điện dự phòng **và** Bơm nước cứu hoả |
| `truong.van.hanh@company.vn` | Dàn lạnh AHU khu B |
| `staff.dev@company.vn` | Lọc bơm thủy lực |
| `auditor@company.vn` | Cụm trục chính máy CNC |
| `dien.nuoc@company.vn` | **Không có gì** — xem giải thích ngay dưới |

> 🔎 **Bơm nước cứu hoả thuộc Tổ Điện & Nước, nhưng anh Việt (nhân viên tổ đó) lại không nhận được thông báo** — vì tổ này chưa có Trưởng tổ, hệ thống **tự đẩy lên cấp trên gần nhất có trưởng** là Ban Cơ điện. Đây chính là cơ chế Escalation đang chạy thật, không phải lỗi.

## 3. Đăng nhập

1. Mở `http://localhost:5173` — nếu chưa đăng nhập, ứng dụng hiển thị màn hình **Sign in**.
2. Nhập email + mật khẩu (xem bảng tài khoản demo ở trên) rồi bấm **Sign in**.
3. Sau khi đăng nhập thành công, phiên làm việc được lưu ở trình duyệt (localStorage) — tải lại trang không cần đăng nhập lại cho đến khi access token hết hạn (15 phút) hoặc bấm **Sign out**.
4. Để đăng xuất: nhìn góc dưới bên trái thanh điều hướng, bấm biểu tượng **logout** cạnh tên người dùng.

*(Trạng thái: **đã nối backend thật** — `POST /auth/login` thật, JWT thật.)*

## 4. Các tính năng hiện có

### 4.1. Sơ đồ Tổ chức (Org Chart) — ✅ đã nối backend thật

Vào mục **Quản trị Admin → Sơ đồ Tổ chức** ở thanh điều hướng bên trái.

- **Xem cây tổ chức**: toàn bộ cây (Khối → Ban → Tổ) được tải trực tiếp từ API (`GET /org-units/tree`). Dữ liệu mẫu có sẵn: Khối Kỹ thuật → (Ban Phát triển Phần mềm, Ban Hạ tầng & Vận hành) → các Tổ trực thuộc.
- **Thêm Node gốc (Root Node)**: bấm nút **+ Root Node** góc trên phải, nhập tên và chọn Loại (Type) — tạo một đơn vị Cấp 1 (Level 1) mới, lưu thật vào database.
- **Thêm Node con**: di chuột vào một node bất kỳ, bấm biểu tượng **+** hiện ra — tạo đơn vị con trực thuộc node đó.
- **Thêm Loại Node mới (Node Type)**: bấm nút **+** cạnh "Node Types" ở panel trái, nhập tên (ví dụ "Tiểu ban") — tạo loại đơn vị mới dùng khi tạo node.
- **Xem Trưởng đơn vị (Head)**: mỗi node hiển thị người đứng đầu nếu đã được gán sẵn trong dữ liệu mẫu (ví dụ Khối Kỹ thuật → Nguyễn Văn Tuấn).

> ⚠️ **Chưa hỗ trợ trong bản này**: gán/đổi Trưởng đơn vị từ giao diện (cần thêm API danh sách người dùng — chưa xây dựng). Việc đổi tên node, kích hoạt/vô hiệu hoá node cũng chưa có nút thao tác trên giao diện (API `PATCH /org-units/:id` đã có sẵn ở backend, chỉ chưa nối UI).

### 4.2. Ma trận RACI (RCSI) — ✅ đã nối backend thật, giao diện "sổ ngang đa cấp" theo đúng BRD

Vào mục **Quản trị Admin → Ma trận RCSI (RACI)** ở thanh điều hướng bên trái. Giao diện này đã được **thiết kế lại lần thứ 3** để khớp đúng mô tả trong BRD (`docs/BRD - Dynamic Workflow Engine (Ma trận RCSI).pdf`), thay cho bản "chỉ cột Cấp 1 + tag" trước đó:

- **Cột sổ ngang 3 lớp: Đơn vị → Chức vụ → Cá nhân** (đúng mô hình BRD). Bấm vào tên cột (icon `+`) để sổ sâu thêm 1 lớp, bấm lại (icon `-`) để thu về:
  - Mở rộng một **Đơn vị** → cột đó được thay bằng: các **đơn vị con** + các **Chức vụ** có người trong chính đơn vị đó (VD "Trưởng đơn vị", "Nhân viên").
  - Mở rộng một **Chức vụ** → thay bằng từng **Cá nhân** đang giữ chức vụ đó.
  - Icon đầu mỗi cột cho biết đang ở lớp nào: 🏢 Đơn vị · 🎫 Chức vụ · 👤 Cá nhân.
- **2 bảng riêng biệt**: Bảng 1 "Tạo Quy Trình" (`kind=process`) và Bảng 2 "Luồng Thực Thi Bảo Trì" (`kind=maintenance_linked`/`maintenance_direct`).
- **Header gộp nhóm 2+ tầng**: khi sổ một đơn vị ra, tên đơn vị đó trở thành **tiêu đề nhóm nằm ngang bên trên**, bên dưới là các cột con (đơn vị con / chức vụ). Giống hệt kiểu merge ô của bảng tính.
- **Không bao giờ mất dữ liệu khi sổ ra**: mỗi khi một đơn vị (hoặc chức vụ) được sổ, hệ thống tự thêm cột **"(Cả đơn vị)"** / **"(Cả chức vụ)"** để giữ chỗ cho những vai trò đã gán ở chính cấp đó. Nếu không có cột này, vai trò gán cho cả đơn vị sẽ biến mất khỏi màn hình ngay khi bạn sổ đơn vị ra.
- **Dòng đầu mỗi quy trình là dòng tổng hợp** — gộp toàn bộ vai trò của tất cả các bước theo từng cột (VD `I, C[1]`), giúp nhìn nhanh bức tranh chung mà không cần mở từng bước.
- **Mỗi ô chỉ mang đúng 1 chữ cái vai trò.** Bấm vào ô sẽ mở bảng chọn chữ cái; chọn chữ mới là **thay thế** chữ cũ, kèm nút "Xóa vai trò khỏi ô này". Riêng chữ **C** sẽ hỏi thêm bước quay về trước khi lưu.
- **Chỉ ô gộp mới hiện nhiều chữ cái**: dòng tổng hợp của quy trình, và ô của cột đang thu gọn (gộp cả cấp dưới) — hai loại này hiển thị dạng `I, C[1]` nét đứt/nền nhạt để phân biệt với ô thường.
- **Ô trống hiển thị `-`**, vai trò **C** kèm badge tím `[số bước]` cho biết từ chối sẽ quay về bước nào.
- **Nút "Sổ tất cả" / "Thu gọn"** ở thanh công cụ để xem nhanh toàn bộ cây hoặc thu về cấp đơn vị gốc.
- **Cột thu gọn nhưng bên trong đã có cấu hình** sẽ hiện một badge xám nét đứt kiểu `R,C ⋯` — chỉ để báo hiệu "có cấu hình sâu hơn ở bên trong", **không sửa/xóa trực tiếp được**; muốn sửa thì sổ cột ra.
- **Gán vai trò ở bất kỳ lớp nào** — cột đang là gì thì gán thẳng vào đó:
  - Gán ở cột **Đơn vị** (đang thu gọn) → giao cho **Trưởng đơn vị** đó.
  - Gán ở cột **Chức vụ** → giao cho **tất cả những người** đang giữ chức vụ đó trong đơn vị (nếu có 2 người thì cả 2 đều phải xử lý — xem AND-logic ở mục 4.3).
  - Gán ở cột **Cá nhân** → giao **đích danh** người đó.
  - Popover thêm vai trò có ghi rõ đang gán ở lớp nào để tránh nhầm.
- Bấm nút **+** dưới các chip để thêm vai trò: chọn **chữ cái vai trò**; nếu là **C (Checker)** bắt buộc chọn thêm bước quay về cố định; nếu là **A (Approve)** không có lựa chọn quay về (người giữ A tự chọn lúc từ chối thật, xem mục 4.3).
- **Giới hạn cứng: mỗi bước chỉ được 1 chữ C** — chữ C sẽ bị **làm mờ không cho chọn** ngay trên giao diện nếu bước đó đã có C ở cột khác (và server cũng chặn lần nữa cho chắc).

> ℹ️ **Quản lý Chức vụ & Nhân sự**: danh mục chức vụ và danh sách nhân sự của từng đơn vị đã có API thật (`/positions`, `/org-units/:id/members`). Dữ liệu mẫu đã seed sẵn (Trưởng đơn vị / Nhân viên cho các đơn vị). Giao diện quản trị riêng để thêm/sửa nhân sự thì **chưa làm** — hiện chỉnh qua seed hoặc gọi API trực tiếp.
- **Thêm bước mới**, **thêm quy trình mới** — như trước, lưu thật vào database.

- **Liên kết "luồng con" (Luồng Thực thi)**: bước cuối của một quy trình có thể trỏ tới một quy trình khác. Khi đơn được duyệt xong bước cuối, hệ thống **tự động sinh ra Luồng Thực thi** tương ứng và gắn liên kết ngược về đơn gốc. Dữ liệu mẫu đã cấu hình sẵn: `WF-CAPEX` bước 4 → `WF-EXEC` (Luồng Thực thi & Nghiệm thu).

> ⚠️ **Chưa hỗ trợ trong bản này**: xóa/đổi tên quy trình, và **trực quan hóa React Flow** (vẽ sơ đồ luồng có mũi tên lùi/màu trạng thái) — chủ động hoãn lại theo quyết định phạm vi.

### 4.3. Workspace (danh sách đơn, duyệt/từ chối) — ✅ đã nối backend thật, đây là tính năng trọng tâm

Vào mục **Workspace** (mặc định khi đăng nhập). Đây là nơi thể hiện rõ nhất logic **khác biệt giữa Role A và Role C khi từ chối** — điểm cốt lõi của toàn bộ hệ thống:

- **Danh sách đơn**: lọc theo trạng thái (Tất cả / Active / Completed / Rejected), tìm theo tiêu đề hoặc mã đơn. Bấm vào 1 đơn để xem chi tiết.
- **Tạo đơn mới**: bấm **"Tạo Đơn / Yêu cầu Mới"**, chọn quy trình (từ Ma trận RACI đã cấu hình), chọn đơn vị Cấp 1 phụ trách, nhập tiêu đề/mô tả/mức ưu tiên/hạn hoàn thành — hệ thống tự sinh toàn bộ các bước và tự động phân công người phụ trách từng bước dựa trên Trưởng đơn vị đã gán ở Sơ đồ Tổ chức + tag RACI đã cấu hình ở Ma trận.
- **Xem tiến trình**: mỗi bước hiển thị trạng thái (Đang chờ / Đang xử lý / Hoàn tất / Bị từ chối) và người phụ trách.
- **Xử lý & Phê duyệt** (panel bên phải) — chỉ hiện nút khi bạn đang đăng nhập bằng tài khoản được phân công vai trò ở bước đang "Đang xử lý":
  - **Phê duyệt**: áp dụng cho bất kỳ vai trò nào bạn giữ ở bước đó (R/A/C/S/I/E).
  - **Từ chối — chỉ Role A hoặc Role C mới được từ chối** (các vai trò khác sẽ bị chặn):
    - **Nếu bạn giữ vai trò C (Checker)**: chỉ cần nhập lý do — hệ thống **tự động** quay đơn về đúng bước đã cấu hình sẵn (từ Ma trận RACI), không cho chọn bước khác.
    - **Nếu bạn giữ vai trò A (Approve)**: bắt buộc **tự chọn bước muốn quay về** từ danh sách các bước trước đó của chính lần chạy này (dropdown "Chọn bước quay về") — đây chính là điểm khác biệt cốt lõi so với Role C.
  - Nếu bạn giữ nhiều vai trò cùng lúc ở 1 bước, hệ thống sẽ yêu cầu chọn rõ bạn đang hành động với vai trò nào trước khi phê duyệt/từ chối.
- **Nhiều người cùng giữ R ở 1 bước (AND-logic)**: nếu một bước được gán vai trò R cho nhiều đơn vị khác nhau, bước đó **chỉ hoàn tất khi TẤT CẢ đều đã duyệt** — duyệt một mình sẽ không đủ, thanh tiến trình % cho biết còn thiếu ai.
- **Ghế trống tự động đẩy lên cấp trên (Escalation)**: nếu đơn vị được gán vai trò chưa có Trưởng bộ phận, hệ thống tự tìm cấp cha gần nhất có Trưởng để giao việc thay — panel hiện dòng cảnh báo màu vàng "⬆️ Xử lý thay thế" để biết mình đang xử lý hộ.
- **Giao việc cho cấp dưới (Delegation)**: nếu đang giữ vai trò R hoặc C ở bước hiện tại, có nút **"Giao việc cho cấp dưới"** — hiện **nhân sự trong chính đơn vị bạn** và trong mọi đơn vị con/cháu. Nhờ vậy việc giao xuống chạy **nhiều tầng**: Trưởng Khối giao cho Trưởng Ban, Trưởng Ban giao tiếp cho Trưởng Tổ, và Trưởng Tổ giao được cho nhân viên trong tổ mình (kể cả tổ không có đơn vị con nào). Sau khi giao, bạn **mất quyền xử lý bước đó**, người được giao sẽ thấy dòng "🔁 được giao bởi {tên bạn}".
- **Trạng thái "Rework" (làm lại)**: khi một bước Thực thi (vai trò **E**) bị người kiểm duyệt (**C**) từ chối, bước đó không quay về "Đang xử lý" bình thường mà chuyển sang **Rework** (viền cam, icon ↻) để biết rõ là *đang làm lại việc bị trả về*. Người giữ Node E vẫn xử lý tiếp được bình thường.
- **Chặn gán Node E sai cấp**: chữ **E** chỉ gán được cho **cấp Quản lý** (người có đơn vị con hoặc có nhân viên cấp dưới). Gán cho người không có cấp dưới sẽ bị báo lỗi ngay.
- **Chặn chạy quy trình sai cấu trúc**: nếu một bước có **E** mà bước liền sau **không có C**, bạn vẫn lưu được lúc thiết kế (để còn sắp xếp), nhưng **không tạo được đơn** từ quy trình đó cho tới khi sửa.

- **Phân rã công việc con `E(x)`** (khi bước hiện tại có vai trò **E**): người giữ Node E bấm **"Phân rã công việc"**, thêm từng dòng gồm *người thực hiện + nội dung + trọng số %*. Để trống ô trọng số thì hệ thống **chia đều** (3 việc → 33.33 / 33.33 / 33.34); nhập tay thì tổng phải đúng 100%, sai sẽ báo lỗi. Danh sách người thực hiện gồm **nhân sự trong đơn vị bạn và các đơn vị con**.
- **Nộp kết quả công việc con**: người được giao thấy ô ghi chú, nút **Đính kèm báo cáo** và **Nộp kết quả**. Nút Nộp **chỉ sáng khi đã có ít nhất 1 file**. Nộp xong tiến độ Node E tự cộng theo trọng số; đủ 100% thì bước tự hoàn tất và chuyển sang người nghiệm thu (Node C). Bấm vào tên file để mở (link có hạn 5 phút).
- **Chuông thông báo** (góc trên bên phải): hiện số thông báo chưa đọc, bấm vào xem danh sách, đánh dấu đã đọc từng cái hoặc tất cả.
- **Nhật ký thao tác** (cột phải, dưới khung Xử lý & Phê duyệt): toàn bộ diễn biến của đơn theo thứ tự thời gian — tạo đơn (và tạo từ đâu: thủ công / tự sinh / Lệnh công việc), ghế trống bị đẩy lên cấp trên, ai duyệt bước nào, ai từ chối và quay về bước nào kèm lý do, ai giao lại việc cho ai, phân rã công việc con với trọng số, đính kèm file, và nộp kết quả kèm tiến độ. Ghi cho **mọi** quy trình và luồng thực thi bảo trì.
- **Dòng "Nguồn:"** dưới tiêu đề đơn cho biết đơn này sinh ra từ đâu (phiếu bảo trì nào, hoặc quy trình cha nào).

### 4.4. Bảo trì định kỳ — ✅ đã nối backend thật

**Cấu hình lịch bảo trì** (menu *Maintenance Config*):
- Bảng ma trận: mỗi dòng là một **thiết bị**, mỗi cột là một **tần suất** (Ngày / Tuần / Tháng / Quý / Năm). Tick ô nào là chạy chu kỳ đó — **một thiết bị có thể có nhiều chu kỳ cùng lúc**.
- Dưới mỗi ô đã tick hiện **ngày đến hạn kế tiếp**. Lịch được **neo theo ngày gốc**: đặt bảo trì hằng tháng từ ngày 15 thì luôn rơi vào ngày 15, kể cả khi bạn sửa cấu hình sau đó.
- Cột cuối chọn **Luồng Thực thi** sẽ chạy khi bấm "Tạo Lệnh công việc" từ phiếu của thiết bị này. Chưa gắn thì không tạo Lệnh được.
- Khung dưới cùng để **thêm thiết bị mới** (mã + tên + đơn vị phụ trách).

**Bảng Bảo trì & Cảnh báo** (menu *Maintenance Dashboard*):
- Danh sách **phiếu nhắc bảo trì** do hệ thống tự sinh trước hạn 3 ngày, kèm mức khẩn (KHẨN / CẢNH BÁO / ĐỊNH KỲ) tính theo ngày hôm nay.
- **Sửa lịch / ưu tiên**: dời hạn bảo trì, đổi mức ưu tiên, thêm ghi chú.
- **Tạo Lệnh công việc**: mở một Luồng Thực thi thật từ phiếu. **Người bấm nút chính là người giữ Node E** của luồng đó — nên chỉ **cấp Quản lý** (người có cấp dưới) mới bấm được. Sau khi tạo, phiếu bị khoá, không sửa và không tạo Lệnh lần hai.
- **Quét ngay**: chạy lại đợt nhắc việc ngay lập tức thay vì đợi 00:00 — hữu ích khi vừa cấu hình lịch xong hoặc máy chủ vừa ngừng vài ngày. Chạy lại nhiều lần **không sinh phiếu trùng**.

### 4.5. Sơ đồ thiết bị (cây cấu trúc tài sản) — ✅ đã nối backend thật

Menu **Sơ đồ thiết bị** (khu Quản trị Admin) hiển thị toàn bộ tài sản dưới dạng cây 4 cấp:

**Công ty → Nhà máy / Hạ tầng → Phân hệ thiết bị chính → Bộ phận / Chi tiết**

- Nhánh **Bộ phận lồng được trong nhau, tối đa 5 cấp** (đúng giới hạn "1 Main part ↔ 5 sub-parts" của BRD). Thêm cấp thứ 6 sẽ bị chặn kèm thông báo.
- Cấp bậc được **kiểm ở backend**: không thể đặt một Bộ phận thẳng dưới Công ty, và chỉ Công ty mới đứng ở gốc cây.
- Bấm một node để mở **khung thông tin chi tiết** bên phải: Kí hiệu, Tình trạng (Đang vận hành / Hỏng / Dự phòng / Khác), Vị trí, Đơn vị phụ trách, Nhà sản xuất, Thông số chính — bấm **Sửa** để chỉnh tại chỗ.
- Khung chi tiết cũng hiện **chu kỳ bảo trì** đang đặt và **danh sách nhiệm vụ JSON** đã khai (chỉ đọc ở đây — khai ở Ma trận bảo trì, xem 4.4).
- **Đơn vị phụ trách kế thừa từ cấp trên**: node Công ty / Nhà máy không cần khai đơn vị. Khi cần biết ai phụ trách (lên lịch, gửi phiếu nhắc, tạo Lệnh công việc), hệ thống **leo ngược cây tìm đơn vị gần nhất có khai**. Cả nhánh không có đơn vị nào thì việc lên lịch sẽ bị chặn kèm lý do rõ ràng.
- **Xoá** một node sẽ xoá cả nhánh con bên dưới, và **bị chặn nếu nhánh còn phiếu bảo trì** trong lịch sử — trường hợp đó hãy tắt hoạt động thay vì xoá.
- Ô tìm kiếm lọc theo tên/mã và **giữ lại cả nhánh cha** của kết quả, nên không bị mất ngữ cảnh.

Dữ liệu seed dựng sẵn nhánh mẫu theo đúng quy cách đặt tên của BRD (`{Mã cty}-{Mã factory}-{Main part}-{Sub part}-{Thứ tự}`):

```
SB (Công ty Thủy điện Sông Bung)
└── SB-KD (Nhà máy Khe Diên)
    ├── SB-KD-T  (Tuabin)
    │   ├── SB-KD-T-S-01   Buồng xoắn        ← có 4 nhiệm vụ JSON + lịch tháng/năm
    │   ├── SB-KD-T-Gu-01  Cánh hướng
    │   └── SB-KD-T-Sh-01  Trục chính
    │       └── SB-KD-T-Sh-Ro-01  Roăng làm kín trục
    └── SB-KD-G  (Máy phát)
        └── SB-KD-G-Be-01  Ổ đỡ hướng trên   ← có 3 nhiệm vụ JSON + lịch quý
```

> Các thiết bị `PART-*` seed từ trước nằm ở nhóm **"Chưa xếp vào cây"** ở cuối danh sách. Chúng vẫn chạy lịch và sinh phiếu như cũ — chỉ là chưa ai xếp vào nhánh nào.

### 4.6. Danh sách nhiệm vụ theo thiết bị (JSON) — ✅ đã nối backend thật

Ở **Ma trận bảo trì thiết bị**, cột *"Luồng Thực thi khi tạo Lệnh"* có thêm nút **"Thêm thông tin công việc"** dưới ô chọn luồng:

- Mở popup khai **Danh sách nhiệm vụ** + **Thời gian thực hiện từng nhiệm vụ** (phút) + ghi chú tuỳ chọn.
- Toàn bộ nội dung được lưu **dạng JSON gắn với ID thiết bị**. Đã khai rồi thì nút đổi thành `N nhiệm vụ (JSON)` màu tím, bấm để sửa; lưu danh sách rỗng để gỡ.
- Mỗi khi thiết bị này sinh **Lệnh công việc**, chuỗi JSON được **chép nguyên văn vào Lệnh đó**. Chép chứ không tham chiếu: sửa cấu hình thiết bị về sau không làm đổi nội dung một Lệnh đã phát ra.
- Bảng ma trận giờ cũng **thụt lề theo cây tài sản**, nên chi tiết luôn nằm ngay dưới phân hệ chứa nó.

### 4.7. Nguồn dữ liệu công việc của Role E — ✅ đã nối backend thật

Trong **Ma trận RSACIE / Bảng 2**, khi bấm chữ **E** để gán vai trò Thực thi, hệ thống hiện dropdown 3 tùy chọn:

| Tùy chọn | Ý nghĩa | Điều kiện |
|---|---|---|
| **Mặc định theo thiết bị** | `E(x)` lấy đúng các đầu việc từ JSON của thiết bị sinh ra Lệnh | **Bị mờ** nếu chưa có thiết bị nào gắn luồng này khai JSON |
| **Nhập danh sách công việc** | Danh sách cố định gõ ngay lúc thiết kế, dùng chung cho mọi lần chạy | Phải khai ít nhất 1 nhiệm vụ |
| **Thiết lập thủ công** | Người giữ Node E tự gõ lúc phân rã (hành vi cũ, mặc định) | Luôn dùng được |

- Tùy chọn bị mờ có **tooltip chỉ rõ phải đi cấu hình ở đâu** — không để người dùng đoán.
- Ô đã gán E hiện **badge nhỏ**: `TB` = theo thiết bị, `DS` = theo danh sách. Rê chuột xem chi tiết.
- Cấu hình được **đông cứng vào đơn ngay lúc tạo**: sửa ma trận sau đó không làm đổi cách giao việc của một đơn đang chạy dở.
- Trong **panel phân rã Node E** ở Workspace, nếu luồng đã quy định sẵn đầu việc thì panel hiện khung tím liệt kê đủ danh sách, và bấm *"Phân rã công việc"* sẽ **đổ sẵn các dòng** — chỉ còn phải chọn người nhận. Nút **"Nạp lại từ cấu hình"** đặt lại danh sách đang sửa về đúng cấu hình gốc.
- Trường hợp biên được xử lý rõ: nếu bước E đặt *"Mặc định theo thiết bị"* nhưng Lệnh cụ thể lại đến từ thiết bị **chưa khai JSON**, panel hiện cảnh báo vàng giải thích và cho phân rã thủ công — thay vì im lặng trả về danh sách rỗng.

**Thử nhanh toàn bộ chuỗi**: đăng nhập `admin@company.vn` → *Sơ đồ thiết bị* xem cây → *Bảng Bảo trì & Cảnh báo* → **Quét ngay** → tìm phiếu của **SB-KD-T-S-01 (Buồng xoắn)** → đăng nhập lại bằng `truong.van.hanh@company.vn` (Trưởng Tổ Cơ khí) → **Tạo Lệnh công việc** → mở Lệnh trong Workspace, panel Node E sẽ hiện sẵn đúng 4 nhiệm vụ đã khai cho Buồng xoắn.

### 4.8. Gắn Luồng Thực thi con vào một bước (tích hợp luồng)

Trong Ma trận RSACIE, mỗi dòng bước có một nút nhỏ ở bên phải tên bước:

- **`+ Luồng con`** — chưa gắn gì, bấm để chọn.
- **`🔗 WF-EXEC`** — đã gắn, bấm để đổi hoặc **Gỡ liên kết**.
- **`—`** (mờ) — bước này không được phép gắn; rê chuột để xem lý do.

Quy tắc khác nhau giữa hai bảng:

| | Gắn được ở đâu | Ý nghĩa |
|---|---|---|
| **Bảng 1 — Quy trình** | **Chỉ bước cuối cùng**, và bước đó phải giữ vai trò **A** | Quy trình được duyệt xong → hệ thống **tự mở một Lệnh Thực thi** từ luồng đã gắn |
| **Bảng 2 — Luồng Thực thi** | **Bất kỳ bước nào** | Bước đó hoàn tất → tự mở **luồng con** của riêng bước đó |

> Vì sao Bảng 1 chỉ cho gắn ở bước cuối: "duyệt xong thì sinh việc thực thi" chỉ có nghĩa ở lần phê duyệt cuối. Gắn ở bước giữa sẽ tạo lệnh công việc cho một hồ sơ vẫn còn có thể bị từ chối và quay ngược lại.

Danh sách chọn chỉ hiện các luồng ở Bảng 2 — một Quy trình không thể làm luồng con của ai.

### 4.9. Các tính năng khác — ⚠️ vẫn dùng dữ liệu giả lập (mock), chưa nối backend

- **Canvas** (trang riêng) và **Submitter (gửi yêu cầu qua luồng triage)** — vẫn toàn bộ mock, thay đổi tạm trong phiên làm việc, mất khi tải lại trang. (Lưu ý: việc tạo đơn trực tiếp giờ đã có thật trong Workspace ở mục 4.3 — Submitter riêng chỉ còn cần cho luồng "gửi yêu cầu rồi chờ người khác triage sau", vốn ít ưu tiên hơn.)

## 5. Kiểm thử nhanh qua API (dành cho dev, không qua giao diện)

Nếu muốn kiểm tra trực tiếp các tính năng backend đã xong nhưng chưa có giao diện (ví dụ luồng duyệt/từ chối Role A vs Role C), xem các lệnh `curl` mẫu và giải thích chi tiết trong `plan.md`, mục "Progress status" của từng bước roadmap.

---

## Nhật ký cập nhật tài liệu này

- **Bước 7 (bắt đầu)**: đăng nhập thật (JWT) + Sơ đồ Tổ chức nối backend thật. Các mục 3 và 4.1 ở trên phản ánh trạng thái này.
- **Bước 7 (tiếp)**: đã xây xong toàn bộ lớp gọi API (workflows, RACI, tasks/duyệt-từ chối, workflow-requests) ở tầng code, **nhưng chưa có giao diện nào sử dụng**. Không có thay đổi nào người dùng cuối nhìn thấy được ở bước này.
- **Bước 8**: Ma trận RACI (RCSI) được **thiết kế lại hoàn toàn** và nối backend thật — xem mục 4.2. Tính năng liên kết luồng con (sub-flow) và thu gọn/mở rộng theo phòng ban của bản mock cũ **đã bị bỏ** vì không còn khớp với kiến trúc mới (xem chi tiết lý do trong `plan.md`).
- **Thêm tài khoản admin nhanh**: `admin@company.vn` / `admin123` (xem mục 2) — không dùng được đúng `admin`/`admin` vì backend yêu cầu email hợp lệ và mật khẩu ≥ 6 ký tự.
- **Bước 7 (hoàn tất) + Bước 9**: Workspace được viết lại hoàn toàn, nối backend thật — xem mục 4.3. Đây là nơi thể hiện tính năng cốt lõi của cả hệ thống: **Role A tự chọn bước quay về khi từ chối, Role C tự động quay về bước cố định**. Đã bỏ: phân rã sub-task theo %, đính kèm file bằng chứng, luồng bảo trì con tự động — vì backend chưa có khái niệm tương ứng.
- **Đối chiếu với BRD** (`docs/BRD - Dynamic Workflow Engine (Ma trận RCSI).pdf`, xem `plan_brd_1.md` để biết toàn bộ kế hoạch): Ma trận RACI **thiết kế lại lần 3** sang mô hình sổ ngang đa cấp thật của BRD (mục 4.2, thay cho bản "chỉ Cấp 1 + tag"); thêm **AND-logic** (nhiều người giữ R phải duyệt hết), **Escalation** (ghế trống tự đẩy lên cấp trên), và **Delegation** (giao việc cho cấp dưới — trước đây ghi "chưa hỗ trợ", nay đã có, xem mục 4.3). React Flow Canvas (vẽ luồng trực quan) của BRD **chủ động chưa làm** trong lượt này.
- **Bổ sung tầng Chức vụ & Nhân sự**: trước đây hệ thống không hề có liên kết giữa người dùng và đơn vị (mỗi đơn vị chỉ có đúng 1 "trưởng"). Nay đã thêm danh mục **Chức vụ** và bảng **nhân sự** (ai làm ở đâu, giữ chức vụ gì). Nhờ đó: ma trận có đủ **3 lớp cột Đơn vị → Chức vụ → Cá nhân** (mục 4.2); gán vai trò cho một chức vụ sẽ giao cho **mọi người** giữ chức vụ đó; và Delegation giờ hiện **nhân sự cấp dưới thật** thay vì chỉ trưởng đơn vị con. Component đổi tên `RaciMatrixView` → `CrasiMatrixView`. **C(End) không làm** vì Role A đã bao phủ (người từ chối tự chọn bước quay về).
- **BRD 2 — Luồng Thực thi (Node E)**: một bước giữ chữ **E** giờ có thể **phân rã thành nhiều công việc con `E(x)`** giao cho từng người, mỗi việc có **trọng số %** (để trống thì hệ thống chia đều, ví dụ 3 việc → 33.33 / 33.33 / 33.34; nhập tay thì tổng phải đúng 100%). Mỗi công việc con **bắt buộc đính kèm file báo cáo** mới nộp được; nộp xong tiến độ Node E tự cộng theo trọng số, đủ 100% thì tự chuyển sang bước nghiệm thu (Node C). File lưu trên **MinIO**, tải về bằng link có hạn 5 phút.
- **BRD 2 — Bảo trì định kỳ**: thêm danh mục **thiết bị** và **ma trận lịch bảo trì** (ngày/tuần/tháng/quý/năm). Mỗi đêm 00:00 (giờ Việt Nam) hệ thống tự quét, thiết bị nào **sắp đến hạn trong 3 ngày** thì sinh **phiếu nhắc việc** và **báo cho trưởng đơn vị phụ trách** (chuông thông báo trong ứng dụng — email/push để sau). Từ phiếu, người quản lý bấm **"Tạo Lệnh công việc"** để mở một Luồng Thực thi thật, và **người bấm nút chính là người giữ Node E** của luồng đó. Trước khi tạo Lệnh, phiếu còn sửa được hạn và mức ưu tiên; sau khi đã tạo thì khoá lại. Lịch được **neo theo ngày gốc** nên bảo trì hằng tháng đặt ngày 15 sẽ luôn rơi vào ngày 15, và nếu máy chủ ngừng vài ngày, lần quét kế tiếp **tự bắt kịp** thay vì lệch vĩnh viễn.
- **BRD 2 — Giao diện**: nối xong toàn bộ phần còn lại. **Cấu hình lịch bảo trì** và **Bảng Bảo trì & Cảnh báo** giờ chạy dữ liệu thật (mục 4.4, trước đây là mock). Workspace có thêm **panel phân rã `E(x)`** và **nộp kết quả kèm file**. Chuông thông báo thành thật (số chưa đọc + danh sách). Hai điều chỉnh đáng chú ý so với bản mock: ma trận bảo trì đổi từ *chọn 1 tần suất* sang **tick nhiều tần suất**, và danh sách người nhận việc con lấy **cả nhân sự trong chính đơn vị mình** chứ không chỉ đơn vị con — nếu không, quản lý của một tổ không có đơn vị con sẽ không giao được việc cho ai.
- **Phân quyền & phạm vi nhìn thấy**: khu **Quản trị Admin** (Ma trận, Sơ đồ Tổ chức, Bảo trì) giờ **chỉ tài khoản có vai trò `admin`** mới thấy và vào được. Ở **Workspace**, người dùng thường chỉ còn thấy công việc mà **đơn vị nhỏ nhất của mình** có tham gia — "tham gia" nghĩa là đơn hướng về đơn vị đó, mình tự mở đơn, hoặc một thành viên của đơn vị đang giữ vai trò ở bước bất kỳ. Trưởng đơn vị thấy thêm phần việc của **các tổ bên dưới**, nếu không thì đơn vừa giao xuống sẽ biến mất khỏi Workspace của chính người giao. Admin vẫn xem được toàn hệ thống. Ví dụ với dữ liệu seed: `ky.thuat1` (Tổ Cơ khí) thấy 3 đơn, `truong.co.dien` (Ban Cơ điện) thấy 3, `admin` thấy 17.
- **Xem lại chi tiết từng bước**: bấm vào **bất kỳ ô nào trong "Tiến trình các bước"** sẽ mở bảng chi tiết của bước đó — người giữ vai trò (kèm nhãn *Xử lý thay thế* / *Được giao bởi*), toàn bộ **công việc con và file đính kèm** (bấm để tải), và **nhật ký riêng của bước**. Đây là màn hình chỉ đọc: cấp trên xem được kết quả cấp dưới đã nộp trước khi duyệt, và người giữ E ở bước sau xem được kết quả E của các bước trước — hai trường hợp trước đây không xem được.
- **Chữ S là ngoại lệ**: S = quyền **mở đơn**, không phải quyền xử lý đơn đang chạy, nên nó không dồn về trưởng đơn vị như R/A/C/I/E. Gán **S cho một đơn vị** nghĩa là **mọi thành viên của đơn vị đó, kể cả các tổ bên dưới**, đều mở được đơn. Gán S đích danh một người hoặc theo chức vụ thì vẫn theo đúng luật cũ. Kiểm chứng trên dữ liệu seed: bước 1 của "Quy trình Phê duyệt CapEx" nay có 3 người giữ S (cả Ban Phát triển) thay vì 1.
- **BRD 3 — Sơ đồ thiết bị, JSON nhiệm vụ, và nguồn công việc Role E**: thêm menu **Sơ đồ thiết bị** với cây tài sản 4 cấp (mục 4.5); thêm nút **"Thêm thông tin công việc"** ở Ma trận bảo trì để khai danh sách nhiệm vụ **lưu dạng JSON theo thiết bị**, tự đính kèm vào mọi Lệnh công việc sinh ra từ thiết bị đó (mục 4.6); và dropdown **3 tùy chọn nguồn công việc cho Role E**, trong đó *"Mặc định theo thiết bị"* bị mờ khi chưa có thiết bị nào gắn luồng khai JSON (mục 4.7). **Không có tính năng cũ nào bị bỏ** — cây tài sản dùng lại chính bảng thiết bị sẵn có, nên lịch bảo trì, phiếu nhắc, Lệnh công việc và phân rã `E(x)` chạy y nguyên; thiết bị seed từ trước nằm ở nhóm "Chưa xếp vào cây". Một thay đổi có ảnh hưởng: **đơn vị phụ trách của thiết bị nay được kế thừa từ cấp trên trong cây** thay vì đọc thẳng một cột — thiết bị đã khai đơn vị thì không đổi gì, thiết bị chưa khai thì thừa hưởng của phân hệ chứa nó.
- **Ma trận gọn hơn khi đọc một quy trình**: sổ dọc một quy trình sẽ **ẩn các cột đơn vị không liên quan** tới quy trình đó. Nút **"Hiện đủ cột"** ở đầu bảng bật lại toàn bộ cột để gán vai trò cho đơn vị chưa có tag nào. Thu gọn hết quy trình thì bảng tự trở về đầy đủ.
