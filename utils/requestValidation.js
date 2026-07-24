const VALID_RESUME_TYPES = ["general", "sap"];

const VALID_FEATURES = [
  "analyze",
  "tailor",
  "resume",
  "cover-letter",
  "application",
  "network"
];

function normalize(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

export function validateJobRequest(body = {}) {
  const errors = [];

  const jobDescription = normalize(body.jobDescription);
  const companyName = normalize(body.companyName);
  const jobTitle = normalize(body.jobTitle);
  const resumeType = normalize(body.resumeType).toLowerCase();

  if (!jobDescription) {
    errors.push("jobDescription is required.");
  }

  if (!companyName) {
    errors.push("companyName is required.");
  }

  if (!jobTitle) {
    errors.push("jobTitle is required.");
  }

  if (
    resumeType &&
    !VALID_RESUME_TYPES.includes(resumeType)
  ) {
    errors.push(
      `resumeType must be one of: ${VALID_RESUME_TYPES.join(", ")}.`
    );
  }

  if (errors.length) {
    const error = new Error(errors.join(" "));
    error.status = 400;
    throw error;
  }

  return {
    ...body,
    jobDescription,
    companyName,
    jobTitle,
    resumeType: resumeType || "general"
  };
}

export function validateFeature(feature) {
  const normalized = normalize(feature).toLowerCase();

  if (!VALID_FEATURES.includes(normalized)) {
    const error = new Error(
      `Unsupported feature: ${feature}`
    );
    error.status = 400;
    throw error;
  }

  return normalized;
}

export function validateEmail(email) {
  const value = normalize(email);

  const pattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!pattern.test(value)) {
    const error = new Error(
      "Invalid email address."
    );
    error.status = 400;
    throw error;
  }

  return value;
}

export function validateLinkedInUrl(url) {
  const value = normalize(url);

  if (
    value &&
    !/^https:\/\/(www\.)?linkedin\.com\/.+/i.test(
      value
    )
  ) {
    const error = new Error(
      "Invalid LinkedIn URL."
    );
    error.status = 400;
    throw error;
  }

  return value;
}