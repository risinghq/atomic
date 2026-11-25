import { fromCents, periodOf, totalIn, type Transaction } from '@atomic/core';
import {
  Amount,
  DayHeader,
  EmptyState,
  ListRow,
  ListSection,
  radii,
  Sheet,
  space,
  Text,
  textStyle,
  TransactionRow,
  useTheme,
  useToast,
} from '@atomic/ui';
import { useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenTitle, screenPadding } from '../components/Screen';
import { categoryOf, useData } from '../data/DataProvider';
import { dayTitle, groupByDay, timeLabel, type Day } from '../format';
import { search } from '../search';
import { useSheet } from '../useSheet';
import { useNow } from '../useNow';

/** Every transaction, newest first, under one header per day, narrowed by a search. */
export function LogScreen({
  onAdd,
  onEdit,
}: {
  onAdd: () => void;
  onEdit: (transaction: Transaction) => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { transactions, categories, settings, write } = useData();
  const toast = useToast();
  const confirm = useSheet<Transaction>();

  const now = useNow();
  const format = { currency: settings.currency };
  const month = periodOf('month', now, settings.weekStart);
  const net = totalIn(transactions, month, 'income') - totalIn(transactions, month, 'expense');

  const [query, setQuery] = useState('');
  const searching = query.trim() !== '';
  const found = search(transactions, (id) => categoryOf(categories, id).name, query);
  const foundNet = found.reduce(
    (sum, transaction) =>
      sum + (transaction.kind === 'income' ? transaction.amount : -transaction.amount),
    0
  );

  async function remove(transaction: Transaction) {
    confirm.hide();
    await write((store) => store.deleteTransaction(transaction.id));
    toast({ text: 'Movimiento borrado', tone: 'success' });
  }

  function renderDay({ item: day }: { item: Day }) {
    return (
      <View>
        <DayHeader title={dayTitle(day.at, now)} total={fromCents(day.net)} format={format} />
        {day.transactions.map((transaction) => {
          const category = categoryOf(categories, transaction.categoryId);
          const time = timeLabel(transaction.at);
          const amount = fromCents(transaction.amount);

          return (
            <TransactionRow
              key={transaction.id}
              title={transaction.note || category.name}
              subtitle={transaction.note ? `${category.name} · ${time}` : time}
              emoji={category.emoji}
              color={category.color}
              amount={transaction.kind === 'income' ? amount : -amount}
              format={format}
              onPress={() => onEdit(transaction)}
              onLongPress={() => confirm.show(transaction)}
            />
          );
        })}
      </View>
    );
  }

  const header = (
    <View style={styles.header}>
      <ScreenTitle title="Registro" />

      {transactions.length > 0 && (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por nota, categoría o monto"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Buscar"
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
          style={[
            styles.search,
            textStyle('body'),
            { backgroundColor: colors.surface, color: colors.text },
          ]}
        />
      )}

      {transactions.length > 0 && (
        <View style={styles.net}>
          <Text variant="caption" weight="semibold" color="textMuted">
            {searching ? resultsLabel(found.length) : 'NETO ESTE MES'}
          </Text>
          <Amount
            value={fromCents(searching ? foundNet : net)}
            currency={settings.currency}
            variant="hero"
            sign="always"
          />
        </View>
      )}
    </View>
  );

  const empty = searching ? (
    <EmptyState
      emoji="🔍"
      title="Sin resultados"
      message={`Nada coincide con "${query.trim()}".`}
    />
  ) : (
    <EmptyState
      emoji="🧾"
      title="Aún no hay movimientos"
      message="Registra tu primer gasto y aparecerá aquí."
      actionLabel="Agregar gasto"
      onAction={onAdd}
    />
  );

  return (
    <>
      <FlatList
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}
        keyboardDismissMode="on-drag"
        data={groupByDay(found)}
        keyExtractor={(day) => day.key}
        renderItem={renderDay}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
      />

      <Sheet
        visible={confirm.open}
        onClose={confirm.hide}
        title="¿Borrar este movimiento?"
        bottomInset={insets.bottom}>
        <ListSection>
          <ListRow
            title="Borrar"
            destructive
            onPress={() => confirm.value && void remove(confirm.value)}
          />
        </ListSection>
      </Sheet>
    </>
  );
}

function resultsLabel(count: number): string {
  return count === 1 ? '1 MOVIMIENTO' : `${count} MOVIMIENTOS`;
}

const styles = StyleSheet.create({
  search: { borderRadius: radii.lg, paddingHorizontal: space.lg, paddingVertical: space.md },
  content: { paddingHorizontal: screenPadding, paddingBottom: space.xxxl, gap: space.lg },
  header: { gap: space.xl, paddingBottom: space.sm },
  net: { alignItems: 'center', gap: space.xs, paddingVertical: space.lg },
});
