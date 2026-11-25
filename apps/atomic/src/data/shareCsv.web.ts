/** Downloads the CSV: a browser has no share sheet for a generated file. */
export async function shareCsv(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));

  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();

  // Firefox reads the URL after click returns, so revoking at once can cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
