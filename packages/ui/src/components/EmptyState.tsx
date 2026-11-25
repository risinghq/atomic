import { StyleSheet, Text as NativeText, View } from 'react-native';
import { space } from '../theme/layout';
import { Button } from './Button';
import { Text } from './Text';

export type EmptyStateProps = {
  emoji: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** What a screen shows before it has data: an emoji, a line of why, and the way out. */
export function EmptyState({ emoji, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.root}>
      <NativeText style={styles.emoji} allowFontScaling={false}>
        {emoji}
      </NativeText>
      <Text variant="title3" style={styles.center}>
        {title}
      </Text>
      {message ? (
        <Text variant="subheadline" color="textMuted" style={styles.center}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} size="small" onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xxxl,
    paddingHorizontal: space.xl,
  },
  emoji: { fontSize: 44, lineHeight: 52, marginBottom: space.xs },
  center: { textAlign: 'center' },
  action: { marginTop: space.md },
});
