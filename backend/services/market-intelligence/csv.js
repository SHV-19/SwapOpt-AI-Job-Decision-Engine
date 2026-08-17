const FORMULA_PREFIX_PATTERN = /^[=+\-@\t\r]/u;

export function createCsv(columns, rows) {
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new TypeError("CSV columns must be a non-empty array.");
  }
  if (!Array.isArray(rows)) {
    throw new TypeError("CSV rows must be an array.");
  }
  const header = columns.map((column) => escapeCsvCell(column.header ?? column.key)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvCell(resolveValue(row, column))).join(",")
  );
  return `\uFEFF${[header, ...body].join("\r\n")}\r\n`;
}

export function escapeCsvCell(value) {
  let text = serialiseCsvValue(value);
  if (FORMULA_PREFIX_PATTERN.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/u.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function serialiseCsvValue(value) {
  if (value === undefined || value === null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (Array.isArray(value)) {
    return value.map((item) =>
      typeof item === "object" && item !== null
        ? JSON.stringify(item)
        : String(item)
    ).join(" | ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).replaceAll("\u0000", "");
}

function resolveValue(row, column) {
  if (typeof column.value === "function") return column.value(row);
  const path = String(column.key ?? "").split(".");
  let current = row;
  for (const segment of path) {
    if (current === null || current === undefined) return null;
    current = current[segment];
  }
  return current;
}
