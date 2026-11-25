import { describe, expect, it, jest } from '@jest/globals';
import { screen } from '@testing-library/react-native';
import type { Store } from '@rising/core';
import { Children, isValidElement, type ReactNode } from 'react';
import type { WidgetRepresentation, WidgetTaskHandlerProps } from 'react-native-android-widget';
import { NEW_ENTRY_URL } from '../src/entry/entryLink';
import { Root } from '../src/Root';
import { widgetHandler } from '../src/widget/handler';
import { launchFrom, linkArrives } from './native';
import { freshStore, renderWith } from './render';

const now = new Date(2026, 10, 25, 12);

const info = {
  widgetName: 'Summary',
  widgetId: 1,
  width: 320,
  height: 160,
  screenInfo: {
    screenHeightDp: 800,
    screenWidthDp: 400,
    density: 2,
    densityDpi: 320,
    fontScale: 1,
  },
};

type Drawn = { texts: string[]; links: string[]; opensApp: boolean };

/** What the launcher would show: the texts in order and where each tap leads. */
function drawn(representation: WidgetRepresentation, scheme: 'light' | 'dark' = 'light'): Drawn {
  const root = 'light' in representation ? representation[scheme] : representation;
  const result: Drawn = { texts: [], links: [], opensApp: false };

  const walk = (node: ReactNode) => {
    if (!isValidElement<Record<string, any>>(node)) return;

    const { type, props } = node;

    // Widget primitives carry `convertProps`; anything else is a component to expand.
    if (typeof type === 'function' && !('convertProps' in type)) {
      walk((type as (props: object) => ReactNode)(props));
      return;
    }

    // Currency formatting puts a no-break space after "S/".
    if (typeof props.text === 'string') result.texts.push(props.text.replace(/\s/g, ' '));
    if (props.clickAction === 'OPEN_URI') result.links.push(props.clickActionData.uri);
    if (props.clickAction === 'OPEN_APP') result.opensApp = true;

    Children.forEach(props.children as ReactNode, walk);
  };

  walk(root);

  return result;
}

/** Runs the launcher's request for `action` and returns what the handler drew, if anything. */
async function launcherAsks(store: Store, action: WidgetTaskHandlerProps['widgetAction']) {
  const renderWidget = jest.fn<(widget: WidgetRepresentation) => void>();

  await widgetHandler(
    async () => store,
    () => now
  )({
    widgetInfo: info,
    widgetAction: action,
    renderWidget,
  });

  return renderWidget.mock.calls[0]?.[0];
}

async function spend(store: Store, amount: number, at: Date) {
  await store.addTransaction({
    kind: 'expense',
    amount,
    categoryId: 'food',
    note: '',
    at: at.getTime(),
  });
}

describe('home-screen widget', () => {
  it('shows what was spent this month when there is no overall budget', async () => {
    const store = await freshStore();

    await spend(store, 1_850, new Date(2026, 10, 3));
    await spend(store, 1_150, new Date(2026, 10, 24));
    await spend(store, 9_999, new Date(2026, 9, 30));
    await store.addTransaction({
      kind: 'income',
      amount: 300_000,
      categoryId: 'salary',
      note: '',
      at: new Date(2026, 10, 1).getTime(),
    });

    const widget = await launcherAsks(store, 'WIDGET_ADDED');

    expect(drawn(widget!).texts).toEqual(['Gastado este mes', '+', 'S/ 30.00', 'Noviembre 2026']);
  });

  it('shows what is left per day of the overall budget', async () => {
    const store = await freshStore();

    await store.setBudget({ categoryId: null, amount: 60_000, period: 'month' });
    await spend(store, 3_000, new Date(2026, 10, 10));

    const widget = await launcherAsks(store, 'WIDGET_UPDATE');

    // S/ 570 left over the 6 days from the 25th to the 30th.
    expect(drawn(widget!).texts).toEqual(['Gastado este mes', '+', 'S/ 30.00', 'S/ 95.00 por día']);
  });

  it('follows a weekly overall budget', async () => {
    const store = await freshStore();

    await store.setBudget({ categoryId: null, amount: 10_000, period: 'week' });
    await spend(store, 12_000, new Date(2026, 10, 24));
    await spend(store, 5_000, new Date(2026, 10, 20));

    const widget = await launcherAsks(store, 'WIDGET_RESIZED');

    // Wednesday the 25th, in a week that starts on Monday: 5 days to go.
    expect(drawn(widget!).texts).toEqual([
      'Gastado esta semana',
      '+',
      'S/ 120.00',
      'Se renueva en 5 días',
    ]);
  });

  it('draws both schemes, opens the app on a tap and a new entry from its add button', async () => {
    const store = await freshStore();
    const widget = await launcherAsks(store, 'WIDGET_ADDED');

    for (const scheme of ['light', 'dark'] as const) {
      expect(drawn(widget!, scheme)).toEqual(
        expect.objectContaining({ links: [NEW_ENTRY_URL], opensApp: true })
      );
    }
  });

  it('draws nothing when the launcher removes it', async () => {
    const store = await freshStore();

    expect(await launcherAsks(store, 'WIDGET_DELETED')).toBeUndefined();
  });
});

describe('new-entry link', () => {
  it('opens the entry sheet when the app starts from it', async () => {
    const store = await freshStore();

    launchFrom(NEW_ENTRY_URL);
    await renderWith(store, <Root />);

    expect(await screen.findByText('Nuevo movimiento')).toBeOnTheScreen();
  });

  it('opens the entry sheet when it arrives while the app runs', async () => {
    const store = await freshStore();

    await renderWith(store, <Root />);
    await screen.findByRole('button', { name: 'Agregar' });

    expect(screen.queryByText('Nuevo movimiento')).not.toBeOnTheScreen();

    await linkArrives(NEW_ENTRY_URL);

    expect(await screen.findByText('Nuevo movimiento')).toBeOnTheScreen();
  });
});
