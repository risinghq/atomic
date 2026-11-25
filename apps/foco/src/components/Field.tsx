import { space, Text } from '@rising/ui';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

/** A caption over one control, for choices a list row cannot hold. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="subheadline" weight="semibold" color="textMuted">
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.sm },
});
