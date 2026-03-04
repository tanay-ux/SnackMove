import type { SnackStyle } from '../types';

export interface BenefitRule {
  id: string;
  text: string;
  snackStyle?: SnackStyle;
  minSnacks?: number;
  minMinutes?: number;
}

const BENEFIT_RULES: BenefitRule[] = [
  { id: 'energizing-cardio', text: 'May support cardiometabolic health', snackStyle: 'energizing', minMinutes: 6 },
  { id: 'mobility-stiffness', text: 'Can help reduce desk stiffness', snackStyle: 'gentle', minSnacks: 3 },
  { id: 'strength-endurance', text: 'Associated with improved muscular endurance', snackStyle: 'strength', minSnacks: 3 },
  { id: 'circulation', text: 'Associated with improved circulation', minMinutes: 4 },
  { id: 'blood-sugar', text: 'May support blood sugar control', minMinutes: 6 },
  { id: 'general', text: 'Supports general wellness', minSnacks: 1 },
];

export function getBenefitsForToday(
  snackStyle: SnackStyle,
  snackCount: number,
  totalMinutes: number
): string[] {
  const matched = BENEFIT_RULES.filter((r) => {
    if (r.snackStyle && r.snackStyle !== snackStyle) return false;
    if (r.minSnacks !== undefined && snackCount < r.minSnacks) return false;
    if (r.minMinutes !== undefined && totalMinutes < r.minMinutes) return false;
    return true;
  });
  return matched.slice(0, 3).map((r) => r.text);
}
