export function formatAttendanceDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }
): string {
  const raw = typeof value === "string" ? value : value.toISOString();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(raw);

  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, options).format(date);
}
