import { OrgUnitsService } from './org-units.service';

/**
 * BRD 3.2 — who a person may hand work to. Shared by delegation and the Node E
 * breakdown, so it is tested once, here.
 */
describe('OrgUnitsService.findSubordinates', () => {
  let service: OrgUnitsService;
  let orgUnitsRepository: { find: jest.Mock };
  let membersRepository: { find: jest.Mock; createQueryBuilder: jest.Mock };
  let descendantMembers: unknown[];
  let ownMembers: unknown[];

  const person = (id: string, name: string, position = 'Nhân viên', unit = 'Tổ Cơ khí') => ({
    userId: id,
    user: { id, email: `${id}@x.com`, fullName: name },
    position: { name: position },
    orgUnit: { title: unit },
  });

  beforeEach(() => {
    descendantMembers = [];
    ownMembers = [];
    orgUnitsRepository = { find: jest.fn().mockResolvedValue([]) };
    membersRepository = {
      find: jest.fn().mockImplementation(async () => ownMembers),
      createQueryBuilder: jest.fn(() => {
        const qb: Record<string, unknown> = {};
        for (const m of ['leftJoinAndSelect', 'innerJoin', 'where', 'andWhere']) {
          qb[m] = jest.fn(() => qb);
        }
        qb.getMany = jest.fn(async () => descendantMembers);
        return qb;
      }),
    };

    service = new OrgUnitsService(
      orgUnitsRepository as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
      {} as any,
      membersRepository as any,
    );
    // Sub-unit heads are read through findDescendants, stubbed per test.
    jest.spyOn(service, 'findDescendants').mockResolvedValue([]);
  });

  const headsUnits = (...units: Array<{ id: string; title: string }>) =>
    orgUnitsRepository.find.mockResolvedValue(units);

  it('includes the roster of the caller’s OWN unit', async () => {
    // The case that was broken: the head of a leaf team has no sub-units at
    // all, so a descendants-only rule left them with nobody to hand work to.
    headsUnits({ id: 'to-co-khi', title: 'Tổ Cơ khí' });
    ownMembers = [person('u-mai', 'Vũ Thị Mai'), person('u-anh', 'Hoàng Đức Anh')];

    const result = await service.findSubordinates('u-head');

    expect(result.map((r) => r.fullName)).toEqual(['Vũ Thị Mai', 'Hoàng Đức Anh']);
    expect(result[0].orgUnitTitle).toBe('Tổ Cơ khí');
  });

  it('never offers the caller themself, even when they are on their own roster', async () => {
    headsUnits({ id: 'to-co-khi', title: 'Tổ Cơ khí' });
    ownMembers = [person('u-head', 'Tôi'), person('u-mai', 'Vũ Thị Mai')];

    const result = await service.findSubordinates('u-head');

    expect(result.map((r) => r.id)).toEqual(['u-mai']);
  });

  it('includes staff of sub-units as well as the own roster', async () => {
    headsUnits({ id: 'ban', title: 'Ban Cơ điện' });
    ownMembers = [person('u-a', 'Người trong ban', 'Phó đơn vị', 'Ban Cơ điện')];
    descendantMembers = [person('u-b', 'Người tổ dưới')];

    const result = await service.findSubordinates('u-head');

    expect(result.map((r) => r.id).sort()).toEqual(['u-a', 'u-b']);
  });

  it('keeps heads of sub-units that appear on no roster', async () => {
    headsUnits({ id: 'ban', title: 'Ban Cơ điện' });
    jest.spyOn(service, 'findDescendants').mockResolvedValue([
      { id: 'to', title: 'Tổ Điện', head: { id: 'u-lead', email: 'l@x.com', fullName: 'Trưởng tổ' } },
      { id: 'to2', title: 'Tổ Trống', head: null },
    ] as never);

    const result = await service.findSubordinates('u-head');

    expect(result.map((r) => r.id)).toEqual(['u-lead']);
  });

  it('de-duplicates someone who is both on the own roster and a sub-unit roster', async () => {
    headsUnits({ id: 'ban', title: 'Ban Cơ điện' });
    ownMembers = [person('u-a', 'Kiêm nhiệm', 'Nhân viên', 'Ban Cơ điện')];
    descendantMembers = [person('u-a', 'Kiêm nhiệm', 'Nhân viên', 'Tổ Điện')];

    const result = await service.findSubordinates('u-head');

    expect(result).toHaveLength(1);
    // First occurrence wins, so the unit closest to the caller is shown.
    expect(result[0].orgUnitTitle).toBe('Ban Cơ điện');
  });

  it('returns nobody when the caller heads no unit at all', async () => {
    headsUnits();
    await expect(service.findSubordinates('u-staff')).resolves.toEqual([]);
  });
});

/**
 * Chữ S là ngoại lệ: nó là quyền MỞ đơn, không phải quyền xử lý đơn, nên nó
 * không dồn về trưởng đơn vị như mọi chữ khác.
 */
describe('OrgUnitsService.resolveAssignees — chữ S', () => {
  let service: OrgUnitsService;
  let ownMembers: Array<{ userId: string }>;
  let descendantMembers: Array<{ userId: string }>;

  beforeEach(() => {
    ownMembers = [];
    descendantMembers = [];
    const membersRepository = {
      find: jest.fn().mockImplementation(async () => ownMembers),
      createQueryBuilder: jest.fn(() => {
        const qb: Record<string, unknown> = {};
        for (const m of ['leftJoinAndSelect', 'innerJoin', 'where', 'andWhere']) {
          qb[m] = jest.fn(() => qb);
        }
        qb.getMany = jest.fn(async () => descendantMembers);
        return qb;
      }),
    };

    service = new OrgUnitsService(
      { find: jest.fn().mockResolvedValue([]) } as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
      {} as any,
      membersRepository as any,
    );
    jest.spyOn(service, 'findDescendants').mockResolvedValue([]);
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: 'ban', title: 'Ban', headUserId: 'u-head' } as never);
  });

  const ids = (r: Array<{ userId: string }>) => r.map((x) => x.userId).sort();

  it('gán S cho đơn vị thì cả đơn vị — kể cả các tổ bên dưới — đều có S', async () => {
    ownMembers = [{ userId: 'u-head' }];
    descendantMembers = [{ userId: 'u-a' }, { userId: 'u-b' }];

    const result = await service.resolveAssignees({ orgUnitId: 'ban', roleLetter: 'S' });

    expect(ids(result)).toEqual(['u-a', 'u-b', 'u-head']);
    expect(result.every((r) => !r.isEscalated)).toBe(true);
  });

  it('các chữ khác vẫn chỉ về trưởng đơn vị', async () => {
    ownMembers = [{ userId: 'u-head' }];
    descendantMembers = [{ userId: 'u-a' }];

    const result = await service.resolveAssignees({ orgUnitId: 'ban', roleLetter: 'R' });

    expect(ids(result)).toEqual(['u-head']);
  });

  it('S gán đích danh một người thì vẫn chỉ người đó', async () => {
    descendantMembers = [{ userId: 'u-a' }];

    const result = await service.resolveAssignees({
      orgUnitId: 'ban',
      userId: 'u-named',
      roleLetter: 'S',
    });

    expect(ids(result)).toEqual(['u-named']);
  });

  it('S gán theo chức vụ vẫn đi theo luật chức vụ, không lan ra cả đơn vị', async () => {
    jest
      .spyOn(service, 'findMembersByPosition')
      .mockResolvedValue([{ userId: 'u-pos' }] as never);
    descendantMembers = [{ userId: 'u-a' }];

    const result = await service.resolveAssignees({
      orgUnitId: 'ban',
      positionId: 'p-1',
      roleLetter: 'S',
    });

    expect(ids(result)).toEqual(['u-pos']);
  });
});
