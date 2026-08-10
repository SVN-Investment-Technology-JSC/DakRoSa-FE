# Plan BRD 2 — Mở rộng: Luồng Thực thi (Node E) & Bảo trì định kỳ

> Nguồn: `docs/phase2.md` (BRD mở rộng). Đây là **phần nối tiếp của `plan_brd_1.md`**, không thay thế. Mọi thứ BRD 1 đã làm (ma trận CRSI 3 lớp, AND-logic, Escalation, Delegation, Role A/C) được giữ nguyên và tái sử dụng.

---

## 0. Bối cảnh & Hiện trạng code

BRD 2 nâng hệ thống từ "phê duyệt giấy tờ" sang "quản lý thực thi công việc thật", bằng 2 luồng mới:

- **Luồng Thực thi (Execution Flow)** — luồng phái sinh, có Node E tổng phân rã thành các task con `E(x)` có trọng số %.
- **Luồng Bảo trì (Maintenance Flow)** — chạy ngầm theo lịch (cron), sinh Ticket nhắc việc, từ đó Quản lý bấm **Work Order** để tạo Luồng Thực thi.

### Những gì đã có, sẽ tái sử dụng

| Thành phần | Trạng thái | Dùng cho BRD 2 |
|---|---|---|
| `task_instances`, `task_step_instances`, `task_step_assignees` | ✅ chạy tốt, có test | Luồng Thực thi cũng là một `task_instance` |
| `raci_assignments` đa hình (đơn vị/chức vụ/cá nhân) | ✅ | Gán chữ **E** cho Quản lý |
| Chữ **E** trong `role_letter_allowlist` | ✅ đã cho phép ở `maintenance_linked` + `maintenance_direct` | Node E |
| `positions`, `org_unit_members`, closure table | ✅ (BRD 1 đợt 2) | Xác định "có cấp dưới" để chặn Nhân viên giữ Node E |
| `ApprovalsService.approveStep` — duyệt bước cuối → task `Completed` | ✅ | **Điểm móc** để tự sinh Luồng Thực thi (Flow 1) |
| `workflow_steps.linked_sub_flow_id` | ⚠️ có cột, set được lúc tạo bước, **chưa có API sửa** | Chỉ định workflow nào là Luồng Thực thi con |
| `task_instances.derivative_task_id`, `task_step_instances.linked_sub_flow_task_id` | ⚠️ **cột chết** — chưa code nào ghi vào | Liên kết cha ↔ con |
| Cảnh báo "E không có C phía sau" | ⚠️ **chỉ hiển thị ở UI**, backend không chặn | Cần validation thật (US 1.5 AC1) |
| `MaintenanceConfigView`, `MaintenanceDashboardView` | ⚠️ **mock hoàn toàn** (`INITIAL_MAINTENANCE_PARTS`, `INITIAL_ALERT_TICKETS`) | Sẽ nối vào bảng thật |

### Những gì hoàn toàn chưa có

- ❌ Scheduler/cron (chưa cài `@nestjs/schedule`)
- ❌ Upload & lưu file đính kèm
- ❌ Bảng thiết bị (Parts), ma trận lịch bảo trì, Maintenance Ticket
- ❌ Hệ thống thông báo (Email/Push)
- ❌ Bảng task con `E(x)` + trọng số

---

## ✅ 0b. Các quyết định đã chốt

BRD có vài chỗ mâu thuẫn/chưa định nghĩa. Đã hỏi và **được chốt như sau**:

| # | Vấn đề | Quyết định |
|---|---|---|
| **Q1** | **Mâu thuẫn số học**: BRD nói chia đều 3 task = `33.33%`, nhưng cũng bắt tổng **đúng 100%**. `33.33 × 3 = 99.99 ≠ 100`. | ✅ Chia đều rồi **dồn phần dư vào task cuối** (`33.33 / 33.33 / 33.34`). Validation vẫn yêu cầu tổng = 100.00 tuyệt đối. |
| **Q2** | **Ma trận bảo trì thiếu mốc gốc** để tính ra ngày cụ thể (không có thì không tính được "T-3"). | ✅ Thêm `anchor_date` cho mỗi lịch; hệ thống tự tính `next_due_at` theo chu kỳ. |
| **Q3** | **Thông báo Email/Push** — chưa có hạ tầng. | ✅ Làm **thông báo trong ứng dụng** trước (bảng `notifications` + badge). **Email để sau.** |
| **Q4** | **Lưu file đính kèm ở đâu.** | ✅ **Dùng MinIO** (object storage S3-compatible, chạy qua Docker Compose cùng Postgres). Client dùng `@aws-sdk/client-s3` trỏ vào MinIO → sau này đổi sang S3 thật chỉ cần đổi endpoint/credentials. |
| **Q5** | **Định nghĩa "Nhân viên không có cấp dưới"** (US 1.2). | ✅ Suy ra từ dữ liệu thật: được giữ E nếu là Trưởng của đơn vị **có đơn vị con hoặc có nhân sự cấp dưới** (dùng lại `findDescendantMembers` của Delegation). |
| **Q6** | **Thời điểm chặn "E phải có C liền sau"**. | ✅ **Hai tầng**: UI cảnh báo ngay (đã có) + **chặn cứng khi tạo task** từ workflow không hợp lệ (không chặn lúc lưu, để còn thiết kế tự do). |
| **Q7** | **React Flow Canvas** (Rule 3). | ✅ **Tạm bỏ qua.** Thiết kế dữ liệu vẫn tuân thủ sẵn: `E(x)` là bảng lồng riêng, *không* sinh `task_step_instances` → sau này làm canvas thì tự động không hiện. |

---

## 1. Liên kết cha–con & khởi tạo Luồng Thực thi

**Vì sao**: BRD Rule 1 + US 1.1 + US 2.3 — mọi Luồng Thực thi phải lưu `Parent_Workflow_ID` để truy ngược, dù sinh tự động (từ quy trình cha) hay thủ công (từ Ticket bảo trì).

- **Schema**: thêm vào `task_instances`:
  - `parent_task_id` (uuid, nullable, self-FK) — luồng cha khi sinh tự động
  - `parent_maintenance_ticket_id` (uuid, nullable) — ticket cha khi sinh từ Work Order
  - `origin` enum `manual | auto_from_parent | work_order`
  - CHECK: không được đồng thời có cả 2 parent.
  - *Ghi chú*: cột `derivative_task_id` cũ (cha → con) hiện là **cột chết**; giữ lại và ghi song song để tra 2 chiều, hoặc bỏ hẳn — sẽ quyết khi code, ưu tiên **bỏ** nếu không có chỗ dùng thật.
- **Sinh tự động (Flow 1)**: trong `ApprovalsService.approveStep`, tại đúng nhánh "không còn bước kế tiếp → task `Completed`", nếu bước cuối của workflow có `linked_sub_flow_id` thì tạo task mới từ workflow đó, gán `parent_task_id` + `origin='auto_from_parent'`.
- **API bổ sung**: `PATCH /workflows/:id/steps/:stepId` để set/gỡ `linkedSubFlowId` — hiện chỉ set được lúc tạo bước. Việc này **mở khoá luôn** tính năng "liên kết luồng con" đã ghi "chưa hỗ trợ" ở `walkthrough.md`.
- **UI**: màn chi tiết task hiện hyperlink `Reference: [Tên quy trình cha]` (US 1.1 AC2).

## 2. Node E: phân rã `E(x)` + trọng số

**Vì sao**: US 1.3 + 1.4, Rule 2.

- **Bảng mới `execution_subtasks`**: `id`, `task_step_instance_id` (FK, bước mang chữ E), `assignee_user_id`, `title`, `weight` (`numeric(5,2)`), `status` (`Pending|Submitted`), `submitted_at`, `note`.
  - Unique `(task_step_instance_id, assignee_user_id, title)` để tránh trùng.
  - **Cố ý KHÔNG tạo `task_step_instances` cho `E(x)`** → tuân thủ Rule 3 (không hiện trên canvas).
- **Endpoint**:
  - `GET /tasks/:taskId/steps/:stepId/subtasks`
  - `PUT /tasks/:taskId/steps/:stepId/subtasks` — thay toàn bộ danh sách (giống cách `replaceCellAssignments` đang làm), **validate tổng = 100.00**, chỉ chủ Node E gọi được.
  - `POST /tasks/:taskId/steps/:stepId/subtasks/:subtaskId/submit` — kèm file (mục 3), chỉ assignee gọi được.
- **Tiến độ**: `progress` của bước E = tổng `weight` của các subtask `Submitted`. Đạt 100 → bước E `Completed`, đẩy sang bước kế (Node C).
  - Tái sử dụng đúng cơ chế cộng dồn của **AND-logic** đã có, nhưng theo trọng số thay vì đếm đầu người.
- **Chia đều**: helper trả về mảng weight chia đều + dồn dư vào phần tử cuối (theo **Q1**).

## 3. File đính kèm bắt buộc

**Vì sao**: US 1.4 AC1 — chưa upload thì chặn Submit.

- Bảng `attachments`: `id`, `subtask_id` (FK), `file_name`, `mime_type`, `size_bytes`, `object_key`, `uploaded_by`, `created_at`.
- **MinIO** (theo **Q4**): thêm service `minio` vào `docker-compose.yml` (cổng 9000 API + 9001 console), `StorageService` dùng `@aws-sdk/client-s3` với `forcePathStyle: true` trỏ vào MinIO. Tự tạo bucket lúc khởi động nếu chưa có.
  - File **không** đi qua DB: chỉ lưu `object_key`; tải về bằng **presigned URL** có hạn.
  - Đổi sang AWS S3 thật sau này = đổi endpoint + credentials, không sửa nghiệp vụ.
- `POST .../subtasks/:id/attachments` (multipart, dùng `@nestjs/platform-express` + multer memory storage → stream lên MinIO), giới hạn dung lượng & whitelist MIME.
- Submit không có attachment → `400` với đúng câu BRD: *"Vui lòng đính kèm file báo cáo kết quả"*.

## 4. Chặn Nhân viên giữ Node E

**Vì sao**: US 1.2.

- Trong `RaciService.replaceCellAssignments`, khi lưu chữ `E`: resolve ra danh sách người sẽ nhận (dùng lại `resolveAssignees` của BRD 1), kiểm tra **từng người có cấp dưới không** (theo **Q5**).
- Nếu có người không đủ điều kiện → `400`: *"Cấp bậc Nhân viên không được phép giữ Node E tổng. Chỉ có thể gán chữ E cho cấp Quản lý"*.
- UI: làm mờ chữ `E` trong bảng chọn khi cột đang trỏ vào cá nhân/chức vụ không có cấp dưới, kèm tooltip lý do (giống cách đang làm với chữ `C`).

## 5. Node C sau Node E & Reject → Rework

**Vì sao**: Rule 4 + US 1.5.

- **Validation** (theo **Q6**): hàm dùng chung `assertExecutableWorkflow(workflowId)` — với mọi bước có `E`, bước kế tiếp phải có `C`. Gọi khi tạo task; thêm endpoint `GET /workflows/:id/validation` để UI hiện cảnh báo chi tiết.
- **Reject tại Node C sau Node E**: hiện `rejectStep` đưa bước đích về `In Progress` và các bước ở giữa về `Pending`. Với trường hợp bước đích là Node E, cần thêm: reset toàn bộ `execution_subtasks` của bước đó về `Pending` và `progress = 0`, trạng thái hiển thị **"Rework"**.
  - Thêm `'Rework'` vào enum `TASK_STEP_STATUSES` (migration đổi enum).
  - **Đây là thay đổi vào code lõi đã có test** → phải bổ sung test trước khi sửa.

## 6. Module Bảo trì

**Vì sao**: Epic 2.

- **Bảng**:
  - `maintenance_parts`: `id`, `code`, `name`, `org_unit_id` (đơn vị phụ trách), `is_active`.
  - `maintenance_schedules`: `id`, `part_id`, `frequency` enum `day|week|month|quarter|year`, `anchor_date`, `next_due_at`, `is_active` (theo **Q2**).
  - `maintenance_tickets`: `id`, `part_id`, `schedule_id`, `due_date`, `status` enum `CRITICAL|WARNING|ROUTINE` (khớp `TicketStatus` mock sẵn có), `priority`, `note`, `resulting_task_id` (task sinh từ Work Order), `created_at`.
- **Cron** (`@nestjs/schedule`): chạy `0 0 * * *` theo `Asia/Ho_Chi_Minh`, tìm lịch có `next_due_at = today + 3 ngày` → tạo ticket + thông báo, rồi dời `next_due_at` sang chu kỳ kế.
  - Chống trùng: unique `(schedule_id, due_date)` để cron chạy lại **không sinh ticket trùng** (quan trọng khi restart server).
  - Tách logic tính ngày ra hàm thuần để **unit-test được mà không cần đợi cron**.
- **Thông báo**: bảng `notifications` (`user_id`, `type`, `title`, `body`, `read_at`, `link`) + `GET /notifications` (theo **Q3**).
- **Endpoint**: CRUD parts/schedules; `GET /maintenance-tickets`; `PATCH /maintenance-tickets/:id` (Change Maintenance / Set Priority — US 2.2); `POST /maintenance-tickets/:id/work-order` (US 2.3) → tạo task Thực thi, **người bấm nút thành chủ Node E**, gán `parent_maintenance_ticket_id` + `origin='work_order'`.

## 7. Frontend

- **`MaintenanceConfigView`**: nối vào parts + ma trận lịch thật (đang mock). Giữ nguyên bố cục grid Part × Day/Week/Month/Quarter/Year, thêm ô chọn `anchor_date`.
- **`MaintenanceDashboardView`**: danh sách ticket thật, cụm nút **Change Maintenance** / **Set Priority** / **Work Order**.
- **`WorkspaceView`**: khi bước hiện tại là Node E và người dùng là chủ → panel **"Phân rã công việc"** (thêm/xoá dòng, chọn người, nhập %, nút "Chia đều", hiện tổng % và chặn khi ≠ 100). Khi người dùng là assignee của `E(x)` → ô upload file + nút Submit.
- Hiện `Reference: [quy trình cha]` và badge "Rework".
- **Chưa làm**: React Flow Canvas (giữ hoãn theo **Q7**).

---

## 8. Thứ tự triển khai đề xuất

Làm từ nền lên, mỗi bước tự kiểm chứng được ngay:

1. **Mục 1** (liên kết cha–con + `PATCH` step) — nhỏ, mở khoá luôn tính năng luồng con đang thiếu.
2. **Mục 4 + 5** (chặn E cho Nhân viên, validation E→C, `Rework`) — thuần backend, có test.
3. **Mục 2 + 3** (subtask + trọng số + attachment) — phần lõi nặng nhất của Epic 1.
4. **Mục 6** (bảo trì + cron + ticket) — Epic 2, kế thừa toàn bộ mục 2/3.
5. **Mục 7** (frontend) — sau khi API ổn định.

## 9. Kiểm thử (giữ đúng mức độ như BRD 1)

- Migration generate/run từng bước, **review tay trước khi apply** — đã 2 lần TypeORM tự ý xoá partial index `1-C/bước`; lần này còn đổi enum `TASK_STEP_STATUSES` nên càng phải soi kỹ.
- `npx jest` xanh toàn bộ; **viết test trước** cho phần sửa vào `ApprovalsService` (code lõi đã có 18 test đang xanh).
- Unit test riêng cho: chia đều trọng số (đặc biệt ca 3 phần → 33.33/33.33/33.34), validation tổng 100, hàm tính `next_due_at` từng chu kỳ, và logic chống sinh ticket trùng.
- **Curl-replay** đúng payload frontend gửi cho mọi endpoint mới — không chỉ "gọi thử endpoint".
- Kiểm chứng cron **không cần đợi tới nửa đêm**: gọi trực tiếp hàm xử lý với ngày giả lập.
- `tsc --noEmit` sạch cả 2 phía; mọi file mới transform qua Vite không lỗi.
- Cập nhật `plan.md` + `walkthrough.md` sau **mỗi mục**, không dồn cuối.
- Môi trường **không có công cụ browser automation** → tiếp tục ghi rõ phần nào chưa kiểm chứng bằng mắt thay vì nhận bừa.

---

## Tiến độ thực hiện

- [x] 0b. Chốt các quyết định Q1–Q7 *(Q4 chốt dùng **MinIO**, khác đề xuất ban đầu là đĩa local)*
- [x] **1. Liên kết cha–con + `PATCH` bước + tự sinh Luồng Thực thi**
  - Schema: bỏ cột chết `derivative_task_id` (đã kiểm chứng 0/9 task dùng tới), thêm `parent_task_id` (con → cha, đúng nghĩa `Parent_Workflow_ID` của BRD) + `origin` enum `manual|auto_from_parent|work_order`. Cột `parent_maintenance_ticket_id` để dành tới mục 6 (khi bảng ticket tồn tại) để tránh FK treo.
  - `PATCH /workflows/:id/steps/:stepId` — set/gỡ `linkedSubFlowId`, chặn tự liên kết chính nó. **Mở khoá luôn** tính năng "liên kết luồng con" trước đây ghi "chưa hỗ trợ" trong `walkthrough.md`.
  - `TasksService.spawnExecutionFlowIfConfigured` — chạy **sau khi transaction duyệt đã commit**, cố ý nằm ngoài transaction để lỗi sinh luồng con không bao giờ làm rollback một lần duyệt hợp lệ; bù lại hàm này **idempotent** (từ chối sinh lần 2 cho cùng một cha) nên retry an toàn.
  - Seed: thêm workflow **WF-EXEC** (bước 1 chữ `E` ở Ban Phát triển — người có cấp dưới; bước 2 chữ `C` — đúng ràng buộc E phải liền kề C của Rule 4) và link vào bước 4 của WF-CAPEX qua pass thứ 2.
  - **Kiểm chứng**: 6 unit test mới cho `spawnExecutionFlowIfConfigured` (idempotent, chỉ theo bước cuối, sort đúng thứ tự, cha chưa Completed thì không sinh) — tổng **24/24 jest xanh**; chạy trọn luồng CapEx từ **seed sạch** → task cha `Completed` và tự sinh `WF-EXEC-…` với `origin=auto_from_parent`, `parent_task_id` trỏ đúng cha, 2 bước E→C dựng đúng.
  - ⚠️ **Lần thứ 3** TypeORM tự ý xoá 2 index SQL thô của `raci_assignments` trong migration sinh ra (1-C/bước + chống trùng tag) mà **không tạo lại** — đã sửa tay và ghi chú cảnh báo ngay trong file migration.
- [x] **2. Node E: subtask `E(x)` + trọng số + tiến độ**
  - Bảng `execution_subtasks` (weight `numeric(5,2)`), **cố ý không** sinh `task_step_instances` cho `E(x)` → tuân thủ sẵn Rule 3 (không hiện trên canvas).
  - Helper `weights.ts` giải quyết mâu thuẫn Q1: chia đều rồi dồn dư vào phần cuối. So sánh bằng **đơn vị phần trăm × 100 (số nguyên)** để tránh sai số dấu phẩy động — `0.1 + 0.2 !== 0.3` sẽ làm validation "đúng 100%" sai một cách ngẫu nhiên nếu dùng float.
  - Tách `completeStepAndAdvance` ra `step-progression.ts` dùng chung: một bước giờ có thể hoàn tất **hoặc** do được duyệt, **hoặc** do đủ 100% trọng số E(x) — hai đường phải tiến trình y hệt nhau.
  - `PUT .../subtasks` thay toàn bộ danh sách, chỉ **người giữ Node E** gọi được.
  - Kiểm chứng thật: chia đều 3 việc → `33.33/33.33/33.34` tổng đúng 100; trọng số tay `50+49.99` → **chặn**; người không giữ E phân rã → **chặn**; nộp lần lượt → tiến độ **33% → 67% → 100%** rồi tự chuyển sang Node C; nộp lại lần 2 → **chặn**.
- [x] **3. File đính kèm bắt buộc (MinIO)**
  - Thêm service `minio` vào `docker-compose.yml` (API 9000, console 9001), `StorageService` dùng `@aws-sdk/client-s3` + `forcePathStyle`, tự tạo bucket lúc khởi động.
  - Tải file lên qua multipart (giới hạn 20MB), tên file gốc được **làm sạch** trước khi ghép vào object key (không cho thoát khỏi prefix); tải về bằng **presigned URL** hết hạn 5 phút, không public bucket.
  - Nộp khi chưa có file → **chặn** đúng câu BRD *"Vui lòng đính kèm file báo cáo kết quả"*.
  - Kiểm chứng thật: upload → file nằm trong MinIO (`docker exec ... ls`), presigned URL tải về **đúng nội dung**.
- [x] **4. Chặn Nhân viên giữ Node E**
  - Gộp logic "ai sẽ nhận việc" về **một nguồn duy nhất** `OrgUnitsService.resolveAssignees` (trước đó nằm ẩn trong `TasksService.create`) — tránh việc tạo task và validate RACI hiểu khác nhau về cùng một quy tắc.
  - `hasSubordinates(userId)`: quản lý = trưởng của đơn vị **có đơn vị con**, hoặc **có nhân sự khác mình** (trong chính đơn vị hoặc đơn vị con cháu).
  - Kiểm chứng thật: gán `E` cho *Tổ Hạ tầng Mạng* (trưởng là auditor, không có cấp dưới) → **bị chặn** đúng câu BRD; gán cho *Ban Phát triển* (lead.dev có cấp dưới) → **cho phép**.
- [x] **5. Validation E→C + Reject → Rework**
  - `WorkflowsService.validate()` + `assertExecutable()`; endpoint `GET /workflows/:id/validation` cho UI. Theo **Q6**: **vẫn lưu được** khi đang thiết kế, nhưng **chặn cứng lúc tạo task**. Kiểm chứng: workflow có E không có C phía sau → `validation` báo `valid:false`, `POST /tasks` trả **400** đúng câu BRD.
  - Thêm `Rework` vào enum + helper `isActionableStepStatus` — **quan trọng**: `Rework` phải được coi là *đang chờ xử lý*, nếu không bước đó sẽ kẹt (không ai approve/reject được, và frontend không nhận ra là bước hiện hành). Đã sửa đồng bộ cả backend lẫn frontend.
  - Reject tại Node C khi bước đích là Node E → `Rework` thay vì `In Progress`. Kiểm chứng vòng đầy đủ trên task thật: `E duyệt → C từ chối → E về Rework → E làm lại → C nhận việc`.
  - 11 test mới (8 cho validation E→C, 3 cho Rework) → **35/35 jest xanh**.
  - ⚠️ **Lần thứ 4** TypeORM lại xoá 2 index SQL thô của `raci_assignments` trong migration đổi enum — đã chặn lại. Phần đổi enum nó sinh đúng (rename → tạo mới → cast → drop cũ).
- [x] **6. Module Bảo trì (parts, ma trận, cron, ticket, Work Order)**
  - 4 bảng mới: `maintenance_parts`, `maintenance_schedules`, `maintenance_tickets`, `notifications`.
  - **Toàn bộ phép tính ngày là hàm thuần trên chuỗi `YYYY-MM-DD`**, không dùng `Date`: ngày nghiệp vụ là ngày lịch theo Asia/Ho_Chi_Minh, đi vòng qua `Date` sẽ bị diễn giải lại theo múi giờ máy chủ và **lệch một ngày**. `addInterval` kẹp tháng ngắn (31/01 + 1 tháng → 28/02, năm nhuận → 29/02).
  - **Mỗi lần quét đều tính lại kỳ hạn từ `anchor_date`**, không cộng dồn mù từ `next_due_at`. Nhờ vậy cron chết vài ngày rồi sống lại sẽ **tự bắt kịp**, không lệch vĩnh viễn. `next_due_at` chỉ là cache để hiển thị.
  - `MaintenanceSchedulerService` chỉ chứa đúng decorator `@Cron('0 0 * * *', timeZone Asia/Ho_Chi_Minh)`; logic nằm ở `runReminderSweep(today)` nhận ngày làm tham số → **test được mà không cần đợi cron hay đóng băng đồng hồ**. Có thêm `POST /maintenance/run-sweep` để chạy bù sau khi máy chủ ngừng.
  - **Chống trùng**: unique `(schedule_id, due_date)`. Chạy lại là no-op; hai tiến trình chạy song song thì bên thua nhận lỗi `23505` và được coi là "đã nhắc rồi", không làm hỏng cả đợt quét. Lỗi khác `23505` vẫn ném ra.
  - Số phiếu lấy từ **sequence Postgres**, không dùng `COUNT(*)` (count sẽ cấp trùng số khi chạy song song và cấp lại số sau khi xoá phiếu).
  - Mức khẩn (CRITICAL/WARNING/ROUTINE) **tính lúc đọc** theo ngày hôm nay, không tin con số cron đã đóng dấu từ mấy hôm trước.
  - Người nhận thông báo dùng lại `OrgUnitsService.resolveAssignees` — cùng một nguồn sự thật với tạo task và validate RACI, nên **ghế trống vẫn tự đẩy lên cấp trên** ở đây.
  - **US 2.3 Work Order**: `TasksService.create` thêm `meta.nodeEOwnerUserId`, chỉ ghi đè chữ **E** — ai bấm nút thì người đó giữ Node E. `parent_maintenance_ticket_id` để riêng khỏi `parent_task_id` vì cha ở đây là *phiếu*, không phải *task*.
  - Kiểm chứng thật: lịch tháng neo 15/01 → `next=2026-08-15` (đúng neo, không trôi); quét 10/08 tạo 1 phiếu, **quét lại cùng ngày tạo 0**; quét 12/08 tạo phiếu kế; thông báo về đúng 2 trưởng đơn vị phụ trách, **admin không nhận nhầm**; đổi hạn 15/08→11/08 thì mức khẩn tự đổi ROUTINE→WARNING; Work Order khiến **người bấm** (Đỗ Minh Khang) giữ Node E dù RACI gốc trỏ Trần Văn Hoàng, còn Node C vẫn theo RACI; bấm Work Order lần 2 và sửa phiếu sau khi đã có Work Order đều bị chặn.
- [x] **7. Frontend (Config, Dashboard, Workspace phân rã/submit)**
  - `MaintenanceConfigView` viết lại: ma trận thật, **checkbox thay vì radio** (một thiết bị có thể có nhiều chu kỳ — đúng với unique `(part, frequency)` ở DB, bản mock cũ chỉ cho chọn 1). Khi lưu, **giữ nguyên `anchorDate` cũ** của tần suất đã có, nếu không lịch tháng neo ngày 15 sẽ bị reset về hôm nay mỗi lần bấm Lưu.
  - `MaintenanceDashboardView` viết lại: phiếu thật, nút **Sửa lịch / ưu tiên** (US 2.2), **Tạo Lệnh công việc** (US 2.3), và **Quét ngay** để chạy bù đợt nhắc mà không phải đợi 00:00.
  - `ExecutionPanel` mới trong Workspace: người giữ **Node E** phân rã `E(x)` (để trống trọng số → server chia đều), người được giao **đính kèm + nộp**; nút Nộp **disabled khi chưa có file**, nhưng server vẫn chặn độc lập. Tải file bằng presigned URL mở tab mới.
  - `NotificationBell` thật thay cho chấm xanh tĩnh: badge số chưa đọc (poll 60s), danh sách **chỉ tải khi mở panel**, đánh dấu đã đọc từng cái / tất cả.
  - Workspace hiện thêm dòng **Nguồn: {referenceCode} — {referenceTitle}**, để từ luồng con thấy được nó sinh ra từ đâu.
  - **Hai lỗi thật phát hiện khi kiểm chứng** (xem `plan.md` Phase 7b): (1) panel phân rã ban đầu dùng `delegation-candidates`, vốn **cố ý chỉ trả đơn vị con** → quản lý của một tổ lá có **0 ứng viên** và không phân rã được; đã thêm endpoint riêng `GET .../subtasks/candidates` gồm cả nhân sự trong chính đơn vị mình. (2) Đường Work Order là **cửa sau** vòng qua luật "chỉ Quản lý giữ Node E" — đã chặn.
  - Kiểm chứng thật: bỏ tick tuần → lịch tuần bị xoá, lịch tháng **giữ nguyên neo 2026-01-15**; trùng mã thiết bị bị chặn; Nhân viên bấm Work Order **bị chặn**; ứng viên nhận `E(x)` trả về đúng 2 nhân sự trong tổ; phân rã 2 việc để trống trọng số → **50/50**; nộp khi chưa đính kèm **bị chặn**; upload → presigned URL tải về đúng nội dung → nộp → tiến độ **50%**.
