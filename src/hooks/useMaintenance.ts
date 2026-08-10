import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMaintenancePart,
  createWorkOrder,
  getMaintenanceParts,
  getMaintenanceTickets,
  runMaintenanceSweep,
  setMaintenanceSchedules,
  updateMaintenanceTicket,
  type MaintenanceFrequency,
  type TicketPriority,
} from '../api/maintenance';

const PARTS_KEY = ['maintenance-parts'];
const ticketsKey = (openOnly: boolean) => ['maintenance-tickets', { openOnly }];

export function useMaintenanceParts() {
  return useQuery({ queryKey: PARTS_KEY, queryFn: getMaintenanceParts });
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
    mutationFn: createMaintenancePart,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PARTS_KEY }),
  });
}

export function useSetMaintenanceSchedules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      partId: string;
      schedules: Array<{ frequency: MaintenanceFrequency; anchorDate?: string; workflowId?: string }>;
    }) => setMaintenanceSchedules(vars.partId, vars.schedules),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PARTS_KEY }),
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
      queryClient.invalidateQueries({ queryKey: PARTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
