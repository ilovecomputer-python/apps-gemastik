export const formatPrice = (value: number) =>
  `Rp${value.toLocaleString("id-ID")}`;

export function formatSoldLabel(count: number): string {
  if (count >= 1000) {
    const thousands = Math.round((count / 1000) * 10) / 10;
    const label = Number.isInteger(thousands)
      ? String(thousands)
      : thousands.toFixed(1).replace(".", ",");
    return `${label}rb terjual`;
  }
  return `${count} terjual`;
}
