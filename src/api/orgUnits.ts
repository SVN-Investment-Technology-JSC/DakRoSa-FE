import { apiClient } from './client';

export interface ApiOrgUnitType {
  id: string;
  code: string;
  name: string;
  colorClass?: string | null;
  hexColor?: string | null;
  defaultRank?: number | null;
}

export interface ApiOrgUnitHead {
  id: string;
  email: string;
  fullName: string;
  avatarInitials?: string;
}

export interface ApiOrgUnit {
  id: string;
  parentId?: string | null;
  typeId: string;
  type?: ApiOrgUnitType;
  title: string;
  level: number;
  isActive: boolean;
  headUserId?: string | null;
  head?: ApiOrgUnitHead | null;
  sortOrder: number;
}

export interface ApiOrgUnitTreeNode extends ApiOrgUnit {
  children: ApiOrgUnitTreeNode[];
}

export function getOrgUnitTypes(): Promise<ApiOrgUnitType[]> {
  return apiClient.get('/org-unit-types').then((r) => r.data);
}

export function createOrgUnitType(dto: {
  code: string;
  name: string;
  colorClass?: string;
  hexColor?: string;
  defaultRank?: number;
}): Promise<ApiOrgUnitType> {
  return apiClient.post('/org-unit-types', dto).then((r) => r.data);
}

export function getOrgUnitTree(): Promise<ApiOrgUnitTreeNode[]> {
  return apiClient.get('/org-units/tree').then((r) => r.data);
}

export function getOrgUnitsByLevel(level: number): Promise<ApiOrgUnit[]> {
  return apiClient.get('/org-units', { params: { level } }).then((r) => r.data);
}

export function getOrgUnitDescendants(
  orgUnitId: string,
  minLevel?: number,
  maxLevel?: number,
): Promise<ApiOrgUnit[]> {
  return apiClient
    .get(`/org-units/${orgUnitId}/descendants`, { params: { minLevel, maxLevel } })
    .then((r) => r.data);
}

export interface CreateOrgUnitDto {
  parentId?: string;
  typeId: string;
  title: string;
  headUserId?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export function createOrgUnit(dto: CreateOrgUnitDto): Promise<ApiOrgUnit> {
  return apiClient.post('/org-units', dto).then((r) => r.data);
}

export interface UpdateOrgUnitDto {
  title?: string;
  headUserId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export function updateOrgUnit(id: string, dto: UpdateOrgUnitDto): Promise<ApiOrgUnit> {
  return apiClient.patch(`/org-units/${id}`, dto).then((r) => r.data);
}

export function deleteOrgUnit(id: string): Promise<void> {
  return apiClient.delete(`/org-units/${id}`).then(() => undefined);
}
