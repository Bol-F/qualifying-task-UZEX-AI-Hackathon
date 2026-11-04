export function csvCell(value: unknown) {
  return (
    '"' +
    String(value ?? "")
      .replace(/^[\s]*[=+@\-\t\r]/, "'$&")
      .replaceAll('"', '""') +
    '"'
  );
}
export function chartCsv(
  points: { label: string; value: string | null }[],
  unit: string,
) {
  return (
    "\uFEFF" +
    [
      ["Observation", unit].map(csvCell).join(","),
      ...points.map((p) => [csvCell(p.label), csvCell(p.value)].join(",")),
    ].join("\r\n")
  );
}
export function downloadCsv(contents: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([contents], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
