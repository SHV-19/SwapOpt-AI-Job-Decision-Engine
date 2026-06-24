const resultDiv = document.getElementById("result");
const analyzeButton = document.getElementById("analyzeButton");
const tailorButton = document.getElementById("tailorButton");
const resumeDraftButton = document.getElementById("resumeDraftButton");
const coverLetterButton = document.getElementById("coverLetterButton");
const networkButton = document.getElementById("networkButton");
const applicationHelpButton = document.getElementById("applicationHelpButton");
const copyInsightButton = document.getElementById("copyInsightButton");
const saveJobButton = document.getElementById("saveJobButton");
const viewJobsButton = document.getElementById("viewJobsButton");
const viewAllJobsButton = document.getElementById("viewAllJobsButton");
const viewArchivedButton = document.getElementById("viewArchivedButton");
const exportJobsButton = document.getElementById("exportJobsButton");

let currentJobResult = null;
let currentTailorResult = null;
let currentResumeDraft = null;
let currentCoverLetter = null;
let currentNetworkResult = null;
let currentApplicationHelp = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function listItems(items) {
  if (!items || !Array.isArray(items) || items.length === 0) return "<li>None found</li>";
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function bar(score, max = 10) {
  const numeric = Number(score);
  const safeScore = Number.isFinite(numeric) ? Math.max(0, Math.min(numeric, max)) : 0;
  const percent = (safeScore / max) * 100;
  return `<div style="background:#2a2a2a;height:7px;border-radius:999px;overflow:hidden;margin-top:6px;">
    <div style="width:${percent}%;height:100%;background:#e6e6e6;border-radius:999px;"></div>
  </div>`;
}

function section(title, body) {
  return `<div style="background:#171717;border:1px solid #303030;padding:12px;border-radius:12px;margin-top:10px;">
    <div style="font-weight:700;color:#fff;margin-bottom:8px;">${escapeHtml(title)}</div>${body}
  </div>`;
}

function getTargetLabel(targetLevel) {
  const v = String(targetLevel || "").toLowerCase();
  if (v.includes("strong")) return ["STRONG TARGET", "#18a058"];
  if (v.includes("possible")) return ["POSSIBLE TARGET", "#d6a100"];
  if (v.includes("weak")) return ["WEAK TARGET", "#d9534f"];
  if (v.includes("not")) return ["NOT WORTH TIME", "#d9534f"];
  return ["TARGET REVIEW", "#888"];
}

function scoreLine(label, value) {
  return `<div style="margin-bottom:12px;">
    <div style="display:flex;justify-content:space-between;">
      <span>${escapeHtml(label)}</span><b>${escapeHtml(value ?? "—")}/10</b>
    </div>${bar(value)}
  </div>`;
}

function renderAnalysisResult(data) {
  currentJobResult = data;
  const [label, accent] = getTargetLabel(data.target_level);

  resultDiv.style.background = "transparent";
  resultDiv.style.padding = "0";
  resultDiv.style.color = "#eee";

  resultDiv.innerHTML = `
    <div style="background:#101010;border-radius:14px;padding:14px;margin-top:10px;border:1px solid #303030;">
      <div style="font-size:11px;letter-spacing:1.5px;color:#999;">SWAPOPT AI</div>
      <div style="font-size:20px;font-weight:800;color:${accent};margin-top:5px;">${label}</div>
      <div style="font-size:13px;color:#bbb;margin-top:6px;">${escapeHtml(data.next_action || "")}</div>
    </div>

    ${section("SwapOpt Verdict", `
      <div style="font-size:34px;font-weight:800;color:#fff;">
        ${escapeHtml(data.swapopt_verdict?.apply_score ?? data.apply_score ?? "Pending")}/10
      </div>

      <div style="font-size:18px;font-weight:700;margin-top:6px;">
       ${escapeHtml(data.swapopt_verdict?.decision_label || data.decision || "Review")}
      </div>

      <p style="color:#ddd;">
        ${escapeHtml(data.swapopt_verdict?.one_line_reason || "")}
      </p>

      <b>Recommended Effort:</b><br>
      ${escapeHtml(data.swapopt_verdict?.effort_recommendation || "")}

      <br><br>

      <b>Why Apply:</b>
      <ul>
        ${listItems(data.swapopt_verdict?.top_positive_factors)}
      </ul>

      <b>Watch Outs:</b>
      <ul>
        ${listItems(data.swapopt_verdict?.top_risk_factors)}
      </ul>

      <p style="color:#ccc;">
        ${escapeHtml(data.swapopt_verdict?.final_advice || "")}
      </p>
    `)}

    <div style="display:flex;gap:8px;margin-top:10px;">
      <div style="flex:1;background:#171717;border:1px solid #303030;border-radius:12px;padding:11px;">
        <div style="font-size:22px;font-weight:700;">${escapeHtml(data.current_match_percent ?? "—")}%</div>
        <div style="font-size:11px;color:#aaa;">Current Resume</div>
      </div>
      <div style="flex:1;background:#171717;border:1px solid #303030;border-radius:12px;padding:11px;">
        <div style="font-size:22px;font-weight:700;">${escapeHtml(data.tailored_match_percent ?? "—")}%</div>
        <div style="font-size:11px;color:#aaa;">After Tailoring</div>
      </div>
    </div>

    ${section("Application Confidence", `
      <b>${escapeHtml(data.application_confidence_score ?? "—")}/100</b>
      <div style="margin-top:6px;color:#ccc;">
        <b>Hiring Intent:</b> ${escapeHtml(data.hiring_intent_level || "Unknown")}<br>
        <b>Posting Quality:</b> ${escapeHtml(data.posting_quality_level || "Unknown")}<br>
        <b>Risk Level:</b> ${escapeHtml(data.posting_risk_level || "Unknown")}<br>
        <b>Verdict:</b> ${escapeHtml(data.reality_check_verdict || "Unknown")}<br>
        <b>Effort:</b> ${escapeHtml(data.recommended_effort_level || "Unknown")}
      </div>
    `)}
${section("Compensation Intelligence", `
  <b>Estimated Range:</b> 
  ${escapeHtml(data.compensation_analysis?.estimated_market_range || "Unknown")}
  <br><br>

  <b>Suggested Application Input:</b>
  ${escapeHtml(data.compensation_analysis?.recommended_application_salary || "Unknown")}
  <br>

  <b>Safe Maximum:</b>
  ${escapeHtml(data.compensation_analysis?.maximum_without_screening_risk || "Unknown")}
  <br>

  <b>Negotiation Strength:</b>
  ${escapeHtml(data.compensation_analysis?.negotiation_strength || "Unknown")}
  <br>

  <b>Confidence:</b>
  ${escapeHtml(data.compensation_analysis?.salary_confidence_level || "Unknown")}

  <p style="color:#ccc;margin-top:8px;">
    ${escapeHtml(data.compensation_analysis?.salary_reasoning || "")}
  </p>

  <p style="color:#aaa;">
    ${escapeHtml(data.compensation_analysis?.salary_risk_warning || "")}
  </p>
`)}

    ${section("Confidence Explanation", `
      <p style="margin:0;color:#ddd;">${escapeHtml(data.confidence_explanation || "No confidence explanation generated.")}</p>
    `)}

    ${section("Positive Posting Signals", `<ul>${listItems(data.positive_legitimacy_signals)}</ul>`)}

    ${section("Concern Signals", `<ul>${listItems(data.concern_legitimacy_signals)}</ul>`)}

    ${section("Hiring Confidence", `<b>${escapeHtml(data.hiring_logic_score ?? "—")}/10</b>${bar(data.hiring_logic_score)}`)}

    ${section("Decision Context", `
      <b>Time Priority:</b> ${escapeHtml(data.time_priority || "Unknown")}<br>
      <b>H-1B Risk:</b> ${escapeHtml(data.h1b_risk || "Unknown")}<br>
      <b>Decision:</b> ${escapeHtml(data.decision || "Unknown")}
    `)}

    ${section("Role", `
      ${escapeHtml(data.job_title || "Unknown")}<br>
      <span style="font-size:12px;color:#aaa;">${escapeHtml(data.company || "Unknown")} | ${escapeHtml(data.location || "Unknown")}</span>
    `)}

    ${section("Score Breakdown", `
      ${scoreLine("Technical Match", data.technical_match_score)}
      ${scoreLine("Responsibility Fit", data.responsibility_match_score)}
      ${scoreLine("Experience Level", data.experience_level_score)}
      ${scoreLine("Domain Transfer", data.domain_transfer_score)}
      ${scoreLine("Sponsorship Fit", data.sponsorship_risk_score)}
    `)}

    ${section("Score Explanation", `<p style="margin:0;color:#ddd;">${escapeHtml(data.score_explanation || data.quick_verdict || "")}</p>`)}
    ${section("Why They Might Hire You", `<ul>${listItems(data.why_they_might_hire)}</ul>`)}
    ${section("Why They Might Pass", `<ul>${listItems(data.why_they_might_pass)}</ul>`)}
    ${section("Best Resume Angle", `<p style="margin:0;color:#ddd;">${escapeHtml(data.best_resume_angle)}</p>`)}
    ${section("Keywords to Emphasize", `<ul>${listItems(data.keywords_to_emphasize)}</ul>`)}
    ${section("Missing Keywords", `<ul>${listItems(data.missing_keywords)}</ul>`)}
    ${section("Recommended Projects", `<ul>${listItems(data.recommended_projects)}</ul>`)}
    ${section("Fit Notes", `<p style="margin:0;color:#ddd;">${escapeHtml(data.risk_or_overclaim_warning)}</p>`)}
  `;
}

function renderTailorResult(data) {
  currentTailorResult = data;

  resultDiv.style.background = "transparent";
  resultDiv.style.padding = "0";
  resultDiv.style.color = "#eee";

  resultDiv.innerHTML = `
    <div style="background:#101010;border-radius:14px;padding:14px;margin-top:10px;border:1px solid #303030;">
      <div style="font-size:11px;letter-spacing:1.5px;color:#999;">SWAPOPT TAILORING</div>
      <div style="font-size:20px;font-weight:800;color:#e6e6e6;margin-top:5px;">Resume Strategy</div>
      <div style="font-size:13px;color:#bbb;margin-top:6px;">${escapeHtml(data.company || "Unknown")} | ${escapeHtml(data.job_title || "Unknown")}</div>
    </div>

    ${section("Tailoring Worth", `<b>${escapeHtml(data.tailoring_worth_score ?? "—")}/10</b>${bar(data.tailoring_worth_score)}`)}
    ${section("Resume Strategy", `<p style="margin:0;color:#ddd;">${escapeHtml(data.resume_strategy)}</p>`)}
    ${section("Recommended Resume Angle", `<p style="margin:0;color:#ddd;">${escapeHtml(data.recommended_resume_angle)}</p>`)}
    ${section("Summary Direction", `<p style="margin:0;color:#ddd;">${escapeHtml(data.summary_direction)}</p>`)}
    ${section("Skills to Emphasize", `<ul>${listItems(data.skills_to_emphasize)}</ul>`)}
    ${section("Keywords to Add", `<ul>${listItems(data.keywords_to_add)}</ul>`)}
    ${section("Project Order", `<ul>${listItems(data.project_order)}</ul><p style="color:#ddd;">${escapeHtml(data.project_reasoning)}</p>`)}
    ${section("Application Positioning", `<p style="margin:0;color:#ddd;">${escapeHtml(data.application_positioning)}</p>`)}
    ${section("Interview Talking Points", `<ul>${listItems(data.interview_talking_points)}</ul>`)}
    ${section("Do Not Claim", `<ul>${listItems(data.do_not_claim)}</ul>`)}
    ${section("Final Recommendation", `<p style="margin:0;color:#ddd;">${escapeHtml(data.final_recommendation)}</p>`)}
  `;
}

function renderResumeDraft(data) {
  currentResumeDraft = data;

  resultDiv.style.background = "transparent";
  resultDiv.style.padding = "0";
  resultDiv.style.color = "#eee";

  const skills = data.skills || {};
  const work = data.work_experience || {};

  function bullets(items) {
    return `<ul>${listItems(items)}</ul>`;
  }

  function roleBlock(role) {
    if (!role) return "";
    return `<div style="margin-top:10px;"><b>${escapeHtml(role.title_line)}</b>${bullets(role.bullets)}</div>`;
  }

  const projects = Array.isArray(data.projects)
    ? data.projects.map((p) => `<div style="margin-top:8px;"><b>${escapeHtml(p.name)}</b> | ${escapeHtml(p.tools)}<ul><li>${escapeHtml(p.bullet)}</li></ul></div>`).join("")
    : "";

  resultDiv.innerHTML = `
    <div style="background:#101010;border-radius:14px;padding:14px;margin-top:10px;border:1px solid #303030;">
      <div style="font-size:11px;letter-spacing:1.5px;color:#999;">SWAPOPT RESUME DRAFT</div>
      <div style="font-size:20px;font-weight:800;color:#e6e6e6;margin-top:5px;">${escapeHtml(data.recommended_resume_title || "Targeted Resume Draft")}</div>
      <div style="font-size:13px;color:#bbb;margin-top:6px;">${escapeHtml(data.company || "Unknown")} | ${escapeHtml(data.job_title || "Unknown")}</div>
    </div>

    ${section("Fit Warning", `<p style="margin:0;color:#ddd;">${escapeHtml(data.resume_fit_warning)}</p>`)}
    ${section("Professional Summary", `<p style="margin:0;color:#ddd;">${escapeHtml(data.professional_summary)}</p>`)}

    ${section("Skills", `
      <b>Analytics & BI</b>${bullets(skills.analytics_bi)}
      <b>Data Platforms & Modeling</b>${bullets(skills.data_platforms_modeling)}
      <b>Programming & Automation</b>${bullets(skills.programming_automation)}
      <b>Data Quality & Business Analysis</b>${bullets(skills.data_quality_business_analysis)}
    `)}

    ${section("Work Experience", `
      ${roleBlock(work.community_dreams_foundation)}
      ${roleBlock(work.accenture_data_analyst_ii)}
      ${roleBlock(work.accenture_data_analyst_i)}
    `)}

    ${section("Projects", projects || "<p>No projects generated.</p>")}
    ${section("Keywords Added", `<ul>${listItems(data.keywords_added)}</ul>`)}
    ${section("Not Used Due to Truthfulness", `<ul>${listItems(data.keywords_not_used_due_to_truthfulness)}</ul>`)}
    ${section("Final Note", `<p style="margin:0;color:#ddd;">${escapeHtml(data.final_note)}</p>`)}
  `;
}

chrome.storage.local.get(["lastSwapOptResult", "lastSwapOptTailorResult", "lastSwapOptResumeDraft"], (stored) => {
  if (stored.lastSwapOptResult) {
    currentJobResult = stored.lastSwapOptResult;
    renderAnalysisResult(stored.lastSwapOptResult);
  }
  if (stored.lastSwapOptTailorResult) currentTailorResult = stored.lastSwapOptTailorResult;
  if (stored.lastSwapOptResumeDraft) currentResumeDraft = stored.lastSwapOptResumeDraft;
});

async function getCurrentPageText() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const selectors = [
        "[data-automation-id='jobPostingDescription']",
        ".jobs-description-content__text",
        "#jobDescriptionText",
        ".jobsearch-JobComponent-description",
        "[class*='job-description']",
        "[class*='description']",
        "main",
        "body"
      ];

      let bestText = "";
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el && el.innerText && el.innerText.length > bestText.length) bestText = el.innerText;
      }

      return {
        title: document.title || "",
        url: window.location.href,
        text: bestText || document.body.innerText || ""
      };
    }
  });

  return result;
}

async function sendJobToBackend(endpoint, loadingText) {
  const buttons = [
  analyzeButton,
  tailorButton,
  resumeDraftButton,
  coverLetterButton,
  networkButton,
  applicationHelpButton,
  copyInsightButton,
  saveJobButton,
  viewJobsButton,
  viewAllJobsButton,
  viewArchivedButton,
  exportJobsButton
];
  buttons.forEach((b) => b.disabled = true);

  resultDiv.style.background = "#171717";
  resultDiv.style.color = "#eee";
  resultDiv.style.padding = "10px";
  resultDiv.textContent = loadingText;

  try {
    const page = await getCurrentPageText();

    if (!page.text || page.text.trim().length < 200) {
      throw new Error("Could not read enough job text. Open the full job description page and try again.");
    }

    const response = await fetch(`http://localhost:8787/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: page.url,
        pageText: `${page.title}\n\n${page.text}`
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.details || data.error || "Backend request failed.");
    return data;
  } finally {
    buttons.forEach((b) => b.disabled = false);
  }
}

analyzeButton.addEventListener("click", async () => {
  try {
    const data = await sendJobToBackend("analyze", "Analyzing job fit...");
    chrome.storage.local.set({ lastSwapOptResult: data });
    currentJobResult = data;
    renderAnalysisResult(data);
  } catch (error) {
    resultDiv.innerHTML = `<b>Error</b><p>${escapeHtml(error.message)}</p>`;
  }
});

tailorButton.addEventListener("click", async () => {
  try {
    const data = await sendJobToBackend("tailor", "Generating tailoring strategy...");
    chrome.storage.local.set({ lastSwapOptTailorResult: data });
    currentTailorResult = data;
    renderTailorResult(data);
  } catch (error) {
    resultDiv.innerHTML = `<b>Error</b><p>${escapeHtml(error.message)}</p>`;
  }
});

resumeDraftButton.addEventListener("click", async () => {
  try {
    const data = await sendJobToBackend("resume-draft", "Generating resume draft...");
    chrome.storage.local.set({ lastSwapOptResumeDraft: data });
    currentResumeDraft = data;
    renderResumeDraft(data);
  } catch (error) {
    resultDiv.innerHTML = `<b>Error</b><p>${escapeHtml(error.message)}</p>`;
  }
});

coverLetterButton.addEventListener("click", async () => {
  try {
    const data = await sendJobToBackend("cover-letter", "Generating cover letter...");
    currentCoverLetter = data;

    resultDiv.innerHTML = section("Cover Letter", `
      <p style="white-space:pre-line;color:#ddd;">${escapeHtml(data.cover_letter || "No cover letter generated.")}</p>
    `);
  } catch (error) {
    resultDiv.innerHTML = `<b>Error</b><p>${escapeHtml(error.message)}</p>`;
  }
});

networkButton.addEventListener("click", async () => {
  try {
    const data = await sendJobToBackend("network", "Finding relevant people...");
    currentNetworkResult = data;

    resultDiv.innerHTML = `
      ${section("People to Find", `<ul>${listItems((data.people_to_find || []).map(p => `${p.target_type}: ${p.linkedin_search_query} — ${p.why_relevant}`))}</ul>`)}
	${section("Networking Priority", `
  	<b>${escapeHtml(data.networking_priority_level || "Unknown")}</b>
  	(${escapeHtml(data.networking_priority_score ?? "N/A")}/10)
  	<p>${escapeHtml(data.hunter_usage_reason || "")}</p>
	`)}

	${section("Hunter Contacts", `
  	<ul>
    	${listItems((data.discovered_contacts || []).map(c =>
      	`${c.name || "Unknown"} | ${c.position || "Unknown role"} | ${c.email || "No email"} | Confidence: ${c.confidence || "N/A"}`
    	))}
  	</ul>
	`)}
      ${section("LinkedIn Notes", `
        <b>Recruiter:</b><p>${escapeHtml(data.linkedin_connection_notes?.recruiter_note || "")}</p>
        <b>Hiring Manager:</b><p>${escapeHtml(data.linkedin_connection_notes?.hiring_manager_note || "")}</p>
        <b>Team Member:</b><p>${escapeHtml(data.linkedin_connection_notes?.team_member_note || "")}</p>
        <b>Alumni:</b><p>${escapeHtml(data.linkedin_connection_notes?.alumni_note || "")}</p>
      `)}
      ${section("Cold Message", `
        <b>Subject:</b> ${escapeHtml(data.cold_message?.subject || "")}
        <p>${escapeHtml(data.cold_message?.message || "")}</p>
      `)}
      ${section("Networking Strategy", `<p>${escapeHtml(data.networking_strategy || "")}</p>`)}
    `;
  } catch (error) {
    resultDiv.innerHTML = `<b>Error</b><p>${escapeHtml(error.message)}</p>`;
  }
});

applicationHelpButton.addEventListener("click", async () => {
  try {
    const data = await sendJobToBackend("application-help", "Generating application answers...");
    currentApplicationHelp = data;

    resultDiv.innerHTML = `
      ${section("Why Company", `<p>${escapeHtml(data.why_company || "")}</p>`)}
      ${section("Why Role", `<p>${escapeHtml(data.why_role || "")}</p>`)}
      ${section("Tell Me About Yourself", `<p>${escapeHtml(data.tell_me_about_yourself || "")}</p>`)}
      ${section("Relevant Experience", `<p>${escapeHtml(data.relevant_experience_answer || "")}</p>`)}
      ${section("Additional Information", `<p>${escapeHtml(data.additional_information_box || "")}</p>`)}
      ${section("Questions to Ask Recruiter", `<ul>${listItems(data.questions_to_ask_recruiter)}</ul>`)}
      ${section("Final Strategy", `<p>${escapeHtml(data.final_application_strategy || "")}</p>`)}
    `;
  } catch (error) {
    resultDiv.innerHTML = `<b>Error</b><p>${escapeHtml(error.message)}</p>`;
  }
});

copyInsightButton.addEventListener("click", async () => {
  if (!currentJobResult) {
    alert("Analyze a job first.");
    return;
  }

  const insight = `
SWAPOPT RESUME TAILORING INSIGHT

Role: ${currentJobResult.job_title || "Unknown"}
Company: ${currentJobResult.company || "Unknown"}
Location: ${currentJobResult.location || "Unknown"}

Current Resume Match: ${currentJobResult.current_match_percent ?? "N/A"}%
Potential After Tailoring: ${currentJobResult.tailored_match_percent ?? "N/A"}%
Hiring Confidence: ${currentJobResult.hiring_logic_score ?? "N/A"}/10
Tailoring Severity:
${currentJobResult.tailoring_intensity_score ?? "N/A"}/10

Tailoring Level:
${currentJobResult.tailoring_intensity_level || "N/A"}

Recommended Tailoring Effort:
${currentJobResult.tailoring_time_recommendation || "N/A"}

Tailoring Strategy:
${currentJobResult.tailoring_strategy_summary || "N/A"}
Decision: ${currentJobResult.decision || "N/A"}
Target Level: ${currentJobResult.target_level || "N/A"}
Next Action: ${currentJobResult.next_action || "N/A"}
H-1B Risk: ${currentJobResult.h1b_risk || "N/A"}

Best Resume Angle:
${currentJobResult.best_resume_angle || "N/A"}

Why They Might Hire:
${(currentJobResult.why_they_might_hire || []).map(x => "- " + x).join("\n")}

Why They Might Pass:
${(currentJobResult.why_they_might_pass || []).map(x => "- " + x).join("\n")}

Keywords to Emphasize:
${(currentJobResult.keywords_to_emphasize || []).map(x => "- " + x).join("\n")}

Missing Keywords:
${(currentJobResult.missing_keywords || []).map(x => "- " + x).join("\n")}

Recommended Projects:
${(currentJobResult.recommended_projects || []).map(x => "- " + x).join("\n")}

Fit Notes / Do Not Overclaim:
${currentJobResult.risk_or_overclaim_warning || "N/A"}

Instruction:
Use this context to tailor my resume truthfully. Keep my same job titles, dates, structure, 3 bullets per role, exactly 2 projects, and do not invent experience.
`.trim();

  await navigator.clipboard.writeText(insight);
  alert("Insight copied.");
});

saveJobButton.addEventListener("click", () => {
  if (!currentJobResult) {
    alert("Analyze a job before saving.");
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.storage.local.get(["savedJobs"], (stored) => {
      const jobs = stored.savedJobs || [];

      jobs.unshift({



        id: crypto.randomUUID(),
        fullAnalysis: currentJobResult,
        tailorAnalysis: currentTailorResult,
        resumeDraft: currentResumeDraft,
        company: currentJobResult.company,
	coverLetter: currentCoverLetter,
	networkResult: currentNetworkResult,
	applicationHelp: currentApplicationHelp,
	title: currentJobResult.job_title,
        location: currentJobResult.location,
        url: tab?.url || "",
        currentMatch: currentJobResult.current_match_percent,
        tailoredMatch: currentJobResult.tailored_match_percent,
        hiringScore: currentJobResult.hiring_logic_score,
        decision: currentJobResult.decision,
        target: currentJobResult.target_level,
        status: "Interested",
        notes: "",
        savedAt: new Date().toLocaleString(),
        updatedAt: new Date().toLocaleString()
      });

      chrome.storage.local.set({ savedJobs: jobs }, () => alert("Job saved!"));
    });
  });
});

function updateJobStatus(id, status) {
  chrome.storage.local.get(["savedJobs"], (stored) => {
    const updatedJobs = (stored.savedJobs || []).map((job) =>
      job.id === id ? { ...job, status, updatedAt: new Date().toLocaleString() } : job
    );

    chrome.storage.local.set({ savedJobs: updatedJobs }, () => viewJobsButton.click());
  });
}

function renderJobs(jobs, title, subtitle) {
  resultDiv.style.background = "transparent";
  resultDiv.style.padding = "0";
  resultDiv.style.color = "#eee";

  if (jobs.length === 0) {
    resultDiv.innerHTML = section(title, "<p>No jobs found.</p>");
    return;
  }

  resultDiv.innerHTML = `
    <div style="background:#101010;border-radius:14px;padding:14px;margin-top:10px;border:1px solid #303030;">
      <div style="font-size:11px;letter-spacing:1.5px;color:#999;">SWAPOPT TRACKER</div>
      <div style="font-size:20px;font-weight:800;color:#e6e6e6;margin-top:5px;">${escapeHtml(title)}</div>
      <div style="font-size:13px;color:#bbb;margin-top:6px;">${escapeHtml(subtitle)}</div>
    </div>

    ${jobs.map((job) => `
      <div style="background:#171717;border:1px solid #303030;padding:12px;border-radius:12px;margin-top:10px;">
        <b>${escapeHtml(job.title)}</b><br>
        <span style="font-size:12px;color:#aaa;">${escapeHtml(job.company)} | ${escapeHtml(job.location)}</span>

        <div style="margin-top:8px;">
          Match: ${escapeHtml(job.currentMatch)}% -> ${escapeHtml(job.tailoredMatch)}%<br>
          Hiring: ${escapeHtml(job.hiringScore)}/10<br>
          Decision: ${escapeHtml(job.decision)}<br>
          Target: ${escapeHtml(job.target)}<br>
          Status: <b>${escapeHtml(job.status || "Interested")}</b>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px;">
          <button class="statusButton" data-id="${escapeHtml(job.id)}" data-status="Applied">Applied</button>
          <button class="statusButton" data-id="${escapeHtml(job.id)}" data-status="Interview">Interview</button>
          <button class="statusButton" data-id="${escapeHtml(job.id)}" data-status="Rejected">Rejected</button>
          <button class="statusButton" data-id="${escapeHtml(job.id)}" data-status="Archived">Archive</button>
        </div>

        <div style="margin-top:8px;font-size:11px;color:#aaa;">Saved: ${escapeHtml(job.savedAt)}</div>
        <div style="margin-top:4px;font-size:11px;color:#aaa;">Updated: ${escapeHtml(job.updatedAt || job.savedAt)}</div>
        <div style="margin-top:8px;display:grid;gap:6px;">
  ${
    job.fullAnalysis
      ? `<button class="viewAnalysisButton" data-id="${escapeHtml(job.id)}">
          View Saved Analysis
        </button>`
      : ""
  }

  ${
    job.tailorAnalysis
      ? `<button class="viewTailorButton" data-id="${escapeHtml(job.id)}">
          View Tailoring Strategy
        </button>`
      : ""
  }

  ${
    job.resumeDraft
      ? `<button class="viewResumeButton" data-id="${escapeHtml(job.id)}">
          View Resume Draft
        </button>`
      : ""
  }

  ${
    job.url
      ? `<a href="${escapeHtml(job.url)}" target="_blank">Open Job</a>`
      : ""
  }
</div>
      </div>
    `).join("")}
  `;

  document.querySelectorAll(".statusButton").forEach((button) => {
    button.addEventListener("click", () => updateJobStatus(button.dataset.id, button.dataset.status));
  });
document.querySelectorAll(".viewAnalysisButton").forEach((button) => {
  button.addEventListener("click", () => {
    const job = jobs.find(j => j.id === button.dataset.id);

    if (job?.fullAnalysis) {
      currentJobResult = job.fullAnalysis;
      renderAnalysisResult(job.fullAnalysis);
    }
  });
});


document.querySelectorAll(".viewTailorButton").forEach((button) => {
  button.addEventListener("click", () => {
    const job = jobs.find(j => j.id === button.dataset.id);

    if (job?.tailorAnalysis) {
      currentTailorResult = job.tailorAnalysis;
      renderTailorResult(job.tailorAnalysis);
    }
  });
});


document.querySelectorAll(".viewResumeButton").forEach((button) => {
  button.addEventListener("click", () => {
    const job = jobs.find(j => j.id === button.dataset.id);

    if (job?.resumeDraft) {
      currentResumeDraft = job.resumeDraft;
      renderResumeDraft(job.resumeDraft);
    }
  });
});
}

viewJobsButton.addEventListener("click", () => {
  chrome.storage.local.get(["savedJobs"], (stored) => {
    const all = stored.savedJobs || [];
    const active = all.filter(job => job.status !== "Archived").slice(0, 5);
    renderJobs(active, "Last 5 Active Jobs", `${active.length} shown | Archived hidden`);
  });
});

viewAllJobsButton.addEventListener("click", () => {
  chrome.storage.local.get(["savedJobs"], (stored) => {
    const active = (stored.savedJobs || []).filter(job => job.status !== "Archived");
    renderJobs(active, "All Active Jobs", `${active.length} active job(s)`);
  });
});

viewArchivedButton.addEventListener("click", () => {
  chrome.storage.local.get(["savedJobs"], (stored) => {
    const archived = (stored.savedJobs || []).filter(job => job.status === "Archived");
    renderJobs(archived, "Archived Jobs", `${archived.length} archived job(s)`);
  });
});

exportJobsButton.addEventListener("click", () => {
  chrome.storage.local.get(["savedJobs"], (stored) => {
    const jobs = stored.savedJobs || [];
    if (jobs.length === 0) {
      alert("No saved jobs to export.");
      return;
    }

    const headers = ["Company", "Title", "Location", "URL", "Current Match", "Tailored Match", "Hiring Score", "Decision", "Target", "Status", "Saved At", "Updated At"];
    const rows = jobs.map((job) => [
      job.company || "", job.title || "", job.location || "", job.url || "",
      job.currentMatch || "", job.tailoredMatch || "", job.hiringScore || "",
      job.decision || "", job.target || "", job.status || "", job.savedAt || "", job.updatedAt || ""
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swapopt_saved_jobs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
});