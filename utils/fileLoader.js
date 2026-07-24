import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");

const cache = new Map();

function resolvePath(relativePath) {
  return path.join(ROOT, relativePath);
}

function read(relativePath) {
  if (cache.has(relativePath)) {
    return cache.get(relativePath);
  }

  const filePath = resolvePath(relativePath);

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Missing required profile file: ${relativePath}`
    );
  }

  const content = fs.readFileSync(filePath, "utf8").trim();

  cache.set(relativePath, content);

  return content;
}

export function clearProfileCache() {
  cache.clear();
}

export function validateProfileFiles() {
  const requiredFiles = [
    "profile/master_profile.txt",
    "profile/preferences.txt",
    "profile/resumes/general_resume.txt",
    "profile/resumes/sap_resume.txt",
    "profile/skills/analytics.txt",
    "profile/skills/sap.txt",
    "profile/experience/accenture.txt",
    "profile/experience/community_dreams.txt"
  ];

  const missing = requiredFiles.filter(
    (file) => !fs.existsSync(resolvePath(file))
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required profile files:\n${missing.join("\n")}`
    );
  }

  return true;
}

export function loadMasterProfile() {
  return read("profile/master_profile.txt");
}

export function loadPreferences() {
  return read("profile/preferences.txt");
}

export function loadResume(type = "general") {
  const normalized = String(type ?? "general")
    .trim()
    .toLowerCase();

  const allowed = {
    general: "profile/resumes/general_resume.txt",
    sap: "profile/resumes/sap_resume.txt"
  };

  const relativePath = allowed[normalized];

  if (!relativePath) {
    throw new Error(
      `Unsupported resume type: ${type}`
    );
  }

  return read(relativePath);
}

export function loadSkills(type = "analytics") {
  const normalized = String(type ?? "analytics")
    .trim()
    .toLowerCase();

  const allowed = {
    analytics: "profile/skills/analytics.txt",
    general: "profile/skills/analytics.txt",
    sap: "profile/skills/sap.txt"
  };

  const relativePath = allowed[normalized];

  if (!relativePath) {
    throw new Error(
      `Unsupported skills profile: ${type}`
    );
  }

  return read(relativePath);
}

export function loadExperience() {
  return {
    accenture: read("profile/experience/accenture.txt"),
    communityDreams: read(
      "profile/experience/community_dreams.txt"
    )
  };
}

export function loadCandidateContext({
  resumeType = "general"
} = {}) {
  const normalizedType = String(
    resumeType ?? "general"
  )
    .trim()
    .toLowerCase();

  return {
    masterProfile: loadMasterProfile(),
    preferences: loadPreferences(),
    resume: loadResume(normalizedType),
    skills: loadSkills(normalizedType),
    experience: loadExperience()
  };
}