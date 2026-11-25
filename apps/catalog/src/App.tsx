import { Ionicons } from '@expo/vector-icons';
import {
  Amount,
  amountValue,
  applyKey,
  BarChart,
  BudgetCard,
  BudgetSummaryCard,
  Button,
  CategoryPicker,
  DayHeader,
  EmptyState,
  fontAssets,
  IconTile,
  ListRow,
  ListSection,
  NumberPad,
  PeriodPicker,
  ProgressBar,
  SegmentedControl,
  Sheet,
  space,
  TabBar,
  Text,
  ThemeProvider,
  tints,
  ToastProvider,
  Toggle,
  TransactionRow,
  useTheme,
  useToast,
  type CategoryOption,
  type ChartBar,
  type ColorScheme,
  type Tab,
} from '@atomic/ui';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

/** On web, `?scheme=dark` or `?scheme=light` picks the scheme, for screenshots. */
function schemeFromUrl(): ColorScheme | null {
  const search = (globalThis as { location?: { search?: string } }).location?.search ?? '';
  const scheme = new URLSearchParams(search).get('scheme');
  return scheme === 'dark' || scheme === 'light' ? scheme : null;
}

export function App() {
  const [fontsLoaded] = useFonts(fontAssets);
  const system = useColorScheme();
  const [scheme, setScheme] = useState<ColorScheme>(
    () => schemeFromUrl() ?? (system === 'dark' ? 'dark' : 'light')
  );
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider scheme={scheme}>
        <ToastProvider>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Catalog scheme={scheme} onScheme={setScheme} />
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

type TabKey = 'log' | 'insights' | 'budgets' | 'settings';

const tabs: Tab<TabKey>[] = [
  { key: 'log', label: 'Registro', icon: 'list-outline', activeIcon: 'list' },
  { key: 'insights', label: 'Resumen', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
  { key: 'budgets', label: 'Presupuestos', icon: 'grid-outline', activeIcon: 'grid' },
  { key: 'settings', label: 'Ajustes', icon: 'settings-outline', activeIcon: 'settings' },
];

function Catalog({
  scheme,
  onScheme,
}: {
  scheme: ColorScheme;
  onScheme: (scheme: ColorScheme) => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>('log');

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}>
        <View style={styles.header}>
          <Text variant="largeTitle" weight="bold">
            Catálogo
          </Text>
          <SegmentedControl
            segments={[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Oscuro' },
            ]}
            value={scheme}
            onChange={onScheme}
          />
        </View>
        <LogDemo />
        <EntryDemo />
        <CategoryDemo />
        <ChartDemo />
        <BudgetDemo />
        <SheetDemo />
        <EmptyDemo />
        <SettingsDemo />
        <Demo title="Botones">
          <Button
            label="Guardar gasto"
            onPress={() => toast({ text: 'Gasto guardado', tone: 'success' })}
          />
          <Button label="Cancelar" variant="secondary" />
          <View style={styles.row}>
            <Button label="Semana" size="small" variant="secondary" />
            <Button
              label="Nuevo"
              size="small"
              icon={<Ionicons name="add" size={16} color={colors.onAccent} />}
            />
            <Button label="Ver todo" size="small" variant="plain" />
          </View>
          <Button label="Sin conexión" disabled />
        </Demo>
      </ScrollView>
      <TabBar
        tabs={tabs}
        active={tab}
        onChange={setTab}
        onAdd={() => toast({ text: 'Nuevo gasto' })}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

function Demo({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.demo}>
      <Text variant="title3" weight="bold">
        {title}
      </Text>
      {children}
    </View>
  );
}

function LogDemo() {
  const toast = useToast();
  const remove = () => toast({ text: 'Gasto borrado', tone: 'success' });

  return (
    <Demo title="Registro">
      <View style={styles.total}>
        <Text variant="caption" weight="semibold" color="textMuted">
          NETO ESTE MES
        </Text>
        <Amount value={1137.45} variant="display" sign="always" />
      </View>
      <View>
        <DayHeader title="Hoy" total={-24.3} />
        <TransactionRow
          title="Almuerzo"
          subtitle="13:05"
          emoji="🍜"
          color={tints.orange}
          amount={-18.5}
          onLongPress={remove}
        />
        <TransactionRow
          title="Taxi"
          subtitle="09:12"
          emoji="🚕"
          color={tints.yellow}
          amount={-5.8}
        />
        <DayHeader title="Ayer" total={1161.75} />
        <TransactionRow
          title="Sueldo"
          subtitle="08:00"
          emoji="💼"
          color={tints.green}
          amount={1200}
        />
        <TransactionRow
          title="Netflix"
          subtitle="21:40"
          emoji="🎬"
          color={tints.red}
          amount={-38.25}
        />
      </View>
    </Demo>
  );
}

function EntryDemo() {
  const toast = useToast();
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [text, setText] = useState('');
  const value = amountValue(text);

  return (
    <Demo title="Ingreso de monto">
      <View style={styles.center}>
        <SegmentedControl
          segments={[
            { value: 'expense', label: 'Gasto' },
            { value: 'income', label: 'Ingreso' },
          ]}
          value={kind}
          onChange={setKind}
        />
      </View>
      <View style={styles.entryAmount}>
        <Amount value={value} variant="display" sign="never" tone={text ? 'default' : 'muted'} />
      </View>
      <NumberPad
        onKey={(key) => setText((current) => applyKey(current, key))}
        canConfirm={value > 0}
        onConfirm={() => {
          toast({
            text: kind === 'expense' ? 'Gasto guardado' : 'Ingreso guardado',
            tone: 'success',
          });
          setText('');
        }}
      />
      <Button
        label="Borrar"
        size="small"
        variant="plain"
        onPress={() => setText((current) => applyKey(current, 'delete'))}
      />
    </Demo>
  );
}

const categories: CategoryOption[] = [
  { id: 'food', name: 'Comida', emoji: '🍜', color: tints.orange },
  { id: 'transport', name: 'Transporte', emoji: '🚕', color: tints.yellow },
  { id: 'fun', name: 'Ocio', emoji: '🎬', color: tints.red },
  { id: 'home', name: 'Casa', emoji: '🏠', color: tints.blue },
  { id: 'health', name: 'Salud', emoji: '💊', color: tints.green },
];

function CategoryDemo() {
  const [selected, setSelected] = useState('food');

  return (
    <Demo title="Categorías">
      <CategoryPicker categories={categories} selected={selected} onSelect={setSelected} />
    </Demo>
  );
}

const week: ChartBar[] = [
  { key: 'mon', label: 'L', value: 42 },
  { key: 'tue', label: 'M', value: 18.5 },
  { key: 'wed', label: 'X', value: 0 },
  { key: 'thu', label: 'J', value: 64.2 },
  { key: 'fri', label: 'V', value: 31, current: true },
  { key: 'sat', label: 'S', value: 0, future: true },
  { key: 'sun', label: 'D', value: 0, future: true },
];

function ChartDemo() {
  const toast = useToast();
  const [offset, setOffset] = useState(0);

  const spent = week.reduce((sum, bar) => sum + bar.value, 0);
  const elapsed = week.filter((bar) => !bar.future).length;

  return (
    <Demo title="Resumen">
      <PeriodPicker
        title={offset === 0 ? 'Esta semana' : `Hace ${-offset} semana${offset < -1 ? 's' : ''}`}
        onPrevious={() => setOffset((current) => current - 1)}
        onNext={() => setOffset((current) => current + 1)}
        canNext={offset < 0}
      />
      <View style={styles.total}>
        <Amount value={spent} variant="amount" sign="never" />
      </View>
      <BarChart
        bars={week}
        average={spent / elapsed}
        formatValue={(value) => `S/ ${value.toFixed(2)}`}
        onSelect={(bar) => toast({ text: `${bar.label}: S/ ${bar.value.toFixed(2)}` })}
      />
    </Demo>
  );
}

function BudgetDemo() {
  const budgets = [
    { ...categories[0]!, spent: 186.4, amount: 400 },
    { ...categories[1]!, spent: 142, amount: 180 },
    { ...categories[2]!, spent: 131.5, amount: 120 },
  ];
  const total = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  const spent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
  // Day 25 of a 30-day month.
  const tick = 25 / 30;

  return (
    <Demo title="Presupuestos">
      <BudgetSummaryCard
        trailing="Noviembre"
        spent={spent}
        amount={total}
        tick={tick}
        segments={budgets.map((budget) => ({
          key: budget.id,
          share: budget.spent / total,
          color: budget.color,
        }))}
        status={`Gastaste S/ ${spent.toFixed(2)} de S/ ${total} · se renueva en 5 días`}
      />
      <View style={styles.tiles}>
        {budgets.map((budget) => (
          <BudgetCard
            key={budget.id}
            name={budget.name}
            emoji={budget.emoji}
            color={budget.color}
            spent={budget.spent}
            amount={budget.amount}
            tick={tick}
            status={
              budget.spent > budget.amount
                ? 'Se renueva en 5 días'
                : `S/ ${((budget.amount - budget.spent) / 5).toFixed(2)} por día`
            }
          />
        ))}
      </View>
      <View style={styles.budget}>
        <Text variant="footnote" color="textMuted">
          ProgressBar
        </Text>
        <ProgressBar progress={0.42} label="Ahorro" />
      </View>
    </Demo>
  );
}

function SheetDemo() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('food');

  const save = () => {
    setOpen(false);
    toast({ text: 'Gasto guardado', tone: 'success' });
  };

  return (
    <Demo title="Hoja">
      <Button label="Abrir hoja" variant="secondary" onPress={() => setOpen(true)} />
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Nuevo gasto"
        bottomInset={insets.bottom}>
        <CategoryPicker categories={categories} selected={category} onSelect={setCategory} />
        <Button label="Guardar" onPress={save} />
      </Sheet>
    </Demo>
  );
}

function EmptyDemo() {
  const toast = useToast();

  return (
    <Demo title="Vacío">
      <EmptyState
        emoji="🧾"
        title="Aún no hay gastos"
        message="Registra tu primer gasto y aparecerá aquí."
        actionLabel="Agregar gasto"
        onAction={() => toast({ text: 'Nuevo gasto' })}
      />
    </Demo>
  );
}

function icon(name: 'color-palette' | 'cash' | 'notifications' | 'calculator' | 'trash') {
  return <Ionicons name={name} size={17} color="#FFFFFF" />;
}

function SettingsDemo() {
  const [reminders, setReminders] = useState(true);
  const [cents, setCents] = useState(false);
  return (
    <Demo title="Ajustes">
      <ListSection title="General">
        <ListRow
          title="Apariencia"
          value="Sistema"
          leading={<IconTile icon={icon('color-palette')} color={tints.blue} size={30} />}
          onPress={() => {}}
        />
        <ListRow
          title="Moneda"
          value="PEN"
          leading={<IconTile icon={icon('cash')} color={tints.green} size={30} />}
          onPress={() => {}}
        />
        <ListRow
          title="Recordatorios"
          leading={<IconTile icon={icon('notifications')} color={tints.red} size={30} />}
          trailing={<Toggle value={reminders} onChange={setReminders} label="Recordatorios" />}
        />
        <ListRow
          title="Mostrar céntimos"
          leading={<IconTile icon={icon('calculator')} color={tints.purple} size={30} />}
          trailing={<Toggle value={cents} onChange={setCents} label="Mostrar céntimos" />}
        />
      </ListSection>
      <ListSection title="Datos" footer="Borrar los datos no se puede deshacer.">
        <ListRow
          title="Borrar datos"
          destructive
          leading={<IconTile icon={icon('trash')} color={tints.grey} size={30} />}
          onPress={() => {}}
        />
      </ListSection>
    </Demo>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: space.xl,
    paddingBottom: space.xxxl,
    gap: space.xxxl,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: { gap: space.lg },
  demo: { gap: space.md },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  total: { alignItems: 'center', gap: space.xs, paddingVertical: space.lg },
  center: { alignItems: 'center' },
  entryAmount: { alignItems: 'center', paddingVertical: space.xl },
  budget: { gap: space.sm },
  tiles: { gap: space.md },
});
