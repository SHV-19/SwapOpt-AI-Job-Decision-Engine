# SwapOpt AI — Job Decision Engine

> I did not build this to apply to more jobs.  
> I built this to decide which jobs deserve my time.

SwapOpt is a personal AI-powered job decision assistant that analyzes job opportunities and helps make smarter application decisions.

The original problem was not:

"Can I apply?"

The harder question was:

"Should I apply?"

---

## Why I Built This

Job searching became less about submitting applications and more about making decisions:

- Is this role actually aligned with my background?
- Is the experience requirement realistic?
- How much should I customize my resume?
- What parts of my experience should I highlight?
- Is the salary expectation reasonable?
- Are there sponsorship or accessibility risks?
- Is this posting worth serious effort?

Generic job tools optimize for everyone.

I wanted something optimized around my own decision-making process.

---

## What SwapOpt Does

SwapOpt reads a job posting and provides:

### Job Decision Analysis
- Overall apply recommendation
- Fit scoring
- Hiring probability reasoning
- Career alignment
- Risk factors
- Opportunity evaluation

### Resume Strategy
- Current match estimation
- Potential match after tailoring
- Keywords to emphasize
- Projects to highlight
- Skills positioning
- Overclaim warnings

### Smart Tailoring Logic

Instead of customizing every resume blindly:

- 9/10 hiring fit → Deep tailoring recommended
- 7-8/10 → Moderate customization
- 5-6/10 → Quick ATS improvements
- Below 5 → Save time

The goal is effort optimization.

---

## Application Assistant

SwapOpt also generates application support:

- "Why this company?"
- "Why this role?"
- Relevant experience answers
- Skill-based responses
- Behavioral examples
- Recruiter questions

Answers are generated from my actual experience and projects.

No fake experience.

---

## Tech Stack

**Frontend**
- Chrome Extension
- JavaScript
- HTML/CSS

**Backend**
- Node.js
- Express.js
- OpenAI API

**AI Layer**
- Personalized profile context
- Resume intelligence
- Job description reasoning
- Structured JSON outputs

---

## Architecture

```text
Job Posting
     |
     v
Chrome Extension
     |
     v
Node.js Backend
     |
     v
Personal AI Context + OpenAI
     |
     v
Decision / Resume / Application Strategy
```

---

## Features

✔ Job fit analysis  
✔ Resume tailoring strategy  
✔ ATS keyword suggestions  
✔ Salary reasoning  
✔ H-1B/access risk awareness  
✔ Saved job tracker  
✔ Application answer generation  
✔ CSV export  

---

## Demo

Video Demo:
(Add YouTube link)

Full Build Story:
(Add Medium link)

---

## Note

This project was built as an experiment in using AI as a decision-support system.

The goal was never to replace human judgment.

The goal was to remove repetitive analysis, reduce wasted effort, and spend more time making better decisions.

Built by Swapnil Herwadkar.
