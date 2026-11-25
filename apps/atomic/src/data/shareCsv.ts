import { File, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';

/** Writes the CSV to the cache and opens the system share sheet on it. */
export async function shareCsv(name: string, csv: string) {
  const file = new File(Paths.cache, name);
  await file.write(csv);

  await shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'Exportar movimientos',
  });
}
