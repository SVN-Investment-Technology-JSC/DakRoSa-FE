# Reconcile implementation with BRD "Dynamic Workflow Engine (Ma trận RCSI)"

> Nguồn: `docs/BRD - Dynamic Workflow Engine (Ma trận RCSI).pdf`. Đây là kế hoạch đối chiếu & thay đổi giữa hệ thống hiện tại và BRD này (đã được duyệt). Tiến độ thực hiện từng mục sẽ được cập nhật trực tiếp trong file này.

## Context

BRD này trước đó đã bị chủ động gạt sang một bên trong phiên làm việc ("ignore BRD, keep continue implement approved plan"). Người dùng nay đảo ngược quyết định đó: muốn đối chiếu và điều chỉnh hệ thống theo đúng BRD, với **một ngoại lệ tường minh — Role A phải được giữ lại** dù BRD chỉ định nghĩa S/R/C/I, vì đây là bổ sung bắt buộc đã được yêu cầu trước đó trong phiên.

Ba câu hỏi phạm vi đã được hỏi và trả lời:
1. **Giữ nguyên mô hình 6 chữ cái** (R/A/C/S/I/E) và 3 loại workflow (process/maintenance_linked/maintenance_direct) — BRD im lặng về Executor/maintenance không có nghĩa là phải xóa bỏ tính năng đã xây và test xong.
2. **Chuyển UI ma trận RACI sang đúng mô hình sổ ngang đa cấp của BRD** (cột Phòng thu gọn → bấm [+] → hiện cột Tổ con → bấm [+] tiếp → hiện cột cá nhân/lá), thay thế thiết kế hiện tại ("chỉ cột Cấp 1 + tag đa vai trò" — vốn là kiến trúc của plan gốc trước đó, không phải của BRD).
3. **Lượt này bao gồm**: sửa AND-logic (nhiều người giữ R phải duyệt hết mới sang bước), sửa Escalation (ghế trống tự đẩy lên cấp trên), và Delegation (người giữ R/C có thể giao việc cho cấp dưới). **React Flow Canvas (Epic 4 của BRD) chủ động hoãn lại** — không nằm trong lượt này.

Kế hoạch này chỉ đụng tới: schema/service `raci_assignments`, `ApprovalsService`, `TasksService`/`TaskStepAssignee`, `OrgUnitsService`, và `RaciMatrixView.tsx` + phần `ApprovalPanel` trong `WorkspaceView.tsx`. `plan.md` và `walkthrough.md` (hai tài liệu theo dõi tiến độ sống của dự án) sẽ được cập nhật sau khi hoàn thành mỗi mục.

## 1. Đổi schema RACI: gán vai trò trực tiếp vào bất kỳ cấp đơn vị nào

**Vì sao**: Mô hình TH1/TH2 của BRD (Epic 2, User Story 2.1) gán một chữ cái vai trò hoặc tại cột phòng ban đang thu gọn (tự động route tới Trưởng phòng), hoặc tại cột đã sổ xuống tới cấp cá nhân/lá (route đích danh người đó) — cả hai đều là "gán trực tiếp vào bất kỳ node nào cột đang đại diện." Schema hiện tại (`column_org_unit_id` ép buộc Cấp 1 + `target_org_unit_id` tùy chọn ở Cấp 2/3) là kiến trúc của plan đã duyệt *trước đó*, không phải của BRD. Bỏ ràng buộc Cấp 1 và trường `target` riêng biệt khiến schema khớp thẳng với BRD và còn *đơn giản hơn*.

- **Migration**: trên `raci_assignments`, đổi tên `column_org_unit_id` → `org_unit_id`, xóa `target_org_unit_id` (và FK), đổi unique index từ `(step_id, column_org_unit_id, target_org_unit_id, role_letter)` thành `(step_id, org_unit_id, role_letter)`. Thêm **partial unique index** để ép buộc BRD Epic 2 AC2 ("mỗi bước chỉ được phép có tối đa 1 người duyệt (Chữ C)") ở tầng DB: `CREATE UNIQUE INDEX ... ON raci_assignments(step_id) WHERE role_letter = 'C'`.
- **Entity `RaciAssignment`**: đổi tên `columnOrgUnitId`/`columnOrgUnit` → `orgUnitId`/`orgUnit`, bỏ hẳn `targetOrgUnitId`/`targetOrgUnit`.
- **`RaciService.replaceCellAssignments`**: bỏ check `column.level !== 1` và check "target phải là con cháu của column" (không còn ý nghĩa — giờ cấp nào cũng hợp lệ). Thêm check tường minh ở service (thông báo lỗi đẹp, hỗ trợ cho DB constraint): nếu tag mới là `roleLetter==='C'`, kiểm tra không có row `raci_assignments` khác trên cùng `step_id` với `roleLetter='C'` và `org_unit_id` khác; nếu có, ném lỗi 400 đúng câu của BRD.
- **DTO**: `columnOrgUnitId` → `orgUnitId`; bỏ `targetOrgUnitId` khỏi `RaciTagDto`.
- **`TasksService.create`**: resolve assignee đơn giản hóa từ `a.targetOrgUnitId ?? a.columnOrgUnitId` thành `a.orgUnitId`.
- **Seed data**: cấu trúc RACI trong `WORKFLOWS` đổi từ `{columnKey, tags:[{targetKey, roleLetter, fixedRollbackStepKey}]}` sang `{orgUnitKey, roleLetter, fixedRollbackStepKey?}` — mỗi tag một row. Việc này cũng *sửa* luôn sai lệch đã ghi chú trước đó (bước 1 của `S` từng phải mô hình hóa gượng ép qua column=Khối+target=Ban; nay trực tiếp là `orgUnitKey: 'ban-phat-trien'`).
- **Frontend**: cập nhật `ApiRaciAssignment` (bỏ trường target, đổi tên column→org unit) và `RaciTagInput`.

## 2. AND-logic: bước có nhiều người giữ R phải duyệt hết

**Vì sao**: BRD Epic 3 / User Story 3.3. Hiện `ApprovalsService.approveStep` hoàn tất & chuyển bước ngay khi CÓ MỘT hành động duyệt thành công đầu tiên, bất kể có bao nhiêu assignee khác — sai lệch thật sự khi một bước có thể có nhiều đơn vị được gắn tag R (điều mà schema mới ở mục 1 làm cho dễ dàng tạo ra).

- **`ApprovalsService`**: inject thêm repository `TaskStepAssignee`. Trong `approveStep`, sau khi ghi `approval_actions`:
  1. Lấy toàn bộ `task_step_assignees` của bước này có `roleLetter === 'R'` → `rAssignees`.
  2. Nếu `rAssignees.length <= 1`, hành xử y hệt hiện tại (hoàn tất + chuyển bước ngay).
  3. Nếu `rAssignees.length > 1`: query `approval_actions` của bước này với `action='APPROVE' AND roleLetterActedAs='R'`, lấy danh sách `actorUserId` duy nhất. Nếu đủ hết mọi `rAssignees[i].userId` → hoàn tất + chuyển bước như cũ. Nếu chưa đủ → cập nhật `progress = round(100 * approvedCount / rAssignees.length)` và **không** đánh dấu Completed / chuyển bước — bước vẫn `In Progress`.
- **Test**: thêm case vào `approvals.service.spec.ts` — bước có 2 người giữ R: duyệt lần 1 → vẫn In Progress, progress một phần; duyệt lần 2 (người khác) → hoàn tất, chuyển bước.

## 3. Escalation: ghế trống tự động đẩy lên cấp trên

**Vì sao**: BRD Epic 3 / User Story 3.1 AC2. Hiện tại `TasksService.create` âm thầm bỏ qua (continue) bất kỳ RACI assignment nào có đơn vị resolve ra không có `headUserId` — nghĩa là một bước có thể kết thúc với **0 assignee**, bị kẹt vĩnh viễn (không ai qua được `RaciActionGuard`). Đây là lỗi thật, độc lập với BRD, đã tái hiện được ngay trong seed data hiện tại (Tổ Backend/QA không có head).

- **`OrgUnitsService`**: thêm `findAncestors(orgUnitId): Promise<OrgUnit[]>` — query bảng `org_unit_closure` (đã có sẵn), trả về tổ tiên gần nhất trước.
- **`TasksService`**: thay việc đọc `.headUserId` trực tiếp bằng `resolveAssignee(orgUnitId)`: có head → dùng luôn (`isEscalated: false`); không có → đi ngược `findAncestors`, dùng tổ tiên gần nhất có head (`isEscalated: true`); không tìm thấy ai tới tận gốc → trả `null` (ghi log cảnh báo).
- **Entity `TaskStepAssignee`**: thêm cột `isEscalated: boolean` (mặc định `false`) — chính là yêu cầu "gắn tag 'Xử lý thay thế'" của BRD. Migration mới.
- **Frontend**: hiển thị badge nhỏ "⬆️ Xử lý thay thế" khi `isEscalated=true`.
- **Test**: unit test cho `resolveAssignee` — case có head trực tiếp, escalate lên cha, escalate lên ông.

## 4. Delegation: người giữ R/C giao việc cho cấp dưới

**Vì sao**: BRD Epic 3 / User Story 3.2.

- **Endpoint mới** (trong `ApprovalsController`, dùng chung guard với approve/reject):
  - `GET /tasks/:taskId/steps/:stepId/delegation-candidates` — tìm đơn vị mà người gọi đang là Trưởng bộ phận, tìm con cháu qua closure table, trả về Trưởng bộ phận của các đơn vị con cháu đó làm candidate.
  - `POST /tasks/:taskId/steps/:stepId/delegate` `{ toUserId }` — bắt buộc người gọi đang giữ R hoặc C ở bước đó; validate `toUserId` nằm trong danh sách candidate; trong 1 transaction: xóa row `task_step_assignees` của người gọi, thêm row mới cho `toUserId` với `delegatedFromUserId` = người gọi.
- **Entity `TaskStepAssignee`**: thêm `delegatedFromUserId: uuid nullable` + relation (cùng migration với mục 3).
- **`TasksService.findOne`**: include relation `delegatedFromUser` để UI hiện "Được giao bởi {tên}".
- **Frontend**: thêm hook + nút "Giao việc" trong `ApprovalPanel`, chỉ hiện khi người dùng đang giữ R hoặc C ở bước hiện tại.
- **Ghi chú phạm vi**: không làm bảng audit riêng cho delegation — trường `delegatedFromUserId` là đủ theo đúng yêu cầu của BRD.
- **Test**: unit test cho candidate resolution và cho transaction delegate.

5. Viết lại CrasiMatrixView: Cột sổ ngang đa cấp theo cấu trúc Tổ chức -> Chức vụ (Lần thiết kế thứ 3)
Vì sao: Khớp với BRD Epic 2 (User Story 2.1 & 2.2), giờ được hỗ trợ trực tiếp bởi thay đổi schema định tuyến theo Chức vụ (Position-based routing). Đổi tên Component từ RaciMatrixView thành CrasiMatrixView.

Dữ liệu: Dùng useOrgUnitTree() kết hợp với danh mục Positions và Users.

Thuật toán hiển thị cột (Động & Đa cấp):

Giữ state expandedColumns: Set<string>.

Tính danh sách cột hiển thị (flat) bằng cách duyệt cây theo quy tắc 3 lớp:

Mặc định render các Node Đơn vị tổ chức (Org_Unit).

Nếu một Đơn vị mở rộng (Expand) -> Node đó được thay bằng các cột Chức vụ (Position) thuộc đơn vị đó (VD: Trưởng phòng, Phó phòng, Nhân viên).

Nếu Chức vụ "Nhân viên" mở rộng (Expand) -> Node đó được thay bằng các cột Cá nhân (User) đang giữ chức vụ đó.

Một nguồn tính toán duy nhất dùng cho cả header lẫn việc render ô lưới của từng dòng bước.

Tự động ẩn cột rỗng (Auto-hide) (User Story 2.1):

Lọc thuần client-side (Frontend JS) trước khi render.

Chỉ render ra bảng các cột (Đơn vị/Chức vụ) CÓ chứa ít nhất 1 cấu hình CRSI. Các cột trống tự động ẩn đi.

Bổ sung: Cần có nút [+ Thêm đối tượng] ở góc bảng để chọn gọi ra một cột đã bị ẩn khi muốn cấu hình mới. (Khớp yêu cầu hiệu năng < 50ms của BRD).

Hiển thị ô theo từng cột hiển thị:

Cột đang Thu gọn (Có con cháu): Quét gom tất cả các tag của con cháu, hiển thị chỉ báo tổng hợp dạng text/badge (Ví dụ: S, I hoặc R, C). Badge này mang tính chất read-only (gợi ý đang có cấu hình sâu hơn bên trong), không tương tác xóa/sửa trực tiếp.

Cột đang Mở rộng (Cột lá trực tiếp): Hiển thị tag CRSI trực tiếp dạng chip, có nút [x] để xóa.

Popover "+" thêm tag (Assign Role):

Luồng đơn giản, nhất quán: Chọn chữ cái quyền (C, R, S, I) gán thẳng vào column.id đang thao tác. Hệ thống tự hiểu đang gán cho TH1 (Đơn vị) hay TH2 (Chức vụ/Cá nhân) dựa vào level của cột.

Validation chữ C: Nếu chọn chữ C, bắt buộc chọn thêm tham số lùi bước C(x) hoặc hủy C(End). Đồng thời check: Nếu bước này ĐÃ CÓ chữ C ở một cột khác, disable/báo lỗi không cho chọn C nữa (Giới hạn 1 C/bước).

File cần update: Đổi tên và viết lại toàn bộ src/components/CrasiMatrixView.tsx.

## Kiểm thử (giữ đúng mức độ kỹ lưỡng như các bước trước trong phiên)

- Generate/run migration cho từng thay đổi schema, review trước khi apply.
- `npx jest` ở `backend/` — toàn bộ test cũ + mới phải xanh.
- `tsc --noEmit` ở gốc repo (frontend) và trong `backend/` — sạch.
- Vite module-transform smoke check qua `curl` cho từng file đã sửa.
- **Curl-replay** đúng với payload mà frontend thực sự gửi cho mọi endpoint mới/thay đổi: từ chối vì vượt quá 1-C-per-step, một case escalation thật (task ở Tổ Backend/QA giờ resolve ra assignee thay vì bị bỏ rơi), một chuỗi AND-logic multi-R (duyệt 1 phần → vẫn In Progress → duyệt nốt → chuyển bước), và luồng delegate đầy đủ (candidates → delegate → người mới hành động được, người cũ thì không).
- Cập nhật `plan.md` và `walkthrough.md` sau khi xong **mỗi mục** trong 5 mục trên — không dồn vào cuối.
- Môi trường này không có công cụ browser automation — sẽ tiếp tục ghi rõ điều này thay vì nhận là đã kiểm chứng bằng mắt.

---

## Tiến độ thực hiện

- [x] 1. Đổi schema RACI (org_unit_id, bỏ target, index 1-C/bước) — migration `RaciAssignmentsAnyLevel` (rename cột giữ nguyên dữ liệu + partial unique index), `RaciService`/DTO/seed cập nhật. Xác nhận qua curl: gán trực tiếp vào Cấp 3 ("Tổ QA") thành công; thêm C thứ 2 khác đơn vị trên cùng 1 bước bị chặn đúng với thông báo tiếng Việt của BRD.
- [x] 2. AND-logic — `ApprovalsService.approveStep` chỉ hoàn tất bước khi TẤT CẢ người giữ R đã duyệt (bước có ≤1 R vẫn hành xử như cũ). Xác nhận qua curl với task thật: bước có 2 người giữ R (1 trực tiếp + 1 escalate) — duyệt người thứ nhất → bước vẫn "In Progress" ở 50%; duyệt người thứ hai → bước "Completed" và tự chuyển bước kế tiếp.
- [x] 3. Escalation — `OrgUnitsService.findAncestors` + `TasksService.resolveAssignee` tự động đẩy lên tổ tiên gần nhất có Trưởng bộ phận khi ghế trống, đánh dấu `isEscalated=true`. Xác nhận qua curl: tạo task thật, các R tag nhắm vào Tổ Backend/Tổ QA (không có Trưởng) tự động resolve ra Trưởng Ban Phát triển Phần mềm thay vì bị bỏ rơi như trước.
- [x] 4. Delegation — endpoint `GET .../delegation-candidates` + `POST .../delegate`, chỉ R/C mới giao được, danh sách candidate chỉ gồm Trưởng các đơn vị con cháu. Xác nhận qua curl full-flow: vp.eng giao vai trò C cho staff.dev (cấp dưới) → vp.eng mất quyền hành động (403), staff.dev hành động được, `delegatedFromUserId` hiển thị đúng.
- [x] 5. **Viết lại CrasiMatrixView — cột 3 lớp Đơn vị → Chức vụ → Cá nhân (HOÀN THÀNH ĐẦY ĐỦ)**. Xem chi tiết ở mục "Đợt 2" bên dưới.

### Đợt 1 (trước khi rà soát lại mục 5)
Kiểm chứng qua migration thật + curl-replay đúng payload code thật gửi + `npx jest` 17/17.
Nhưng khi rà soát lại theo bản plan mục 5 đã sửa, **mục 5 mới đạt một phần**: chưa đổi tên component, chưa có badge tổng hợp, chưa có nút `[+ Thêm đối tượng]`, chưa disable C phía client, và **thiếu hoàn toàn tầng Chức vụ + Nhân sự** (cột mới chỉ 1 lớp Đơn vị).

### Đợt 2 — bổ sung cho đủ mục 5

Phát hiện then chốt khi audit: hệ thống **không có bất kỳ liên kết User ↔ Đơn vị nào** (user không thuộc đơn vị nào; chỉ có `org_units.head_user_id` = mỗi đơn vị 1 trưởng). Vì vậy mô hình 3 lớp cần xây cả một tầng nhân sự mới, không chỉ sửa UI.

- [x] **Tầng Chức vụ + Nhân sự (mới)**: bảng `positions` (danh mục: Trưởng đơn vị / Phó đơn vị / Nhân viên) + bảng `org_unit_members` (ai làm ở đơn vị nào, giữ chức vụ gì). Endpoint `GET/POST /positions`, `GET /org-units/:id/members`, `POST /org-units/members`, `DELETE /org-units/members/:id`. Giữ nguyên `head_user_id` làm nguồn sự thật cho escalation để **không phá logic đã test**.
- [x] **`raci_assignments` đa hình**: thêm `position_id` + `user_id` (nullable, loại trừ nhau bằng CHECK). Ba kiểu gán: chỉ đơn vị (TH1 → giao Trưởng đơn vị) | đơn vị + chức vụ (→ giao **mọi người** giữ chức vụ đó) | đơn vị + cá nhân (TH2 → giao đích danh). Unique index mới dùng `NULLS NOT DISTINCT` (PG15+) để hai tag "không thu hẹp" vẫn bị coi là trùng.
- [x] **`resolveAssignees` trả về NHIỀU người**: một tag gán vào chức vụ nay sinh ra nhiều assignee — chính là nguồn tự nhiên của AND-logic. Nếu chức vụ đang trống người → tự escalate lên Trưởng đơn vị (`isEscalated`).
- [x] **Delegation dùng nhân sự thật**: candidate giờ là toàn bộ nhân sự của các đơn vị con cháu (kèm chức vụ + đơn vị), không còn chỉ "trưởng đơn vị con". Vẫn giữ trưởng đơn vị con trong danh sách để không thụt lùi so với trước.
- [x] **CrasiMatrixView (đổi tên từ RaciMatrixView)**: cột 3 lớp thật, hành xử **như cây tổ chức** — mở rộng là **cộng thêm** cột con chứ không thay thế cột cha. Thêm: **badge tổng hợp read-only** `R,C ⋯` khi cột thu gọn còn cấu hình bên trong; nút **Sổ tất cả / Thu gọn**; ô tick **Ẩn cột trống** (mặc định tắt); **disable chọn C** ngay ở client khi bước đã có C. Logic dựng cột tách riêng ra `src/components/crasi/columns.ts`.
  - **Sửa 2 lỗi sau khi người dùng phản hồi (kèm ảnh chụp màn hình)**:
    1. **Mất dữ liệu khi mở rộng** — bản đầu làm đúng chữ nghĩa BRD ("node được *thay bằng* cột chức vụ"), hệ quả là mở "Khối Kỹ thuật" thì cột Khối biến mất, kéo theo 3 tag C/I/A gắn ở cấp Khối **không còn chỗ hiển thị**; cộng với auto-hide ẩn nốt phần còn lại → bảng trống trơn dù DB có đủ 6 tag. Đã đổi sang mô hình cây (cha luôn ở lại). Kiểm chứng bằng script chạy thật `buildColumns` trên dữ liệu API: mặc định 1 cột `direct=[C,I,A] deeper=[S,R,R]`; mở Khối → cột Khối vẫn giữ C,I,A; sổ tất cả → 19 cột đủ 3 lớp, không mất tag nào.
    2. **Popover bị cắt** — container bảng dùng `overflow-x-auto`, mà CSS ép trục còn lại cũng thành `auto`, nên popover `absolute` bị kẹp. Đã chuyển sang `position: fixed` đo từ `getBoundingClientRect` của nút bấm + thêm lớp phủ để bấm ra ngoài là đóng.
  - Bỏ nút `[+ Thêm đối tượng]` theo yêu cầu người dùng: việc chọn xem cá nhân hay nhóm nào giờ do chính các nút bật/tắt sổ ngang trên cây quyết định, trực quan hơn danh sách ẩn.

- [x] **Dựng lại UI theo ảnh mẫu người dùng cung cấp** (`<table>` thật thay cho flexbox):
  - **Header gộp nhóm nhiều tầng** dùng `colSpan`/`rowSpan`: đơn vị cha nằm hàng trên span ngang các cột con, đúng như ảnh (Engineering Dept span VP Eng | Lead Dev | Staff Dev).
  - **Dòng tổng hợp cho mỗi quy trình** (gộp vai trò của mọi bước theo cột, VD `I, C[1]`), ô trống hiện `-`, chip `C` kèm badge `[mã bước]` quay về.
  - Cột trái sticky, nút `+ Bước` nằm ngay trên dòng quy trình, footer thêm quy trình như ảnh.
  - **Lỗi thứ 3 phát hiện khi tự kiểm chứng**: sổ một *chức vụ* ra thì tag gán ở cấp chức vụ (`R @ Nhân viên/Tổ Backend`) biến mất — cùng loại lỗi mất dữ liệu như tầng đơn vị. Đã thêm cột **"(Cả chức vụ)"** song song với "(Cả đơn vị)".
  - **Kiểm chứng bằng script chạy thật** trên dữ liệu API: mô phỏng lưới header để chắc chắn `colSpan`/`rowSpan` **phủ kín, không chồng lấn** ở cả 3 trạng thái (thu gọn / mở 1 cấp / sổ tất cả); và đếm tag hiển thị — khi sổ tất cả đạt **6/6 tag**, không mất tag nào.
  - Đánh đổi đã biết: sổ tất cả sinh khá nhiều cột "(Cả đơn vị)"/"(Cả chức vụ)" (19 cột cho cây demo nhỏ). Chấp nhận vì ưu tiên **không bao giờ giấu mất dữ liệu người dùng đã cấu hình**.

- [x] **Chuẩn hóa ô: 1 chữ cái / ô + nút to** (theo ảnh mẫu thứ 2 của người dùng):
  - Ô thường giờ mang **đúng 1 vai trò**. Editor đổi từ "thêm tag" sang **chọn-1-thay-thế**: lưới nút chữ cái, bấm là lưu ngay (riêng `C` hỏi bước quay về rồi mới lưu), kèm nút "Xóa vai trò khỏi ô này". Backend không đổi — `replaceCellAssignments` vốn đã thay toàn bộ ô, gửi 1 phần tử hoặc mảng rỗng.
  - **Nút chữ cái to, rộng hết ô** (`min-h-34px`, bo góc, viền + nền theo màu vai trò); `C` có badge tím `[mã bước]` ở góc dưới phải; ô trống là `-` bấm được.
  - **Chỉ ô gộp mới nhiều chữ cái**: dòng tổng hợp quy trình (nền xanh nhạt) và ô của cột thu gọn có cấu hình ở cấp dưới (nền xám nét đứt) — hiển thị `I, C[1]`. Bấm vào ô gộp vẫn sửa được vai trò của riêng cấp đó, kèm dòng nhắc cấp dưới đang có gì.
  - Sửa một lỗi logic tự phát hiện: ban đầu tôi loại `deeper` khỏi phép kiểm "đã có C ở nơi khác" → nút `C` vẫn bật dù cấp dưới đã có C, trong khi server chặn (1 C/bước là quy tắc toàn cục). Đã tính cả `deeper` vào.
  - Kiểm chứng qua API thật: thay thế `R → I`, xóa (`tags: []`), gán lại `R` — cả 3 đúng; seed cuối cùng vẫn nguyên vẹn 1 chữ cái/ô.
- [x] **Bỏ C(End)** theo quyết định: Role A đã bao phủ ca "người từ chối tự quyết định quay về đâu", nên C(End) là thừa. Ghi chú lý do ngay trong code (`raci.service.ts`).

**Kiểm chứng đợt 2**: migration `PositionsAndPersonnel` chạy thật (đã sửa tay để TypeORM không xoá mất partial index 1-C/bước — lỗi differ lặp lại lần 2); `npx jest` **18/18 pass**; `tsc --noEmit` sạch cả frontend lẫn backend; mọi file transform qua Vite ra JS thật. **Curl-replay trên dữ liệu thật**: tag gán vào chức vụ "Nhân viên @ Tổ Backend" resolve ra **đúng 2 người** → duyệt người 1 vẫn "In Progress 50%", duyệt người 2 mới "Completed" và sang bước kế; tag cấp đơn vị ở Tổ QA (không có trưởng) tự escalate lên Trưởng Ban; 3 loại ô (đơn vị/chức vụ/cá nhân) cùng tồn tại trên một bước mà không đè nhau; thêm C thứ 2 ở ô cá nhân trong bước đã có C bị chặn đúng.

**Chưa kiểm chứng bằng trình duyệt thật** (môi trường không có công cụ browser automation) — giao diện 3 lớp cột và các nút mới chưa được click thử bằng mắt.

React Flow Canvas (Epic 4 BRD) vẫn chủ động hoãn lại theo phạm vi đã thống nhất. Xem `plan.md` để biết chi tiết kỹ thuật, `walkthrough.md` để biết hướng dẫn sử dụng.
