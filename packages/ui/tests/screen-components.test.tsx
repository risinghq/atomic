import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

afterEach(cleanup);

describe('withAlpha', () => {
  it('turns a hex color into rgba', () => {
    expect(withAlpha('#FF6B5E', 0.25)).toBe('rgba(255, 107, 94, 0.25)');
  });

  it('passes other forms through', () => {
    expect(withAlpha('rgba(1, 2, 3, 1)', 0.5)).toBe('rgba(1, 2, 3, 1)');
  });
});

describe('CategoryPicker', () => {
  const categories = [
    { id: 'food', name: 'Comida', emoji: '🍜', color: '#FF9F43' },
    { id: 'taxi', name: 'Taxi', emoji: '🚕', color: '#FDCC41' },
    { id: 'fun', name: 'Ocio', emoji: '🎬', color: '#FF6B5E' },
    { id: 'home', name: 'Casa', emoji: '🏠', color: '#4F8EF7' },
  ];

  it('marks the selected tile and reports a new choice', () => {
    const onSelect = vi.fn();
    render(<CategoryPicker categories={categories} selected="taxi" onSelect={onSelect} />);

    expect(screen.getByRole('radio', { name: 'Taxi' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Ocio' }).getAttribute('aria-checked')).toBe('false');

    fireEvent.click(screen.getByRole('radio', { name: 'Casa' }));
    expect(onSelect).toHaveBeenCalledWith('home');
  });
});

describe('BudgetMeter', () => {
  it('reports the filled share, capped at the whole bar', () => {
    render(
      <BudgetMeter
        label="General"
        segments={[
          { key: 'a', share: 0.5, color: '#FF9F43' },
          { key: 'b', share: 0.7, color: '#4F8EF7' },
        ]}
      />
    );

    const meter = screen.getByRole('progressbar', { name: 'General' });
    expect(meter.getAttribute('aria-valuenow')).toBe('100');
  });

  it('places the pace tick at the elapsed share', () => {
    render(<BudgetMeter segments={[]} tick={0.25} />);

    expect(screen.getByTestId('meter-tick').style.left).toBe('25%');
  });
});

describe('BudgetCard', () => {
  it('shows what is left', () => {
    render(<BudgetCard name="Comida" emoji="🍜" color="#FF9F43" spent={60} amount={100} />);

    expect(document.body.textContent).toContain('S/ 40.00');
    expect(document.body.textContent).toContain('restante');
  });

  it('shows how far over the budget is', () => {
    render(<BudgetCard name="Ocio" emoji="🎬" color="#FF6B5E" spent={130} amount={100} />);

    expect(document.body.textContent).toContain('S/ 30.00');
    expect(document.body.textContent).toContain('excedido');
  });
});

describe('PeriodPicker', () => {
  it('steps back and blocks the step past the current period', () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    render(
      <PeriodPicker
        title="Noviembre 2026"
        onPrevious={onPrevious}
        onNext={onNext}
        canNext={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Periodo anterior' }));
    fireEvent.click(screen.getByRole('button', { name: 'Periodo siguiente' }));

    expect(onPrevious).toHaveBeenCalledOnce();
    expect(onNext).not.toHaveBeenCalled();
  });
});

describe('BarChart', () => {
  const bars: ChartBar[] = [
    { key: 'mon', label: 'L', value: 20 },
    { key: 'tue', label: 'M', value: 0 },
    { key: 'wed', label: 'X', value: 40, current: true },
    { key: 'thu', label: 'J', value: 0, future: true },
  ];

  it('labels each bar with its value and selects one with data', () => {
    const onSelect = vi.fn();
    render(<BarChart bars={bars} formatValue={(value) => `S/ ${value}`} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'X, S/ 40' }));
    fireEvent.click(screen.getByRole('button', { name: 'M, S/ 0' }));

    expect(onSelect.mock.calls.map(([bar]) => bar.key)).toEqual(['wed']);
  });

  it('shows the average only when enough bars hold data', () => {
    expect(showsAverage(bars, 30)).toBe(true);
    expect(showsAverage([{ key: 'a', label: 'a', value: 5 }], 5)).toBe(false);
    expect(showsAverage(bars, 0)).toBe(false);
  });
});

function SheetHarness() {
  const [open, setOpen] = useState(true);

  return (
    <Sheet visible={open} onClose={() => setOpen(false)} title="Nuevo gasto">
      <span>contenido</span>
    </Sheet>
  );
}

describe('Sheet', () => {
  // Real timers: the sheet unmounts after its exit animation.
  it('closes from the backdrop and leaves after its exit', async () => {
    render(<SheetHarness />);
    expect(screen.getByText('contenido')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    await waitFor(() => expect(screen.queryByText('contenido')).toBeNull());
  });
});

describe('EmptyState', () => {
  it('runs its action', () => {
    const onAction = vi.fn();
    render(
      <EmptyState emoji="🧾" title="Sin gastos" actionLabel="Agregar gasto" onAction={onAction} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Agregar gasto' }));

    expect(onAction).toHaveBeenCalledOnce();
  });
});

describe('TransactionRow', () => {
  it('stays pressable with only a long-press handler', () => {
    render(
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

    expect(screen.getByRole('button', { name: 'Taxi' }).getAttribute('aria-disabled')).toBeNull();
    expect(screen.getByRole('button', { name: 'Bus' }).getAttribute('aria-disabled')).toBe('true');
  });
});
