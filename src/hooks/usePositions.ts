import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addOrgUnitMember,
  createPosition,
  getOrgUnitMembers,
  getPositions,
  removeOrgUnitMember,
} from '../api/positions';

const POSITIONS_KEY = ['positions'];
const membersKey = (orgUnitId: string) => ['org-units', orgUnitId, 'members'];

export function usePositions() {
  return useQuery({ queryKey: POSITIONS_KEY, queryFn: getPositions });
}

export function useOrgUnitMembers(orgUnitId: string | undefined) {
  return useQuery({
    queryKey: membersKey(orgUnitId ?? ''),
    queryFn: () => getOrgUnitMembers(orgUnitId as string),
    enabled: !!orgUnitId,
  });
}

/**
 * Rosters for many units at once — the matrix needs every expanded unit's staff
 * to render the third column layer, and the count isn't known ahead of time.
 */
export function useManyOrgUnitMembers(orgUnitIds: string[]) {
  return useQueries({
    queries: orgUnitIds.map((id) => ({
      queryKey: membersKey(id),
      queryFn: () => getOrgUnitMembers(id),
    })),
  });
}

export function useCreatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { code: string; name: string; rank?: number }) => createPosition(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: POSITIONS_KEY }),
  });
}

export function useAddOrgUnitMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { orgUnitId: string; userId: string; positionId: string }) =>
      addOrgUnitMember(dto),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: membersKey(variables.orgUnitId) }),
  });
}

export function useRemoveOrgUnitMember(orgUnitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeOrgUnitMember(memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: membersKey(orgUnitId) }),
  });
}
