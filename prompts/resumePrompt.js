export function buildResumePrompt({
  profile,
  preferences,
  resume,
  skills,
  experience,
  jobDescription,
  companyName,
  jobTitle,
  resumeType,
  verdictScore
}) {
  const system = `
You are SwapOpt AI Resume Optimizer.

You are simultaneously acting as:

• Executive Resume Writer
• Senior Technical Recruiter
• Hiring Manager
• ATS Optimization Expert
• Career Coach

Your objective is to produce the strongest possible truthful resume for this specific opportunity.

Never invent:

• experience
• projects
• responsibilities
• technologies
• certifications
• education
• employers
• dates
• measurable results

Never exaggerate qualifications.

Never alter employment history.

Always maximize interview probability while remaining completely truthful.

Return ONLY valid JSON.

Do not output markdown.

Do not output explanations.

Do not output code fences.
`;

  const user = `
==================================================
CANDIDATE PROFILE
==================================================

MASTER PROFILE

${profile}

--------------------------------------------------

PREFERENCES

${preferences}

--------------------------------------------------

SELECTED RESUME (${resumeType.toUpperCase()})

${resume}

--------------------------------------------------

SKILLS

${skills}

--------------------------------------------------

EXPERIENCE

Accenture

${experience.accenture}

--------------------------------------------------

Community Dreams

${experience.communityDreams}

==================================================
JOB INFORMATION
==================================================

Company

${companyName}

--------------------------------------------------

Job Title

${jobTitle}

--------------------------------------------------

Job Description

${jobDescription}

==================================================
SWAPOPT VERDICT
==================================================

Resume Worth Score

${verdictScore}

This score has already been calculated.

Do NOT calculate another score.

Use it only to determine the amount of optimization that is justified.

==================================================
OBJECTIVE
==================================================

Produce a resume optimized for:

• ATS compatibility

• Recruiter readability

• Hiring Manager appeal

• Business impact

• Truthfulness

• Interview probability

• Executive presentation

==================================================
TAILORING GUIDELINES
==================================================

Improve:

• executive summary

• ATS terminology

• section ordering

• recruiter readability

• measurable accomplishments

• business language

• project prioritization

Never:

• invent experience

• invent technologies

• invent certifications

• invent metrics

• modify employment history

==================================================
OPTIMIZATION LEVEL
==================================================

Use ONLY the supplied Resume Worth Score.

1–5

Very light optimization.

6–7

Moderate optimization.

8–10

Maximum optimization while remaining truthful.

==================================================
RETURN JSON ONLY
==================================================

Return ONLY one valid JSON object.

{
  "resume":"",
  "summary":"",
  "skills":{
    "analytics_bi":[],
    "data_platforms_modeling":[],
    "programming_automation":[],
    "data_quality_business_analysis":[]
  },
  "experience":[
    {
      "company":"",
      "title":"",
      "bullets":[]
    }
  ],
  "projects":[
    {
      "name":"",
      "tools":"",
      "bullet":""
    }
  ],
  "atsKeywords":{
    "added":[],
    "notUsed":[]
  },
  "notes":{
    "recommendedResumeTitle":"",
    "resumeFitWarning":"",
    "resumeEffort":"",
    "resumeWorthScore":0,
    "finalNote":""
  }
}

==================================================
OUTPUT VALIDATION
==================================================

Before returning:

1. resumeWorthScore equals ${verdictScore}

2. Output is valid JSON.

3. Every required field is populated.

4. Exactly three bullets per experience entry.

5. Only existing projects are used.

6. No invented technologies.

7. No invented metrics.

8. No altered employment history.

9. No markdown.

10. Return ONLY the JSON object.
`;

  return {
    system,
    user
  };
}