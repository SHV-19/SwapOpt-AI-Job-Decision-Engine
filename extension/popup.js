const resultDiv = document.getElementById("result");
const analyzeButton = document.getElementById("analyzeButton");
const tailorButton = document.getElementById("tailorButton");
const saveJobButton = document.getElementById("saveJobButton");
const viewJobsButton = document.getElementById("viewJobsButton");

let currentJobResult = null;

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

    ${section("Hiring Confidence", `
      <b>${escapeHtml(data.hiring_logic_score ?? "—")}/10</b>
      ${bar(data.hiring_logic_score)}
    `)}

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
    ${section("Skills to Deprioritize", `<ul>${listItems(data.skills_to_deprioritize)}</ul>`)}
    ${section("Keywords to Add", `<ul>${listItems(data.keywords_to_add)}</ul>`)}
    ${section("Avoid Overclaiming", `<ul>${listItems(data.keywords_to_avoid_overclaiming)}</ul>`)}
    ${section("Project Order", `<ul>${listItems(data.project_order)}</ul><p style="color:#ddd;">${escapeHtml(data.project_reasoning)}</p>`)}
    ${section("Community Dreams Bullet Strategy", `<ul>${listItems(data.experience_bullet_strategy?.community_dreams)}</ul>`)}
    ${section("Accenture DA II Bullet Strategy", `<ul>${listItems(data.experience_bullet_strategy?.accenture_data_analyst_ii)}</ul>`)}
    ${section("Accenture DA I Bullet Strategy", `<ul>${listItems(data.experience_bullet_strategy?.accenture_data_analyst_i)}</ul>`)}
    ${section("Application Positioning", `<p style="margin:0;color:#ddd;">${escapeHtml(data.application_positioning)}</p>`)}
    ${section("Interview Talking Points", `<ul>${listItems(data.interview_talking_points)}</ul>`)}
    ${section("Do Not Claim", `<ul>${listItems(data.do_not_claim)}</ul>`)}
    ${section("Final Recommendation", `<p style="margin:0;color:#ddd;">${escapeHtml(data.final_recommendation)}</p>`)}
  `;
}

chrome.storage.local.get(["lastSwapOptResult"], (stored) => {
  if (stored.lastSwapOptResult) {
    currentJobResult = stored.lastSwapOptResult;
    renderAnalysisResult(stored.lastSwapOptResult);
  }
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
        if (el && el.innerText && el.innerText.length > bestText.length) {
          bestText = el.innerText;
        }
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
  analyzeButton.disabled = true;
  tailorButton.disabled = true;
  saveJobButton.disabled = true;
  viewJobsButton.disabled = true;

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

    if (!response.ok) {
      throw new Error(data.details || data.error || "Backend request failed.");
    }

    return data;
  } finally {
    analyzeButton.disabled = false;
    tailorButton.disabled = false;
    saveJobButton.disabled = false;
    viewJobsButton.disabled = false;
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
    renderTailorResult(data);
  } catch (error) {
    resultDiv.innerHTML = `<b>Error</b><p>${escapeHtml(error.message)}</p>`;
  }
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
        company: currentJobResult.company,
        title: currentJobResult.job_title,
        location: currentJobResult.location,
        url: tab?.url || "",
        currentMatch: currentJobResult.current_match_percent,
        tailoredMatch: currentJobResult.tailored_match_percent,
        hiringScore: currentJobResult.hiring_logic_score,
        decision: currentJobResult.decision,
        target: currentJobResult.target_level,
        savedAt: new Date().toLocaleString()
      });

      chrome.storage.local.set({ savedJobs: jobs }, () => {
        alert("Job saved!");
      });
    });
  });
});

viewJobsButton.addEventListener("click", () => {
  chrome.storage.local.get(["savedJobs"], (stored) => {
    const jobs = stored.savedJobs || [];

    if (jobs.length === 0) {
      resultDiv.innerHTML = section("Saved Jobs", "<p>No saved jobs yet.</p>");
      return;
    }

    resultDiv.style.background = "transparent";
    resultDiv.style.padding = "0";
    resultDiv.style.color = "#eee";

    resultDiv.innerHTML = `
      <div style="background:#101010;border-radius:14px;padding:14px;margin-top:10px;border:1px solid #303030;">
        <div style="font-size:11px;letter-spacing:1.5px;color:#999;">SWAPOPT TRACKER</div>
        <div style="font-size:20px;font-weight:800;color:#e6e6e6;margin-top:5px;">Saved Jobs</div>
        <div style="font-size:13px;color:#bbb;margin-top:6px;">${jobs.length} saved role(s)</div>
      </div>
      ${jobs.map((job) => `
        <div style="background:#171717;border:1px solid #303030;padding:12px;border-radius:12px;margin-top:10px;">
          <b>${escapeHtml(job.title)}</b><br>
          <span style="font-size:12px;color:#aaa;">${escapeHtml(job.company)} | ${escapeHtml(job.location)}</span>
          <div style="margin-top:8px;">
            Match: ${escapeHtml(job.currentMatch)}% → ${escapeHtml(job.tailoredMatch)}%<br>
            Hiring: ${escapeHtml(job.hiringScore)}/10<br>
            Decision: ${escapeHtml(job.decision)}<br>
            Target: ${escapeHtml(job.target)}
          </div>
          <div style="margin-top:8px;font-size:11px;color:#aaa;">Saved: ${escapeHtml(job.savedAt)}</div>
          ${job.url ? `<div style="margin-top:8px;"><a href="${escapeHtml(job.url)}" target="_blank" style="color:#ddd;">Open Job</a></div>` : ""}
        </div>
      `).join("")}
    `;
  });
});