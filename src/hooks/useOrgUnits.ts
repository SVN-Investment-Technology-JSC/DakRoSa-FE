import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateOrgUnitDto,
  UpdateOrgUnitDto,
  createOrgUnit,
  createOrgUnitType,
  deleteOrgUnit,
  getOrgUnitDescendants,
  getOrgUnitTree,
  getOrgUnitTypes,
  getOrgUnitsByLevel,
  updateOrgUnit,
} from '../api/orgUnits';

const ORG_TREE_KEY = ['org-units', 'tree'];
const ORG_TYPES_KEY = ['org-unit-types'];

export function useOrgUnitTree() {
  return useQuery({ queryKey: ORG_TREE_KEY, queryFn: getOrgUnitTree });
}

export function useOrgUnitsByLevel(level: number) {
  return useQuery({
    queryKey: ['org-units', 'level', level],
    queryFn: () => getOrgUnitsByLevel(level),
  });
}

export function useOrgUnitDescendants(
  orgUnitId: string | undefined,
  minLevel?: number,
  maxLevel?: number,
) {
  return useQuery({
    queryKey: ['org-units', orgUnitId, 'descendants', minLevel, maxLevel],
    queryFn: () => getOrgUnitDescendants(orgUnitId as string, minLevel, maxLevel),
    enabled: !!orgUnitId,
  });
}

export function useOrgUnitTypes() {
  return useQuery({ queryKey: ORG_TYPES_KEY, queryFn: getOrgUnitTypes });
}

export function useCreateOrgUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateOrgUnitDto) => createOrgUnit(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ORG_TREE_KEY }),
  });
}

export function useUpdateOrgUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateOrgUnitDto }) => updateOrgUnit(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ORG_TREE_KEY }),
  });
}

export function useDeleteOrgUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOrgUnit(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ORG_TREE_KEY }),
  });
}

export function useCreateOrgUnitType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { code: string; name: string; colorClass?: string; hexColor?: string; defaultRank?: number }) =>
      createOrgUnitType(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ORG_TYPES_KEY }),
  });
}
