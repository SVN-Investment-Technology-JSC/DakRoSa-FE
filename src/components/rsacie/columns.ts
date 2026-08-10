import { ApiOrgUnitTreeNode } from '../../api/orgUnits';
import { ApiOrgUnitMember } from '../../api/positions';
import { ApiRaciAssignment, RoleLetter } from '../../api/workflows';

/**
 * The header is a grouped (spanning) tree, like a spreadsheet's merged headers:
 *
 *   ┌────── Ban Phát triển ──────┬ Ban Hạ tầng ┬─── Khối Kỹ thuật ───┐
 *   │ Trưởng đv │ Nhân viên │ Tổ │             │ Trưởng đv │ …       │
 *
 * A collapsed unit is a single data column (rowSpan across the header).
 * An expanded unit becomes a group label spanning its children, which are the
 * real data columns.
 *
 * There is deliberately NO "(Cả đơn vị)" pseudo-column. Assigning a role to a
 * department — at any level — means the department HEAD owns it, and the head
 * then redistributes downward. So a unit-level tag is rendered on that unit's
 * head column (see `inheritedByLeaf`), which shows the routing rule instead of
 * hiding it behind an extra column.
 */
export interface CellTarget {
  orgUnitId: string;
  positionId?: string;
  userId?: string;
}

export type ColumnKind = 'unit' | 'user';

export interface ColumnNode {
  key: string;
  title: string;
  /** Secondary line under the title (e.g. which unit a position belongs to). */
  subtitle?: string;
  kind: ColumnKind;
  target: CellTarget;
  /** Key used for the expand/collapse toggle; absent when the node can't drill down. */
  toggleKey?: string;
  expanded: boolean;
  children: ColumnNode[];
  /** Unit columns only — who currently heads the unit. Drives tag anchoring. */
  headUserId?: string | null;
  /** Person columns only — which position they hold, for position-level tags. */
  positionId?: string;
  /**
   * True only for a COLLAPSED unit, which stands in for everything beneath it.
   * A head column is a unit column too, but its staff sit right beside it, so
   * it must not roll their tags up as if they were its own.
   */
  aggregatesSubtree?: boolean;
}

export const userColumnKey = (orgUnitId: string, userId: string) =>
  `${orgUnitId}::usr::${userId}`;

/** Data columns = leaves of the header tree. */
export function leafColumns(nodes: ColumnNode[]): ColumnNode[] {
  return nodes.flatMap((n) => (n.children.length ? leafColumns(n.children) : [n]));
}

export function leafCount(node: ColumnNode): number {
  return node.children.length
    ? node.children.reduce((sum, c) => sum + leafCount(c), 0)
    : 1;
}

export function treeDepth(nodes: ColumnNode[]): number {
  return nodes.length
    ? Math.max(...nodes.map((n) => (n.children.length ? 1 + treeDepth(n.children) : 1)))
    : 0;
}

export interface HeaderCell {
  node: ColumnNode;
  colSpan: number;
  rowSpan: number;
}

/** Lays the header tree out into rows of merged cells. */
export function headerRows(nodes: ColumnNode[], totalDepth: number): HeaderCell[][] {
  const rows: HeaderCell[][] = Array.from({ length: totalDepth }, () => []);
  const walk = (node: ColumnNode, depth: number) => {
    if (!node.children.length) {
      rows[depth].push({ node, colSpan: 1, rowSpan: totalDepth - depth });
      return;
    }
    rows[depth].push({ node, colSpan: leafCount(node), rowSpan: 1 });
    node.children.forEach((c) => walk(c, depth + 1));
  };
  nodes.forEach((n) => walk(n, 0));
  return rows;
}

/** Assignments belonging to exactly this column's target. */
export function cellAssignments(
  column: ColumnNode,
  assignments: ApiRaciAssignment[],
): ApiRaciAssignment[] {
  const t = column.target;
  return assignments.filter(
    (a) =>
      a.orgUnitId === t.orgUnitId &&
      (a.positionId ?? undefined) === t.positionId &&
      (a.userId ?? undefined) === t.userId,
  );
}

/** Ids of every org unit at or below `node`. */
export function subtreeUnitIds(node: ApiOrgUnitTreeNode): Set<string> {
  const ids = new Set<string>();
  const walk = (n: ApiOrgUnitTreeNode) => {
    ids.add(n.id);
    (n.children ?? []).forEach(walk);
  };
  walk(node);
  return ids;
}

/**
 * For a COLLAPSED unit column: everything configured deeper inside it (child
 * units, or its own position/person-level tags) that the user can't currently
 * see. Surfaced as a read-only hint so configuration is never silently hidden.
 */
export function deeperAssignments(
  column: ColumnNode,
  assignments: ApiRaciAssignment[],
  unitById: Map<string, ApiOrgUnitTreeNode>,
): ApiRaciAssignment[] {
  // A head column is a unit column, but it must never absorb its staff's tags:
  // once a unit is expanded those people have their own cells, and showing the
  // same letter on the head as well reads as the head holding it too.
  if (column.kind !== 'unit' || !column.aggregatesSubtree) return [];
  const node = unitById.get(column.target.orgUnitId);
  if (!node) return [];
  const ids = subtreeUnitIds(node);
  return assignments.filter(
    (a) =>
      ids.has(a.orgUnitId) &&
      !(a.orgUnitId === column.target.orgUnitId && !a.positionId && !a.userId),
  );
}

/** Display order of the six letters — the matrix is named after it: RSACIE. */
const LETTER_ORDER: RoleLetter[] = ['R', 'S', 'A', 'C', 'I', 'E'];

export function sortLetters(letters: Iterable<RoleLetter>): RoleLetter[] {
  return Array.from(new Set(letters)).sort(
    (a, b) => LETTER_ORDER.indexOf(a) - LETTER_ORDER.indexOf(b),
  );
}

export interface BuildOptions {
  roots: ApiOrgUnitTreeNode[];
  expandedKeys: Set<string>;
  membersByUnit: Map<string, ApiOrgUnitMember[]>;
}

/**
 * "Trưởng" + cấp của đơn vị: Trưởng khối / Trưởng ban / Trưởng tổ.
 *
 * The `positions` catalogue only has the generic "Trưởng đơn vị", which reads
 * identically on every level and makes the header ambiguous. The org unit's
 * TYPE is what actually distinguishes them.
 */
function headTitleFor(node: ApiOrgUnitTreeNode): string {
  const typeName = node.type?.name?.trim();
  return typeName ? `Trưởng ${typeName.toLowerCase()}` : 'Trưởng đơn vị';
}

/**
 * Builds the grouped header tree.
 *
 * An expanded unit becomes a group label whose children are: the head column
 * (carrying the UNIT's own target), then one column PER PERSON on the roster,
 * then the sub-units. There is deliberately no intermediate "chức vụ" grouping
 * level — a position with several holders is shown as several people, each with
 * their position printed above their name.
 */
export function buildColumnTree({ roots, expandedKeys, membersByUnit }: BuildOptions): ColumnNode[] {
  const build = (nodes: ApiOrgUnitTreeNode[]): ColumnNode[] =>
    nodes.map((node) => {
      const members = membersByUnit.get(node.id) ?? [];
      const canExpand = (node.children ?? []).length > 0 || members.length > 0;
      const expanded = canExpand && expandedKeys.has(node.id);

      const base: ColumnNode = {
        key: node.id,
        title: node.title,
        kind: 'unit',
        target: { orgUnitId: node.id },
        toggleKey: canExpand ? node.id : undefined,
        expanded,
        children: [],
        headUserId: node.headUserId ?? null,
        // Only a COLLAPSED unit stands in for everything beneath it.
        aggregatesSubtree: !expanded,
      };

      if (!expanded) return base;

      const children: ColumnNode[] = [...build(node.children ?? [])];

      const head = members.find((m) => m.userId === node.headUserId);

      // The head IS the unit. Work given to a department is the department
      // head's own work — they may then hand it down, but that is a run-time
      // decision, not a second kind of assignment. So the head's column carries
      // the UNIT's target: one cell, directly editable, no "assigned at unit
      // level, edit it elsewhere" indirection.
      const headColumn: ColumnNode = {
        key: `${node.id}::head`,
        title: headTitleFor(node),
        subtitle: head?.user?.fullName ?? node.head?.fullName ?? 'chưa có trưởng',
        kind: 'unit',
        target: { orgUnitId: node.id },
        expanded: false,
        children: [],
        headUserId: node.headUserId ?? null,
        // The head column represents the unit itself, but its staff already
        // have their own columns beside it — so it must NOT roll their tags up.
        aggregatesSubtree: false,
      };

      // One column per person, ordered by seniority. The head is skipped: they
      // are already `headColumn`, and listing them twice would let the same
      // person hold two different letters on one step.
      const staffColumns: ColumnNode[] = members
        .filter((m) => m.userId !== node.headUserId)
        .sort((a, b) => (a.position?.rank ?? 100) - (b.position?.rank ?? 100))
        .map((m) => ({
          key: userColumnKey(node.id, m.userId),
          title: m.position?.name ?? 'Nhân viên',
          subtitle: m.user?.fullName ?? m.user?.email ?? 'Nhân sự',
          kind: 'user' as const,
          target: { orgUnitId: node.id, userId: m.userId },
          expanded: false,
          children: [],
          positionId: m.positionId,
        }));

      // Head first, then the roster, then sub-units.
      return { ...base, children: [headColumn, ...staffColumns, ...children] };
    });

  return build(roots);
}

/**
 * A tag that was configured at a group level (a whole unit, or a whole
 * position) but is rendered on one concrete column, because that is who
 * actually receives it at run time.
 */
export interface InheritedTag {
  assignment: ApiRaciAssignment;
  /** What the tag was configured on. Only positions can be inherited now. */
  from: 'position';
  fromTitle: string;
}

/**
 * Position-level tags, keyed by the person column that displays them.
 *
 * The matrix no longer has a "chức vụ" column to hold these — every person gets
 * their own column instead. A position tag routes to EVERY holder at run time,
 * so it is shown on every holder's column, marked read-only. Data created
 * before this change (or through the API) therefore stays visible.
 */
export function inheritedByLeaf(
  nodes: ColumnNode[],
  assignments: ApiRaciAssignment[],
): Map<string, InheritedTag[]> {
  const result = new Map<string, InheritedTag[]>();
  const positionTags = assignments.filter((a) => a.positionId && !a.userId);
  if (positionTags.length === 0) return result;

  const walk = (node: ColumnNode) => {
    if (node.kind === 'user' && node.positionId) {
      for (const assignment of positionTags) {
        if (
          assignment.orgUnitId === node.target.orgUnitId &&
          assignment.positionId === node.positionId
        ) {
          const list = result.get(node.key) ?? [];
          list.push({ assignment, from: 'position', fromTitle: node.title });
          result.set(node.key, list);
        }
      }
    }
    node.children.forEach(walk);
  };

  nodes.forEach(walk);
  return result;
}

/**
 * Giữ lại đúng những cột có liên quan tới một tập assignment.
 *
 * Dùng khi sổ dọc một quy trình: bảng ma trận rộng theo cả sơ đồ tổ chức, nên
 * đọc một quy trình cụ thể thường phải cuộn ngang qua hàng loạt cột trống. Một
 * cột được giữ khi nó có tag trực tiếp, có tag theo chức vụ, hoặc (khi đang thu
 * gọn) có tag nằm sâu bên trong. Nhóm cha được giữ nếu còn con nào được giữ.
 *
 * Trả về `null` khi không còn cột nào — người gọi phải rơi về cây đầy đủ, vì
 * một quy trình chưa cấu hình gì mà mất sạch cột thì không thể cấu hình được.
 */
export function pruneToRelevant(
  nodes: ColumnNode[],
  assignments: ApiRaciAssignment[],
  unitById: Map<string, ApiOrgUnitTreeNode>,
): ColumnNode[] | null {
  const inherited = inheritedByLeaf(nodes, assignments);

  const keep = (node: ColumnNode): ColumnNode | null => {
    if (node.children.length) {
      const children = node.children.map(keep).filter((c): c is ColumnNode => c !== null);
      return children.length ? { ...node, children } : null;
    }
    const relevant =
      cellAssignments(node, assignments).length > 0 ||
      (inherited.get(node.key)?.length ?? 0) > 0 ||
      deeperAssignments(node, assignments, unitById).length > 0;
    return relevant ? node : null;
  };

  const pruned = nodes.map(keep).filter((n): n is ColumnNode => n !== null);
  return pruned.length ? pruned : null;
}

/** Flat map of unit id → tree node, for subtree lookups. */
export function indexUnits(roots: ApiOrgUnitTreeNode[]): Map<string, ApiOrgUnitTreeNode> {
  const map = new Map<string, ApiOrgUnitTreeNode>();
  const walk = (n: ApiOrgUnitTreeNode) => {
    map.set(n.id, n);
    (n.children ?? []).forEach(walk);
  };
  roots.forEach(walk);
  return map;
}
