import { budgetStatus, fromCents, totalsByCategory, type Budget } from '@rising/core';
import {
  BudgetCard,
  BudgetSummaryCard,
  Button,
  EmptyState,
  ListRow,
  ListSection,
  Sheet,
  space,
  type MeterSegment,
} from '@rising/ui';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BudgetForm } from '../budgets/BudgetForm';
import { Screen } from '../components/Screen';
import { categoryOf, useData } from '../data/DataProvider';
import { budgetLine, daysLeft, formatMoney } from '../format';
import { useSheet } from '../useSheet';
import { useNow } from '../useNow';

const periodNames = { week: 'Esta semana', month: 'Este mes' } as const;

/** The overall budget on top, split by category, then one card per category budget. */
export function BudgetsScreen() {
  const insets = useSafeAreaInsets();
  const { budgets, categories, transactions, settings, write } = useData();
  const form = useSheet<Budget>();
  const confirm = useSheet<Budget>();

  const now = useNow();
  const format = { currency: settings.currency };
  const overall = budgets.find((budget) => budget.categoryId === null);
  const perCategory = budgets.filter((budget) => budget.categoryId !== null);

  async function remove(budget: Budget) {
    confirm.hide();
    await write((store) => store.deleteBudget(budget.id));
  }

  function renderOverall(budget: Budget) {
    const status = budgetStatus(budget, transactions, now, settings.weekStart);
    const days = daysLeft(status.period, now);

    const segments: MeterSegment[] = totalsByCategory(transactions, status.period, 'expense').map(
      ({ categoryId, total }) => ({
        key: categoryId,
        share: total / budget.amount,
        color: categoryOf(categories, categoryId).color,
      })
    );

    return (
      <BudgetSummaryCard
        title="General"
        trailing={periodNames[budget.period]}
        spent={fromCents(status.spent)}
        amount={fromCents(budget.amount)}
        segments={segments}
        tick={status.elapsed}
        status={`Gastaste ${formatMoney(status.spent, settings.currency)} de ${formatMoney(budget.amount, settings.currency)} · se renueva en ${days} ${days === 1 ? 'día' : 'días'}`}
        format={format}
        onPress={() => form.show(budget)}
        onLongPress={() => confirm.show(budget)}
      />
    );
  }

  function renderCategory(budget: Budget) {
    const category = categoryOf(categories, budget.categoryId ?? '');
    const status = budgetStatus(budget, transactions, now, settings.weekStart);

    return (
      <BudgetCard
        key={budget.id}
        name={category.name}
        emoji={category.emoji}
        color={category.color}
        spent={fromCents(status.spent)}
        amount={fromCents(budget.amount)}
        tick={status.elapsed}
        status={budgetLine(status, settings.currency, now)}
        format={format}
        onPress={() => form.show(budget)}
        onLongPress={() => confirm.show(budget)}
      />
    );
  }

  const editing = form.value;

  return (
    <>
      <Screen
        title="Presupuestos"
        trailing={<Button label="Nuevo" size="small" onPress={() => form.show()} />}>
        {budgets.length === 0 ? (
          <EmptyState
            emoji="🎯"
            title="Sin presupuestos"
            message="Pon un límite al mes o a una categoría y mira cuánto te queda."
            actionLabel="Crear presupuesto"
            onAction={() => form.show()}
          />
        ) : (
          <View style={styles.list}>
            {overall && renderOverall(overall)}
            {perCategory.map(renderCategory)}
          </View>
        )}
      </Screen>

      <Sheet
        visible={form.open}
        onClose={form.hide}
        title={editing ? 'Editar presupuesto' : 'Nuevo presupuesto'}
        bottomInset={insets.bottom}>
        <BudgetForm key={form.session} editing={editing} onDone={form.hide} />
      </Sheet>

      <Sheet
        visible={confirm.open}
        onClose={confirm.hide}
        title="¿Borrar este presupuesto?"
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

const styles = StyleSheet.create({
  list: { gap: space.md },
});
