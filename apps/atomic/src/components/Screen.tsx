import { space, Text, useTheme } from '@rising/ui';
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
    // A sheet's Modal is a React child of this view, so its touches pass this
    // responder: without "handled", a tap in a sheet only blurs its input.
    <ScrollView
      keyboardShouldPersistTaps="handled"
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
