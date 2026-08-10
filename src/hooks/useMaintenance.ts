import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMaintenancePart,
  createWorkOrder,
  deleteMaintenancePart,
  getMaintenanceParts,
  getMaintenancePartsTree,
  getMaintenanceTickets,
  runMaintenanceSweep,
  setEquipmentTaskTemplate,
  setMaintenanceSchedules,
  updateMaintenancePart,
  updateMaintenanceTicket,
  type AssetDetailsInput,
  type AssetKind,
  type EquipmentTaskItem,
  type MaintenanceFrequency,
  type TicketPriority,
} from '../api/maintenance';

const PARTS_KEY = ['maintenance-parts'];
const PARTS_TREE_KEY = ['maintenance-parts', 'tree'];
const ticketsKey = (openOnly: boolean) => ['maintenance-tickets', { openOnly }];

/**
 * Danh sách phẳng và cây là hai hình chiếu của cùng một bảng, nên mọi thay đổi
 * đều phải làm mới cả hai — nếu không, thêm thiết bị ở Sơ đồ thiết bị sẽ không
 * xuất hiện ở Ma trận bảo trì cho tới khi tải lại trang.
 */
function invalidateParts(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: PARTS_KEY });
}

export function useMaintenanceParts() {
  return useQuery({ queryKey: PARTS_KEY, queryFn: getMaintenanceParts });
}

/** BRD 3 Epic 1 — cây cấu trúc tài sản cho màn hình "Sơ đồ thiết bị". */
export function useMaintenancePartsTree() {
  return useQuery({ queryKey: PARTS_TREE_KEY, queryFn: getMaintenancePartsTree });
}

export function useMaintenanceTickets(openOnly = false) {
  return useQuery({
    queryKey: ticketsKey(openOnly),
    queryFn: () => getMaintenanceTickets(openOnly),
  });
}

export function useCreateMaintenancePart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      dto: {
        code: string;
        name: string;
        orgUnitId?: string;
        parentId?: string;
        assetKind?: AssetKind;
      } & AssetDetailsInput,
    ) => createMaintenancePart(dto),
    onSuccess: () => invalidateParts(queryClient),
  });
}

export function useUpdateMaintenancePart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...dto
    }: { id: string; name?: string; orgUnitId?: string; isActive?: boolean } & AssetDetailsInput) =>
      updateMaintenancePart(id, dto),
    onSuccess: () => invalidateParts(queryClient),
  });
}

export function useDeleteMaintenancePart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMaintenancePart(id),
    onSuccess: () => invalidateParts(queryClient),
  });
}

/** BRD 3 US 2.1 AC2 — "Thêm thông tin công việc" ở Ma trận bảo trì. */
export function useSetEquipmentTaskTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { partId: string; tasks: EquipmentTaskItem[] }) =>
      setEquipmentTaskTemplate(vars.partId, vars.tasks),
    onSuccess: () => {
      invalidateParts(queryClient);
      // Khai/gỡ JSON là đúng thứ bật/tắt tùy chọn "Mặc định theo thiết bị" của
      // Role E, nên đáp án đã cache của dropdown đó không còn đúng nữa.
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useSetMaintenanceSchedules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      partId: string;
      schedules: Array<{ frequency: MaintenanceFrequency; anchorDate?: string; workflowId?: string }>;
    }) => setMaintenanceSchedules(vars.partId, vars.schedules),
    onSuccess: () => {
      invalidateParts(queryClient);
      // Đổi luồng gắn cho thiết bị làm đổi tập thiết bị "có JSON" của một luồng,
      // tức đổi luôn tính khả dụng của "Mặc định theo thiết bị".
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useUpdateMaintenanceTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      dueDate?: string;
      priority?: TicketPriority;
      note?: string;
    }) => updateMaintenanceTicket(vars.id, vars),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] }),
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ticketId: string) => createWorkOrder(ticketId),
    onSuccess: () => {
      // A Work Order creates a real task, so the Workspace list is stale too.
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useRunMaintenanceSweep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (today?: string) => runMaintenanceSweep(today),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      invalidateParts(queryClient);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
