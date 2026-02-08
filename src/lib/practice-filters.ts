/**
 * Static filter definitions for Practice Labs sidebar.
 * Values must match the TinaCMS schema options in tina/config.ts.
 */

export interface EnvironmentDef {
  id: string;
  value: string;
  icon: string;
}

export const LAB_ENVIRONMENTS: EnvironmentDef[] = [
  { id: 'python',  value: 'Python',  icon: 'code' },
  { id: 'nodejs',  value: 'Node.js', icon: 'terminal' },
  { id: 'go',      value: 'Go',      icon: 'monitor' },
];

export const LAB_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const;

export type LabDifficulty = (typeof LAB_DIFFICULTIES)[number];
