import { nextOccurrence, type Recurring } from '@rising/core';
import { IconTile, ListRow, ListSection } from '@rising/ui';
import { useState } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { everyLabel } from '../choices';
import { categoryOf, useData } from '../data/DataProvider';
import { dayTitle, formatMoney } from '../format';
import { useNow } from '../useNow';

/**
 * The recurring transactions, each with how often it repeats and when it
 * comes next. Tapping one offers to stop it.
 */
export function RecurringList() {
  const { recurring, categories, settings, write } = useData();
  const { height } = useWindowDimensions();
  const now = useNow();
  const [stopping, setStopping] = useState<Recurring | null>(null);

  if (stopping) {
    return (
      <ListSection footer="Los movimientos que ya registró se conservan.">
        <ListRow
          title="Dejar de repetir"
          destructive
          onPress={() =>
            void write((store) => store.deleteRecurring(stopping.id)).then(() => setStopping(null))
          }
        />
        <ListRow title="Cancelar" onPress={() => setStopping(null)} />
      </ListSection>
    );
  }

  if (recurring.length === 0) {
    return (
      <ListSection footer="Al registrar un movimiento, elige Repetir para que se anote solo.">
        <ListRow title="No hay movimientos recurrentes" />
      </ListSection>
    );
  }

  return (
    <ScrollView style={{ maxHeight: height * 0.7 }}>
      <ListSection>
        {recurring.map((rule) => {
          const category = categoryOf(categories, rule.categoryId);
          const next = dayTitle(nextOccurrence(rule, now.getTime()), now);

          return (
            <ListRow
              key={rule.id}
              title={rule.note || category.name}
              subtitle={`${everyLabel[rule.every]} · próximo: ${next}`}
              value={formatMoney(rule.amount, settings.currency)}
              leading={<IconTile icon={category.emoji} color={category.color} size={32} />}
              onPress={() => setStopping(rule)}
            />
          );
        })}
      </ListSection>
    </ScrollView>
  );
}
