import { palettes, type Colors } from '@rising/ui';
import {
  FlexWidget,
  TextWidget,
  type HexColor,
  type WidgetRepresentation,
} from 'react-native-android-widget';
import { NEW_ENTRY_URL } from '../entry/entryLink';
import type { WidgetSummary } from './summary';

/** Each must match a font file the widget plugin in app.json copies. */
const regular = 'Inter_400Regular';
const semiBold = 'Inter_600SemiBold';

function hex(color: string): HexColor {
  return color as HexColor;
}

/** Widgets take no hooks: the colors arrive as an argument, one tree per scheme. */
function SummaryWidget({ summary, colors }: { summary: WidgetSummary; colors: Colors }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 24,
        backgroundColor: hex(colors.card),
      }}>
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <TextWidget
          text={summary.label}
          style={{ fontSize: 14, fontFamily: regular, color: hex(colors.textMuted) }}
        />

        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: NEW_ENTRY_URL }}
          style={{
            height: 36,
            width: 36,
            borderRadius: 18,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: hex(colors.accent),
          }}>
          <TextWidget
            text="+"
            style={{ fontSize: 22, fontFamily: semiBold, color: hex(colors.onAccent) }}
          />
        </FlexWidget>
      </FlexWidget>

      <TextWidget
        text={summary.amount}
        maxLines={1}
        style={{ fontSize: 32, fontFamily: semiBold, color: hex(colors.text) }}
      />

      <TextWidget
        text={summary.detail}
        maxLines={1}
        style={{ fontSize: 14, fontFamily: regular, color: hex(colors.textMuted) }}
      />
    </FlexWidget>
  );
}

/** The widget in both schemes; the launcher shows the one that matches the system. */
export function summaryWidget(summary: WidgetSummary): WidgetRepresentation {
  return {
    light: <SummaryWidget summary={summary} colors={palettes.light} />,
    dark: <SummaryWidget summary={summary} colors={palettes.dark} />,
  };
}
