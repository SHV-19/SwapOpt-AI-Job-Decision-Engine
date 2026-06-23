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

console.log("🧠 SwapOpt Brain loaded");

function cleanJobText(text) {
  return String(text || "").slice(0, 30000);
}

async function askAI(prompt) {
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


app.post("/analyze", async (req, res) => {
  try {

    const { pageText, url } = req.body;

    const prompt = `
You are SwapOpt AI.

Your job:
Decide if Swapnil should spend time applying.

Do NOT simply score keyword overlap.
Think like:
- recruiter
- hiring manager
- compensation advisor
- immigration-aware career coach


Candidate:
${profile.masterProfile}


Preferences:
${profile.preferences}


URL:
${url}


JOB:
${cleanJobText(pageText)}


Return JSON:

IMPORTANT:
You must always populate every field.
Never leave swapopt_verdict empty.
swapopt_verdict.apply_score must always be a number from 1-10.

{
"swapopt_verdict":{
"apply_score":5,
"decision_label":"",
"effort_recommendation":"",
"one_line_reason":"",
"top_positive_factors":[],
"top_risk_factors":[],
"final_advice":""
},

"job_title":"",
"company":"",
"location":"",

"current_match_percent":0,
"tailored_match_percent":0,

"hiring_logic_score":0,
"tailoring_intensity_score":0,
"tailoring_intensity_level":"",
"tailoring_strategy_summary":"",
"tailoring_time_recommendation":"",

"responsibility_match_score":0,
"experience_level_score":0,
"domain_transfer_score":0,
"sponsorship_risk_score":0,

"target_level":"",
"decision":"",
"time_priority":"",
"h1b_risk":"",
"access_risk_explanation":"",
"sponsorship_recommendation":"",
"next_action":"",

"score_explanation":"",

"why_they_might_hire":[],
"why_they_might_pass":[],

"keywords_to_emphasize":[],
"missing_keywords":[],
"recommended_projects":[],

"best_resume_angle":"",
"risk_or_overclaim_warning":"",

"application_confidence_score":0,
"hiring_intent_level":"",
"posting_quality_level":"",
"posting_risk_level":"",
"reality_check_verdict":"",
"positive_legitimacy_signals":[],
"concern_legitimacy_signals":[],
"confidence_explanation":"",
"recommended_effort_level":"",

"compensation_analysis":{
"estimated_market_range":"",
"recommended_application_salary":"",
"minimum_reasonable_salary":"",
"maximum_without_screening_risk":"",
"negotiation_strength":"",
"salary_confidence_level":"",
"salary_reasoning":"",
"salary_risk_warning":""
}
}

Tailoring Intensity Rules:

If hiring_logic_score is high, decide how much customization is worth doing.

9-10:
Heavy tailoring.
Rewrite summary, reorder projects, adjust bullets.

7-8:
Medium tailoring.
Change keywords and emphasize relevant projects.

5-6:
Light tailoring.
Small ATS edits only.

Below 5:
Do not waste time.

Explain the effort/time tradeoff.


SwapOpt Final Verdict Rules:

The Apply Score answers:
"Should Swapnil spend time applying?"

Use 1-10 scale.

Consider:
- resume match
- ability to tailor honestly
- hiring probability
- career upside
- salary upside
- posting quality
- competition
- H1B/access risk


Do NOT average scores.

Risks reduce confidence but are not automatic rejection.

Examples:

Strong fit + unclear sponsorship:
Still can be 8+

Good salary + bad career growth:
Do not inflate score.

Weak fit + easy application:
Quick apply score only.


Score Meaning:

9-10:
Dream Target.
Prioritize immediately.

8-8.9:
Strong Apply.
Tailor resume.

6.5-7.9:
Apply.
Moderate effort.

5-6.4:
Quick Apply.

Below 5:
Low priority.


Application Confidence Rules:

This evaluates whether the posting appears worth effort.

Missing information is uncertainty, not proof.

Do not punish:
- missing salary
- no recruiter listed
- generic company pages alone

Watch:
- evergreen jobs
- talent pools
- future opportunities
- vague responsibilities
- unrealistic requirements
- spammy reposting


H-1B Rules:

Sponsorship uncertainty ≠ rejection.

Missing sponsorship = unknown.

Judge separately:
1. Can he win the job?
2. Is access difficult?

Strong fit with immigration risk:
recommend applying carefully.

Explicit no sponsorship:
mark risk clearly but don't erase fit.


Compensation Rules:

Salary never decides alone.

Estimate using:
- title
- seniority
- location
- tools
- industry
- company size

Goal:
maximize salary without pricing out.

Tell him if he is asking too low.

Tell him if target is aggressive.

Do not discourage good career moves purely because salary is lower.


Be practical.
Optimize time.
Do not self reject.
`;

    const answer = await askAI(prompt);
    res.json(answer);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error:"Analyze failed",
      details:err.message
    });

  }
});

app.post("/tailor", async (req, res) => {
  try {
    const { pageText, url } = req.body;

    const prompt = `
Create resume tailoring strategy.

Candidate:
${profile.masterProfile}

Preferences:
${profile.preferences}

URL:
${url}

Job:
${cleanJobText(pageText)}

Return JSON:
{
"job_title":"",
"company":"",
"tailoring_worth_score":0,
"resume_strategy":"",
"recommended_resume_angle":"",
"summary_direction":"",
"skills_to_emphasize":[],
"skills_to_deprioritize":[],
"keywords_to_add":[],
"keywords_to_avoid_overclaiming":[],
"project_order":[],
"project_reasoning":"",
"application_positioning":"",
"interview_talking_points":[],
"do_not_claim":[],
"final_recommendation":""
}

Rules:
- Do not invent experience.
- Tailor emphasis, not identity.
- Keep advice specific.
`;

    res.json(await askAI(prompt));

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Tailor failed",
      details: err.message
    });
  }
});


app.post("/resume-draft", async (req, res) => {
  try {
    const { pageText, url } = req.body;

    const prompt = `
Create a truthful tailored resume draft.

Use ONLY real experience.

Candidate:
${profile.masterProfile}

Preferences:
${profile.preferences}

URL:
${url}

JOB:
${cleanJobText(pageText)}

Return JSON:
{
"job_title":"",
"company":"",
"resume_fit_warning":"",
"recommended_resume_title":"",
"professional_summary":"",
"skills":{
"analytics_bi":[],
"data_platforms_modeling":[],
"programming_automation":[],
"data_quality_business_analysis":[]
},
"work_experience":{
"community_dreams_foundation":{
"title_line":"",
"bullets":[]
},
"accenture_data_analyst_ii":{
"title_line":"",
"bullets":[]
},
"accenture_data_analyst_i":{
"title_line":"",
"bullets":[]
}
},
"projects":[
{
"name":"",
"tools":"",
"bullet":""
}
],
"keywords_added":[],
"keywords_not_used_due_to_truthfulness":[],
"final_note":""
}

Rules:
- exactly 3 bullets per job
- exactly 2 projects
- no fake experience
- ATS optimized
- keep same resume story
- do not overclaim
`;

    res.json(await askAI(prompt));

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Resume draft failed",
      details: err.message
    });
  }
});

app.post("/application-help", async (req, res) => {
  try {
    const { pageText, url } = req.body;

    const prompt = `
You are SwapOpt Application Assistant.

Help Swapnil answer job application questions.

Generate truthful answers only.

Candidate:
${profile.masterProfile}

Preferences:
${profile.preferences}

URL:
${url}

JOB:
${cleanJobText(pageText)}

Return JSON:

{
"job_title":"",
"company":"",

"why_company":"",
"why_role":"",

"tell_me_about_yourself":"",
"relevant_experience_answer":"",

"skills_answers":[
{
"skill":"",
"answer":""
}
],

"project_examples":[
{
"question":"",
"answer":""
}
],

"behavioral_answers":[
{
"question":"",
"answer":""
}
],

"additional_information_box":"",

"questions_to_ask_recruiter":[],

"final_application_strategy":""
}

Rules:
- Do not invent experience
- Keep answers natural
- Avoid sounding AI generated
- Use Swapnil's real projects
- Make answers application-form ready
- Professional but human tone
`;

    res.json(await askAI(prompt));

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error:"Application helper failed",
      details:err.message
    });

  }
});

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "SwapOpt optimized backend running",
    brainCharacters: profile.masterProfile.length,
    preferenceCharacters: profile.preferences.length,
    endpoints: [
"/analyze",
"/tailor",
"/resume-draft",
"/application-help"
]
  });
});


app.listen(PORT, () => {
  console.log(`🚀 SwapOpt backend running http://localhost:${PORT}`);
});