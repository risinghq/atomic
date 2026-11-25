import type { Category } from './model';

type Seed = Pick<Category, 'id' | 'name' | 'emoji' | 'color' | 'kind'>;

// The ids are the ones the AsyncStorage version of the app stored, so imported
// transactions keep pointing at the same category.
const seeds: Seed[] = [
  { id: 'food', name: 'Comida', emoji: '🍔', color: '#FF9F43', kind: 'expense' },
  { id: 'transport', name: 'Transporte', emoji: '🚌', color: '#4F8EF7', kind: 'expense' },
  { id: 'home', name: 'Casa', emoji: '🏠', color: '#34D399', kind: 'expense' },
  { id: 'utilities', name: 'Servicios', emoji: '💡', color: '#FDCC41', kind: 'expense' },
  { id: 'shopping', name: 'Compras', emoji: '🛍️', color: '#B57BFF', kind: 'expense' },
  { id: 'health', name: 'Salud', emoji: '💊', color: '#FF6B5E', kind: 'expense' },
  { id: 'entertainment', name: 'Ocio', emoji: '🎬', color: '#7C83FD', kind: 'expense' },
  { id: 'education', name: 'Educación', emoji: '📚', color: '#FF6FAE', kind: 'expense' },
  { id: 'travel', name: 'Viajes', emoji: '✈️', color: '#2DD4BF', kind: 'expense' },
  { id: 'other', name: 'Otros', emoji: '📦', color: '#A6A6A6', kind: 'expense' },
  { id: 'salary', name: 'Sueldo', emoji: '💼', color: '#34D399', kind: 'income' },
  { id: 'freelance', name: 'Freelance', emoji: '💻', color: '#4F8EF7', kind: 'income' },
  { id: 'investment', name: 'Inversiones', emoji: '📈', color: '#7C83FD', kind: 'income' },
  { id: 'gift', name: 'Regalos', emoji: '🎁', color: '#FF9F43', kind: 'income' },
  { id: 'other-income', name: 'Otros', emoji: '💰', color: '#A6A6A6', kind: 'income' },
];

/** The categories a new install starts with. */
export const defaultCategories: Category[] = seeds.map(
  ({ id, name, emoji, color, kind }, position) => ({
    id,
    name,
    emoji,
    color,
    kind,
    position,
    archived: false,
  })
);

/** The category a record falls back to when its own is unknown. */
export const fallbackCategoryId = { expense: 'other', income: 'other-income' } as const;
