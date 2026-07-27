import { describe, expect, it } from 'vitest';
import { firstPermittedPath, normalizeModuleSelection } from './permissions';

describe('firstPermittedPath', () => {
  it('uses dashboard as the default route for admin', () => {
    expect(firstPermittedPath({
      id: 'admin-id',
      username: 'admin',
      displayName: 'Quản trị hệ thống',
      activeTenant: {
        id: 'tenant-id',
        slug: 'dakrosa',
        code: 'DAKROSA',
        name: 'Công ty Cổ phần Thủy điện ĐăkRơSa',
        shortName: 'EVN HPC ĐăkRơSa',
        logoUrl: '/brand/dakrosa-logo.jpg',
        primaryColor: '#386948',
        locale: 'vi-VN',
        timezone: 'Asia/Ho_Chi_Minh',
        roleCodes: ['admin'],
        permissions: [],
      },
      tenants: [],
      roleCodes: ['admin'],
      permissions: [],
    })).toBe('/t/dakrosa/dashboard');
  });
});

describe('normalizeModuleSelection', () => {
  it('selects view when an action is selected', () => {
    const selected = normalizeModuleSelection(new Set(), 'users.view', 'users.update', true);
    expect([...selected]).toEqual(['users.view', 'users.update']);
  });

  it('clears module actions when view is unchecked', () => {
    const selected = normalizeModuleSelection(
      new Set(['users.view', 'users.create', 'dashboard.view']),
      'users.view',
      'users.view',
      false,
    );
    expect([...selected]).toEqual(['dashboard.view']);
  });
});
