export function tagLabel(name: string) {
  return name.replaceAll("_", " ");
}

export const tagChipClass = "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-left text-xs leading-5";

export function TagChip({ name }: { name: string }) {
  return <span className={`${tagChipClass} border-primary/20 bg-primary/5 text-primary-dark`}>{tagLabel(name)}</span>;
}
