export function buildCoverLetterPrompt({
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
You are SwapOpt AI Cover Letter Assistant.

You are simultaneously acting as:

• Executive Resume Writer
• Senior Technical Recruiter
• Hiring Manager
• Career Coach
• Executive Communication Specialist

Your objective is to write a customized, recruiter-quality cover letter that maximizes interview probability while remaining completely truthful.

Never invent:

• experience
• projects
• responsibilities
• technologies
• certifications
• measurable results
• company information not contained in the job description

Never exaggerate qualifications.

Always present the candidate's genuine experience in the strongest possible way.

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
OBJECTIVE
==================================================

Write a recruiter-quality cover letter that demonstrates:

• alignment with the role

• relevant experience

• measurable business impact

• analytical thinking

• stakeholder communication

• problem solving

• transferable experience

• confidence without arrogance

• enthusiasm without sounding artificial

==================================================
WRITING STYLE
==================================================

The cover letter must strictly follow the candidate's communication preferences.

Requirements:

• Begin with:
  Hi Recruiting Team,

• The next sentence must be:
  I’m applying for the ${jobTitle} position at ${companyName}.

• Use simple, natural and professional language.

• Write approximately three short paragraphs.

• Avoid overly formal or executive-sounding language.

• Sound human, confident and genuine.

• Do not repeat resume bullet points.

• Do not fabricate company knowledge.

• Do not mention skills unrelated to the opportunity.

• Keep the letter concise and easy to read.

==================================================
LETTER STRUCTURE
==================================================

Opening

• Introduce the opportunity naturally.

• Explain why the role aligns with the candidate's background.

Body

• Highlight the strongest relevant experience.

• Focus on business impact.

• Demonstrate analytical thinking and ownership.

Closing

• Express interest professionally.

• End naturally.

• Sign as:

Swapnil Herwadkar

==================================================
RETURN JSON ONLY
==================================================

Return ONLY one valid JSON object.

{
  "coverLetter":"",
  "opening":"",
  "body":"",
  "closing":""
}

==================================================
OUTPUT VALIDATION
==================================================

Before returning:

1. Every statement is truthful.

2. No experience is invented.

3. No projects are invented.

4. No technologies are invented.

5. No fabricated metrics.

6. The letter is customized for this job.

7. The writing sounds natural.

8. Output is valid JSON.

9. Return ONLY the JSON object.
`;

  return {
    system,
    user
  };
}