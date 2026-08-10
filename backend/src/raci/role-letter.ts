export const ROLE_LETTERS = ['R', 'A', 'C', 'S', 'I', 'E'] as const;
export type RoleLetter = (typeof ROLE_LETTERS)[number];
