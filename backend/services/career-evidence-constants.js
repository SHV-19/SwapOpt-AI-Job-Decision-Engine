export const CAREER_EVIDENCE_SERVICE_SCHEMA_VERSION = 1;
export const CAREER_EVIDENCE_GRAPH_SCHEMA_VERSION = 1;
export const CAREER_EVIDENCE_CLAIM_SCHEMA_VERSION = 1;
export const CAREER_EVIDENCE_CALCULATION_VERSION = "2026-08-14.1";
export const CAREER_EVIDENCE_SERVICE_NAME = "careerEvidenceService";

export const CLAIM_CATEGORIES = Object.freeze([
  "identity",
  "experience",
  "skill",
  "education",
  "project",
  "eligibility",
  "preference",
  "achievement",
  "credential"
]);

export const CLAIM_EVIDENCE_CLASSES = Object.freeze([
  "user-confirmed",
  "verified-source"
]);

export const GRAPH_EVIDENCE_CLASSES = Object.freeze([
  ...CLAIM_EVIDENCE_CLASSES,
  "observed",
  "derived"
]);

export const CLAIM_SENSITIVITY_LEVELS = Object.freeze([
  "standard",
  "private"
]);

export const PROTECTED_PROFILE_FIELDS = Object.freeze([
  "gender",
  "hispanicLatino",
  "race",
  "veteranStatus",
  "disabilityStatus",
  "ethnicity",
  "transgenderStatus",
  "sexualOrientation",
  "age18OrOlder",
  "activeDutyOrReserve",
  "leftActiveDuty",
  "militaryService",
  "militarySpouse"
]);

export const SAFE_PROFILE_ANSWER_DEFINITIONS = Object.freeze([
  Object.freeze({
    field: "totalProfessionalExperienceYears",
    category: "experience",
    key: "experience.total-professional-years",
    label: "Total professional experience",
    unit: "years",
    sensitivity: "standard"
  }),
  Object.freeze({
    field: "workAuthorisedUs",
    category: "eligibility",
    key: "eligibility.work-authorized-us",
    label: "Authorized to work in the United States",
    unit: null,
    sensitivity: "private"
  }),
  Object.freeze({
    field: "sponsorshipRequired",
    category: "eligibility",
    key: "eligibility.sponsorship-required",
    label: "Future employment sponsorship required",
    unit: null,
    sensitivity: "private"
  }),
  Object.freeze({
    field: "unrestrictedWorkWithoutFutureSponsorship",
    category: "eligibility",
    key: "eligibility.unrestricted-without-future-sponsorship",
    label: "Unrestricted work authorization without future sponsorship",
    unit: null,
    sensitivity: "private"
  }),
  Object.freeze({
    field: "willingToRelocate",
    category: "preference",
    key: "preference.willing-to-relocate",
    label: "Willing to relocate",
    unit: null,
    sensitivity: "standard"
  }),
  Object.freeze({
    field: "workTypeDesired",
    category: "preference",
    key: "preference.work-type",
    label: "Preferred work type",
    unit: null,
    sensitivity: "standard"
  }),
  Object.freeze({
    field: "relocationLocation",
    category: "preference",
    key: "preference.relocation-location",
    label: "Relocation location preference",
    unit: null,
    sensitivity: "standard"
  }),
  Object.freeze({
    field: "compensationTargetNumeric",
    category: "preference",
    key: "preference.compensation-target",
    label: "Compensation target",
    unit: "USD/year",
    sensitivity: "private"
  })
]);

export const MAX_CLAIM_LABEL_LENGTH = 240;
export const MAX_CLAIM_KEY_LENGTH = 160;
export const MAX_CLAIM_STRING_LENGTH = 2_000;
export const MAX_CLAIM_NOTES_LENGTH = 4_000;
export const MAX_CLAIM_SOURCE_LABEL_LENGTH = 300;
export const MAX_CLAIM_URL_LENGTH = 2_048;
export const MAX_CLAIM_ARRAY_ITEMS = 50;
export const MAX_REVISION_HISTORY = 25;
export const DEFAULT_OBSERVED_JOB_LIMIT = 250;
export const MAX_OBSERVED_JOB_LIMIT = 1_000;

export const SUBMITTED_APPLICATION_STATUSES = Object.freeze([
  "applied",
  "interview",
  "offer",
  "rejected"
]);

export const EVIDENCE_CLASS_RANK = Object.freeze({
  derived: 1,
  observed: 2,
  "verified-source": 3,
  "user-confirmed": 4
});
