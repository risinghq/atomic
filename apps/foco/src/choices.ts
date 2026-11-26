export const intervals = [
  { value: '5', label: '5 min' },
  { value: '10', label: '10 min' },
  { value: '15', label: '15 min' },
  { value: '25', label: '25 min' },
] as const;

export type IntervalChoice = (typeof intervals)[number]['value'];

export function intervalChoice(minutes: number): IntervalChoice {
  return intervals.find((choice) => Number(choice.value) === minutes)?.value ?? '5';
}
