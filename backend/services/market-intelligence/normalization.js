import { createHash } from "node:crypto";

export const MARKET_INTELLIGENCE_SCHEMA_VERSION = 1;
export const MARKET_EXTRACTION_VERSION = "l1.2";
export const MARKET_TAXONOMY_VERSION = "2026-08-05";

export const MARKET_ENTITY_TYPES = Object.freeze([
  "company",
  "role",
  "industry",
  "skill",
  "technology",
  "initiative",
  "region",
  "person"
]);

export const MARKET_DECISIONS = Object.freeze([
  "apply",
  "save",
  "skip"
]);

export const MARKET_CONSTRAINT_TYPES = Object.freeze([
  "hard",
  "preference",
  "temporary"
]);

export const MARKET_SKIP_REASONS = Object.freeze([
  "sponsorship",
  "location",
  "work-model",
  "salary",
  "seniority",
  "experience-requirement",
  "missing-mandatory-skill",
  "certification-or-license",
  "security-clearance",
  "role-mismatch",
  "industry-mismatch",
  "company-concern",
  "poor-compensation-to-effort-value",
  "duplicate-or-already-reviewed",
  "posting-quality-concern",
  "timing",
  "other"
]);

const SKILL_ALIASES = new Map([
  ["powerbi", "Power BI"],
  ["microsoftpowerbi", "Power BI"],
  ["mspowerbi", "Power BI"],
  ["structuredquerylanguage", "SQL"],
  ["sql", "SQL"],
  ["python", "Python"],
  ["tableau", "Tableau"],
  ["looker", "Looker"],
  ["excel", "Excel"],
  ["snowflake", "Snowflake"],
  ["amazonwebservices", "AWS"],
  ["aws", "AWS"],
  ["microsoftazure", "Azure"],
  ["azure", "Azure"],
  ["googlecloudplatform", "Google Cloud"],
  ["gcp", "Google Cloud"],
  ["s4hana", "SAP S/4HANA"],
  ["saps4hana", "SAP S/4HANA"],
  ["saphana", "SAP HANA"],
  ["sapbw", "SAP BW"],
  ["bigquery", "BigQuery"],
  ["redshift", "Amazon Redshift"],
  ["mysql", "MySQL"],
  ["postgresql", "PostgreSQL"],
  ["scikitlearn", "Scikit-learn"],
  ["machinelearning", "Machine Learning"],
  ["artificialintelligence", "Artificial Intelligence"],
  ["generativeai", "Generative AI"],
  ["restapi", "REST APIs"],
  ["restapis", "REST APIs"],
  ["etl", "ETL"],
  ["datamodeling", "Data Modeling"],
  ["datamodelling", "Data Modeling"],
  ["datagovernance", "Data Governance"],
  ["jira", "JIRA"],
  ["confluence", "Confluence"],
  ["alteryx", "Alteryx"],
  ["azuredatafactory", "Azure Data Factory"],
  ["pandas", "Pandas"],
  ["numpy", "NumPy"],
  ["xgboost", "XGBoost"],
  ["streamlit", "Streamlit"],
  ["linux", "Linux"],
  ["git", "Git"],
  ["github", "GitHub"],
  ["r", "R"]
]);

const TECHNOLOGY_NAMES = new Set([
  "Power BI", "SQL", "Python", "Tableau", "Looker", "Excel",
  "Snowflake", "AWS", "Azure", "Google Cloud", "SAP S/4HANA",
  "SAP HANA", "SAP BW", "BigQuery", "Amazon Redshift", "MySQL",
  "PostgreSQL", "Scikit-learn", "REST APIs", "Alteryx",
  "Azure Data Factory", "Pandas", "NumPy", "XGBoost", "Streamlit",
  "Linux", "Git", "GitHub", "R"
]);

const INITIATIVE_PATTERNS = Object.freeze([
  ["Cloud migration", /\bcloud (?:migration|moderni[sz]ation|transformation)\b|\bmigrat(?:e|ing|ion).{0,35}\bcloud\b/iu],
  ["Data migration", /\bdata migration\b|\bmigrat(?:e|ing|ion).{0,35}\bdata\b/iu],
  ["ERP modernization", /\berp moderni[sz]ation\b|\bs\/?4hana\b|\bsap transformation\b/iu],
  ["Data governance", /\bdata governance\b|\bmaster data management\b|\bdata stewardship\b/iu],
  ["AI adoption", /\b(?:generative )?ai adoption\b|\bartificial intelligence\b|\bgenerative ai\b|\bmachine learning transformation\b/iu],
  ["Automation", /\bautomation\b|\bautomate\b|\bworkflow orchestration\b/iu],
  ["Reporting modernization", /\breporting moderni[sz]ation\b|\bself-service bi\b|\bmodern analytics\b/iu],
  ["Platform consolidation", /\bplatform consolidation\b|\btool consolidation\b|\bapplication rationali[sz]ation\b/iu],
  ["Product analytics", /\bproduct analytics\b|\bproduct metrics\b|\bproduct insights\b/iu],
  ["Customer analytics", /\bcustomer analytics\b|\bcustomer insights\b|\bcustomer segmentation\b/iu],
  ["Security or compliance modernization", /\bsecurity moderni[sz]ation\b|\bcompliance transformation\b|\bsecurity compliance\b/iu]
]);

const INDUSTRY_PATTERNS = Object.freeze([
  ["Sports", /\bsports?\b|\bathletic\b|\bteam performance\b|\bfifa\b|\bnfl\b|\bnba\b|\bmlb\b|\bnhl\b/iu],
  ["Healthcare", /\bhealthcare\b|\bhealth care\b|\bclinical\b|\bpatient\b|\bmedical\b|\bhospital\b/iu],
  ["Financial Services", /\bfinancial services\b|\bbanking\b|\bfintech\b|\binsurance\b|\bpayments?\b/iu],
  ["Oil and Gas", /\boil and gas\b|\benergy exploration\b|\bpetroleum\b|\bupstream\b|\bdownstream\b/iu],
  ["Retail", /\bretail\b|\be-?commerce\b|\bmerchandising\b/iu],
  ["Technology", /\bsoftware\b|\btechnology company\b|\bsaas\b|\bcloud platform\b/iu],
  ["Manufacturing", /\bmanufacturing\b|\bfactory\b|\bindustrial\b|\bsupply chain manufacturing\b/iu],
  ["Government", /\bgovernment\b|\bpublic sector\b|\bfederal\b|\bstate agency\b/iu],
  ["Nonprofit", /\bnonprofit\b|\bnon-profit\b|\bfoundation\b|\bcharity\b/iu],
  ["Education", /\beducation\b|\buniversity\b|\bschool district\b|\bhigher education\b/iu],
  ["Media and Entertainment", /\bmedia\b|\bentertainment\b|\bstreaming\b|\bbroadcast\b/iu],
  ["Consulting", /\bconsulting\b|\bprofessional services\b/iu]
]);

const CERTIFICATION_PATTERN =
  /\b(?:certified|certification|certificate|license|licence)\b[^.\n]{0,100}/giu;

const EDUCATION_PATTERN =
  /\b(?:bachelor'?s?|master'?s?|ph\.?d\.?|doctorate|associate'?s?)\b[^.\n]{0,100}/giu;

const EXPERIENCE_PATTERN =
  /\b(\d{1,2})(?:\s*[-–—]\s*(\d{1,2}))?\+?\s+years?\s+(?:of\s+)?(?:relevant\s+)?experience\b/giu;

const SALARY_PATTERNS = Object.freeze([
  /\$\s*([\d,.]+)\s*(?:-|–|—|to)\s*\$?\s*([\d,.]+)\s*(?:per\s+year|annually|\/\s*year|\/\s*yr)?/iu,
  /\b(?:salary|compensation|pay range)\s*[:\-]?\s*\$?\s*([\d,.]+)\s*(?:-|–|—|to)\s*\$?\s*([\d,.]+)/iu
]);

const PERSON_PATTERNS = Object.freeze([
  /\bposted by\s+([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3})/gu,
  /\brecruiter\s*[:\-]\s*([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3})/gu,
  /\bhiring manager\s*[:\-]\s*([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3})/gu
]);

export function createMarketSnapshotInput({
  job,
  jobAnalysis,
  verifiedSkills = [],
  baseResumes = [],
  capturedAt = new Date().toISOString()
}) {
  const pageText = normaliseText(job?.pageText, 30_000);
  const analysis = isRecord(jobAnalysis?.analysis)
    ? jobAnalysis.analysis
    : isRecord(jobAnalysis)
      ? jobAnalysis
      : {};
  const title = firstString(
    analysis.job_title,
    analysis.jobTitle,
    job?.title,
    "Unknown role"
  );
  const company = firstString(
    analysis.company,
    analysis.companyName,
    job?.company,
    "Unknown company"
  );
  const location = firstString(
    analysis.location,
    job?.location,
    "Unknown"
  );
  const sourceUrl = normaliseUrl(job?.url);
  const role = normaliseRole(title);
  const industries = extractIndustries(pageText);
  const skills = extractSkills(pageText, analysis);
  const technologies = skills.filter((item) =>
    TECHNOLOGY_NAMES.has(item.name)
  );
  const initiatives = extractInitiatives(pageText);
  const evidence = [];
  const workModel = extractWorkModel(pageText, location, evidence);
  const employmentType = extractEmploymentType(pageText, evidence);
  const seniority = extractSeniority(title, pageText, evidence);
  const salary = extractSalary(pageText, evidence);
  const sponsorship = extractSponsorship(pageText, analysis, evidence);
  const experienceRequirements = extractExperience(pageText, evidence);
  const educationRequirements = extractRequirements(
    pageText,
    EDUCATION_PATTERN,
    "educationRequirements",
    evidence
  );
  const certificationRequirements = extractRequirements(
    pageText,
    CERTIFICATION_PATTERN,
    "certificationRequirements",
    evidence
  );
  const people = extractPeople(pageText);
  const resumeGap = createResumeGap({
    analysis,
    skills,
    verifiedSkills,
    baseResumes
  });
  const sourceFingerprint = createJobFingerprint({
    sourceUrl,
    company,
    title,
    location,
    pageText
  });
  const sourcePlatform = detectSourcePlatform(sourceUrl);
  const region = normaliseRegion(location);
  const confidence = calculateSnapshotConfidence({
    title,
    company,
    location,
    pageText,
    skills,
    salary,
    sponsorship
  });

  addEvidence(evidence, {
    field: "company",
    value: company,
    sourceType: "job-posting",
    classification: "stated",
    snippet: company
  });
  addEvidence(evidence, {
    field: "role",
    value: role.canonicalName,
    sourceType: "deterministic-normalization",
    classification: "calculated",
    snippet: title
  });
  for (const industry of industries) {
    addEvidence(evidence, {
      field: "industry",
      value: industry.name,
      sourceType: "deterministic-classification",
      classification: "inference",
      snippet: industry.evidence,
      confidence: industry.confidence
    });
  }
  for (const initiative of initiatives) {
    addEvidence(evidence, {
      field: "initiative",
      value: initiative.name,
      sourceType: "deterministic-classification",
      classification: "early-signal",
      snippet: initiative.evidence,
      confidence: initiative.confidence
    });
  }

  return deepFreeze({
    schemaVersion: MARKET_INTELLIGENCE_SCHEMA_VERSION,
    extractionVersion: MARKET_EXTRACTION_VERSION,
    taxonomyVersion: MARKET_TAXONOMY_VERSION,
    sourceFingerprint,
    jobId: job?.id ?? null,
    jobAnalysisId: jobAnalysis?.id ?? null,
    capturedAt: normaliseIso(capturedAt),
    sourceUrl,
    sourcePlatform,
    company: {
      canonicalName: company,
      normalizedKey: normaliseEntityKey(company)
    },
    role,
    industries: industries.map(toNamedEntity),
    location,
    region,
    country: inferCountry(location),
    workModel,
    employmentType,
    seniority,
    salary,
    sponsorship,
    experienceRequirements,
    educationRequirements,
    certificationRequirements,
    skills,
    technologies,
    initiatives: initiatives.map(toNamedEntity),
    people,
    evidence,
    resumeGap,
    aiRecommendation: normaliseNullableString(analysis.decision, 100),
    fit: {
      currentMatchPercent: normalisePercentage(analysis.current_match_percent),
      tailoredMatchPercent: normalisePercentage(analysis.tailored_match_percent),
      targetLevel: normaliseNullableString(analysis.target_level, 100),
      missingKeywords: normaliseStringArray(analysis.missing_keywords, 100, 50),
      keywordsToEmphasize: normaliseStringArray(analysis.keywords_to_emphasize, 100, 50)
    },
    confidence,
    limitations: createLimitations({
      pageText,
      industries,
      initiatives,
      salary,
      sponsorship
    })
  });
}

export function createMarketEntities(snapshot) {
  const entities = [];
  pushEntity(entities, "company", snapshot.company.canonicalName, {
    sourceRecordIds: [snapshot.jobId, snapshot.jobAnalysisId].filter(Boolean),
    confidence: snapshot.confidence,
    metadata: {
      sourceUrl: snapshot.sourceUrl
    }
  });
  pushEntity(entities, "role", snapshot.role.canonicalName, {
    aliases: [snapshot.role.originalTitle],
    sourceRecordIds: [snapshot.jobId].filter(Boolean),
    confidence: snapshot.role.confidence,
    metadata: {
      seniority: snapshot.seniority
    }
  });
  for (const industry of snapshot.industries) {
    pushEntity(entities, "industry", industry.name, {
      sourceRecordIds: [snapshot.jobId].filter(Boolean),
      confidence: industry.confidence,
      metadata: {}
    });
  }
  pushEntity(entities, "region", snapshot.region, {
    sourceRecordIds: [snapshot.jobId].filter(Boolean),
    confidence: snapshot.location === "Unknown" ? 0.2 : 0.8,
    metadata: {
      country: snapshot.country
    }
  });
  for (const skill of snapshot.skills) {
    pushEntity(entities, "skill", skill.name, {
      aliases: skill.aliases,
      sourceRecordIds: [snapshot.jobId].filter(Boolean),
      confidence: skill.confidence,
      metadata: {
        requirement: skill.requirement
      }
    });
  }
  for (const technology of snapshot.technologies) {
    pushEntity(entities, "technology", technology.name, {
      aliases: technology.aliases,
      sourceRecordIds: [snapshot.jobId].filter(Boolean),
      confidence: technology.confidence,
      metadata: {
        requirement: technology.requirement
      }
    });
  }
  for (const initiative of snapshot.initiatives) {
    pushEntity(entities, "initiative", initiative.name, {
      sourceRecordIds: [snapshot.jobId].filter(Boolean),
      confidence: initiative.confidence,
      metadata: {
        evidence: initiative.evidence
      }
    });
  }
  for (const person of snapshot.people) {
    pushEntity(entities, "person", person.name, {
      sourceRecordIds: [snapshot.jobId].filter(Boolean),
      confidence: person.confidence,
      metadata: {
        company: snapshot.company.canonicalName,
        role: person.role,
        sourceUrl: snapshot.sourceUrl
      }
    });
  }
  return entities;
}

export function createJobFingerprint({
  sourceUrl,
  company,
  title,
  location,
  pageText
}) {
  const canonicalUrl = canonicaliseJobUrl(sourceUrl);
  const material = canonicalUrl
    ? `url:${canonicalUrl}`
    : [
        `company:${normaliseEntityKey(company)}`,
        `title:${normaliseEntityKey(title)}`,
        `location:${normaliseEntityKey(location)}`,
        `text:${normaliseText(pageText, 30_000)}`
      ].join("|");
  return createHash("sha256").update(material, "utf8").digest("hex");
}

export function normaliseEntityKey(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/&/gu, " and ")
    .replace(/[^a-z0-9]+/gu, "")
    .slice(0, 180) || "unknown";
}

export function normaliseFilters(value = {}) {
  if (!isRecord(value)) {
    throw new TypeError("Market-intelligence filters must be an object.");
  }
  const allowed = new Set([
    "dateFrom", "dateTo", "company", "industry", "roleFamily",
    "location", "region", "workModel", "jobStatus", "decision",
    "outcome", "skill", "technology", "initiative", "sponsorship",
    "minimumConfidence", "limit", "offset"
  ]);
  const unsupported = Object.keys(value).filter((key) => !allowed.has(key));
  if (unsupported.length > 0) {
    throw new RangeError(`Unsupported market-intelligence filters: ${unsupported.join(", ")}.`);
  }
  const result = {};
  for (const key of [
    "company", "industry", "roleFamily", "location", "region",
    "workModel", "jobStatus", "decision", "outcome", "skill",
    "technology", "initiative", "sponsorship"
  ]) {
    const normalized = normaliseNullableString(value[key], 300);
    if (normalized !== null) result[key] = normalized;
  }
  for (const key of ["dateFrom", "dateTo"]) {
    if (value[key] !== undefined && value[key] !== null && String(value[key]).trim() !== "") {
      result[key] = normaliseIso(value[key]);
    }
  }
  if (value.minimumConfidence !== undefined && value.minimumConfidence !== null && value.minimumConfidence !== "") {
    const number = Number(value.minimumConfidence);
    if (!Number.isFinite(number) || number < 0 || number > 1) {
      throw new RangeError("minimumConfidence must be between 0 and 1.");
    }
    result.minimumConfidence = number;
  }
  result.limit = normaliseInteger(value.limit, 100, 1, 1000);
  result.offset = normaliseInteger(value.offset, 0, 0, 1_000_000);
  return Object.freeze(result);
}

export function snapshotMatchesFilters(snapshot, filters, decision = null, outcome = null) {
  const captured = new Date(snapshot.capturedAt).getTime();
  if (filters.dateFrom && captured < new Date(filters.dateFrom).getTime()) return false;
  if (filters.dateTo && captured > new Date(filters.dateTo).getTime()) return false;
  if (filters.company && !contains(snapshot.company?.canonicalName, filters.company)) return false;
  if (filters.industry && !snapshot.industries?.some((item) => contains(item.name, filters.industry))) return false;
  if (filters.roleFamily && !contains(snapshot.role?.canonicalName, filters.roleFamily)) return false;
  if (filters.location && !contains(snapshot.location, filters.location)) return false;
  if (filters.region && !contains(snapshot.region, filters.region)) return false;
  if (filters.workModel && !same(snapshot.workModel, filters.workModel)) return false;
  if (filters.skill && !snapshot.skills?.some((item) => contains(item.name, filters.skill))) return false;
  if (filters.technology && !snapshot.technologies?.some((item) => contains(item.name, filters.technology))) return false;
  if (filters.initiative && !snapshot.initiatives?.some((item) => contains(item.name, filters.initiative))) return false;
  if (filters.sponsorship && !contains(snapshot.sponsorship?.status, filters.sponsorship)) return false;
  if (filters.minimumConfidence !== undefined && snapshot.confidence < filters.minimumConfidence) return false;
  if (filters.decision && !same(decision?.decision, filters.decision)) return false;
  if (filters.outcome && !same(outcome, filters.outcome)) return false;
  return true;
}

export function normaliseDecisionInput(value, { partial = false } = {}) {
  if (!isRecord(value)) {
    throw new TypeError("Job decision input must be an object.");
  }
  const allowed = new Set([
    "jobId", "jobAnalysisId", "marketJobSnapshotId", "decision",
    "primaryReason", "secondaryReasons", "constraintType", "note",
    "aiRecommendationAtDecision", "userOverrodeAi", "decidedAt"
  ]);
  const unsupported = Object.keys(value).filter((key) => !allowed.has(key));
  if (unsupported.length > 0) {
    throw new RangeError(`Unsupported job-decision fields: ${unsupported.join(", ")}.`);
  }
  const result = {};
  if (!partial || Object.hasOwn(value, "jobId")) {
    result.jobId = requiredId(value.jobId, "jobId");
  }
  for (const key of ["jobAnalysisId", "marketJobSnapshotId"]) {
    if (Object.hasOwn(value, key)) {
      result[key] = optionalId(value[key], key);
    } else if (!partial) {
      result[key] = null;
    }
  }
  if (!partial || Object.hasOwn(value, "decision")) {
    const decision = normaliseEnum(value.decision, MARKET_DECISIONS, "decision");
    result.decision = decision;
  }
  if (!partial || Object.hasOwn(value, "primaryReason")) {
    const reason = normaliseNullableEnum(value.primaryReason, MARKET_SKIP_REASONS, "primaryReason");
    if ((result.decision ?? value.decision) === "skip" && reason === null) {
      throw new RangeError("A skip decision requires a primary reason.");
    }
    result.primaryReason = reason;
  }
  if (!partial || Object.hasOwn(value, "secondaryReasons")) {
    result.secondaryReasons = normaliseEnumArray(value.secondaryReasons ?? [], MARKET_SKIP_REASONS, "secondaryReasons");
  }
  if (!partial || Object.hasOwn(value, "constraintType")) {
    result.constraintType = normaliseNullableEnum(value.constraintType, MARKET_CONSTRAINT_TYPES, "constraintType");
  }
  if (!partial || Object.hasOwn(value, "note")) {
    result.note = normaliseNullableString(value.note, 2000);
  }
  if (!partial || Object.hasOwn(value, "aiRecommendationAtDecision")) {
    result.aiRecommendationAtDecision = normaliseNullableString(value.aiRecommendationAtDecision, 100);
  }
  if (!partial || Object.hasOwn(value, "userOverrodeAi")) {
    if (value.userOverrodeAi === undefined && !partial) {
      result.userOverrodeAi = false;
    } else if (typeof value.userOverrodeAi !== "boolean") {
      if (!(partial && value.userOverrodeAi === undefined)) {
        throw new TypeError("userOverrodeAi must be a boolean.");
      }
    } else {
      result.userOverrodeAi = value.userOverrodeAi;
    }
  }
  if (!partial || Object.hasOwn(value, "decidedAt")) {
    result.decidedAt = value.decidedAt ? normaliseIso(value.decidedAt) : new Date().toISOString();
  }
  return Object.freeze(result);
}

export function calculateConfidenceLabel({
  sampleSize,
  companyCount,
  dateSpanDays,
  duplicateRatio = 0
}) {
  if (sampleSize < 2) {
    return {
      label: "Insufficient evidence",
      reason: "Fewer than two matching observations are available."
    };
  }
  if (sampleSize >= 15 && companyCount >= 5 && dateSpanDays >= 30 && duplicateRatio < 0.35) {
    return {
      label: "Strong evidence",
      reason: "The observed sample includes multiple companies and a meaningful time range."
    };
  }
  if (sampleSize >= 5 && companyCount >= 2) {
    return {
      label: "Moderate evidence",
      reason: "The observed sample contains repeated evidence across more than one company."
    };
  }
  return {
    label: "Early signal",
    reason: "The pattern is visible but the observed sample remains small or narrow."
  };
}

function extractSkills(pageText, analysis) {
  const source = `${pageText}\n${normaliseStringArray(analysis.keywords_to_emphasize, 100, 50).join("\n")}`;
  const lowerSource = source.toLocaleLowerCase("en-US");
  const mandatorySections = extractRequirementSections(pageText, "mandatory");
  const preferredSections = extractRequirementSections(pageText, "preferred");
  const values = new Map();

  for (const [aliasKey, canonicalName] of SKILL_ALIASES) {
    const aliases = createSearchAliases(aliasKey, canonicalName);
    const evidence = aliases.map((alias) => findEvidence(source, alias)).find(Boolean);
    if (!evidence) continue;
    const mandatory = aliases.some((alias) => mandatorySections.some((section) => section.includes(alias.toLocaleLowerCase("en-US"))));
    const preferred = !mandatory && aliases.some((alias) => preferredSections.some((section) => section.includes(alias.toLocaleLowerCase("en-US"))));
    values.set(canonicalName, {
      name: canonicalName,
      normalizedKey: normaliseEntityKey(canonicalName),
      aliases: aliases.filter((alias) => normaliseEntityKey(alias) !== normaliseEntityKey(canonicalName)),
      requirement: mandatory ? "mandatory" : preferred ? "preferred" : "mentioned",
      confidence: mandatory || preferred ? 0.92 : 0.82,
      evidence
    });
  }

  for (const keyword of [
    ...normaliseStringArray(analysis.keywords_to_emphasize, 100, 50),
    ...normaliseStringArray(analysis.missing_keywords, 100, 50)
  ]) {
    const canonical = canonicaliseSkill(keyword);
    if (!canonical || values.has(canonical)) continue;
    const evidence = findEvidence(source, keyword) ?? keyword;
    values.set(canonical, {
      name: canonical,
      normalizedKey: normaliseEntityKey(canonical),
      aliases: keyword === canonical ? [] : [keyword],
      requirement: lowerSource.includes(`required ${keyword.toLocaleLowerCase("en-US")}`) ? "mandatory" : "mentioned",
      confidence: 0.72,
      evidence
    });
  }
  return [...values.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function extractRequirementSections(text, kind) {
  const lines = String(text ?? "").split(/\r?\n/u);
  const patterns = kind === "mandatory"
    ? [/\brequired\b/iu, /\bmust have\b/iu, /\bminimum qualifications?\b/iu, /\bwhat you need\b/iu]
    : [/\bpreferred\b/iu, /\bnice to have\b/iu, /\bdesired\b/iu, /\bbonus\b/iu];
  return lines
    .filter((line) => patterns.some((pattern) => pattern.test(line)))
    .map((line) => line.toLocaleLowerCase("en-US"));
}

function extractInitiatives(text) {
  const values = [];
  for (const [name, pattern] of INITIATIVE_PATTERNS) {
    const match = String(text ?? "").match(pattern);
    if (!match) continue;
    values.push({
      name,
      normalizedKey: normaliseEntityKey(name),
      confidence: 0.68,
      evidence: cleanSnippet(match[0])
    });
  }
  return values;
}

function extractIndustries(text) {
  const values = [];
  for (const [name, pattern] of INDUSTRY_PATTERNS) {
    const match = String(text ?? "").match(pattern);
    if (!match) continue;
    values.push({
      name,
      normalizedKey: normaliseEntityKey(name),
      confidence: 0.65,
      evidence: cleanSnippet(match[0])
    });
  }
  return values.length > 0
    ? values
    : [{
        name: "Unclassified",
        normalizedKey: "unclassified",
        confidence: 0.2,
        evidence: "No deterministic industry signal was found."
      }];
}

function extractWorkModel(text, location, evidence) {
  const source = `${location}\n${text}`.toLocaleLowerCase("en-US");
  const values = [];
  if (/\bremote\b/u.test(source)) values.push("remote");
  if (/\bhybrid\b/u.test(source)) values.push("hybrid");
  if (/\bon-?site\b|\bin[- ]office\b/u.test(source)) values.push("onsite");
  const value = values.length === 1 ? values[0] : values.length > 1 ? "mixed" : "unknown";
  addEvidence(evidence, {
    field: "workModel",
    value,
    sourceType: "job-posting",
    classification: value === "unknown" ? "insufficient-evidence" : "stated",
    snippet: findEvidence(`${location}\n${text}`, value === "onsite" ? "on-site" : value) ?? location
  });
  return value;
}

function extractEmploymentType(text, evidence) {
  const source = String(text ?? "");
  const candidates = [
    ["full-time", /\bfull[- ]time\b/iu],
    ["part-time", /\bpart[- ]time\b/iu],
    ["contract", /\bcontract(?:or)?\b/iu],
    ["temporary", /\btemporary\b|\btemp\b/iu],
    ["internship", /\binternship\b|\bintern\b/iu]
  ];
  for (const [value, pattern] of candidates) {
    const match = source.match(pattern);
    if (match) {
      addEvidence(evidence, {
        field: "employmentType",
        value,
        sourceType: "job-posting",
        classification: "stated",
        snippet: match[0]
      });
      return value;
    }
  }
  return "unknown";
}

function extractSeniority(title, text, evidence) {
  const source = `${title}\n${text}`;
  const candidates = [
    ["executive", /\b(?:chief|vp|vice president|executive)\b/iu],
    ["principal", /\bprincipal\b|\bstaff\b/iu],
    ["lead", /\blead\b|\bmanager\b|\bdirector\b/iu],
    ["senior", /\bsenior\b|\bsr\.?\b/iu],
    ["entry", /\bjunior\b|\bjr\.?\b|\bentry[- ]level\b|\bassociate\b/iu],
    ["mid", /\bmid[- ]level\b|\bintermediate\b/iu]
  ];
  for (const [value, pattern] of candidates) {
    const match = source.match(pattern);
    if (match) {
      addEvidence(evidence, {
        field: "seniority",
        value,
        sourceType: "deterministic-classification",
        classification: "calculated",
        snippet: match[0]
      });
      return value;
    }
  }
  return "unspecified";
}

function extractSalary(text, evidence) {
  for (const pattern of SALARY_PATTERNS) {
    const match = String(text ?? "").match(pattern);
    if (!match) continue;
    const minimum = parseMoney(match[1]);
    const maximum = parseMoney(match[2]);
    if (minimum === null || maximum === null) continue;
    const salary = {
      minimum: Math.min(minimum, maximum),
      maximum: Math.max(minimum, maximum),
      currency: "USD",
      period: inferSalaryPeriod(match[0], minimum, maximum),
      stated: true,
      evidence: cleanSnippet(match[0])
    };
    addEvidence(evidence, {
      field: "salary",
      value: `${salary.minimum}-${salary.maximum} ${salary.currency}/${salary.period}`,
      sourceType: "job-posting",
      classification: "stated",
      snippet: salary.evidence
    });
    return salary;
  }
  return {
    minimum: null,
    maximum: null,
    currency: null,
    period: null,
    stated: false,
    evidence: null
  };
}

function extractSponsorship(text, analysis, evidence) {
  const source = String(text ?? "");
  const patterns = [
    [
      "restricted",
      /\b(?:(?:no|not offer|unable to provide|cannot provide|without)\b[^.\n]{0,80}\b(?:visa|sponsorship|h-?1b)\b|(?:do|does|will|can)\s+not\s+sponsor\b|sponsorship\b[^.\n]{0,45}\b(?:not available|unavailable|not provided|not offered)\b)/iu
    ],
    [
      "available",
      /\b(?:(?:visa|h-?1b)\s+sponsorship\s+(?:is\s+)?available|sponsorship\s+(?:is\s+)?available|(?:will|can|may)\s+sponsor\b|we\s+sponsor\b|sponsorship\s+(?:is\s+)?provided)\b/iu
    ],
    ["citizenship-required", /\b(?:u\.?s\.? citizen|citizenship required|security clearance required)\b/iu]
  ];
  for (const [status, pattern] of patterns) {
    const match = source.match(pattern);
    if (!match) continue;
    const result = {
      status,
      explicit: true,
      aiRisk: normaliseNullableString(analysis.h1b_risk, 50),
      evidence: cleanSnippet(match[0])
    };
    addEvidence(evidence, {
      field: "sponsorship",
      value: status,
      sourceType: "job-posting",
      classification: "stated",
      snippet: result.evidence
    });
    return result;
  }
  const aiRisk = normaliseNullableString(analysis.h1b_risk, 50);
  return {
    status: "not-explicitly-stated",
    explicit: false,
    aiRisk,
    evidence: null
  };
}

function extractExperience(text, evidence) {
  const values = [];
  for (const match of String(text ?? "").matchAll(EXPERIENCE_PATTERN)) {
    const minimumYears = Number.parseInt(match[1], 10);
    const maximumYears = match[2] ? Number.parseInt(match[2], 10) : null;
    const requirement = {
      minimumYears,
      maximumYears,
      evidence: cleanSnippet(match[0])
    };
    values.push(requirement);
    addEvidence(evidence, {
      field: "experienceRequirements",
      value: maximumYears === null ? `${minimumYears}+ years` : `${minimumYears}-${maximumYears} years`,
      sourceType: "job-posting",
      classification: "stated",
      snippet: requirement.evidence
    });
  }
  return dedupeObjects(values, (item) => `${item.minimumYears}:${item.maximumYears ?? ""}`);
}

function extractRequirements(text, pattern, field, evidence) {
  const values = [];
  for (const match of String(text ?? "").matchAll(pattern)) {
    const value = cleanSnippet(match[0]);
    if (!value) continue;
    values.push(value);
    addEvidence(evidence, {
      field,
      value,
      sourceType: "job-posting",
      classification: "stated",
      snippet: value
    });
  }
  return [...new Set(values)].slice(0, 20);
}

function extractPeople(text) {
  const values = [];
  for (const pattern of PERSON_PATTERNS) {
    for (const match of String(text ?? "").matchAll(pattern)) {
      const name = cleanSnippet(match[1]);
      if (!name) continue;
      values.push({
        name,
        normalizedKey: normaliseEntityKey(name),
        role: match[0].toLocaleLowerCase("en-US").startsWith("posted by")
          ? "visible poster"
          : match[0].split(":")[0].trim().toLocaleLowerCase("en-US"),
        confidence: 0.72,
        source: "job-posting"
      });
    }
  }
  return dedupeObjects(values, (item) => item.normalizedKey);
}

function createResumeGap({
  analysis,
  skills,
  verifiedSkills,
  baseResumes
}) {
  const verified = new Map();
  for (const skill of verifiedSkills) {
    const name = firstString(skill?.canonicalName, skill?.name, skill?.skillName);
    if (!name) continue;
    const verifiedFlag = skill?.verified === true || skill?.verificationStatus === "verified";
    if (verifiedFlag) verified.set(normaliseEntityKey(name), name);
  }
  const required = skills.filter((skill) => skill.requirement !== "mentioned");
  const matchedVerifiedSkills = skills
    .filter((skill) => verified.has(skill.normalizedKey))
    .map((skill) => skill.name);
  const missingFromAnalysis = normaliseStringArray(analysis.missing_keywords, 100, 50);
  const missingMandatorySkills = required
    .filter((skill) => skill.requirement === "mandatory" && !verified.has(skill.normalizedKey))
    .map((skill) => skill.name);
  for (const item of missingFromAnalysis) {
    const canonical = canonicaliseSkill(item);
    if (canonical && !matchedVerifiedSkills.some((name) => normaliseEntityKey(name) === normaliseEntityKey(canonical))) {
      missingMandatorySkills.push(canonical);
    }
  }
  const missingPreferredSkills = required
    .filter((skill) => skill.requirement === "preferred" && !verified.has(skill.normalizedKey))
    .map((skill) => skill.name);
  const coverageSkills = required.length > 0
    ? required
    : skills;
  const denominator = Math.max(1, coverageSkills.length);
  const numerator = coverageSkills.filter((skill) => verified.has(skill.normalizedKey)).length;
  const currentMatchPercent = normalisePercentage(analysis.current_match_percent);
  const calculatedCoverage = coverageSkills.length > 0
    ? Math.round((numerator / denominator) * 100)
    : currentMatchPercent;
  const coveragePercentage = Math.min(
    100,
    Math.max(
      0,
      Number.isFinite(calculatedCoverage)
        ? calculatedCoverage
        : 0
    )
  );
  const baseResumeCoverage = baseResumes.map((resume) => ({
    baseResumeId: resume.id,
    name: firstString(resume.name, resume.title, "Base resume"),
    coveragePercentage: calculateResumeTextCoverage(resume, skills)
  })).sort((a, b) => b.coveragePercentage - a.coveragePercentage);
  return {
    schemaVersion: 1,
    selectedBaseResumeId: null,
    defaultBaseResumeId: baseResumes.find((resume) => resume.isDefault === true)?.id ?? null,
    matchedVerifiedSkills: uniqueStrings(matchedVerifiedSkills),
    transferableSkills: [],
    missingMandatorySkills: uniqueStrings(missingMandatorySkills),
    missingPreferredSkills: uniqueStrings(missingPreferredSkills),
    coveragePercentage,
    highImpactGaps: uniqueStrings(missingMandatorySkills).slice(0, 10),
    lowValueKeywordGaps: [],
    baseResumeCoverage,
    assessedAt: new Date().toISOString(),
    evidenceConfidence: skills.length > 0 ? 0.78 : 0.35
  };
}

function calculateResumeTextCoverage(resume, skills) {
  const text = JSON.stringify(resume ?? {}).toLocaleLowerCase("en-US");
  if (skills.length === 0) return 0;
  const matches = skills.filter((skill) => text.includes(skill.name.toLocaleLowerCase("en-US"))).length;
  return Math.round((matches / skills.length) * 100);
}

function normaliseRole(title) {
  const originalTitle = normaliseText(title, 300) || "Unknown role";
  const lower = originalTitle.toLocaleLowerCase("en-US");
  const families = [
    ["Business Intelligence Analyst", /\b(?:business intelligence|bi) (?:analyst|developer|engineer)\b/iu],
    ["Data Analyst", /\bdata analyst\b|\banalytics analyst\b/iu],
    ["Product Analyst", /\bproduct analyst\b|\bproduct analytics\b/iu],
    ["Business Analyst", /\bbusiness (?:data )?analyst\b/iu],
    ["Reporting Analyst", /\breporting analyst\b|\breports? developer\b/iu],
    ["Operations Analyst", /\boperations? analyst\b/iu],
    ["Marketing Analyst", /\bmarketing (?:data |analytics )?analyst\b/iu],
    ["Customer Analytics Analyst", /\bcustomer (?:analytics|insights) analyst\b/iu],
    ["Supply Chain Analyst", /\bsupply chain analyst\b/iu],
    ["Analytics Engineer", /\banalytics engineer\b/iu],
    ["Data Scientist", /\bdata scientist\b|\bdecision scientist\b/iu],
    ["Data Engineer", /\bdata engineer\b/iu],
    ["Analytics Consultant", /\banalytics consultant\b|\bdata consultant\b/iu]
  ];
  for (const [canonicalName, pattern] of families) {
    if (pattern.test(lower)) {
      return {
        canonicalName,
        normalizedKey: normaliseEntityKey(canonicalName),
        originalTitle,
        confidence: 0.88
      };
    }
  }
  return {
    canonicalName: originalTitle,
    normalizedKey: normaliseEntityKey(originalTitle),
    originalTitle,
    confidence: 0.55
  };
}

function normaliseRegion(location) {
  const value = normaliseText(location, 300) || "Unknown";
  const lower = value.toLocaleLowerCase("en-US");
  const regions = [
    ["Phoenix Metropolitan Area", /\bphoenix\b|\bglendale\b|\btempe\b|\bscottsdale\b|\bmesa\b/iu],
    ["Dallas-Fort Worth", /\bdallas\b|\bfort worth\b|\bdfw\b|\birving\b|\bplano\b/iu],
    ["New York Metropolitan Area", /\bnew york\b|\bnyc\b|\bjersey city\b/iu],
    ["San Francisco Bay Area", /\bsan francisco\b|\bbay area\b|\bsan jose\b|\boakland\b/iu],
    ["Greater Los Angeles", /\blos angeles\b|\birvine\b|\banaheim\b/iu],
    ["Greater Chicago", /\bchicago\b/iu],
    ["Greater Boston", /\bboston\b|\bcambridge\b/iu],
    ["Greater Seattle", /\bseattle\b|\bbellevue\b/iu],
    ["Austin Metropolitan Area", /\baustin\b/iu],
    ["Remote - United States", /\bremote\b.*\b(?:united states|u\.?s\.?|usa)\b|\b(?:united states|u\.?s\.?|usa)\b.*\bremote\b/iu]
  ];
  for (const [name, pattern] of regions) {
    if (pattern.test(lower)) return name;
  }
  return value;
}

function inferCountry(location) {
  const lower = String(location ?? "").toLocaleLowerCase("en-US");
  if (/\b(?:united states|usa|u\.s\.|arizona|texas|california|new york|illinois|massachusetts|washington)\b/u.test(lower)) {
    return "United States";
  }
  if (/\bcanada\b|\btoronto\b|\bvancouver\b/u.test(lower)) return "Canada";
  if (/\bunited kingdom\b|\blondon\b|\buk\b/u.test(lower)) return "United Kingdom";
  return "Unknown";
}

function detectSourcePlatform(url) {
  const value = String(url ?? "").toLocaleLowerCase("en-US");
  if (value.includes("linkedin.com")) return "LinkedIn";
  if (value.includes("indeed.com")) return "Indeed";
  if (value.includes("greenhouse.io")) return "Greenhouse";
  if (value.includes("lever.co")) return "Lever";
  if (value.includes("workday")) return "Workday";
  if (value.includes("ziprecruiter")) return "ZipRecruiter";
  return value ? "Other" : "Unknown";
}

function canonicaliseJobUrl(value) {
  const url = normaliseUrl(value);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(?:utm_|trk|tracking|ref|source)/iu.test(key)) parsed.searchParams.delete(key);
    }
    return parsed.toString().replace(/\/$/u, "");
  } catch {
    return url;
  }
}

function normaliseUrl(value) {
  const text = normaliseNullableString(value, 2048);
  if (text === null) return null;
  try {
    const parsed = new URL(text);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function calculateSnapshotConfidence({
  title,
  company,
  location,
  pageText,
  skills,
  salary,
  sponsorship
}) {
  let score = 0.2;
  if (title && title !== "Unknown role") score += 0.15;
  if (company && company !== "Unknown company") score += 0.15;
  if (location && location !== "Unknown") score += 0.1;
  if (pageText.length >= 500) score += 0.15;
  if (skills.length >= 3) score += 0.15;
  if (salary.stated) score += 0.05;
  if (sponsorship.explicit) score += 0.05;
  return Number(Math.min(1, score).toFixed(2));
}

function createLimitations({
  pageText,
  industries,
  initiatives,
  salary,
  sponsorship
}) {
  const limitations = [
    "Conclusions are limited to the user's observed job sample."
  ];
  if (pageText.length < 500) limitations.push("The stored job text is short and may omit requirements.");
  if (industries.some((item) => item.name === "Unclassified")) limitations.push("Industry could not be classified deterministically.");
  if (initiatives.length > 0) limitations.push("Initiative themes are early signals, not proof of a company-wide program.");
  if (!salary.stated) limitations.push("No explicit salary range was found.");
  if (!sponsorship.explicit) limitations.push("Sponsorship was not explicitly stated in the observed text.");
  return limitations;
}

function pushEntity(collection, entityType, canonicalName, {
  aliases = [],
  sourceRecordIds = [],
  confidence = 0.5,
  metadata = {}
}) {
  if (!canonicalName || canonicalName === "Unknown") return;
  collection.push({
    schemaVersion: 1,
    taxonomyVersion: MARKET_TAXONOMY_VERSION,
    entityType,
    canonicalName,
    normalizedKey: normaliseEntityKey(canonicalName),
    aliases: uniqueStrings(aliases),
    sourceRecordIds: uniqueStrings(sourceRecordIds),
    confidence: normaliseConfidence(confidence),
    metadata
  });
}

function addEvidence(collection, {
  field,
  value,
  sourceType,
  classification,
  snippet,
  confidence = null
}) {
  collection.push({
    field,
    value,
    sourceType,
    classification,
    snippet: normaliseNullableString(snippet, 500),
    confidence: confidence === null ? null : normaliseConfidence(confidence)
  });
}

function toNamedEntity(value) {
  return {
    name: value.name,
    normalizedKey: value.normalizedKey,
    confidence: normaliseConfidence(value.confidence),
    evidence: normaliseNullableString(value.evidence, 500)
  };
}

function canonicaliseSkill(value) {
  const text = normaliseText(value, 100);
  if (!text) return null;
  return SKILL_ALIASES.get(normaliseEntityKey(text)) ?? text;
}

function createSearchAliases(aliasKey, canonicalName) {
  const aliases = new Set([canonicalName]);
  if (aliasKey === "powerbi") aliases.add("PowerBI");
  if (aliasKey === "structuredquerylanguage") aliases.add("Structured Query Language");
  if (aliasKey === "amazonwebservices") aliases.add("Amazon Web Services");
  if (aliasKey === "s4hana") aliases.add("S/4 HANA");
  if (aliasKey === "restapi") aliases.add("REST API");
  return [...aliases];
}

function findEvidence(source, value) {
  const sourceText = String(source ?? "");
  const searchValue = String(value ?? "").trim();
  if (!searchValue) return null;

  const escapedValue = searchValue.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const requiresBoundaries = /^[A-Za-z0-9][A-Za-z0-9 .+#/-]*$/u.test(searchValue);
  const pattern = new RegExp(
    requiresBoundaries
      ? `(?<![A-Za-z0-9])${escapedValue}(?![A-Za-z0-9])`
      : escapedValue,
    "iu"
  );
  const match = pattern.exec(sourceText);
  if (!match) return null;

  const start = Math.max(0, match.index - 80);
  const end = Math.min(sourceText.length, match.index + match[0].length + 120);
  return cleanSnippet(sourceText.slice(start, end));
}

function cleanSnippet(value) {
  return normaliseText(value, 500);
}

function parseMoney(value) {
  const number = Number(String(value ?? "").replace(/,/gu, ""));
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function inferSalaryPeriod(source, minimum, maximum) {
  if (/\b(?:hour|hourly|\/\s*hr)\b/iu.test(source)) return "hour";
  if (maximum <= 500) return "hour";
  return "year";
}

function normaliseIso(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new RangeError("A valid ISO date is required.");
  }
  return date.toISOString();
}

function normalisePercentage(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function normaliseConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Number(Math.max(0, Math.min(1, number)).toFixed(2));
}

function normaliseInteger(value, fallback, minimum, maximum) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number.parseInt(String(value), 10);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new RangeError(`Integer value must be between ${minimum} and ${maximum}.`);
  }
  return number;
}

function normaliseEnum(value, allowed, field) {
  const normalized = String(value ?? "").trim().toLocaleLowerCase("en-US").replace(/\s+/gu, "-");
  if (!allowed.includes(normalized)) {
    throw new RangeError(`${field} must be one of: ${allowed.join(", ")}.`);
  }
  return normalized;
}

function normaliseNullableEnum(value, allowed, field) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return normaliseEnum(value, allowed, field);
}

function normaliseEnumArray(value, allowed, field) {
  if (!Array.isArray(value)) throw new TypeError(`${field} must be an array.`);
  return uniqueStrings(value.map((item) => normaliseEnum(item, allowed, field)));
}

function requiredId(value, field) {
  const result = optionalId(value, field);
  if (result === null) throw new RangeError(`${field} is required.`);
  return result;
}

function optionalId(value, field) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const result = String(value).trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(result)) {
    throw new RangeError(`${field} is invalid.`);
  }
  return result;
}

function normaliseText(value, maximumLength = 30_000) {
  return String(value ?? "")
    .replaceAll("\u0000", "")
    .replace(/\r\n?/gu, "\n")
    .replace(/[ \t]+/gu, " ")
    .replace(/ *\n */gu, "\n")
    .trim()
    .slice(0, maximumLength);
}

function normaliseNullableString(value, maximumLength) {
  if (value === undefined || value === null) return null;
  const text = normaliseText(value, maximumLength);
  return text || null;
}

function normaliseStringArray(value, maximumItemLength, maximumItems) {
  if (!Array.isArray(value)) return [];
  return uniqueStrings(
    value
      .map((item) => normaliseNullableString(item, maximumItemLength))
      .filter(Boolean)
  ).slice(0, maximumItems);
}

function firstString(...values) {
  for (const value of values) {
    const text = normaliseNullableString(value, 500);
    if (text !== null) return text;
  }
  return null;
}

function contains(value, expected) {
  return String(value ?? "").toLocaleLowerCase("en-US").includes(String(expected ?? "").toLocaleLowerCase("en-US"));
}

function same(value, expected) {
  return normaliseEntityKey(value) === normaliseEntityKey(expected);
}

function uniqueStrings(values) {
  const result = [];
  const seen = new Set();
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (!text) continue;
    const key = text.toLocaleLowerCase("en-US");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}

function dedupeObjects(values, keyFactory) {
  const result = [];
  const seen = new Set();
  for (const value of values) {
    const key = keyFactory(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}
