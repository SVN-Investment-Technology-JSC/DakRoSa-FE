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

