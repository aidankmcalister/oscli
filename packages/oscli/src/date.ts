function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseDateByFormat(input: string, format: string): Date | null {
  const tokens: string[] = [];
  const pattern = `^${escapeRegExp(format).replace(/YYYY|MM|DD/g, (token) => {
    tokens.push(token);
    return token === "YYYY" ? "(\\d{4})" : "(\\d{2})";
  })}$`;
  const match = input.match(new RegExp(pattern));

  if (!match) {
    return null;
  }

  let year = 0;
  let month = 1;
  let day = 1;

  for (let index = 0; index < tokens.length; index += 1) {
    const value = Number(match[index + 1]);
    if (tokens[index] === "YYYY") {
      year = value;
    } else if (tokens[index] === "MM") {
      month = value;
    } else if (tokens[index] === "DD") {
      day = value;
    }
  }

  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export function formatDateValue(date: Date, format: string): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return format
    .replace(/YYYY/g, year)
    .replace(/MM/g, month)
    .replace(/DD/g, day);
}
