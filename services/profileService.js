import { loadCandidateContext } from "../utils/fileLoader.js";

const VALID_RESUME_TYPES = new Set([
  "general",
  "sap"
]);

export function getCandidateProfile(
  resumeType = "general"
) {
  const normalizedType = String(
    resumeType ?? "general"
  )
    .trim()
    .toLowerCase();

  const finalType = VALID_RESUME_TYPES.has(
    normalizedType
  )
    ? normalizedType
    : "general";

  return loadCandidateContext({
    resumeType: finalType
  });
}