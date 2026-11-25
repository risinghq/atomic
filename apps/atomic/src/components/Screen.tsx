import { space, Text, useTheme } from '@atomic/ui';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** A tab's large title, with an optional control at its trailing edge. */
export function ScreenTitle({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <View style={styles.title}>
      <Text variant="largeTitle" weight="bold" accessibilityRole="header">
        {title}
      </Text>
      {trailing}
    </View>
  );
}

/** A scrolling tab screen under the status bar, its title first. */
export function Screen({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}>
      <ScreenTitle title={title} trailing={trailing} />
      {children}
    </ScrollView>
  );
}

export const screenPadding = space.xl;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: screenPadding,
    paddingBottom: space.xxxl,
    gap: space.xl,
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
});
