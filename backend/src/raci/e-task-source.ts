/**
 * Nguồn dữ liệu công việc cho Role E (BRD 3 US 3.1 AC2).
 *
 * Ba tùy chọn của dropdown khi gán quyền cho `E` ở Bảng 2:
 *
 *  - device_default .. "Mặc định theo thiết bị" — lấy JSON đã khai ở Ma trận
 *                      bảo trì của chính thiết bị sinh ra Lệnh công việc.
 *  - task_list ....... "Nhập danh sách công việc" — danh sách cố định gõ ngay
 *                      lúc thiết kế luồng, dùng chung cho mọi lần chạy.
 *  - manual .......... "Thiết lập thủ công" — người giữ Node E tự gõ lúc phân rã.
 *
 * `manual` là hành vi có từ trước BRD 3, nên nó cũng là giá trị mặc định khi
 * một tag E không khai gì: luồng cũ chạy y nguyên.
 */
export const E_TASK_SOURCES = ['device_default', 'task_list', 'manual'] as const;
export type ETaskSource = (typeof E_TASK_SOURCES)[number];

export const E_TASK_SOURCE_LABEL: Record<ETaskSource, string> = {
  device_default: 'Mặc định theo thiết bị',
  task_list: 'Nhập danh sách công việc',
  manual: 'Thiết lập thủ công',
};

export const DEFAULT_E_TASK_SOURCE: ETaskSource = 'manual';
