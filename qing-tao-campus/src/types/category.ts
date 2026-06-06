export interface Category {
  id: number;
  name: string;
  icon: string;
  sortOrder: number;
}

export const CAMPUS_OPTIONS = [
  { value: 'kexue', label: '科学校区' },
  { value: 'dongfeng', label: '东风校区' },
] as const;
