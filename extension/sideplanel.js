import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8787;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json({ limit: "5mb" }));

const profile = {
  masterProfile: fs.readFileSync("./profile/SwapOpt_Master_Profile.txt", "utf8"),
  preferences: fs.readFileSync("./profile/SwapOpt_Preferences.txt", "utf8")
};

console.log("SwapOpt Brain loaded:");
console.log("Brain:", profile.masterProfile.length, "characters");
console.log("Preferences:", profile.preferences.length, "characters");

function getJobText(pageText) {
  return String(pageText || "").slice(0, 30000);
}

async function callOpenAI(prompt) {
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: prompt,
    temperature: 0,
    text: {
      format: {
        type: "json_object"
      }
    }
  });

  return JSON.parse(response.output_text);
}

function buildAnalysisPrompt({ pageText, url }) {
  const jobText = getJobText(pageText);

  return `
You are SwapOpt, a deterministic job-fit scoring engine for Swapnil Herwadkar.

Goal:
Decide whether Swapnil should spend time tailoring and applying.

SWAPOPT CANDIDATE INTELLIGENCE PROFILE:
${profile.masterProfile}

SWAPOPT PERSONAL APPLICATION PREFERENCES:
${profile.preferences}

JOB PAGE URL:
${url || "Unknown"}

JOB PAGE TEXT:
${jobText}

Return ONLY valid JSON.

Use exactly this schema:
{
  "job_title": "string",
  "company": "string",
  "location": "string",
  "current_match_percent": 0,
  "tailored_match_percent": 0,
  "technical_match_score": 0,
  "responsibility_match_score": 0,
  "experience_level_score": 0,
  "domain_transfer_score": 0,
  "sponsorship_risk_score": 0,
  "tailoring_roi_score": 0,
  "hiring_logic_score": 0,
  "time_priority": "High",
  "target_level": "Strong Target",
  "next_action": "Tailor first, then apply",
  "decision": "Apply",
  "h1b_risk": "Medium",
  "score_explanation": "string",
  "top_match_reasons": ["string"],
  "why_they_might_hire": ["string"],
  "why_they_might_pass": ["string"],
  "missing_keywords": ["string"],
  "keywords_to_emphasize": ["string"],
  "best_resume_angle": "string",
  "recommended_projects": ["string"],
  "tailoring_notes": ["string"],
  "risk_or_overclaim_warning": "string",
  "quick_verdict": "string"
}

Rules:
- Be strict and consistent.
- Do not invent experience.
- Tailored match rarely exceeds 90.
- 100% should almost never happen.
- Penalize seniority, domain, contract, government, and H-1B risks.
- Use the user's personal preferences heavily when deciding time priority.
- Focus on hiring logic, not only ATS keyword overlap.
`;
}

function buildTailorPrompt({ pageText, url }) {
  const jobText = getJobText(pageText);

  return `
You are SwapOpt, a resume tailoring strategist for Swapnil Herwadkar.

Your job is NOT to write a full resume yet.
Your job is to give a practical tailoring plan for this job.

Use only truthful experience from the candidate profile.
Do not invent tools, domains, metrics, certifications, or responsibilities.

SWAPOPT CANDIDATE INTELLIGENCE PROFILE:
${profile.masterProfile}

SWAPOPT PERSONAL APPLICATION PREFERENCES:
${profile.preferences}

JOB PAGE URL:
${url || "Unknown"}

JOB PAGE TEXT:
${jobText}

Return ONLY valid JSON.

Use exactly this schema:
{
  "job_title": "string",
  "company": "string",
  "tailoring_worth_score": 0,
  "resume_strategy": "string",
  "recommended_resume_angle": "string",
  "summary_direction": "string",
  "skills_to_emphasize": ["string"],
  "skills_to_deprioritize": ["string"],
  "keywords_to_add": ["string"],
  "keywords_to_avoid_overclaiming": ["string"],
  "project_order": ["string"],
  "project_reasoning": "string",
  "experience_bullet_strategy": {
    "community_dreams": ["string"],
    "accenture_data_analyst_ii": ["string"],
    "accenture_data_analyst_i": ["string"]
  },
  "example_rewrites": [
    {
      "section": "string",
      "current_angle": "string",
      "better_angle": "string"
    }
  ],
  "application_positioning": "string",
  "interview_talking_points": ["string"],
  "do_not_claim": ["string"],
  "final_recommendation": "string"
}

Rules:
- Keep the same resume structure.
- Keep same job titles and dates.
- Exactly 3 bullets per job if later generating full resume.
- Exactly 2 projects.
- Keep it one-page and ATS-friendly.
- Do not overstate domain experience.
- Use the user's personal preferences when judging whether tailoring is worth it.
- Make the advice specific and useful.
- If tailoring is not worth it, say so clearly.
`;
}

function buildResumeDraftPrompt({ pageText, url }) {
  const jobText = getJobText(pageText);

  return `
You are SwapOpt, a truthful resume drafting assistant for Swapnil Herwadkar.

Goal:
Create a role-targeted resume draft for the job description.
This is NOT a final formatted DOCX yet. It is structured resume content.

Use ONLY the candidate intelligence profile and personal preferences.
Do not invent experience, tools, industries, certifications, metrics, or job titles.
Tailor emphasis, not identity.

SWAPOPT CANDIDATE INTELLIGENCE PROFILE:
${profile.masterProfile}

SWAPOPT PERSONAL APPLICATION PREFERENCES:
${profile.preferences}

JOB PAGE URL:
${url || "Unknown"}

JOB PAGE TEXT:
${jobText}

Return ONLY valid JSON.

Use exactly this schema:
{
  "job_title": "string",
  "company": "string",
  "resume_fit_warning": "string",
  "recommended_resume_title": "string",
  "professional_summary": "string",
  "skills": {
    "analytics_bi": ["string"],
    "data_platforms_modeling": ["string"],
    "programming_automation": ["string"],
    "data_quality_business_analysis": ["string"]
  },
  "work_experience": {
    "community_dreams_foundation": {
      "title_line": "Data Analyst | Community Dreams Foundation | Oct 2024 – Oct 2025 | Contract",
      "bullets": ["string", "string", "string"]
    },
    "accenture_data_analyst_ii": {
      "title_line": "Data Analyst II | Accenture | Nov 2022 - Jun 2023",
      "bullets": ["string", "string", "string"]
    },
    "accenture_data_analyst_i": {
      "title_line": "Data Analyst I | Accenture | Feb 2021 - Nov 2022",
      "bullets": ["string", "string", "string"]
    }
  },
  "projects": [
    {
      "name": "string",
      "tools": "string",
      "bullet": "string"
    },
    {
      "name": "string",
      "tools": "string",
      "bullet": "string"
    }
  ],
  "education": [
    "Master of Science in Business Analytics | University of Massachusetts Amherst | Sep 2023 - Aug 2024",
    "Bachelor of Engineering in Electronics | Ramdeobaba College of Engineering & Management | Jul 2016 - Aug 2020"
  ],
  "keywords_added": ["string"],
  "keywords_not_used_due_to_truthfulness": ["string"],
  "final_note": "string"
}

Resume rules:
- Keep the same section order:
  Contact Information, Professional Summary, Skills, Work Experience, Projects, Education.
- Keep same job titles and dates.
- Exactly 3 bullets for each work experience role.
- Exactly 2 projects.
- Keep concise one-page style.
- Use strong action verbs.
- Show business value, not just tools.
- Match the job description without exaggerating.
- Do not claim direct domain experience unless supported.
- Use truthful transferable positioning.
- If job is not worth tailoring, still provide the best truthful draft but clearly warn in resume_fit_warning.
`;
}

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "SwapOpt optimized backend running",
    brainCharacters: profile.masterProfile.length,
    preferenceCharacters: profile.preferences.length,
    endpoints: ["/analyze", "/tailor", "/resume-draft"]
  });
});

app.post("/analyze", async (req, res) => {
  try {
    const { pageText, url } = req.body;

    if (!pageText || String(pageText).trim().length < 200) {
      return res.status(400).json({
        error: "Job page text is too short. Send at least 200 characters."
      });
    }

    const result = await callOpenAI(buildAnalysisPrompt({ pageText, url }));
    res.json(result);
  } catch (error) {
    console.error("Analyze error:", error);
    res.status(500).json({
      error: "Analysis failed",
      details: error.message
    });
  }
});

app.post("/tailor", async (req, res) => {
  try {
    const { pageText, url } = req.body;

    if (!pageText || String(pageText).trim().length < 200) {
      return res.status(400).json({
        error: "Job page text is too short. Send at least 200 characters."
      });
    }

    const result = await callOpenAI(buildTailorPrompt({ pageText, url }));
    res.json(result);
  } catch (error) {
    console.error("Tailor error:", error);
    res.status(500).json({
      error: "Tailoring failed",
      details: error.message
    });
  }
});

app.post("/resume-draft", async (req, res) => {
  try {
    const { pageText, url } = req.body;

    if (!pageText || String(pageText).trim().length < 200) {
      return res.status(400).json({
        error: "Job page text is too short. Send at least 200 characters."
      });
    }

    const result = await callOpenAI(buildResumeDraftPrompt({ pageText, url }));
    res.json(result);
  } catch (error) {
    console.error("Resume draft error:", error);
    res.status(500).json({
      error: "Resume draft failed",
      details: error.message
    });
  }
});

app.post("/test", (req, res) => {
  res.json({
    status: "ok",
    received: req.body
  });
});

app.listen(PORT, () => {
  console.log(`SwapOpt backend running on http://localhost:${PORT}`);
});