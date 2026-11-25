import type { Category, Kind } from '@atomic/core';
import { IconTile, ListRow, ListSection, SegmentedControl, space } from '@atomic/ui';
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useData } from '../data/DataProvider';
import { CategoryForm } from './CategoryForm';

const kinds = [
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Ingresos' },
] as const;

/**
 * The categories of one kind, active first and archived after, with a row to
 * add one. Tapping a category, or adding one, opens its form in place.
 */
export function CategoryManager() {
  const { categories } = useData();
  const { height } = useWindowDimensions();
  const [kind, setKind] = useState<Kind>('expense');
  const [editing, setEditing] = useState<Category | 'new' | null>(null);

  if (editing) {
    return (
      <CategoryForm
        kind={kind}
        editing={editing === 'new' ? undefined : editing}
        onDone={() => setEditing(null)}
      />
    );
  }

  const ofKind = categories.filter((category) => category.kind === kind);
  const active = ofKind.filter((category) => !category.archived);
  const archived = ofKind.filter((category) => category.archived);

  const row = (category: Category) => (
    <ListRow
      key={category.id}
      title={category.name}
      leading={<IconTile icon={category.emoji} color={category.color} size={32} />}
      onPress={() => setEditing(category)}
    />
  );

  return (
    <View style={styles.manager}>
      <SegmentedControl segments={kinds} value={kind} onChange={setKind} />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{ maxHeight: height * 0.7 }}
        contentContainerStyle={styles.lists}>
        <ListSection>
          {active.map(row)}
          <ListRow title="Nueva categoría" onPress={() => setEditing('new')} />
        </ListSection>

        {archived.length > 0 ? (
          <ListSection
            title="Archivadas"
            footer="Sus movimientos se conservan, pero no aparecen al registrar.">
            {archived.map(row)}
          </ListSection>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  manager: { gap: space.md },
  lists: { gap: space.lg },
});
