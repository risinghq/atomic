import { registerWidgetTaskHandler, requestWidgetUpdate } from 'react-native-android-widget';
import { openAppStore } from '../data/openAppStore';
import { WIDGET_NAME, widgetHandler } from './handler';
import { widgetSummary, type WidgetData } from './summary';
import { summaryWidget } from './SummaryWidget';

/** Lets the launcher draw the widget while the app is closed. */
export function registerWidget(): void {
  registerWidgetTaskHandler(widgetHandler(openAppStore));
}

/** Redraws every placed widget from the data the app already holds. */
export function refreshWidget(data: WidgetData): void {
  const widget = summaryWidget(widgetSummary(data, new Date()));

  void requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: () => widget });
}
