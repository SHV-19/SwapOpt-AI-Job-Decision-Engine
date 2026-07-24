const REQUIRED_ENV_VARS = [
  "OPENAI_API_KEY",
  "OPENAI_MODEL"
];

export function validateEnvironment() {
  const missing = REQUIRED_ENV_VARS.filter((key) => {
    const value = process.env[key];

    return (
      typeof value !== "string" ||
      value.trim().length === 0
    );
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable${
        missing.length > 1 ? "s" : ""
      }: ${missing.join(", ")}`
    );
  }

  return true;
}