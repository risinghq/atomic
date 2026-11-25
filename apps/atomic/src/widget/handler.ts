import type { Store } from '@atomic/core';
import type { WidgetTaskHandler } from 'react-native-android-widget';
import { summaryWidget } from './SummaryWidget';
import { readWidgetData, widgetSummary } from './summary';

/** The name app.json gives the widget. */
export const WIDGET_NAME = 'Summary';

/**
 * Draws the widget when the launcher adds, refreshes or resizes it. It only
 * reads: recurring transactions that came due wait for the app to record them.
 */
export function widgetHandler(
  open: () => Promise<Store>,
  now: () => Date = () => new Date()
): WidgetTaskHandler {
  return async ({ widgetAction, renderWidget }) => {
    if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;

    const at = now();

    renderWidget(summaryWidget(widgetSummary(await readWidgetData(await open(), at), at)));
  };
}
