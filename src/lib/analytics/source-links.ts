export function sourceLink(
  selection: {
    from?: string;
    to?: string;
    products?: string[];
    contractType?: string;
  },
  filters: Record<string, string> = {},
) {
  const params = new URLSearchParams({
    ...(selection.from ? { from: selection.from } : {}),
    ...(selection.to ? { to: selection.to } : {}),
    ...(selection.contractType ? { contractType: selection.contractType } : {}),
    ...filters,
  });
  if (!filters.productName)
    selection.products?.forEach((product) => params.append("product", product));
  return "/trades?" + params;
}
