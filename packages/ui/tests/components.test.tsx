import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  render,
  screen,
  userEvent,
  waitForElementToBeRemoved,
} from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Text } from 'react-native';
import {
  Amount,
  amountValue,
  applyKey,
  Button,
  NumberPad,
  ProgressBar,
  SegmentedControl,
  TabBar,
  ToastProvider,
  setHapticLevel,
  Toggle,
  useToast,
  type HapticLevel,
} from '../src';

describe('Amount', () => {
  it('reads a signed income with its symbol', async () => {
    await render(<Amount value={12.7} tone="income" sign="always" />);

    expect(screen.getByLabelText('+S/ 12.70')).toBeOnTheScreen();
  });

  it('reads a large amount as one value', async () => {
    await render(<Amount value={-137.45} variant="display" />);

    expect(screen.getByLabelText('-S/ 137.45')).toBeOnTheScreen();
  });
});

function ReminderSetting({ disabled = false }: { disabled?: boolean }) {
  const [on, setOn] = useState(false);

  return <Toggle value={on} onChange={setOn} label="Recordatorios" disabled={disabled} />;
}

describe('Toggle', () => {
  it('turns on when pressed', async () => {
    const user = userEvent.setup();
    await render(<ReminderSetting />);
    const toggle = screen.getByRole('switch', { name: 'Recordatorios' });
    expect(toggle).not.toBeChecked();

    await user.press(toggle);

    expect(toggle).toBeChecked();
  });

  it('stays off while disabled', async () => {
    const user = userEvent.setup();
    await render(<ReminderSetting disabled />);
    const toggle = screen.getByRole('switch', { name: 'Recordatorios' });

    await user.press(toggle);

    expect(toggle).toBeDisabled();
    expect(toggle).not.toBeChecked();
  });
});

describe('ProgressBar', () => {
  it('reports the clamped percentage', async () => {
    await render(<ProgressBar progress={1.4} label="Presupuesto" />);

    expect(screen.getByRole('progressbar', { name: 'Presupuesto' })).toHaveAccessibilityValue({
      now: 100,
    });
  });
});

function AmountEntry({ onSave }: { onSave: (value: number) => void }) {
  const [text, setText] = useState('');

  return (
    <>
      <Text>{text || '0'}</Text>
      <NumberPad
        decimalSeparator=","
        onKey={(key) => setText((current) => applyKey(current, key))}
        onConfirm={() => onSave(amountValue(text))}
        canConfirm={text !== ''}
      />
    </>
  );
}

describe('NumberPad', () => {
  it('types an amount with the local separator and saves it', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    await render(<AmountEntry onSave={onSave} />);

    await user.press(screen.getByRole('button', { name: '7' }));
    await user.press(screen.getByRole('button', { name: ',' }));
    await user.press(screen.getByRole('button', { name: '5' }));

    expect(screen.getByText('7.5')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Confirmar' }));

    expect(onSave).toHaveBeenCalledWith(7.5);
  });

  it('cannot confirm before an amount is typed', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    await render(<AmountEntry onSave={onSave} />);
    const confirm = screen.getByRole('button', { name: 'Confirmar' });

    await user.press(confirm);

    expect(confirm).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });
});

function KindPicker() {
  const [kind, setKind] = useState('expense');

  return (
    <SegmentedControl
      segments={[
        { value: 'expense', label: 'Gasto' },
        { value: 'income', label: 'Ingreso' },
      ]}
      value={kind}
      onChange={setKind}
    />
  );
}

describe('SegmentedControl', () => {
  it('moves the selection to the pressed segment', async () => {
    const user = userEvent.setup();
    await render(<KindPicker />);
    expect(screen.getByRole('tab', { name: 'Gasto' })).toBeSelected();

    await user.press(screen.getByRole('tab', { name: 'Ingreso' }));

    expect(screen.getByRole('tab', { name: 'Ingreso' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Gasto' })).not.toBeSelected();
  });
});

function Shell({ onAdd }: { onAdd: () => void }) {
  const [active, setActive] = useState<'log' | 'insights'>('log');

  return (
    <TabBar
      tabs={[
        { key: 'log', label: 'Registro', icon: 'list' },
        { key: 'insights', label: 'Resumen', icon: 'pie-chart' },
      ]}
      active={active}
      onChange={setActive}
      onAdd={onAdd}
    />
  );
}

describe('TabBar', () => {
  it('switches tabs and offers the add button', async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn();
    await render(<Shell onAdd={onAdd} />);
    expect(screen.getByRole('tab', { name: 'Registro' })).toBeSelected();

    await user.press(screen.getByRole('tab', { name: 'Resumen' }));
    await user.press(screen.getByRole('button', { name: 'Agregar' }));

    expect(screen.getByRole('tab', { name: 'Resumen' })).toBeSelected();
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});

function SaveButton() {
  const show = useToast();

  return (
    <Button label="Guardar" onPress={() => show({ text: 'Gasto guardado', tone: 'success' })} />
  );
}

describe('Toast', () => {
  it('shows a message and removes it after its duration', async () => {
    const user = userEvent.setup();
    await render(
      <ToastProvider duration={50}>
        <SaveButton />
      </ToastProvider>
    );

    await user.press(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/Gasto guardado/);
    await waitForElementToBeRemoved(() => screen.queryByRole('alert'));
  });

  it('throws outside a provider', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(render(<SaveButton />)).rejects.toThrow('ToastProvider');

    error.mockRestore();
  });
});

async function pressToggleThenSave(level: HapticLevel) {
  const user = userEvent.setup();
  setHapticLevel(level);

  await render(
    <ToastProvider duration={50}>
      <ReminderSetting />
      <SaveButton />
    </ToastProvider>
  );

  await user.press(screen.getByRole('switch', { name: 'Recordatorios' }));
  await user.press(screen.getByRole('button', { name: 'Guardar' }));
}

describe('haptics', () => {
  // Records the calls expo-haptics receives and lets each one through to the
  // native module jest-expo stands in.
  const impact = jest.spyOn(Haptics, 'impactAsync');
  const notification = jest.spyOn(Haptics, 'notificationAsync');

  afterEach(() => {
    setHapticLevel('essential');
    impact.mockClear();
    notification.mockClear();
  });

  it('plays only the outcome of an action at the essential level', async () => {
    await pressToggleThenSave('essential');

    expect(impact).not.toHaveBeenCalled();
    expect(notification).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });

  it('plays every switch too at the all level', async () => {
    await pressToggleThenSave('all');

    expect(impact).toHaveBeenCalledTimes(1);
    expect(notification).toHaveBeenCalledTimes(1);
  });

  it('plays nothing when off', async () => {
    await pressToggleThenSave('off');

    expect(impact).not.toHaveBeenCalled();
    expect(notification).not.toHaveBeenCalled();
  });
});
