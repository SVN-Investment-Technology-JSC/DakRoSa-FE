import { describe, expect, it } from 'vitest';
import { firstPermittedPath, normalizeModuleSelection } from './permissions';

describe('firstPermittedPath', () => {
  it('uses dashboard as the default route for admin', () => {
    expect(firstPermittedPath({
      id: 'admin-id',
      username: 'admin',
      displayName: 'Quản trị hệ thống',
      roleCodes: ['admin'],
      permissions: [],
    })).toBe('/dashboard');
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
