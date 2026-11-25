import { StyleSheet, Text as NativeText, View } from 'react-native';
import { withAlpha } from '../theme/colors';
import { space } from '../theme/layout';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type CategoryOption = { id: string; name: string; emoji: string; color: string };

export type CategoryPickerProps = {
  categories: readonly CategoryOption[];
  selected?: string;
  onSelect: (id: string) => void;
  columns?: number;
};

/** A grid of category tiles: emoji over name on a soft wash of the category color. */
export function CategoryPicker({
  categories,
  selected,
  onSelect,
  columns = 3,
}: CategoryPickerProps) {
  const rows = chunk(categories, Math.max(1, columns));

  return (
    <View accessibilityRole="radiogroup" style={styles.grid}>
      {rows.map((row) => (
        <View key={row.map((category) => category.id).join()} style={styles.row}>
          {row.map((category) => (
            <CategoryTile
              key={category.id}
              category={category}
              selected={category.id === selected}
              onPress={() => onSelect(category.id)}
            />
          ))}
          {Array.from({ length: columns - row.length }, (_, index) => (
            <View key={`spacer-${index}`} style={[styles.cell, styles.spacer]} />
          ))}
        </View>
      ))}
    </View>
  );
}

function CategoryTile({
  category,
  selected,
  onPress,
}: {
  category: CategoryOption;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityLabel={category.name}
      aria-checked={selected}
      onPress={onPress}
      scaleTo={0.96}
      style={[
        styles.cell,
        styles.tile,
        {
          backgroundColor: withAlpha(category.color, selected ? 0.45 : 0.25),
          borderColor: selected ? category.color : 'transparent',
        },
      ]}>
      <NativeText style={styles.emoji} allowFontScaling={false}>
        {category.emoji}
      </NativeText>
      <Text variant="subheadline" weight="semibold" numberOfLines={1}>
        {category.name}
      </Text>
    </PressableScale>
  );
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];

  for (let start = 0; start < items.length; start += size) {
    rows.push(items.slice(start, start + size));
  }

  return rows;
}

const GAP = 10;

const styles = StyleSheet.create({
  grid: { gap: GAP },
  row: { flexDirection: 'row', gap: GAP },
  // Every cell, spacer included, shares a zero basis, padding and border. A
  // flex item never shrinks below its padding and border, so a spacer without
  // them would come out narrower than a tile.
  cell: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    borderWidth: 2,
    paddingHorizontal: space.sm,
  },
  spacer: { borderColor: 'transparent' },
  tile: {
    height: 84,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  emoji: { fontSize: 22, lineHeight: 28 },
});
