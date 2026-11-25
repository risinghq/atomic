import { describe, expect, it, jest } from '@jest/globals';
import {
  render,
  screen,
  userEvent,
  waitForElementToBeRemoved,
} from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';
import {
  BarChart,
  BudgetCard,
  BudgetMeter,
  CategoryPicker,
  EmptyState,
  PeriodPicker,
  Sheet,
  showsAverage,
  TransactionRow,
  withAlpha,
  type ChartBar,
} from '../src';

describe('withAlpha', () => {
  it('turns a hex color into rgba', () => {
    expect(withAlpha('#FF6B5E', 0.25)).toBe('rgba(255, 107, 94, 0.25)');
  });

  it('passes other forms through', () => {
    expect(withAlpha('rgba(1, 2, 3, 1)', 0.5)).toBe('rgba(1, 2, 3, 1)');
  });
});

const categories = [
  { id: 'food', name: 'Comida', emoji: '🍜', color: '#FF9F43' },
  { id: 'taxi', name: 'Taxi', emoji: '🚕', color: '#FDCC41' },
  { id: 'home', name: 'Casa', emoji: '🏠', color: '#4F8EF7' },
];

function CategoryField() {
  const [selected, setSelected] = useState('taxi');

  return <CategoryPicker categories={categories} selected={selected} onSelect={setSelected} />;
}

describe('CategoryPicker', () => {
  it('moves the check to the pressed category', async () => {
    const user = userEvent.setup();
    await render(<CategoryField />);
    expect(screen.getByRole('radio', { name: 'Taxi' })).toBeChecked();

    await user.press(screen.getByRole('radio', { name: 'Casa' }));

    expect(screen.getByRole('radio', { name: 'Casa' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Taxi' })).not.toBeChecked();
  });
});

describe('BudgetMeter', () => {
  it('reports the filled share, capped at the whole bar', async () => {
    await render(
      <BudgetMeter
        label="General"
        segments={[
          { key: 'a', share: 0.5, color: '#FF9F43' },
          { key: 'b', share: 0.7, color: '#4F8EF7' },
        ]}
      />
    );

    expect(screen.getByRole('progressbar', { name: 'General' })).toHaveAccessibilityValue({
      now: 100,
    });
  });
});

describe('BudgetCard', () => {
  it('shows what is left', async () => {
    await render(<BudgetCard name="Comida" emoji="🍜" color="#FF9F43" spent={60} amount={100} />);

    expect(screen.getByLabelText('S/ 40.00')).toBeOnTheScreen();
    expect(screen.getByText('restante')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Excedido')).not.toBeOnTheScreen();
  });

  it('warns how far over the budget is', async () => {
    await render(<BudgetCard name="Ocio" emoji="🎬" color="#FF6B5E" spent={130} amount={100} />);

    expect(screen.getByLabelText('S/ 30.00')).toBeOnTheScreen();
    expect(screen.getByText('excedido')).toBeOnTheScreen();
    expect(screen.getByLabelText('Excedido')).toBeOnTheScreen();
  });
});

const months = ['Septiembre 2026', 'Octubre 2026', 'Noviembre 2026'];

function MonthStepper() {
  const [index, setIndex] = useState(months.length - 1);

  return (
    <PeriodPicker
      title={months[index]}
      onPrevious={() => setIndex(index - 1)}
      onNext={() => setIndex(index + 1)}
      canNext={index < months.length - 1}
    />
  );
}

describe('PeriodPicker', () => {
  it('steps back, and forward no further than the current period', async () => {
    const user = userEvent.setup();
    await render(<MonthStepper />);
    const next = screen.getByRole('button', { name: 'Periodo siguiente' });
    expect(next).toBeDisabled();

    await user.press(screen.getByRole('button', { name: 'Periodo anterior' }));

    expect(screen.getByText('Octubre 2026')).toBeOnTheScreen();
    expect(next).toBeEnabled();

    await user.press(next);
    await user.press(next);

    expect(screen.getByText('Noviembre 2026')).toBeOnTheScreen();
  });
});

const bars: ChartBar[] = [
  { key: 'mon', label: 'L', accessibilityLabel: 'Lunes', value: 20 },
  { key: 'tue', label: 'M', accessibilityLabel: 'Martes', value: 0 },
  { key: 'wed', label: 'X', accessibilityLabel: 'Miércoles', value: 40, current: true },
  { key: 'thu', label: 'J', accessibilityLabel: 'Jueves', value: 0, future: true },
];

function WeekChart() {
  const [selected, setSelected] = useState<ChartBar | null>(null);

  return (
    <>
      <BarChart bars={bars} formatValue={(value) => `S/ ${value}`} onSelect={setSelected} />
      <Text>{selected ? `Día: ${selected.accessibilityLabel}` : 'Toda la semana'}</Text>
    </>
  );
}

describe('BarChart', () => {
  it('opens a day with spending and ignores an empty one', async () => {
    const user = userEvent.setup();
    await render(<WeekChart />);

    await user.press(screen.getByRole('button', { name: 'Martes, S/ 0' }));

    expect(screen.getByText('Toda la semana')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Miércoles, S/ 40' }));

    expect(screen.getByText('Día: Miércoles')).toBeOnTheScreen();
  });

  it('shows the average only when enough bars hold data', () => {
    expect(showsAverage(bars, 30)).toBe(true);
    expect(showsAverage([{ key: 'a', label: 'a', value: 5 }], 5)).toBe(false);
    expect(showsAverage(bars, 0)).toBe(false);
  });
});

function NewExpense() {
  const [open, setOpen] = useState(true);

  return (
    <Sheet visible={open} onClose={() => setOpen(false)} title="Nuevo gasto">
      <Text>contenido</Text>
    </Sheet>
  );
}

describe('Sheet', () => {
  it('closes from the backdrop and leaves after its exit', async () => {
    const user = userEvent.setup();
    await render(<NewExpense />);
    expect(screen.getByText('contenido')).toBeOnTheScreen();

    // The modal panel hides the backdrop from screen readers; this is a touch.
    await user.press(screen.getByRole('button', { name: 'Cerrar', includeHiddenElements: true }));

    await waitForElementToBeRemoved(() => screen.queryByText('contenido'));
  });
});

describe('EmptyState', () => {
  it('runs its action', async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();
    await render(
      <EmptyState emoji="🧾" title="Sin gastos" actionLabel="Agregar gasto" onAction={onAction} />
    );

    await user.press(screen.getByRole('button', { name: 'Agregar gasto' }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

describe('TransactionRow', () => {
  it('stays pressable with only a long-press handler', async () => {
    await render(
      <>
        <TransactionRow
          title="Taxi"
          emoji="🚕"
          color="#FDCC41"
          amount={-5.8}
          onLongPress={() => {}}
        />
        <TransactionRow title="Bus" emoji="🚌" color="#FDCC41" amount={-1.5} />
      </>
    );

    expect(screen.getByRole('button', { name: 'Taxi' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Bus' })).toBeDisabled();
  });
});
