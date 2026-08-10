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

export type ColumnKind = 'unit' | 'position' | 'user';

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
  /** Position columns only — everyone holding that position in the unit. */
  holderUserIds?: string[];
}

export const positionColumnKey = (orgUnitId: string, positionId: string) =>
  `${orgUnitId}::pos::${positionId}`;
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
  if (column.kind !== 'unit') return [];
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
 * Builds the grouped header tree. An expanded unit becomes a pure group label
 * whose children are the real data columns; its own unit-level tags are then
 * anchored onto its head column by `inheritedByLeaf`.
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
      };

      if (!expanded) return base;

      const children: ColumnNode[] = [...build(node.children ?? [])];
      const positionColumns: ColumnNode[] = [];

      const head = members.find((m) => m.userId === node.headUserId);

      // The head IS the unit. Work given to a department is the department
      // head's own work — they may then hand it down, but that is a run-time
      // decision, not a second kind of assignment. So the head's column carries
      // the UNIT's target: one cell, directly editable, no "assigned at unit
      // level, edit it elsewhere" indirection.
      const headColumn: ColumnNode = {
        key: `${node.id}::head`,
        title: head?.position?.name ?? 'Trưởng đơn vị',
        subtitle: head?.user?.fullName ?? node.head?.fullName ?? 'chưa có trưởng',
        kind: 'unit',
        target: { orgUnitId: node.id },
        expanded: false,
        children: [],
        headUserId: node.headUserId ?? null,
      };

      const byPosition = new Map<string, ApiOrgUnitMember[]>();
      for (const m of members) {
        // The head is already represented by `headColumn`; listing them again
        // under their position would give the same person two cells.
        if (m.userId === node.headUserId) continue;
        const list = byPosition.get(m.positionId) ?? [];
        list.push(m);
        byPosition.set(m.positionId, list);
      }
      const ordered = Array.from(byPosition.entries()).sort(
        ([, a], [, b]) => (a[0].position?.rank ?? 100) - (b[0].position?.rank ?? 100),
      );

      for (const [positionId, holders] of ordered) {
        const posKey = positionColumnKey(node.id, positionId);
        const posExpanded = expandedKeys.has(posKey);
        positionColumns.push({
          key: posKey,
          title: holders[0].position?.name ?? 'Chức vụ',
          subtitle: node.title,
          kind: 'position',
          target: { orgUnitId: node.id, positionId },
          toggleKey: posKey,
          expanded: posExpanded,
          holderUserIds: holders.map((h) => h.userId),
          children: posExpanded
            ? [
                ...holders.map((h) => ({
                  key: userColumnKey(node.id, h.userId),
                  title: h.user?.fullName ?? h.user?.email ?? 'Nhân sự',
                  subtitle: holders[0].position?.name,
                  kind: 'user' as const,
                  target: { orgUnitId: node.id, userId: h.userId },
                  expanded: false,
                  children: [],
                })),
              ]
            : [],
        });
      }

      // Head first, then the rest of the roster, then sub-units.
      return { ...base, children: [headColumn, ...positionColumns, ...children] };
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
 * Decides where a group-level tag is shown once its group has been expanded.
 *
 * Only POSITIONS need this: a position tag goes to every holder, so when the
 * position is drilled into its holders, one of them has to carry the marker.
 * Units never need it — an expanded unit always keeps its own head column,
 * which carries the unit's target directly.
 */
function anchorLeafKey(node: ColumnNode): string | undefined {
  const leaves = leafColumns(node.children);
  return leaves[0]?.key;
}

/**
 * Group-level tags, keyed by the leaf column that displays them. Callers merge
 * these into each cell alongside the column's own direct tags.
 */
export function inheritedByLeaf(
  nodes: ColumnNode[],
  assignments: ApiRaciAssignment[],
): Map<string, InheritedTag[]> {
  const result = new Map<string, InheritedTag[]>();

  const add = (key: string, tag: InheritedTag) => {
    const list = result.get(key) ?? [];
    list.push(tag);
    result.set(key, list);
  };

  const walk = (node: ColumnNode) => {
    if (node.children.length > 0) {
      // Units are skipped: their head column already holds the unit's target.
      const own =
        node.kind !== 'position'
          ? []
          : assignments.filter(
              (a) =>
                a.orgUnitId === node.target.orgUnitId &&
                (a.positionId ?? undefined) === node.target.positionId &&
                !a.userId,
            );
      const key = own.length > 0 ? anchorLeafKey(node) : undefined;
      if (key) {
        for (const assignment of own) {
          add(key, { assignment, from: 'position', fromTitle: node.title });
        }
      }
      node.children.forEach(walk);
    }
  };

  nodes.forEach(walk);
  return result;
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
