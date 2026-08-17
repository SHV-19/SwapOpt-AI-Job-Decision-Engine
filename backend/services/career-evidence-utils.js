import crypto from "node:crypto";

import {
  GRAPH_EVIDENCE_CLASSES,
  EVIDENCE_CLASS_RANK,
  MAX_CLAIM_URL_LENGTH
} from "./career-evidence-constants.js";

export function sourceRef({
  sourceType,
  repositoryKey = null,
  recordId = null,
  fieldPath = null,
  label = null,
  sourceUrl = null,
  capturedAt = null
}) {
  return Object.freeze({
    sourceType: cleanString(sourceType, 120, true) ?? "unknown",
    repositoryKey: cleanString(repositoryKey, 120, true),
    recordId: cleanString(recordId, 160, true),
    fieldPath: cleanString(fieldPath, 300, true),
    label: cleanString(label, 300, true),
    sourceUrl: normaliseOptionalUrl(sourceUrl),
    capturedAt: normaliseOptionalTimestamp(capturedAt)
  });
}

export function mergeSourceRefs(left, right) {
  const output = [];
  const seen = new Set();

  for (const item of [
    ...(Array.isArray(left) ? left : []),
    ...(Array.isArray(right) ? right : [])
  ]) {
    if (!item || typeof item !== "object") continue;
    const normalized = sourceRef(item);
    const key = JSON.stringify(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
  }

  return output.slice(0, 50);
}

export function strongerEvidence(left, right) {
  const leftClass = normaliseEvidenceClass(left);
  const rightClass = normaliseEvidenceClass(right);

  return (EVIDENCE_CLASS_RANK[rightClass] ?? 0) >
    (EVIDENCE_CLASS_RANK[leftClass] ?? 0)
    ? rightClass
    : leftClass;
}

export function normaliseEvidenceClass(value) {
  const evidenceClass = cleanString(value, 80, true) ?? "derived";
  if (!GRAPH_EVIDENCE_CLASSES.includes(evidenceClass)) {
    throw new RangeError(
      `Unsupported Career Evidence graph evidence class: ${evidenceClass}.`
    );
  }
  return evidenceClass;
}

export function companyNodeId(company) {
  return `company:${normaliseEntityKey(company)}`;
}

export function normaliseEntityKey(value) {
  const normalized = String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/gu, " and ")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");

  return normalized || "unknown";
}

export function latestByKey(records, keyFactory, dateFactory) {
  const values = new Map();

  for (const record of records) {
    const key = keyFactory(record);
    if (!key) continue;
    const current = values.get(key);

    if (
      !current ||
      compareTimestamp(
        dateFactory(record),
        dateFactory(current)
      ) >= 0
    ) {
      values.set(key, record);
    }
  }

  return [...values.values()];
}

export function stableHash(parts) {
  return crypto
    .createHash("sha256")
    .update(
      parts
        .map((item) => String(item ?? ""))
        .join("\u001F"),
      "utf8"
    )
    .digest("hex")
    .slice(0, 20);
}

export function stringList(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return [];

  const output = [];
  const seen = new Set();

  for (const item of value) {
    const text = cleanString(item, maxLength, true);
    if (!text) continue;

    const key = text.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    output.push(text);

    if (output.length >= maxItems) break;
  }

  return output;
}

export function cleanRequiredString(value, maxLength, label) {
  const result = cleanString(value, maxLength, true);

  if (!result) {
    throw new TypeError(
      `${label} must be a non-empty string.`
    );
  }

  return result;
}

export function cleanString(value, maxLength, nullable) {
  if (value === undefined || value === null) {
    return nullable ? null : "";
  }

  if (typeof value !== "string") {
    return nullable ? null : "";
  }

  const result = value
    .replace(/\u0000/gu, "")
    .replace(/\s+/gu, " ")
    .trim();

  if (result === "") {
    return nullable ? null : "";
  }

  return result.length > maxLength
    ? result.slice(0, maxLength)
    : result;
}

export function normaliseOptionalUrl(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") return null;

  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (
    url.protocol !== "http:" &&
    url.protocol !== "https:"
  ) {
    return null;
  }

  url.username = "";
  url.password = "";
  url.hash = "";

  const result = url.toString();

  return result.length <= MAX_CLAIM_URL_LENGTH
    ? result
    : null;
}

export function normaliseOptionalTimestamp(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString();
}

export function normaliseBoolean(value, label) {
  if (typeof value !== "boolean") {
    throw new TypeError(`${label} must be a boolean.`);
  }

  return value;
}

export function normaliseQueryBoolean(value, label) {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }

  throw new TypeError(`${label} must be true or false.`);
}

export function normaliseOptionalQueryBoolean(
  value,
  fallback,
  label
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  return normaliseQueryBoolean(value, label);
}

export function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function compareTimestamp(left, right) {
  const leftTime = new Date(left ?? 0).getTime();
  const rightTime = new Date(right ?? 0).getTime();

  return (Number.isFinite(leftTime) ? leftTime : 0) -
    (Number.isFinite(rightTime) ? rightTime : 0);
}

export function nowIso(clock) {
  const value = clock();

  if (
    !(value instanceof Date) ||
    Number.isNaN(value.getTime())
  ) {
    throw new TypeError(
      "Career evidence service clock must return a valid Date."
    );
  }

  return value.toISOString();
}

export function isPlainObject(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

export function deepFreeze(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  Object.freeze(value);

  for (const child of Object.values(value)) {
    deepFreeze(child);
  }

  return value;
}

export function mergeMetadata(left, right) {
  return {
    ...(isPlainObject(left) ? structuredClone(left) : {}),
    ...(isPlainObject(right) ? structuredClone(right) : {})
  };
}
