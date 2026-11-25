import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { haptic } from '../theme/haptics';
import { minTouchTarget, radii, space } from '../theme/layout';
import { useTheme } from '../theme/ThemeProvider';
import { PressableScale } from './PressableScale';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type Tab<K extends string> = {
  key: K;
  label: string;
  icon: IconName;
  /** The icon while the tab is selected. Defaults to `icon`. */
  activeIcon?: IconName;
};

export type TabBarProps<K extends string> = {
  tabs: readonly Tab<K>[];
  active: K;
  onChange: (key: K) => void;
  /** Shows the add button between the two halves of the tabs. */
  onAdd?: () => void;
  addLabel?: string;
  /** The bottom safe-area inset, so the bar clears the home indicator. */
  bottomInset?: number;
};

/**
 * Icon-only tabs with a dark add capsule in the middle. It knows nothing of the
 * router: the app maps `active` and `onChange` to its navigator.
 */
export function TabBar<K extends string>({
  tabs,
  active,
  onChange,
  onAdd,
  addLabel = 'Agregar',
  bottomInset = 0,
}: TabBarProps<K>) {
  const { colors } = useTheme();
  const half = Math.ceil(tabs.length / 2);

  const tab = (item: Tab<K>) => {
    const selected = item.key === active;
    return (
      <Pressable
        key={item.key}
        accessibilityRole="tab"
        accessibilityLabel={item.label}
        aria-selected={selected}
        onPress={() => {
          if (selected) return;
          haptic('selection');
          onChange(item.key);
        }}
        style={styles.tab}>
        <Ionicons
          name={selected ? (item.activeIcon ?? item.icon) : item.icon}
          size={24}
          color={selected ? colors.icon : colors.textFaint}
        />
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        { backgroundColor: colors.background, paddingBottom: Math.max(bottomInset, space.md) },
      ]}>
      {tabs.slice(0, half).map(tab)}
      {onAdd ? (
        <PressableScale
          accessibilityLabel={addLabel}
          feedback="medium"
          onPress={onAdd}
          style={[styles.add, { backgroundColor: colors.accent }]}>
          <Ionicons name="add" size={26} color={colors.onAccent} />
        </PressableScale>
      ) : null}
      {tabs.slice(half).map(tab)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: space.sm,
    paddingHorizontal: space.lg,
  },
  tab: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    width: 65,
    height: 38,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
