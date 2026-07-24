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

    preferences: candidate.preferences,

    resume: candidate.resume,

    skills: candidate.skills,

    experience: candidate.experience,

    job: {
      description: String(jobDescription).trim(),
      companyName: String(companyName).trim(),
      jobTitle: String(jobTitle).trim()
    },

    resumeType: normalizedResumeType
  };
}