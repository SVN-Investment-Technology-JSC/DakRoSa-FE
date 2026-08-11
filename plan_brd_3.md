Dưới đây là Tài liệu Đặc tả Yêu cầu (BRD) đã được cập nhật và bổ sung các logic mới về UI, lưu trữ JSON cho danh sách công việc, cũng như các tùy chọn phân quyền cho Role E dựa trên các hình ảnh mockup bạn cung cấp.

# TÀI LIỆU ĐẶC TẢ YÊU CẦU (BRD)

**Dự án / Phân hệ:** Hệ thống Dynamic Workflow Engine - Mở rộng Module Quản lý & Bảo trì Thiết bị (CMMS)
**Trạng thái:** Phiên bản Cập nhật (Tích hợp UI & Logic Role E)

---

## 1. Tổng quan Phân hệ (Overview & Business Value)

Hệ thống Workflow Engine được mở rộng thêm phân hệ Quản lý Tài sản và Bảo trì (CMMS). Phân hệ này cho phép số hóa toàn bộ vòng đời của thiết bị trong nhà máy thông qua 3 trụ cột cốt lõi:

1. **Cây cấu trúc tài sản (Asset Hierarchy):** Quản lý phân cấp từ Công ty -> Nhà máy -> Phân hệ -> Cụm chi tiết.
2. **Ma trận lập lịch bảo trì (Maintenance Grid):** Điều phối các tác vụ bảo trì định kỳ thông qua giao diện ma trận thời gian và liên kết trực tiếp với Luồng thực thi. Cấu hình chi tiết danh sách nhiệm vụ được lưu trữ dạng JSON.
3. **Điều phối Thực thi (Execution Matrix):** Định nghĩa luồng công việc thực tế với Role E (Execute), cho phép linh hoạt lấy dữ liệu công việc từ cấu hình gốc của thiết bị hoặc thiết lập thủ công.

---

## 2. Kiến trúc Dữ liệu & Cấu trúc phân cấp (Data Hierarchy)

Hệ thống bắt buộc tuân thủ cấu trúc cây đa cấp (Nested Tree) để quản lý thiết bị:

* **Level 1:** Company (Công ty).
* **Level 2:** Factory / Infrastructure (Nhà máy).
* **Level 3:** Main Equipments (Phân hệ thiết bị chính).
* **Level 4:** Parts (Bộ phận/Chi tiết lồng nhau).

---


## 3. Chi tiết Yêu cầu Chức năng (Functional Requirements)

### Epic 1: Quản lý Cấu trúc & Điều hướng Thiết bị

**User Story 1.1: Điều hướng Sơ đồ Thiết bị (Navigation)**
Là System Admin, tôi muốn truy cập nhanh vào Cây cấu trúc thiết bị từ thanh điều hướng chính của hệ thống.

* **AC 1 (Thêm Menu Navigate):**
* Hệ thống hiện tại có thanh điều hướng bên trái bao gồm các mục: Workspace, Ma trận RCSI (RACI), Sơ đồ Tổ chức, và Bảng Bảo trì & Cảnh báo.
* Bổ sung thêm menu "Sơ đồ thiết bị" vào thanh điều hướng này.
* Menu "Sơ đồ thiết bị" dùng để hiển thị và lưu trữ toàn bộ cây cấu trúc thiết bị (từ Công ty đến các Parts con).



### Epic 2: Cấu hình Ma trận Bảo trì Ngăn ngừa (Maintenance Grid)

**User Story 2.1: Lập lịch và Cấu hình Luồng Thực thi (Execution Workflow Config)**
Là Admin, tại màn hình cấu hình lịch bảo trì, tôi muốn gán Luồng thực thi và khai báo chi tiết danh sách công việc cho từng thiết bị.

* **AC 1 (Hiển thị Ma trận Bảo trì):**
* Giao diện "Ma trận bảo trì thiết bị" hiển thị danh sách thiết bị kèm các cột chu kỳ: Ngày, Tuần, Tháng, Quý, Năm.
* Bảng hiển thị thêm cột "Luồng Thực thi khi tạo Lệnh" ở ngoài cùng bên phải để map thiết bị với quy trình tương ứng (VD: WF-EXEC - Luồng Thực thi & Nghiệm thu).


* **AC 2 (Cấu hình chi tiết Công việc - JSON Storage):**
* Tại cột "Luồng Thực thi khi tạo Lệnh", tích hợp thêm 1 nút/action "Thêm thông tin công việc".
* Khi click, hiển thị popup cho phép Admin khai báo: "Danh sách nhiệm vụ" và "Thời gian thực hiện từng nhiệm vụ".
* **Data Requirement:** Toàn bộ thông tin công việc này bắt buộc phải được hệ thống lưu trữ dưới định dạng `JSON` gắn liền với ID của thiết bị đó.
* Mỗi khi hệ thống trigger tạo Work Order bảo trì cho thiết bị này, payload sinh ra lệnh làm việc sẽ tự động đính kèm chuỗi JSON này.



### Epic 3: Điều phối Thực thi tại Node E (Role E Matrix Configuration)

**User Story 3.1: Gán quyền và Nguồn dữ liệu cho Role E**
Là Quản lý cấu hình luồng, tôi muốn linh hoạt chọn cách thức giao việc tại bước Thực thi (Role E) dựa trên dữ liệu cấu hình sẵn của thiết bị hoặc nhập tay.

* **AC 1 (Hiển thị Bảng cấu hình Thực thi):**
* Hệ thống cung cấp giao diện "Ma trận RSACIE".
* Giao diện này bao gồm "Bảng 2: Luồng Thực Thi Bảo Trì" dùng để thiết lập các bước (VD: 1-Thực thi công việc, 2-Nghiệm thu kết quả) và gán các Role (E, C) cho các khối/ban tương ứng.


* **AC 2 (Dropdown Tùy chọn gán Role E):**
* Khi Admin click vào gán quyền cho Role `E` tại Bảng 2, hệ thống hiển thị Dropdown menu gồm 3 tùy chọn:
1. `Mặc định theo thiết bị`
2. `Nhập danh sách công việc`
3. `Thiết lập thủ công`




* **AC 3 (Validation tùy chọn "Mặc định theo thiết bị"):**
* Hệ thống kiểm tra dữ liệu liên kết giữa Work Order hiện tại và Thiết bị.
* **NẾU** thiết bị đó KHÔNG có dữ liệu JSON (Danh sách nhiệm vụ & thời gian) được cấu hình từ bảng "Ma trận bảo trì thiết bị" (User Story 2.1): Tùy chọn `Mặc định theo thiết bị` sẽ bị mờ (disabled) và không thể click.
* **NẾU** có dữ liệu JSON: Tùy chọn có hiệu lực. Khi chọn, Task $E(x)$ sinh ra sẽ tự động lấy chính xác các đầu việc từ file JSON này để giao cho nhân viên.



### Epic 4: Bảng Theo dõi & Cảnh báo Bảo trì (Maintenance Dashboard)

**User Story 4.1: Giám sát Phiếu nhắc bảo trì**
Là Quản lý bảo trì, tôi muốn có một Dashboard tổng hợp để theo dõi các mức độ khẩn cấp của lịch bảo trì.

* **AC 1 (Hiển thị Thống kê):**
* Giao diện "Bảng Bảo trì & Cảnh báo" cung cấp các thẻ tóm tắt số lượng: Phiếu khẩn, Phiếu chưa xử lý, và Đã tạo lệnh công việc.


* **AC 2 (Danh sách Phiếu nhắc):**
* Hệ thống liệt kê các "Phiếu nhắc bảo trì" hiển thị thông tin: Số phiếu, Thiết bị, Đơn vị phụ trách, Hạn, Mức, Ưu tiên và Thao tác.
* Cột "Thao tác" cho phép người dùng click "Tạo Lệnh công việc" hoặc xem trạng thái "Đã tạo Lệnh". Lệnh công việc này khi sinh ra sẽ kế thừa luồng Thực thi và cấu hình JSON đã thiết lập ở Epic 2 & 3.


### Cấu trúc khuyến nghị:
Dưới đây là chi tiết văn bản được trích xuất (OCR) từ 2 hình ảnh bạn đã cung cấp, được sắp xếp theo bố cục của từng ảnh:

### 1. Hình ảnh "image_60c85c.jpg"

**Phần Cây cấu trúc:**

* Company
* .... Factory/infrastructure
* .... Main equipments
* :
* :.... Parts....
* Parts....
* :
* :..




* .... Main equipments
* Parts....
* Parts....




* .... Main equipments
* Parts....
* Parts....




* .... Main equipments
* Parts....
* Parts....






* .... Factory/infrastructure



**Khung thông tin chi tiết thiết bị:**

* **Part A:**
* * Kí hiệu:.....


* * Tình trạng: Đang vận hành/hỏng/Dự phòng/ khác


* * Vị trí:địa điểm - Kho


* * Thông số chính: Thông số kỹ thuật/vật liệu/Quy cách


* * Nhà sản xuất


* * Time line bảo dưỡng/sửa chữa/sự cố


* Tài liệu kèm theo:
* * Manual/Datasheet


* * Biên bản thử nghiệm (nếu có)


* * CO/CQ


* * Test report


**Bảng "Quy cách đặt tên"**


| Mã cty | Mã Factory | Tên tắt Main parts | Tên tắt Sub parts | Tên tắt Sub parts | Thứ tự parts |
| --- | --- | --- | --- | --- | --- |
|  |  | T - Tuabin | S - Buồng xoắn |  |  |
|  |  | G - Máy phát | Gu - Cánh Hướng |  |  |
|  |  | G - Điều tốc | Sh - trục |  |  |
|  |  | E - Kích từ | Be - Ổ đỡ |  |  |
|  |  | W - Nước | Ro - Roăng |  |  |
|  |  | P - Bảo vệ | LG - Chốt cánh hướng |  |  |
|  |  | C - Điều khiển | Di - Ống xả |  |  |

**Phần giới hạn cấp bậc (Dưới bảng đặt tên):**

* 1 Main parts <------------------------> 5 sub-parts

**Phần Ví dụ và Mục tiêu (Bên phải phía dưới):**

* Ví dụ:
* SB-KD-T-S-01
* SB-KD-T-Gu-01
* SB-KD-T-Sh-Ro-01
* SB-HN-T-Sh-Ro-02

**Khung thông tin công việc theo thiết bị **
    Được lưu theo cấu trúc json để dễ xuất/đọc dư liệu, trích xuất task


---

## Nhật ký triển khai (cập nhật khi code)

Toàn bộ 4 Epic của BRD 3 **đã triển khai xong** và kiểm chứng end-to-end trên DB/API thật. Không có tính năng nào của BRD 1/BRD 2 bị bỏ.

### Quyết định kiến trúc

- **Cây tài sản lồng ngay trong `maintenance_parts`** (thêm `parent_id` + `asset_kind`), không tách bảng `assets` riêng. Lý do: mọi thứ đã khoá theo `maintenance_parts.id` (lịch bảo trì, phiếu nhắc, Lệnh công việc), nên tách bảng chỉ thêm một tầng join mà không đổi lại được gì. Thiết bị seed từ BRD 2 mặc định thành `asset_kind = 'part'` đứng ở gốc → chạy y nguyên.
- **`maintenance_parts.org_unit_id` chuyển sang nullable.** Node Công ty / Nhà máy không nhất thiết thuộc tổ nào. Chỗ nào cần đơn vị thật (`setSchedules`, `raiseTicket`, `createWorkOrder`) gọi `MaintenanceService.resolveOrgUnitId`, leo ngược cây tìm tổ tiên gần nhất có khai; không tìm ra thì chặn kèm lý do thay vì tạo lịch chạy vào hư không.
- **`manual` lưu thành NULL** ở `raci_assignments.e_task_source`. Tag E cũ (chưa từng khai gì) và tag E chọn "Thiết lập thủ công" là cùng một hành vi, nên không để chúng thành hai trạng thái khác nhau.
- **Cấu hình Role E đông cứng vào `task_step_instances` lúc tạo đơn** (`e_task_source` + `e_task_list`), và JSON thiết bị **chép** vào `task_instances.equipment_task_template`. Đọc lại từ template lúc chạy sẽ khiến một đơn dở dang đổi cách giao việc chỉ vì ai đó sửa ma trận.
- **Validation "Mặc định theo thiết bị"** (US 3.1 AC3) đặt lại thành câu hỏi trả lời được lúc thiết kế: *có thiết bị nào trỏ vào luồng này và đã khai JSON chưa*. Backend trả cả cờ `enabled` lẫn `disabledReason` qua `GET /workflows/:id/e-task-source-options`, nên giao diện không tự suy đoán điều kiện. Kiểm lại lần nữa lúc lưu — giao diện không phải là hàng rào.

### Thay đổi schema — migration `AssetHierarchyAndTaskTemplate1786400512004` (viết tay)

| Bảng | Cột thêm |
|---|---|
| `maintenance_parts` | `parent_id`, `asset_kind`, `symbol`, `condition`, `location`, `specifications`, `manufacturer`, `task_template` (jsonb); `org_unit_id` → nullable |
| `task_instances` | `maintenance_part_id`, `equipment_task_template` (jsonb) |
| `raci_assignments` | `e_task_source`, `e_task_list` (jsonb) + CHECK chỉ cho phép trên tag `E` |
| `task_step_instances` | `e_task_source`, `e_task_list` (jsonb) |

> Viết tay vì cùng lý do đã ghi ở `MaintenanceModule1786322987516`: differ của TypeORM không đọc được hai index raw-SQL trên `raci_assignments` nên lần nào cũng đòi DROP. File này cũng đặt tên tay cho CHECK constraint. **Phải soi bằng mắt trước khi chạy `migration:generate`.**

### Endpoint mới

- `GET /maintenance-parts/tree` — cây tài sản lồng sẵn
- `DELETE /maintenance-parts/:id` — xoá cả nhánh, chặn khi còn phiếu bảo trì
- `PUT /maintenance-parts/:id/task-template` — khai JSON danh sách nhiệm vụ
- `GET /workflows/:id/e-task-source-options` — 3 tùy chọn + tính khả dụng của `device_default`
- `GET /tasks/:taskId/steps/:stepId/subtasks/suggested` — đầu việc gợi ý cho Node E theo nguồn đã chốt

### Giao diện

`AssetTreeView.tsx` (mới) · `MaintenanceConfigView` (+ modal "Thêm thông tin công việc", thụt lề theo cây) · `RsacieMatrixView` (+ `ETaskSourcePanel`, badge `TB`/`DS` trên ô E) · `ExecutionPanel` (+ khung nguồn công việc, đổ sẵn dòng phân rã, nút "Nạp lại từ cấu hình") · `SideNavBar`/`App` (+ tab `asset-tree`, nằm trong khu Admin).

### Đã kiểm chứng

`tsc --noEmit` sạch cả hai phía; `npm test` 77/77 pass (thêm 3 test mới cho BRD 3 trong `maintenance.service.spec.ts`); migration + seed chạy trên Postgres thật. Kiểm qua `curl`: lưu/gỡ JSON và chặn trùng tên + thời gian ≤ 0; chặn đặt sai cấp trong cây; chặn Nhà máy ở gốc; chặn lồng quá 5 cấp `part`; xoá nhánh cascade; 3 tùy chọn Role E gồm cả trạng thái mờ và chặn phía server; **chuỗi đầy đủ**: quét bảo trì → phiếu → Tạo Lệnh công việc → JSON 4 nhiệm vụ của Buồng xoắn đi vào `equipmentTaskTemplate` → `GET .../suggested` trả đúng 4 việc → phân rã `E(x)` tổng trọng số 100; và nhánh biên `device_default` + thiết bị không có JSON → trả `unavailableReason` thay vì mảng rỗng câm.

**Chưa làm**: chuyển nhánh (đổi `parentId` của một node đã tạo) — cùng lý do với reparenting của Sơ đồ Tổ chức, là thao tác riêng chứ không phải một field của form sửa. Tạo/xoá đã đủ để dựng cây.

---

## Siết đích gán vai trò + hiện tên người (phản hồi sau BRD 3)

Bốn sửa đổi, không cần migration — chỉ đổi luật validate và dọn dữ liệu qua seed.

### 1. Bỏ cấp "Chức vụ" khỏi ma trận

Đích gán chỉ còn `orgUnitId` (đơn vị → trưởng đơn vị) hoặc `orgUnitId + userId` (cá nhân). `RaciService.replaceCellAssignments` từ chối `positionId`; frontend xoá `inheritedByLeaf`/`InheritedTag` trong `rsacie/columns.ts` và bỏ `positionId` khỏi `CellTarget`/`RaciCellTarget`.

Cột `raci_assignments.position_id` **vẫn giữ trong schema** — bỏ cột là một migration phá huỷ để đổi lấy đúng một cột nullable không ai ghi vào nữa. Seed xoá các dòng còn sót.

### 2. Đơn vị chưa có trưởng không phải đích gán hợp lệ

`replaceCellAssignments` chặn tag mức đơn vị khi `orgUnit.headUserId` rỗng. Cố ý **không** mượn `resolveUnitHead` ở đây: escalation là lưới an toàn lúc CHẠY (trưởng nghỉ giữa chừng), dùng nó lúc THIẾT KẾ sẽ biến một ô cấu hình sai thành một ô im lặng chạy sai người. `resolveAssignees` giữ nguyên.

Vẫn cho lưu `tags: []` để gỡ được tag cũ — nếu không, ô sai sẽ mắc kẹt vĩnh viễn.

### 3. Lọc quy trình theo chữ S ở màn hình tạo đơn

`GET /workflows?submittableByMe=true` → `WorkflowsService.filterSubmittableBy`, phân giải mỗi tag S qua `OrgUnitsService.resolveAssignees` (dùng chung luật với lúc tạo đơn: S gán cho một Ban là cả Ban kể cả các Tổ bên dưới). `TasksService.create` gọi `assertSubmittableBy` → **403**, chỉ với `origin: 'manual'`; `auto_from_parent` và `work_order` không có người đề xuất nào để kiểm.

`WorkflowsModule` nhận thêm `OrgUnitsModule` + repository của `RaciAssignment`. Không import `RaciModule` vì module đó đã phụ thuộc ngược lại `WorkflowsModule`.

### 4. `roleAssignedSummary` ghi tên người

`TasksService.create` phân giải người nhận **một lần**, dùng chung cho câu tóm tắt lẫn `task_step_assignees` — trước đây câu tóm tắt dựng từ tên đơn vị, tính riêng, nên hai chỗ có thể nói khác nhau. Định dạng: `C: Nguyễn Văn Tuấn — Khối Kỹ thuật`, người được escalate kèm `(xử lý thay)`.

Chuỗi này đông cứng lúc tạo đơn nên đơn cũ vẫn giữ nội dung cũ. Frontend vì thế dựng lại từ `step.assignees` (`describeStepOwners` trong `WorkspaceView.tsx`), chỉ rơi về `roleAssignedSummary` khi một bước không có người nhận nào — đơn tạo trước thay đổi này cũng hiện đúng tên.

### Đã kiểm chứng

`tsc --noEmit` sạch cả hai phía; `npm test` 77/77 pass; seed chạy trên Postgres thật (gỡ 1 tag chức vụ + tag trỏ vào Tổ QA). Kiểm qua `curl` trên API thật: gán cho đơn vị chưa có trưởng → 400 kèm lý do, gán cho cá nhân trong chính đơn vị đó → OK, gán theo chức vụ → 400, gán cho đơn vị có trưởng → OK (hoàn tác sau khi thử); `submittableByMe` trả đúng theo từng người (`lead.dev`/`officer` → WF-CAPEX, `ky.thuat1` → HP, `auditor`/`truong.co.dien`/`admin` → rỗng); `auditor` tạo đơn WF-CAPEX → 403, `lead.dev` tạo → thành công và 4 bước đều ghi tên người.

### Chưa làm

Chưa có màn hình bổ nhiệm trưởng đơn vị (`org_units.head_user_id` sửa được qua `PATCH /org-units/:id` nhưng `OrgChartView` chưa có ô chọn) — thông báo lỗi hiện chỉ dẫn người dùng sang Sơ đồ Tổ chức, mà ở đó vẫn phải gọi API tay. Đây là cùng một khoảng trống "chưa có picker chọn người" đã ghi từ bước 7.

---

## Quản lý nhân sự trên Sơ đồ Tổ chức

Đóng nốt khoảng trống "chưa có picker chọn người" đã ghi từ bước 7 và nhắc lại ở mục trên.

### Endpoint mới

- `GET /users?search=` — danh bạ, trả shape gọn `UserDirectoryEntry` (`roles` là eager nên trả nguyên entity sẽ kéo theo cả cây quyền mỗi lần gõ tìm kiếm).
- `POST /users` — tạo tài khoản, mặc định quyền `approver`. Người được đưa vào sơ đồ tổ chức là để xử lý việc; thiếu `task.approve` thì họ nhận việc rồi đứng im, một cái bẫy chỉ lộ ra lúc đơn đã chạy tới bước của họ.

Cả hai đòi `org.manage` chứ không chỉ đăng nhập: đây là toàn bộ danh bạ, và nơi tiêu thụ duy nhất là màn hình quản trị tổ chức (vốn đã chỉ admin thấy). `UsersModule` nhận thêm `RbacModule` + `forwardRef(() => AuthModule)` — AuthModule đã import UsersModule cho JWT strategy nên chiều ngược lại phải forwardRef.

**Tìm kiếm lọc trong bộ nhớ, không dùng `ILIKE`.** Postgres không phân biệt HOA/thường nhưng **có** phân biệt dấu, nên "tuan" không ra "Tuấn" — mà gõ không dấu mới là cách người dùng thật sự tìm. Bỏ dấu hai phía trong SQL cần extension `unaccent` + một migration, chỉ để phục vụ ô tìm kiếm của một danh bạ nội bộ cỡ vài trăm người.

### Giao diện

`UnitPeopleModal.tsx` (mới) — bổ nhiệm/đổi/gỡ trưởng, thêm/gỡ nhân sự, tạo tài khoản mới rồi thêm luôn vào đơn vị đang mở. `OrgChartView` liệt kê nhân sự trên từng thẻ (nạp một lượt bằng `useManyOrgUnitMembers` cho cả cây, thay vì nạp lười theo thẻ thành chuỗi request nối đuôi), thêm nút 👥, và biến dòng "chưa có trưởng" thành nút mở thẳng bảng nhân sự.

Trưởng đơn vị và danh sách nhân sự tách riêng có chủ ý vì hệ thống đối xử khác nhau: `head_user_id` là người nhận vai trò khi ma trận gán cho cả đơn vị, còn `org_unit_members` là danh sách để phân rã việc xuống và để chữ S lan tới cả đơn vị.

### Lỗi thật phát hiện khi kiểm chứng

`PATCH /org-units/:id` với `headUserId: null` **không gỡ được trưởng**. `OrgUnitsService.update` nạp entity kèm quan hệ `head` (`findOne` có `relations: ['type','head']`), rồi `Object.assign(unit, dto)` + `save()`. TypeORM thấy `unit.head` vẫn trỏ vào User cũ nên tính lại khoá ngoại từ object đó, ghi đè `null` trở về id cũ — im lặng, không lỗi. Đúng cùng cái bẫy đã ghi ở `WorkflowRequestsService.triage`.

Sửa sang `repository.update(id, patch)` với patch dựng tay, phân biệt `null` (gỡ) với `undefined` (không đụng tới trường đó).

### Đã kiểm chứng

`tsc --noEmit` sạch cả hai phía; `npm test` 77/77 pass. Kiểm qua `curl` trên API thật: tạo tài khoản (`Trịnh Thu Hà` → avatar `TH`, quyền `approver`), chặn trùng email, chặn mật khẩu < 6 ký tự; tìm không dấu `tuan` → `Nguyễn Văn Tuấn`, `ha` → 5 người kể cả `Đặng Hải Yến`/`Đỗ Minh Khang`; **chuỗi đầy đủ**: thêm người vào Tổ QA → bổ nhiệm trưởng → gán R cho cả Tổ QA thành công (trước đó bị chặn đúng theo luật mới) → gỡ trưởng → xác nhận `headUserId` về `null` → đổi `title` không đụng tới `head`. Dữ liệu thử đã dọn, DB trở về đúng trạng thái seed.

### Chưa làm

Đổi tên / vô hiệu hoá đơn vị và **chuyển nhánh** vẫn chưa có nút trên giao diện (`PATCH /org-units/:id` đã đủ cho hai việc đầu). Xoá hoặc vô hiệu hoá tài khoản người dùng chưa có endpoint — chỉ tạo được.
