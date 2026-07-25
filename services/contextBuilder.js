import { getCandidateProfile } from "./profileService.js";

export function buildContext({
  jobDescription = "",
  companyName = "",
  jobTitle = "",
  resumeType = "general"
} = {}) {
  const normalizedResumeType = String(resumeType)
    .trim()
    .toLowerCase();

  const candidate = getCandidateProfile(normalizedResumeType);

  return {
    candidate,

profile: candidate.masterProfile,

resume: candidate.resume,

    job: {
      description: String(jobDescription).trim(),
      companyName: String(companyName).trim(),
      jobTitle: String(jobTitle).trim()
    },

    resumeType: normalizedResumeType
  };
}