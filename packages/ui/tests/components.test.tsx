import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Amount,
  NumberPad,
  ProgressBar,
  SegmentedControl,
  TabBar,
  ToastProvider,
  Toggle,
  useToast,
} from '../src';

afterEach(cleanup);

describe('Amount', () => {
  it('signs income and keeps the symbol', () => {
    render(<Amount value={12.7} tone="income" sign="always" />);
    expect(document.body.textContent).toBe('+S/ 12.70');
  });

  it('splits a large amount into sign, symbol and number', () => {
    render(<Amount value={-137.45} variant="display" />);
    expect(screen.getByText('137.45')).toBeTruthy();
    expect(document.body.textContent).toBe('-S/137.45');
  });
});

describe('Toggle', () => {
  it('reports the next value', () => {
    const onChange = vi.fn();
    render(<Toggle value={false} onChange={onChange} label="Recordatorios" />);
    const toggle = screen.getByRole('switch', { name: 'Recordatorios' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('ignores presses while disabled', () => {
    const onChange = vi.fn();
    render(<Toggle value={false} onChange={onChange} label="Recordatorios" disabled />);
    fireEvent.click(screen.getByRole('switch', { name: 'Recordatorios' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('ProgressBar', () => {
  it('reports the clamped percentage', () => {
    render(<ProgressBar progress={1.4} label="Presupuesto" />);
    const bar = screen.getByRole('progressbar', { name: 'Presupuesto' });
    expect(bar.getAttribute('aria-valuenow')).toBe('100');
  });
});

describe('NumberPad', () => {
  it('sends digits and the point key, and confirms', () => {
    const onKey = vi.fn();
    const onConfirm = vi.fn();
    render(<NumberPad onKey={onKey} onConfirm={onConfirm} decimalSeparator="," />);
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    fireEvent.click(screen.getByRole('button', { name: ',' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onKey.mock.calls).toEqual([['7'], ['.']]);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('blocks confirm while it cannot confirm', () => {
    const onConfirm = vi.fn();
    render(<NumberPad onKey={() => {}} onConfirm={onConfirm} canConfirm={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('SegmentedControl', () => {
  it('selects another segment', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        segments={[
          { value: 'expense', label: 'Gasto' },
          { value: 'income', label: 'Ingreso' },
        ]}
        value="expense"
        onChange={onChange}
      />
    );
    expect(screen.getByRole('tab', { name: 'Gasto' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Ingreso' }));
    expect(onChange).toHaveBeenCalledWith('income');
  });
});

describe('TabBar', () => {
  const tabs = [
    { key: 'log', label: 'Registro', icon: 'list' },
    { key: 'insights', label: 'Resumen', icon: 'pie-chart' },
  ] as const;

  it('changes tab and presses add', () => {
    const onChange = vi.fn();
    const onAdd = vi.fn();
    render(<TabBar tabs={tabs} active="log" onChange={onChange} onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Registro' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Resumen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(onChange.mock.calls).toEqual([['insights']]);
    expect(onAdd).toHaveBeenCalledOnce();
  });
});

function Trigger() {
  const show = useToast();
  return <button onClick={() => show({ text: 'Gasto guardado', tone: 'success' })}>go</button>;
}

describe('Toast', () => {
  // Real timers: Reanimated keeps the frame scheduler it found at import, so
  // faked animation frames never reach the exit animation.
  it('shows a message and removes it after its duration', async () => {
    render(
      <ToastProvider duration={50}>
        <Trigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('go'));
    expect(screen.getByRole('alert').textContent).toContain('Gasto guardado');
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('throws outside a provider', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow('ToastProvider');
    error.mockRestore();
  });
});
