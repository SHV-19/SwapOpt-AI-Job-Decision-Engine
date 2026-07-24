export function buildApplicationPrompt({
  profile,
  preferences,
  resume,
  skills,
  experience,
  jobDescription,
  companyName,
  jobTitle,
  resumeType
}) {
  const system = `
You are SwapOpt AI.

You are an expert Hiring Manager, Executive Recruiter, Career Coach and Interview Strategist.

Your ONLY objective is to evaluate whether this candidate should apply for this role and prepare them for the application.

Never invent:

• experience
• projects
• technologies
• certifications
• education
• business results
• responsibilities

Never exaggerate.

Only use information provided in the candidate profile.

If information is unavailable, acknowledge the limitation instead of inventing it.

Return ONLY valid JSON.

No markdown.

No explanations.

No code fences.
`;

  const user = `
==========================
CANDIDATE PROFILE
==========================

MASTER PROFILE

${profile}

--------------------------

PREFERENCES

${preferences}

--------------------------

SELECTED RESUME (${resumeType.toUpperCase()})

${resume}

--------------------------

SKILLS

${skills}

--------------------------

EXPERIENCE

Accenture

${experience.accenture}

--------------------------

Community Dreams

${experience.communityDreams}

==========================
JOB INFORMATION
==========================

Company

${companyName}

--------------------------

Job Title

${jobTitle}

--------------------------

Job Description

${jobDescription}

==========================
YOUR TASK
==========================

Evaluate this opportunity exactly as a senior recruiter would.

Provide a concise but highly actionable application summary.

Focus on:

• overall fit
• strongest selling points
• recruiter concerns
• missing qualifications
• transferable experience
• interview preparation
• application strategy

Do NOT rewrite the resume.

Do NOT generate a cover letter.

Do NOT generate interview stories.

Do NOT generate behavioural answers unless requested in the schema.

Be objective.

If requirements are missing, clearly explain them.

If transferable experience compensates for a gap, explain why.

==========================
recommended_answers
==========================

Generate concise recruiter-ready answers for the five questions most likely to appear during the application.

Use ONLY the candidate's real experience.

Each answer should be approximately 75-150 words.

==========================
OUTPUT RULES
==========================

Return ONLY valid JSON.

Every field must be populated.

strengths:
3-8 items

concerns:
0-6 items

missing_requirements:
0-10 items

selling_points:
3-10 items

interview_focus:
3-10 items

recommended_answers:
Exactly 5 objects.

match_score:
Integer from 0-100.

final_recommendation must be ONE of:

"Apply Immediately"

"Apply"

"Apply with Tailored Resume"

"Borderline"

"Low Match"

==========================
RETURN EXACTLY THIS JSON
==========================

{
  "summary": "",

  "match_score": 0,

  "strengths": [],

  "concerns": [],

  "missing_requirements": [],

  "selling_points": [],

  "interview_focus": [],

  "recommended_answers": [
    {
      "question": "",
      "answer": ""
    },
    {
      "question": "",
      "answer": ""
    },
    {
      "question": "",
      "answer": ""
    },
    {
      "question": "",
      "answer": ""
    },
    {
      "question": "",
      "answer": ""
    }
  ],

  "application_strategy": "",

  "final_recommendation": ""
}

Return ONLY valid JSON.
`;

  return {
    system,
    user
  };
}