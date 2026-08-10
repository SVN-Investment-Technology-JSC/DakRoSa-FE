# Hướng dẫn tích hợp module Workflow Engine vào nền tảng SaaS

> Tài liệu dành cho đội tích hợp. Mô tả **cái đang có**, **cái phải sửa**, và **thứ tự làm**.
> Bổ trợ: `plan.md` (nhật ký kỹ thuật), `walkthrough.md` (hướng dẫn người dùng), `plan_brd_1.md` / `plan_brd_2.md` (yêu cầu nghiệp vụ).

---

## 0. Tóm tắt cho người quyết định

| | |
|---|---|
| **Module là gì** | Một bounded context độc lập: cây tổ chức → ma trận phân vai RSACIE → chạy đơn (duyệt / thực thi / bảo trì định kỳ) |
| **Quy mô** | 24 entity / 26 bảng nghiệp vụ, 13 controller, 2 tiến trình (API + cron), 2 kho dữ liệu (PostgreSQL + S3/MinIO) |
| **Phụ thuộc ra ngoài** | Không có. Module tự chứa auth, RBAC, lưu file, thông báo |
| **Rào cản lớn nhất** | **Chưa có multi-tenancy.** Toàn bộ dữ liệu nằm trong một không gian phẳng, không có `tenant_id` ở bất kỳ đâu |
| **Việc nặng nhất** | (1) Tenancy, (2) thay auth nội bộ bằng SSO của nền tảng. Hai việc này chiếm phần lớn công sức; các phần còn lại chủ yếu là cấu hình |

**Đọc mục 3 trước tiên.** Mọi phương án tích hợp đều phải trả lời câu hỏi tenancy, và câu trả lời quyết định phần còn lại.

---

## 1. Ranh giới module hiện tại

### Bảng dữ liệu (26 + `migrations`)

| Nhóm | Bảng |
|---|---|
| Danh tính & phân quyền | `users`, `roles`, `permissions`, `role_permissions`, `user_roles` |
| Cơ cấu tổ chức | `org_unit_types`, `org_units`, `org_unit_closure`, `org_unit_members`, `positions` |
| Thiết kế quy trình | `workflows`, `workflow_steps`, `raci_assignments`, `role_letter_allowlist` |
| Chạy đơn | `task_instances`, `task_step_instances`, `task_step_assignees`, `approval_actions`, `workflow_requests` |
| Thực thi (Node E) | `execution_subtasks`, `execution_attachments` |
| Bảo trì định kỳ | `maintenance_parts`, `maintenance_schedules`, `maintenance_tickets` |
| Phụ trợ | `notifications`, `task_activity_logs` |

### Route (13 controller)

`health`, `auth`, `org-units`, `org-unit-types`, `positions`, `workflows`, `workflows/:id/steps/:stepId/raci`, `tasks`, `tasks/:taskId/steps/:stepId` (duyệt / từ chối / uỷ quyền), `tasks/:taskId/steps/:stepId/subtasks`, `maintenance-parts` + `maintenance-tickets` + `maintenance/run-sweep`, `notifications`, `workflow-requests`

`UsersModule` **không có controller** — chỉ là service dùng nội bộ, nên không cần lo va route với nền tảng.

### Tiến trình chạy nền

- `MaintenanceSchedulerService` — cron `0 0 * * *` theo `Asia/Ho_Chi_Minh`, quét lịch bảo trì đến hạn.

### Hạ tầng cần có

- **PostgreSQL 15+** — bắt buộc, vì có dùng `NULLS NOT DISTINCT` (PG15) và partial unique index.
- **S3-compatible object storage** — hiện dùng MinIO qua `@aws-sdk/client-s3` với `forcePathStyle: true`. Đổi sang S3/GCS thật chỉ cần đổi biến môi trường và bỏ `forcePathStyle`.

---

## 2. Chọn hình thái tích hợp

| Phương án | Mô tả | Nên chọn khi |
|---|---|---|
| **A. Service riêng, DB riêng** *(khuyến nghị)* | Giữ nguyên NestJS app, deploy như một service sau API gateway. Schema riêng hoặc database riêng | Mặc định. Ít phải sửa nhất, ranh giới rõ, nâng cấp độc lập |
| **B. Service riêng, dùng chung DB (schema riêng)** | Cùng cụm PostgreSQL, khác schema | Muốn giảm chi phí hạ tầng và chấp nhận ràng buộc chung về nâng cấp |
| **C. Nhúng module vào monolith có sẵn** | Import các `*.module.ts` vào `AppModule` của nền tảng | Nền tảng cũng là NestJS + TypeORM và muốn một tiến trình duy nhất |

Phần còn lại của tài liệu viết theo **phương án A**; chỗ nào khác biệt với B/C sẽ ghi rõ.

> Với phương án C: `ActivityModule` và `StorageModule` đang khai báo `@Global()`. Nhúng vào monolith sẽ đưa `ActivityService` và `StorageService` vào phạm vi toàn ứng dụng — hãy bỏ `@Global()` và import tường minh để tránh va tên với service cùng chức năng của nền tảng.

---

## 3. Multi-tenancy — phần khó nhất

**Hiện trạng: không có.** Không bảng nào có `tenant_id`. Chạy nhiều khách hàng trên một instance như hiện tại sẽ **rò rỉ dữ liệu chéo**.

### 3.1. Chọn mô hình

| Mô hình | Cách làm | Đánh giá |
|---|---|---|
| **Database / schema riêng cho từng tenant** *(khuyến nghị cho bản đầu)* | Mỗi tenant một schema; định tuyến `DataSource` theo tenant lúc request | **Gần như không phải sửa code nghiệp vụ.** Mọi ràng buộc unique hiện tại vẫn đúng vì phạm vi đã là một tenant. Đổi lại: tốn kém khi số tenant lớn, và mỗi lần migrate phải chạy trên mọi schema |
| **Cột `tenant_id` dùng chung bảng** | Thêm `tenant_id` vào cả 26 bảng, thêm vào mọi unique index, ép filter ở mọi truy vấn | Rẻ khi quy mô lớn, nhưng **rủi ro cao**: chỉ cần sót một truy vấn là rò dữ liệu. Nếu chọn hướng này, bắt buộc dùng **PostgreSQL Row-Level Security** làm lưới an toàn cuối, đừng chỉ tin vào tầng ứng dụng |

### 3.2. Nếu chọn cột `tenant_id`: các unique constraint sẽ vỡ

Đây là danh sách **thật**, lấy từ `pg_index` của DB hiện tại. Mỗi dòng dưới đây đang unique **toàn cục** và sẽ khiến tenant thứ hai không tạo được dữ liệu trùng mã với tenant thứ nhất:

| Bảng | Unique hiện tại | Phải đổi thành |
|---|---|---|
| `users` | `(email)` | `(tenant_id, email)` — hoặc bỏ hẳn nếu dùng SSO (mục 4) |
| `workflows` | `(code)` | `(tenant_id, code)` |
| `positions` | `(code)` | `(tenant_id, code)` |
| `org_unit_types` | `(code)` | `(tenant_id, code)` |
| `roles` | `(name)` | `(tenant_id, name)` |
| `permissions` | `(key)` | Giữ toàn cục — đây là danh mục hệ thống |
| `maintenance_parts` | `(code)` | `(tenant_id, code)` |
| `maintenance_tickets` | `(ticket_number)` | `(tenant_id, ticket_number)` |
| `task_instances` | `(task_code)` | `(tenant_id, task_code)` |

Các unique còn lại (`raci_assignments`, `workflow_steps`, `task_step_instances`, `org_unit_members`, `execution_subtasks`, `maintenance_schedules`, `maintenance_tickets(schedule_id, due_date)`) đều gắn với một khoá cha đã thuộc về tenant, nên **không cần sửa**.

### 3.3. Sequence đánh số phiếu

`maintenance_ticket_number_seq` là **sequence toàn cục**. Với mô hình dùng chung bảng, các tenant sẽ thấy số phiếu nhảy cóc (`#4001`, `#4007`, …). Hai lựa chọn:

- Chấp nhận — số phiếu chỉ cần *duy nhất*, không cần *liên tục*.
- Hoặc chuyển sang bảng bộ đếm theo tenant. **Đừng quay lại dùng `COUNT(*)`** — đã bị loại vì cấp trùng số khi hai tiến trình chạy song song và cấp lại số sau khi xoá phiếu (xem `MaintenanceService.nextTicketNumber`).

### 3.4. Object storage

`StorageService.upload()` đặt key dạng `execution-reports/<YYYY-MM-DD>/<uuid>-<tên file>`. Thêm tenant vào **đầu** key:

```
<tenant_id>/execution-reports/<YYYY-MM-DD>/<uuid>-<tên file>
```

Như vậy một bucket dùng chung vẫn tách được quyền bằng IAM policy theo prefix. `StorageService` hiện tạo bucket lúc khởi động (`OnModuleInit`) — bỏ đoạn này ở môi trường production, bucket phải do hạ tầng cấp phát.

---

## 4. Thay danh tính nội bộ bằng SSO của nền tảng

Module đang tự quản lý danh tính: `users` + bcrypt + JWT access/refresh tự phát hành.

### 4.1. Cái phải bỏ

- `POST /auth/login`, `POST /auth/refresh` — nền tảng phát hành token.
- `users.password_hash` — xoá cột. Lưu ý cột này đang để `select: false` ở entity, và `UsersService.findByEmailWithPassword()` là **ngoại lệ duy nhất** được đọc nó (một lỗi lộ hash qua `GET /org-units/tree` đã từng xảy ra và được vá bằng cách này).

### 4.2. Cái phải giữ — quan trọng

**`users` không được xoá, phải trở thành bảng chiếu (projection) danh tính của nền tảng.** Lý do: **14 khoá ngoại trên 13 bảng** đang trỏ vào `users.id`:

```
approval_actions.actor_user_id          org_units.head_user_id
execution_attachments.uploaded_by_user_id   raci_assignments.user_id
execution_subtasks.assignee_user_id     task_activity_logs.actor_user_id
notifications.user_id                   task_instances.initiator_user_id
org_unit_members.user_id                task_step_assignees.user_id
user_roles.user_id                      task_step_assignees.delegated_from_user_id
workflow_requests.submitted_by_user_id  workflows.created_by
```

Cách làm: giữ `users` với `id`, `email`, `full_name`, `avatar_initials`, thêm `external_user_id` (unique theo tenant) trỏ về danh tính nền tảng. Đồng bộ bằng webhook hoặc upsert lười lúc đăng nhập lần đầu.

> **Không dùng thẳng id của nền tảng làm khoá chính.** Một nhân sự nghỉ việc và bị xoá ở nền tảng vẫn phải còn tên trong nhật ký phê duyệt — đó là dữ liệu kiểm toán.

### 4.3. Chỉnh guard

- `JwtStrategy` (`src/auth/strategies/jwt.strategy.ts`): đổi `secretOrKey` sang **JWKS** của nền tảng (dùng `jwks-rsa`), kiểm `issuer` và `audience`. `validate()` phải trả về `{ sub, email, tenantId }` — thêm `tenantId` vào `JwtPayload` và truyền xuống tầng dịch vụ.
- `PermissionsGuard` (`src/auth/guards/permissions.guard.ts`): hiện đọc quyền từ `users → user_roles → role_permissions`. Nếu nền tảng đã cấp scope trong token thì đọc thẳng từ claim và bỏ truy vấn này; nếu không thì giữ nguyên và ánh xạ vai trò nền tảng sang `roles` nội bộ lúc đồng bộ.
- `RaciActionGuard` (`src/approvals/guards/`) **giữ nguyên** — nó kiểm quyền theo dữ liệu nghiệp vụ (người này có giữ vai trò ở bước đó không), không liên quan tới danh tính.

### 4.4. Ánh xạ quyền

Module chỉ dùng đúng 3 permission key. Ánh xạ sang vai trò của nền tảng:

| Key | Cho phép |
|---|---|
| `workflow.design` | Thiết kế quy trình, ma trận RSACIE, cấu hình bảo trì |
| `task.approve` | Duyệt / từ chối / uỷ quyền một bước |
| `org.manage` | Sửa cây tổ chức, chức vụ, nhân sự |

---

## 5. Cron trong môi trường nhiều bản sao

`MaintenanceSchedulerService` chạy trong tiến trình API. Deploy 3 replica là **3 lần quét mỗi đêm**.

Điều này *không* sinh phiếu trùng — unique `(schedule_id, due_date)` chặn, và bên thua cuộc nhận lỗi `23505` được nuốt và coi như "đã nhắc rồi" (xem `MaintenanceService.raiseTicket`). Nhưng vẫn lãng phí và làm nhiễu log. Chọn một:

1. **Tách riêng** — deploy thêm một bản chỉ chạy cron, `ScheduleModule` chỉ bật ở đó. Sạch nhất.
2. **Khoá phân tán** — bọc `runReminderSweep` trong `pg_try_advisory_lock`.
3. **Cron của nền tảng** — bỏ `ScheduleModule`, cho scheduler của nền tảng gọi `POST /maintenance/run-sweep`. Endpoint này **đã có sẵn** và nhận tham số `today`, vốn được làm để chạy bù sau khi hệ thống ngừng.

Toàn bộ logic tính ngày nằm trong `maintenance-frequency.ts` dưới dạng **hàm thuần trên chuỗi `YYYY-MM-DD`**, cố ý không dùng `Date` vì đi vòng qua `Date` sẽ diễn giải lại theo múi giờ máy chủ và lệch một ngày. Nếu nền tảng phục vụ nhiều múi giờ, `todayInVietnam()` phải nhận múi giờ của tenant làm tham số — đây là **chỗ duy nhất** hardcode `Asia/Ho_Chi_Minh` ngoài decorator `@Cron`.

---

## 6. Thông báo

Hiện là bảng `notifications` + chuông trong ứng dụng. Email/push đã **chủ động hoãn** (quyết định Q3 trong `plan_brd_2.md`).

Chỉ có **một** nơi ghi thông báo: `NotificationsService.createMany`, gọi từ `MaintenanceService.raiseTicket`. Muốn đẩy sang bus thông báo của nền tảng thì thay thân hàm đó là đủ — không cần sờ vào logic nghiệp vụ. Giữ lại bảng nếu vẫn muốn có chuông trong ứng dụng.

---

## 7. Frontend

Ứng dụng React 19 + Vite, không phải micro-frontend.

- **Địa chỉ API**: `VITE_API_URL` (`src/api/client.ts`), mặc định `http://localhost:3001`.
- **Token**: đang giữ trong `localStorage` (`workflowengine.accessToken`). Khi nhúng vào nền tảng, bỏ `AuthProvider` nội bộ và lấy token từ shell — sửa `getAccessToken()` là xong, interceptor không đổi.
- **Xử lý 401**: `registerUnauthorizedHandler` đang gọi logout nội bộ; trỏ về luồng đăng nhập lại của nền tảng.
- **Chưa có định tuyến theo URL** — điều hướng bằng state (`currentTab` trong `App.tsx`). Nhúng vào shell có router thì phải thêm react-router; ước lượng nhỏ nhưng không phải bằng không.
- **Phụ thuộc ngoài**: Material Symbols (icon) và Tailwind. Kiểm tra xung đột với design system của nền tảng.

---

## 8. Cạm bẫy khi migrate — đọc trước khi chạy lệnh

### 8.1. TypeORM luôn muốn xoá 2 index của `raci_assignments`

**Đã xảy ra 7 lần.** Mọi migration sinh tự động đều thêm vào `up()`:

```sql
DROP INDEX "IDX_raci_assignments_one_c_per_step"
DROP INDEX "IDX_raci_assignments_target"
```

…mà **không tạo lại**. Nguyên nhân: differ của TypeORM không diễn đạt được partial index (`WHERE role_letter = 'C'`) và `NULLS NOT DISTINCT`, nên lần nào cũng đọc nhầm là lệch schema.

Mất hai index này sẽ **âm thầm phá vỡ**:
- quy tắc "mỗi bước tối đa 1 người duyệt (C)",
- và lớp chặn gán thẻ trùng.

**Bắt buộc đưa vào quy trình:** mỗi migration sinh ra phải mở đọc bằng mắt; nếu chạm `raci_assignments` thì xoá 2 dòng `DROP INDEX` trong `up()` và 2 dòng `CREATE INDEX` tương ứng trong `down()`. Sau khi chạy, kiểm lại:

```bash
psql -c "SELECT indexname FROM pg_indexes WHERE tablename='raci_assignments';"
# phải còn: IDX_raci_assignments_one_c_per_step, IDX_raci_assignments_target
```

### 8.2. Phiên bản TypeORM

Ghim ở `typeorm@0.3.31`. Bản `1.x` đã gây **vòng lặp fork tiến trình chạy loạn** khi chạy `migration:generate`. Đừng nâng cấp mà không thử ở môi trường tách biệt.

### 8.3. `synchronize` luôn để `false`

Đã đặt sẵn trong `typeorm.config.ts`. Bật lên sẽ xoá đúng những index nói ở 8.1.

---

## 9. Cấu hình

`.env` hiện tại (xem `backend/.env.example`):

```
PORT, DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE
JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN
MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET, MINIO_REGION
```

Cần thêm khi lên SaaS: `TENANT_MODE`, `PLATFORM_JWKS_URL`, `PLATFORM_ISSUER`, `PLATFORM_AUDIENCE`, `SCHEDULER_ENABLED`.

Cần sửa trong `main.ts`:

- `app.enableCors({ origin: true })` — **đang cho phép mọi origin**. Phải đổi thành whitelist theo domain nền tảng.
- Chưa có global prefix. Nếu đứng sau gateway, thêm `app.setGlobalPrefix('api/workflow')`.
- `ValidationPipe` đã bật `whitelist: true` — giữ nguyên.
- `GET /health` có sẵn (`app.controller.ts`) nhưng **không kiểm tra kết nối DB/MinIO** — chỉ trả về 200 nếu tiến trình còn sống. Nếu nền tảng dùng nó làm readiness probe thì phải bổ sung kiểm tra phụ thuộc, nếu không pod sẽ được coi là sẵn sàng trong khi DB đã chết.

---

## 10. Thứ tự thực hiện

Mỗi mốc nên chạy được và kiểm chứng được trước khi sang bước sau.

| # | Việc | Xong khi |
|---|---|---|
| 1 | **Chốt mô hình tenancy** (mục 3) | Có văn bản quyết định. Mọi thứ sau phụ thuộc bước này |
| 2 | Deploy nguyên trạng vào hạ tầng nền tảng, một tenant nội bộ | `npm run migration:run` + `npm run seed` chạy sạch; đăng nhập được |
| 3 | Siết CORS, thêm global prefix, đưa cron ra bản chạy riêng | Quét bảo trì chỉ chạy đúng một lần mỗi đêm |
| 4 | Thay auth bằng SSO (mục 4) | Token nền tảng gọi được API; `users` thành bảng chiếu; bỏ `password_hash` |
| 5 | Áp tenancy (mục 3) | Hai tenant cùng tồn tại, **có kiểm thử tự động chứng minh không nhìn thấy dữ liệu của nhau** |
| 6 | Đổi MinIO sang object storage của nền tảng, thêm prefix tenant | Tải lên/tải về chạy; IAM policy chặn được chéo tenant |
| 7 | Nối thông báo vào bus của nền tảng (mục 6) | Phiếu bảo trì đến hạn đẩy được ra kênh của nền tảng |
| 8 | Nhúng frontend (mục 7) | Chạy trong shell, dùng token của shell |

**Kiểm chứng tối thiểu ở mỗi mốc** (đã là thói quen của dự án này):

```bash
cd backend && npx jest && npx tsc --noEmit    # 70 test
cd .. && npm run lint                          # tsc frontend
psql -c "SELECT indexname FROM pg_indexes WHERE tablename='raci_assignments';"
```

---

## 11. Những thứ **không** nên đụng vào

Đây là các bất biến đã được kiểm chứng bằng test và bằng chạy thật; sửa chúng sẽ phá vỡ hành vi nghiệp vụ:

- **`OrgUnitsService.resolveAssignees`** — nguồn sự thật duy nhất cho "thẻ RSACIE này giao cho ai", dùng chung bởi tạo đơn, validate RACI và thông báo bảo trì. Escalation (ghế trống đẩy lên cấp trên) nằm ở đây.
- **`OrgUnitsService.findSubordinates`** — nguồn sự thật duy nhất cho "ai là cấp dưới", dùng chung bởi uỷ quyền và phân rã `E(x)`. Đã từng có hai bản sao lệch nhau và gây lỗi thật.
- **`distributeWeights`** trong `execution/weights.ts` — giải quyết mâu thuẫn số học của BRD (3 việc × 33.33% ≠ 100%). Có 7 test riêng, gồm cả chống trôi số thực.
- **Tính lại kỳ hạn từ `anchor_date` mỗi lần quét**, không cộng dồn từ `next_due_at` — đây là thứ giúp cron chết vài ngày rồi tự bắt kịp.
- **`ActivityService.record` không bao giờ ném lỗi** — nhật ký kiểm toán không được phép làm hỏng chính hành động nó đang ghi.
- **Sinh luồng con chạy SAU khi transaction commit**, chống trùng theo từng bước qua `task_step_instances.linked_sub_flow_task_id`.

---

## 12. Việc còn dang dở (không phải nợ kỹ thuật do tích hợp)

- **React Flow Canvas** (BRD Epic 4) — chủ động hoãn. `CanvasView` vẫn dùng dữ liệu giả.
- **Submitter** (gửi yêu cầu qua luồng triage) — vẫn mock.
- **Email/push** — hoãn theo quyết định Q3.
- **Chưa có kiểm thử tự động cho frontend** — chỉ có `tsc`. Backend có 70 test.
- **Chưa từng kiểm chứng bằng trình duyệt thật** trong suốt quá trình phát triển (môi trường không có automation). Tính đúng đắn của logic và API đã được kiểm; **giao diện thì chưa**.
