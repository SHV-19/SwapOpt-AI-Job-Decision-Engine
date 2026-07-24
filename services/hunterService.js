import axios from "axios";

const HUNTER_API_URL = "https://api.hunter.io/v2/domain-search";

const REQUEST_TIMEOUT = 10000;
const MAX_RESULTS = 10;
const MAX_RECOMMENDED_CONTACTS = 5;

const STRONG_MATCHES = [
  "recruiter",
  "technical recruiter",
  "talent acquisition",
  "talent partner",
  "talent acquisition partner",
  "talent acquisition specialist",
  "data analyst",
  "senior data analyst",
  "lead data analyst",
  "analytics manager",
  "data analytics manager",
  "business intelligence manager",
  "bi manager",
  "reporting manager",
  "insights manager",
  "hiring manager"
];

const MEDIUM_MATCHES = [
  "analytics",
  "data",
  "business intelligence",
  "bi ",
  "insights",
  "reporting",
  "machine learning",
  "artificial intelligence",
  "data science",
  "strategy",
  "product analytics"
];

const AVOID_MATCHES = [
  "sales",
  "marketing",
  "legal",
  "finance",
  "accounting",
  "payroll",
  "campus",
  "operations",
  "administrator",
  "administration",
  "executive assistant",
  "chief",
  "founder",
  "owner",
  "vp",
  "vice president",
  "president",
  "director of sales"
];

export async function hunterSearch(domain) {
  const apiKey = process.env.HUNTER_API_KEY;

  if (!apiKey || !domain) {
    return [];
  }

  try {
    const { data } = await axios.get(HUNTER_API_URL, {
      timeout: REQUEST_TIMEOUT,
      params: {
        domain: String(domain).trim().toLowerCase(),
        api_key: apiKey,
        limit: MAX_RESULTS
      }
    });

    return Array.isArray(data?.data?.emails)
      ? data.data.emails
      : [];
  } catch (error) {
    console.error(
      "Hunter API request failed:",
      error.response?.status || error.message
    );

    return [];
  }
}

export function filterRelevantHunterContacts(contacts = []) {
  if (!Array.isArray(contacts)) {
    return [];
  }

  return contacts
    .map((person) => {
      const title = String(person.position ?? "").toLowerCase();

      let relevanceScore = Number(person.confidence ?? 0) / 100;

      if (STRONG_MATCHES.some((match) => title.includes(match))) {
        relevanceScore += 5;
      }

      if (MEDIUM_MATCHES.some((match) => title.includes(match))) {
        relevanceScore += 2;
      }

      if (AVOID_MATCHES.some((match) => title.includes(match))) {
        relevanceScore -= 5;
      }

      return {
        ...person,
        relevanceScore
      };
    })
    .filter(
      ({ relevanceScore, value, email }) =>
        relevanceScore >= 2 && (value || email)
    )
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, MAX_RECOMMENDED_CONTACTS);
}