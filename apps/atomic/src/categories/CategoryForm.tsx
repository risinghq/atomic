import type { Category, Kind } from '@atomic/core';
import {
  Button,
  IconTile,
  PressableScale,
  radii,
  space,
  textStyle,
  tints,
  useTheme,
  useToast,
  type Tint,
} from '@atomic/ui';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Field } from '../components/Field';
import { useData } from '../data/DataProvider';

const colorNames: Record<Tint, string> = {
  red: 'Rojo',
  orange: 'Naranja',
  yellow: 'Amarillo',
  green: 'Verde',
  teal: 'Turquesa',
  blue: 'Azul',
  indigo: 'Índigo',
  purple: 'Morado',
  pink: 'Rosa',
  grey: 'Gris',
};

const pictograph = /\p{Extended_Pictographic}/u;

/**
 * The emoji a change to the emoji field leaves. An emoji keyboard inserts a
 * whole sequence at once, so the inserted text is the new emoji; text without
 * one leaves the current emoji in place.
 */
export function emojiAfter(current: string, typed: string): string {
  const inserted = typed.startsWith(current) ? typed.slice(current.length) : typed;

  return pictograph.test(inserted) ? inserted.trim() : current;
}

type Props = {
  kind: Kind;
  /** The category to edit; a new one when absent. */
  editing?: Category;
  onDone: () => void;
};

/** Names a category and picks its emoji and color. An existing one can also be archived or restored. */
export function CategoryForm({ kind, editing, onDone }: Props) {
  const { categories, write } = useData();
  const { colors } = useTheme();
  const toast = useToast();

  const [emoji, setEmoji] = useState(editing?.emoji ?? '🏷️');
  const [name, setName] = useState(editing?.name ?? '');
  const [color, setColor] = useState<string>(editing?.color ?? tints.blue);

  const trimmed = name.trim();

  // A kind always keeps one category to record with.
  const lastActive =
    categories.filter((category) => category.kind === kind && !category.archived).length <= 1;

  async function finish(change: Parameters<typeof write>[0], text: string) {
    await write(change);
    toast({ text, tone: 'success' });
    onDone();
  }

  function save() {
    const fields = { name: trimmed, emoji, color };

    void finish(
      (store) =>
        editing
          ? store.updateCategory({ ...editing, ...fields })
          : store.addCategory({ ...fields, kind }),
      'Categoría guardada'
    );
  }

  function setArchived(archived: boolean) {
    if (!editing) return;

    void finish(
      (store) => store.updateCategory({ ...editing, archived }),
      archived ? 'Categoría archivada' : 'Categoría restaurada'
    );
  }

  const input = [
    styles.input,
    textStyle('body'),
    { backgroundColor: colors.surface, color: colors.text },
  ];

  return (
    <View style={styles.form}>
      <View style={styles.identity}>
        <IconTile icon={emoji} color={color} size={56} />

        <View style={styles.fields}>
          <TextInput
            accessibilityLabel="Emoji"
            value={emoji}
            onChangeText={(typed) => setEmoji((current) => emojiAfter(current, typed))}
            selectTextOnFocus
            style={input}
          />
          <TextInput
            accessibilityLabel="Nombre"
            value={name}
            onChangeText={setName}
            placeholder="Nombre"
            placeholderTextColor={colors.textMuted}
            maxLength={24}
            returnKeyType="done"
            style={input}
          />
        </View>
      </View>

      <Field label="Color">
        <View accessibilityRole="radiogroup" style={styles.swatches}>
          {(Object.keys(colorNames) as Tint[]).map((tint) => {
            const chosen = tints[tint] === color;

            return (
              <PressableScale
                key={tint}
                accessibilityRole="radio"
                accessibilityLabel={colorNames[tint]}
                accessibilityState={{ checked: chosen }}
                onPress={() => setColor(tints[tint])}
                style={[
                  styles.swatch,
                  { backgroundColor: tints[tint] },
                  chosen && { borderColor: colors.text },
                ]}
              />
            );
          })}
        </View>
      </Field>

      <Button label="Guardar" disabled={trimmed === ''} onPress={save} />

      {editing?.archived ? (
        <Button label="Restaurar" variant="secondary" onPress={() => setArchived(false)} />
      ) : null}

      {editing && !editing.archived && !lastActive ? (
        <Button label="Archivar" variant="secondary" onPress={() => setArchived(true)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  fields: { flex: 1, gap: space.sm },
  input: { borderRadius: radii.lg, paddingHorizontal: space.lg, paddingVertical: space.md },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: 'transparent' },
});
