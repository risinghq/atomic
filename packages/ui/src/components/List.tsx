import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { radii, space } from '../theme/layout';
import { useTheme } from '../theme/ThemeProvider';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type ListSectionProps = {
  title?: string;
  footer?: string;
  children: ReactNode;
};

/** A titled, rounded group of rows with hairlines between them. */
export function ListSection({ title, footer, children }: ListSectionProps) {
  const { colors } = useTheme();
  const rows = Children.toArray(children);
  return (
    <View style={styles.section}>
      {title ? (
        <Text variant="subheadline" weight="semibold" color="textMuted" style={styles.title}>
          {title.toUpperCase()}
        </Text>
      ) : null}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {rows.map((row, index) => (
          <Fragment key={isValidElement(row) ? row.key : String(row)}>
            {index > 0 ? (
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
            ) : null}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <Text variant="footnote" color="textMuted" style={styles.footer}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export type ListRowProps = {
  title: string;
  subtitle?: string;
  /** A leading element, usually an IconTile. */
  leading?: ReactNode;
  /** A value shown in grey before the trailing chevron. */
  value?: string;
  /** A trailing control such as a Toggle. Replaces `value` and the chevron. */
  trailing?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
};

export function ListRow({
  title,
  subtitle,
  leading,
  value,
  trailing,
  onPress,
  destructive = false,
}: ListRowProps) {
  const { colors } = useTheme();
  const content = (
    <>
      {leading}
      <View style={styles.text}>
        <Text variant="body" color={destructive ? 'danger' : 'text'} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" color="textMuted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ?? (
        <>
          {value ? (
            <Text variant="body" color="textMuted">
              {value}
            </Text>
          ) : null}
          {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textFaint} /> : null}
        </>
      )}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <PressableScale accessibilityLabel={title} onPress={onPress} scaleTo={0.98} style={styles.row}>
      {content}
    </PressableScale>
  );
}

// From the card's edge to its rows, title and footer.
const ROW_INSET = 14;

const styles = StyleSheet.create({
  section: { gap: space.sm },
  title: { paddingHorizontal: ROW_INSET },
  card: { borderRadius: radii.xl, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: ROW_INSET },
  footer: { paddingHorizontal: ROW_INSET },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 48,
    paddingHorizontal: ROW_INSET,
    paddingVertical: space.sm,
  },
  text: { flex: 1, gap: 1 },
});
