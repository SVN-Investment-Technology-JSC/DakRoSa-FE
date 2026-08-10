import { apiClient } from './client';
import { ApiOrgUnitHead } from './orgUnits';

/** Danh mục Chức vụ — Trưởng đơn vị / Phó đơn vị / Nhân viên… */
export interface ApiPosition {
  id: string;
  code: string;
  name: string;
  rank: number;
}

/** Một dòng nhân sự: ai làm ở đơn vị nào, giữ chức vụ gì. */
export interface ApiOrgUnitMember {
  id: string;
  orgUnitId: string;
  userId: string;
  user?: ApiOrgUnitHead;
  positionId: string;
  position?: ApiPosition;
}

export function getPositions(): Promise<ApiPosition[]> {
  return apiClient.get('/positions').then((r) => r.data);
}

export function createPosition(dto: {
  code: string;
  name: string;
  rank?: number;
}): Promise<ApiPosition> {
  return apiClient.post('/positions', dto).then((r) => r.data);
}

export function getOrgUnitMembers(orgUnitId: string): Promise<ApiOrgUnitMember[]> {
  return apiClient.get(`/org-units/${orgUnitId}/members`).then((r) => r.data);
}

export function addOrgUnitMember(dto: {
  orgUnitId: string;
  userId: string;
  positionId: string;
}): Promise<ApiOrgUnitMember> {
  return apiClient.post('/org-units/members', dto).then((r) => r.data);
}

export function removeOrgUnitMember(memberId: string): Promise<void> {
  return apiClient.delete(`/org-units/members/${memberId}`).then(() => undefined);
}
