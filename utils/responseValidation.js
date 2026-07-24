function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

export function parseJsonResponse(response) {
  if (isObject(response)) {
    return response;
  }

  if (typeof response !== "string") {
    throw new Error("OpenAI returned an invalid response.");
  }

  try {
    return JSON.parse(response);
  } catch {
    throw new Error("OpenAI returned malformed JSON.");
  }
}

export function requireFields(object, requiredFields = []) {
  if (!isObject(object)) {
    throw new Error("Response must be a JSON object.");
  }

  for (const field of requiredFields) {
    if (
      !(field in object) ||
      object[field] === null ||
      object[field] === undefined
    ) {
      throw new Error(
        `Missing required response field: ${field}`
      );
    }
  }

  return object;
}

export function validateArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array.`);
  }

  return value;
}

export function validateString(value, fieldName) {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

export function validateNumber(value, fieldName) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`${fieldName} must be a number.`);
  }

  return number;
}

export function validateScore(value, fieldName) {
  const score = validateNumber(value, fieldName);

  if (score < 0 || score > 100) {
    throw new Error(
      `${fieldName} must be between 0 and 100.`
    );
  }

  return score;
}