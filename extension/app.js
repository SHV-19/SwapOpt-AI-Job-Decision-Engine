const API_BASE_URL = "http://localhost:8787";

const resultDiv = document.getElementById("result");

const analyzeButton = document.getElementById("analyzeButton");
const tailorButton = document.getElementById("tailorButton");
const resumeDraftButton = document.getElementById("resumeDraftButton");
const coverLetterButton = document.getElementById("coverLetterButton");
const networkButton = document.getElementById("networkButton");
const applicationHelpButton = document.getElementById(
  "applicationHelpButton"
);

const copyInsightButton = document.getElementById("copyInsightButton");

const saveJobButton = document.getElementById("saveJobButton");
const viewJobsButton = document.getElementById("viewJobsButton");
const viewAllJobsButton = document.getElementById("viewAllJobsButton");
const viewArchivedButton = document.getElementById(
  "viewArchivedButton"
);
const exportJobsButton = document.getElementById("exportJobsButton");
const clearTrackerButton = document.getElementById(
  "clearTrackerButton"
);

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

function listItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return "<li>None found</li>";
  }

  return items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function bar(score, max = 10) {
  const numeric = Number(score);

  const safeScore = Number.isFinite(numeric)
    ? Math.max(0, Math.min(max, numeric))
    : 0;

  return `
    <div
      style="
        background:#2a2a2a;
        height:7px;
        border-radius:999px;
        overflow:hidden;
        margin-top:6px;
      "
    >
      <div
        style="
          width:${(safeScore / max) * 100}%;
          height:100%;
          background:#e6e6e6;
          border-radius:999px;
        "
      ></div>
    </div>
  `;
}

function section(title, body) {
  return `
    <div
      style="
        background:#171717;
        border:1px solid #303030;
        padding:12px;
        border-radius:12px;
        margin-top:10px;
      "
    >
      <div
        style="
          font-weight:700;
          color:#fff;
          margin-bottom:8px;
        "
      >
        ${escapeHtml(title)}
      </div>

      ${body}
    </div>
  `;
}

function getTargetLabel(targetLevel) {
  const value = String(targetLevel ?? "").toLowerCase();

  if (value.includes("strong")) {
    return ["STRONG TARGET", "#18a058"];
  }

  if (value.includes("possible")) {
    return ["POSSIBLE TARGET", "#d6a100"];
  }

  if (value.includes("weak")) {
    return ["WEAK TARGET", "#d9534f"];
  }

  if (value.includes("not")) {
    return ["NOT WORTH TIME", "#d9534f"];
  }

  return ["TARGET REVIEW", "#888"];
}

function scoreLine(label, value) {
  return `
    <div style="margin-bottom:12px;">
      <div
        style="
          display:flex;
          justify-content:space-between;
        "
      >
        <span>${escapeHtml(label)}</span>
        <b>${escapeHtml(value ?? "—")}/10</b>
      </div>

      ${bar(value)}
    </div>
  `;
}

function bullets(items) {
  return `<ul>${listItems(items)}</ul>`;
}

function roleBlock(role) {
  if (!role) {
    return "";
  }

  return `
    <div style="margin-top:10px;">
      <b>${escapeHtml(role.title_line)}</b>
      ${bullets(role.bullets)}
    </div>
  `;
}

function setLoading(message) {
  if (!resultDiv) {
    return;
  }

  resultDiv.style.background = "#171717";
  resultDiv.style.color = "#eee";
  resultDiv.style.padding = "10px";
  resultDiv.textContent = message;
}

function setError(error) {
  if (!resultDiv) {
    return;
  }

  resultDiv.innerHTML = `
    <b>Error</b>
    <p>${escapeHtml(error?.message || error)}</p>
  `;
}

function toggleButtons(disabled) {
  [
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
    exportJobsButton,
    clearTrackerButton
  ].forEach((button) => {
    if (button) {
      button.disabled = disabled;
    }
  });
}

function prepareResultArea() {
  if (!resultDiv) {
    return;
  }

  resultDiv.style.background = "transparent";
  resultDiv.style.padding = "0";
  resultDiv.style.color = "#eee";
}

function renderAnalysisResult(data = {}) {
  currentJobResult = data;

  prepareResultArea();

  const verdict = data.swapopt_verdict || {};
  const compensation = data.compensation_analysis || {};

  const targetLevel =
    data.target_level ||
    data.targetLevel ||
    verdict.decision_label ||
    "";

  const [targetLabel, accent] = getTargetLabel(targetLevel);

  const applyScore =
    verdict.apply_score ??
    data.apply_score ??
    data.verdictScore ??
    "—";

  const decisionLabel =
    verdict.decision_label ||
    data.decision ||
    "Review";

  const nextAction =
    data.next_action ||
    data.nextAction ||
    verdict.final_advice ||
    "";

  const currentMatch =
    data.current_match_percent ??
    data.currentMatchPercent ??
    "—";

  const tailoredMatch =
    data.tailored_match_percent ??
    data.tailoredMatchPercent ??
    "—";

  const applicationConfidence =
    data.application_confidence_score ??
    data.applicationConfidenceScore ??
    "—";

  const jobTitle =
    data.job_title ||
    data.jobTitle ||
    "Unknown role";

  const company =
    data.company ||
    data.companyName ||
    "Unknown company";

  const location =
    data.location ||
    "Unknown location";

  const strengths =
    data.why_they_might_hire ||
    data.strengths ||
    verdict.top_positive_factors ||
    [];

  const weaknesses =
    data.why_they_might_pass ||
    data.weaknesses ||
    verdict.top_risk_factors ||
    [];

  const keywordsToEmphasize =
    data.keywords_to_emphasize ||
    data.keywordsToEmphasize ||
    [];

  const missingKeywords =
    data.missing_keywords ||
    data.missingKeywords ||
    [];

  const recommendedProjects =
    data.recommended_projects ||
    data.recommendedProjects ||
    [];

  const recommendedActions =
    data.recommendedActions ||
    [];

  const summary =
    data.summary ||
    data.score_explanation ||
    data.quick_verdict ||
    verdict.one_line_reason ||
    "";

  resultDiv.innerHTML = `
    <div
      style="
        background:#101010;
        border-radius:14px;
        padding:14px;
        margin-top:10px;
        border:1px solid #303030;
      "
    >
      <div
        style="
          font-size:11px;
          letter-spacing:1.5px;
          color:#999;
        "
      >
        SWAPOPT AI
      </div>

      <div
        style="
          font-size:20px;
          font-weight:800;
          color:${accent};
          margin-top:5px;
        "
      >
        ${escapeHtml(targetLabel)}
      </div>

      <div
        style="
          font-size:13px;
          color:#bbb;
          margin-top:6px;
        "
      >
        ${escapeHtml(nextAction)}
      </div>
    </div>

    ${section(
      "SwapOpt Verdict",
      `
        <div
          style="
            font-size:34px;
            font-weight:800;
            color:#fff;
          "
        >
          ${escapeHtml(applyScore)}/10
        </div>

        <div
          style="
            font-size:18px;
            font-weight:700;
            margin-top:6px;
          "
        >
          ${escapeHtml(decisionLabel)}
        </div>

        <p style="color:#ddd;">
          ${escapeHtml(
            verdict.one_line_reason ||
            summary ||
            "No verdict explanation was generated."
          )}
        </p>

        <b>Recommended Effort:</b>

        <div style="margin-top:4px;color:#ddd;">
          ${escapeHtml(
            verdict.effort_recommendation ||
            data.recommended_effort_level ||
            data.recommendedEffort ||
            "Not determined"
          )}
        </div>

        <div style="margin-top:14px;">
          <b>Why Apply:</b>

          <ul>
            ${listItems(
              verdict.top_positive_factors ||
              strengths
            )}
          </ul>
        </div>

        <div style="margin-top:12px;">
          <b>Watch Outs:</b>

          <ul>
            ${listItems(
              verdict.top_risk_factors ||
              weaknesses
            )}
          </ul>
        </div>

        ${
          verdict.final_advice
            ? `
              <p style="color:#ccc;margin-bottom:0;">
                ${escapeHtml(verdict.final_advice)}
              </p>
            `
            : ""
        }
      `
    )}

    <div
      style="
        display:flex;
        gap:8px;
        margin-top:10px;
      "
    >
      <div
        style="
          flex:1;
          background:#171717;
          border:1px solid #303030;
          border-radius:12px;
          padding:11px;
        "
      >
        <div
          style="
            font-size:22px;
            font-weight:700;
          "
        >
          ${escapeHtml(currentMatch)}${
            currentMatch === "—" ? "" : "%"
          }
        </div>

        <div
          style="
            font-size:11px;
            color:#aaa;
          "
        >
          Current Resume
        </div>
      </div>

      <div
        style="
          flex:1;
          background:#171717;
          border:1px solid #303030;
          border-radius:12px;
          padding:11px;
        "
      >
        <div
          style="
            font-size:22px;
            font-weight:700;
          "
        >
          ${escapeHtml(tailoredMatch)}${
            tailoredMatch === "—" ? "" : "%"
          }
        </div>

        <div
          style="
            font-size:11px;
            color:#aaa;
          "
        >
          After Tailoring
        </div>
      </div>
    </div>

    ${section(
      "Application Confidence",
      `
        <b>${escapeHtml(applicationConfidence)}/100</b>

        ${bar(applicationConfidence, 100)}

        <div
          style="
            margin-top:10px;
            color:#ccc;
            line-height:1.6;
          "
        >
          <b>Hiring Intent:</b>
          ${escapeHtml(
            data.hiring_intent_level ||
            data.hiringIntentLevel ||
            "Unknown"
          )}
          <br>

          <b>Posting Quality:</b>
          ${escapeHtml(
            data.posting_quality_level ||
            data.postingQualityLevel ||
            "Unknown"
          )}
          <br>

          <b>Risk Level:</b>
          ${escapeHtml(
            data.posting_risk_level ||
            data.postingRiskLevel ||
            "Unknown"
          )}
          <br>

          <b>Reality Check:</b>
          ${escapeHtml(
            data.reality_check_verdict ||
            data.realityCheckVerdict ||
            "Unknown"
          )}
          <br>

          <b>Recommended Effort:</b>
          ${escapeHtml(
            data.recommended_effort_level ||
            data.recommendedEffort ||
            "Unknown"
          )}
        </div>
      `
    )}

    ${section(
      "Compensation Intelligence",
      `
        <b>Estimated Range:</b>
        ${escapeHtml(
          compensation.estimated_market_range ||
          compensation.estimatedMarketRange ||
          "Unknown"
        )}

        <br><br>

        <b>Suggested Application Input:</b>
        ${escapeHtml(
          compensation.recommended_application_salary ||
          compensation.recommendedApplicationSalary ||
          "Unknown"
        )}

        <br><br>

        <b>Safe Maximum:</b>
        ${escapeHtml(
          compensation.maximum_without_screening_risk ||
          compensation.maximumWithoutScreeningRisk ||
          "Unknown"
        )}

        <br><br>

        <b>Negotiation Strength:</b>
        ${escapeHtml(
          compensation.negotiation_strength ||
          compensation.negotiationStrength ||
          "Unknown"
        )}

        <br><br>

        <b>Confidence:</b>
        ${escapeHtml(
          compensation.salary_confidence_level ||
          compensation.salaryConfidenceLevel ||
          "Unknown"
        )}

        ${
          compensation.salary_reasoning ||
          compensation.salaryReasoning
            ? `
              <p style="color:#ccc;margin-top:10px;">
                ${escapeHtml(
                  compensation.salary_reasoning ||
                  compensation.salaryReasoning
                )}
              </p>
            `
            : ""
        }

        ${
          compensation.salary_risk_warning ||
          compensation.salaryRiskWarning
            ? `
              <p style="color:#aaa;margin-bottom:0;">
                ${escapeHtml(
                  compensation.salary_risk_warning ||
                  compensation.salaryRiskWarning
                )}
              </p>
            `
            : ""
        }
      `
    )}

    ${section(
      "Confidence Explanation",
      `
        <p style="margin:0;color:#ddd;">
          ${escapeHtml(
            data.confidence_explanation ||
            data.confidenceExplanation ||
            "No confidence explanation generated."
          )}
        </p>
      `
    )}

    ${section(
      "Positive Posting Signals",
      `
        <ul>
          ${listItems(
            data.positive_legitimacy_signals ||
            data.positiveLegitimacySignals
          )}
        </ul>
      `
    )}

    ${section(
      "Concern Signals",
      `
        <ul>
          ${listItems(
            data.concern_legitimacy_signals ||
            data.concernLegitimacySignals
          )}
        </ul>
      `
    )}

    ${section(
      "Hiring Confidence",
      `
        <b>
          ${escapeHtml(
            data.hiring_logic_score ??
            data.hiringLogicScore ??
            "—"
          )}/10
        </b>

        ${bar(
          data.hiring_logic_score ??
          data.hiringLogicScore
        )}
      `
    )}

    ${section(
      "Decision Context",
      `
        <div style="line-height:1.7;color:#ddd;">
          <b>Time Priority:</b>
          ${escapeHtml(
            data.time_priority ||
            data.timePriority ||
            "Unknown"
          )}
          <br>

          <b>H-1B Risk:</b>
          ${escapeHtml(
            data.h1b_risk ||
            data.h1bRisk ||
            "Unknown"
          )}
          <br>

          <b>Decision:</b>
          ${escapeHtml(
            data.decision ||
            decisionLabel ||
            "Unknown"
          )}
        </div>
      `
    )}

    ${section(
      "Role",
      `
        <div>
          ${escapeHtml(jobTitle)}
        </div>

        <span
          style="
            font-size:12px;
            color:#aaa;
          "
        >
          ${escapeHtml(company)} |
          ${escapeHtml(location)}
        </span>
      `
    )}

    ${section(
      "Score Breakdown",
      `
        ${scoreLine(
          "Technical Match",
          data.technical_match_score ??
          data.technicalMatchScore ??
          data.responsibility_match_score ??
          data.responsibilityMatchScore
        )}

        ${scoreLine(
          "Responsibility Fit",
          data.responsibility_match_score ??
          data.responsibilityMatchScore
        )}

        ${scoreLine(
          "Experience Level",
          data.experience_level_score ??
          data.experienceLevelScore
        )}

        ${scoreLine(
          "Domain Transfer",
          data.domain_transfer_score ??
          data.domainTransferScore
        )}

        ${scoreLine(
          "Sponsorship Fit",
          data.sponsorship_risk_score ??
          data.sponsorshipRiskScore
        )}
      `
    )}

    ${section(
      "Score Explanation",
      `
        <p style="margin:0;color:#ddd;">
          ${escapeHtml(
            summary ||
            "No score explanation generated."
          )}
        </p>
      `
    )}

    ${section(
      "Why They Might Hire You",
      `
        <ul>
          ${listItems(strengths)}
        </ul>
      `
    )}

    ${section(
      "Why They Might Pass",
      `
        <ul>
          ${listItems(weaknesses)}
        </ul>
      `
    )}

    ${section(
      "Best Resume Angle",
      `
        <p style="margin:0;color:#ddd;">
          ${escapeHtml(
            data.best_resume_angle ||
            data.bestResumeAngle ||
            "No resume angle generated."
          )}
        </p>
      `
    )}

    ${section(
      "Keywords to Emphasize",
      `
        <ul>
          ${listItems(keywordsToEmphasize)}
        </ul>
      `
    )}

    ${section(
      "Missing Keywords",
      `
        <ul>
          ${listItems(missingKeywords)}
        </ul>
      `
    )}

    ${section(
      "Recommended Projects",
      `
        <ul>
          ${listItems(recommendedProjects)}
        </ul>
      `
    )}

    ${
      recommendedActions.length > 0
        ? section(
            "Recommended Actions",
            `
              <ul>
                ${listItems(recommendedActions)}
              </ul>
            `
          )
        : ""
    }

    ${section(
      "Fit Notes",
      `
        <p style="margin:0;color:#ddd;">
          ${escapeHtml(
            data.risk_or_overclaim_warning ||
            data.riskOrOverclaimWarning ||
            "No additional fit warning generated."
          )}
        </p>
      `
    )}
  `;
}

function renderTailorResult(data = {}) {
  currentTailorResult = data;

  prepareResultArea();

  const notes = data.tailoringNotes || {};

  resultDiv.innerHTML = `
    <div
      style="
        background:#101010;
        border-radius:14px;
        padding:14px;
        margin-top:10px;
        border:1px solid #303030;
      "
    >
      <div
        style="
          font-size:11px;
          letter-spacing:1.5px;
          color:#999;
        "
      >
        SWAPOPT TAILORING
      </div>

      <div
        style="
          font-size:20px;
          font-weight:800;
          color:#e6e6e6;
          margin-top:5px;
        "
      >
        Resume Strategy
      </div>
    </div>

    ${section(
      "Tailoring Worth",
      `
        <b>
          ${escapeHtml(
            notes.tailoring_worth_score ??
            data.tailoring_score ??
            "—"
          )}/10
        </b>

        ${bar(
          notes.tailoring_worth_score ??
          data.tailoring_score
        )}
      `
    )}

    ${section(
      "Recommended Effort",
      `
        <b>
          ${escapeHtml(
            notes.tailoring_effort ||
            data.tailoring_effort ||
            "Not determined"
          )}
        </b>
      `
    )}

    ${section(
      "Professional Summary Direction",
      `
        <p style="margin:0;color:#ddd;">
          ${escapeHtml(
            data.professionalSummary ||
            "No summary recommendation generated."
          )}
        </p>
      `
    )}

    ${section(
      "Resume Strategy",
      `
        <p style="margin:0;color:#ddd;">
          ${escapeHtml(
            notes.resume_strategy ||
            "No resume strategy generated."
          )}
        </p>
      `
    )}

    ${section(
      "Recommended Resume Angle",
      `
        <p style="margin:0;color:#ddd;">
          ${escapeHtml(
            notes.recommended_resume_angle ||
            "No resume angle generated."
          )}
        </p>
      `
    )}

    ${section(
      "Skills To Emphasize",
      bullets(data.skills)
    )}

    ${section(
      "Experience Recommendations",
      bullets(data.experience)
    )}

    ${section(
      "Project Recommendations",
      bullets(data.projects)
    )}

    ${section(
      "ATS Keywords",
      bullets(data.atsKeywords)
    )}

    ${section(
      "Application Positioning",
      `
        <p style="margin:0;color:#ddd;">
          ${escapeHtml(
            notes.application_positioning ||
            "No application positioning generated."
          )}
        </p>
      `
    )}

    ${section(
      "Interview Talking Points",
      bullets(notes.interview_talking_points)
    )}

    ${section(
      "Do Not Claim",
      bullets(notes.do_not_claim)
    )}

    ${section(
      "Final Recommendation",
      `
        <p style="margin:0;color:#ddd;">
          ${escapeHtml(
            notes.final_recommendation ||
            "No final recommendation generated."
          )}
        </p>
      `
    )}
  `;
}

function renderResumeDraft(data = {}) {
  currentResumeDraft = data;

  prepareResultArea();

  const skills = data.skills || {};
  const work = data.work_experience || {};

  const projects = Array.isArray(data.projects)
    ? data.projects
        .map(
          (project) => `
            <div style="margin-top:10px;">
              <b>${escapeHtml(project.name)}</b>

              ${
                project.tools
                  ? ` | ${escapeHtml(project.tools)}`
                  : ""
              }

              <ul>
                <li>${escapeHtml(project.bullet)}</li>
              </ul>
            </div>
          `
        )
        .join("")
    : "<p>No projects generated.</p>";

  resultDiv.innerHTML = `

    <div
      style="
        background:#101010;
        border-radius:14px;
        padding:14px;
        margin-top:10px;
        border:1px solid #303030;
      "
    >
      <div
        style="
          font-size:11px;
          letter-spacing:1.5px;
          color:#999;
        "
      >
        SWAPOPT RESUME
      </div>

      <div
        style="
          font-size:20px;
          font-weight:800;
          color:#fff;
          margin-top:5px;
        "
      >
        ${escapeHtml(
          data.recommended_resume_title ||
          "Tailored Resume Draft"
        )}
      </div>

      <div
        style="
          font-size:13px;
          color:#bbb;
          margin-top:6px;
        "
      >
        ${escapeHtml(data.company || "Unknown")}
        |
        ${escapeHtml(data.job_title || "Unknown")}
      </div>
    </div>

    ${section(
      "Fit Warning",
      `
        <p style="margin:0;color:#ddd;">
          ${escapeHtml(
            data.resume_fit_warning
          )}
        </p>
      `
    )}

    ${section(
      "Professional Summary",
      `
        <p style="margin:0;color:#ddd;">
          ${escapeHtml(
            data.professional_summary
          )}
        </p>
      `
    )}

    ${section(
      "Skills",
      `
        <b>Analytics & BI</b>
        ${bullets(skills.analytics_bi)}

        <b>Data Platforms & Modeling</b>
        ${bullets(
          skills.data_platforms_modeling
        )}

        <b>Programming & Automation</b>
        ${bullets(
          skills.programming_automation
        )}

        <b>Data Quality & Business Analysis</b>
        ${bullets(
          skills.data_quality_business_analysis
        )}
      `
    )}

    ${section(
      "Work Experience",
      `
        ${roleBlock(
          work.community_dreams_foundation
        )}

        ${roleBlock(
          work.accenture_data_analyst_ii
        )}

        ${roleBlock(
          work.accenture_data_analyst_i
        )}
      `
    )}

    ${section(
      "Projects",
      projects
    )}

    ${section(
      "Keywords Added",
      bullets(data.keywords_added)
    )}

    ${section(
      "Keywords Not Used",
      bullets(
        data.keywords_not_used_due_to_truthfulness
      )
    )}

    ${section(
      "Final Note",
      `
        <p style="margin:0;color:#ddd;">
          ${escapeHtml(data.final_note)}
        </p>
      `
    )}
  `;
}

function renderCoverLetter(data = {}) {
  currentCoverLetter = data;

  prepareResultArea();

  resultDiv.innerHTML = section(
    "Cover Letter",
    `
      <p
        style="
          white-space:pre-line;
          color:#ddd;
          margin:0;
        "
      >
        ${escapeHtml(
data.coverLetter ||
"No cover letter generated."
        )}
      </p>
    `
  );
}

function renderNetworkResult(data = {}) {
  currentNetworkResult = data;

  prepareResultArea();

  const hunter = data.hunterSearch || {};
  const outreach = data.outreachMessages || {};
  const email = outreach.email || {};
  const followUp = data.followUpPlan || {};

  const people = Array.isArray(data.targetContacts)
    ? data.targetContacts.map((person) => {
        return [
          person.targetType || "Unknown contact",
          person.priority
            ? `Priority: ${person.priority}`
            : "",
          person.reason || "",
          person.linkedinSearch
            ? `Search: ${person.linkedinSearch}`
            : ""
        ]
          .filter(Boolean)
          .join(" — ");
      })
    : [];

  const contacts = Array.isArray(
    data.discovered_contacts
  )
    ? data.discovered_contacts.map((contact) =>
        [
          contact.name || "Unknown",
          contact.position || "Unknown role",
          contact.email || "No email",
          `Confidence: ${
            contact.confidence ?? "N/A"
          }`
        ].join(" | ")
      )
    : [];

  resultDiv.innerHTML = `
    ${section(
      "Networking Strategy",
      `
        <p style="margin:0;color:#ddd;">
          ${escapeHtml(
            data.networkStrategy ||
            "No networking strategy generated."
          )}
        </p>
      `
    )}

    ${section(
      "Target Contacts",
      bullets(people)
    )}

    ${section(
      "Hunter Recommendation",
      `
        <b>
          ${
            hunter.recommended
              ? "Recommended"
              : "Not Recommended"
          }
        </b>

        <p style="color:#ddd;">
          ${escapeHtml(
            hunter.reason ||
            "No Hunter explanation generated."
          )}
        </p>

        ${
          hunter.companyDomain
            ? `
              <div>
                <b>Company Domain:</b>
                ${escapeHtml(
                  hunter.companyDomain
                )}
              </div>
            `
            : ""
        }
      `
    )}

    ${section(
      "Discovered Contacts",
      bullets(contacts)
    )}

    ${section(
      "LinkedIn Connection Request",
      `
        <p style="white-space:pre-line;margin:0;color:#ddd;">
          ${escapeHtml(
            outreach.linkedinConnection ||
            "No connection request generated."
          )}
        </p>
      `
    )}

    ${section(
      "LinkedIn Message",
      `
        <p style="white-space:pre-line;margin:0;color:#ddd;">
          ${escapeHtml(
            outreach.linkedinMessage ||
            "No LinkedIn message generated."
          )}
        </p>
      `
    )}

    ${section(
      "Email Message",
      `
        <b>Subject:</b>

        <div style="margin-top:5px;color:#ddd;">
          ${escapeHtml(
            email.subject ||
            "No subject generated."
          )}
        </div>

        <p style="white-space:pre-line;color:#ddd;">
          ${escapeHtml(
            email.body ||
            "No email body generated."
          )}
        </p>
      `
    )}

    ${section(
      "Follow-Up Timeline",
      bullets(followUp.timeline)
    )}

    ${section(
      "Follow-Up Notes",
      `
        <p style="margin:0;color:#ddd;">
          ${escapeHtml(
            followUp.notes ||
            "No follow-up notes generated."
          )}
        </p>
      `
    )}
  `;
}
function renderApplicationHelp(data = {}) {
  currentApplicationHelp = data;

  prepareResultArea();

  resultDiv.innerHTML = `
    ${section(
      "Why This Company",
      `
        <p>
          ${escapeHtml(
            data.why_company ||
            ""
          )}
        </p>
      `
    )}

    ${section(
      "Why This Role",
      `
        <p>
          ${escapeHtml(
            data.why_role ||
            ""
          )}
        </p>
      `
    )}

    ${section(
      "Tell Me About Yourself",
      `
        <p>
          ${escapeHtml(
            data.tell_me_about_yourself ||
            ""
          )}
        </p>
      `
    )}

    ${section(
      "Relevant Experience",
      `
        <p>
          ${escapeHtml(
            data.relevant_experience_answer ||
            ""
          )}
        </p>
      `
    )}

    ${section(
      "Additional Information",
      `
        <p>
          ${escapeHtml(
            data.additional_information_box ||
            ""
          )}
        </p>
      `
    )}

    ${section(
      "Questions To Ask Recruiter",
      bullets(
        data.questions_to_ask_recruiter
      )
    )}

    ${section(
      "Final Application Strategy",
      `
        <p>
          ${escapeHtml(
            data.final_application_strategy ||
            ""
          )}
        </p>
      `
    )}
  `;
}

chrome.storage.local.get(
  [
    "lastSwapOptResult",
    "lastSwapOptTailorResult",
    "lastSwapOptResumeDraft"
  ],
  (stored) => {
    if (stored.lastSwapOptResult) {
      currentJobResult =
        stored.lastSwapOptResult;

      renderAnalysisResult(
        stored.lastSwapOptResult
      );
    }

    if (stored.lastSwapOptTailorResult) {
      currentTailorResult =
        stored.lastSwapOptTailorResult;
    }

    if (stored.lastSwapOptResumeDraft) {
      currentResumeDraft =
        stored.lastSwapOptResumeDraft;
    }
  }
);

async function getCurrentJobPage() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) {
    throw new Error(
      "No active browser tab was found."
    );
  }

  const [{ result }] =
    await chrome.scripting.executeScript({
      target: {
        tabId: tab.id
      },
      func: () => {
        function getLongestText(selectors) {
          let bestText = "";

          for (const selector of selectors) {
            const elements =
              document.querySelectorAll(selector);

            for (const element of elements) {
              const text =
                element?.innerText?.trim() ||
                "";

              if (text.length > bestText.length) {
                bestText = text;
              }
            }
          }

          return bestText;
        }

        function getFirstText(selectors) {
          for (const selector of selectors) {
            const element =
              document.querySelector(selector);

            const text =
              element?.innerText?.trim();

            if (text) {
              return text;
            }
          }

          return "";
        }

        function cleanText(value) {
          return String(value || "")
            .replace(/\u00a0/g, " ")
            .replace(/[ \t]+/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
        }

        const descriptionSelectors = [
          "[data-automation-id='jobPostingDescription']",
          "[data-testid='job-description']",
          ".jobs-description-content__text",
          ".jobs-box__html-content",
          "#jobDescriptionText",
          ".jobsearch-JobComponent-description",
          ".job-description",
          ".jobDescription",
          "[class*='job-description']",
          "[class*='jobDescription']",
          "article",
          "main"
        ];

        const titleSelectors = [
          "[data-automation-id='jobPostingHeader'] h1",
          "[data-testid='job-title']",
          ".job-details-jobs-unified-top-card__job-title",
          ".jobs-unified-top-card__job-title",
          ".top-card-layout__title",
          ".jobsearch-JobInfoHeader-title",
          "h1"
        ];

        const companySelectors = [
          "[data-automation-id='jobPostingCompany']",
          "[data-testid='company-name']",
          ".job-details-jobs-unified-top-card__company-name",
          ".jobs-unified-top-card__company-name",
          ".topcard__org-name-link",
          ".jobsearch-InlineCompanyRating-companyHeader",
          "[class*='company-name']",
          "[class*='companyName']"
        ];

        const locationSelectors = [
          "[data-automation-id='locations']",
          "[data-testid='job-location']",
          ".job-details-jobs-unified-top-card__primary-description-container",
          ".jobs-unified-top-card__bullet",
          ".topcard__flavor--bullet",
          ".jobsearch-JobInfoHeader-subtitle div",
          "[class*='job-location']",
          "[class*='jobLocation']"
        ];

        let jobDescription = getLongestText(
          descriptionSelectors
        );

        if (jobDescription.length < 200) {
          jobDescription =
            document.body?.innerText?.trim() ||
            "";
        }

        const pageTitle = document.title || "";

        let jobTitle = getFirstText(
          titleSelectors
        );

        let companyName = getFirstText(
          companySelectors
        );

        const location = getFirstText(
          locationSelectors
        );

        if (!jobTitle && pageTitle) {
          const titleParts = pageTitle
            .split(/\s+[|\-–—]\s+/)
            .map((part) => part.trim())
            .filter(Boolean);

          jobTitle = titleParts[0] || "";
        }

        if (!companyName && pageTitle) {
          const titleParts = pageTitle
            .split(/\s+[|\-–—]\s+/)
            .map((part) => part.trim())
            .filter(Boolean);

          companyName =
            titleParts.length > 1
              ? titleParts[1]
              : "";
        }

        return {
          jobDescription: cleanText(
            jobDescription
          ),
          jobTitle: cleanText(jobTitle),
          companyName: cleanText(
            companyName
          ),
          location: cleanText(location)
        };
      }
    });

  if (!result) {
    throw new Error(
      "Could not extract information from the current page."
    );
  }

  if (
    !result.jobDescription ||
    result.jobDescription.length < 200
  ) {
    throw new Error(
      "Could not read enough job-description text. Open the full job posting and try again."
    );
  }

  return result;
}

async function callBackend(
  endpoint,
  payload
) {
  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}/${endpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify(payload)
      }
    );
  } catch {
    throw new Error(
      "Could not connect to the SwapOpt backend. Confirm that the server is running on localhost:8787."
    );
  }

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `The backend returned an unreadable response with status ${response.status}.`
    );
  }

  if (!response.ok) {
    throw new Error(
      data.details ||
        data.error ||
        data.message ||
        `Backend request failed with status ${response.status}.`
    );
  }

  return data;
}

async function sendJobToBackend(
  endpoint,
  loadingText,
  extraData = {}
) {
  toggleButtons(true);
  setLoading(loadingText);

  try {
    const page =
      await getCurrentJobPage();

    return await callBackend(endpoint, {
      jobDescription:
        page.jobDescription,
      companyName: page.companyName,
      jobTitle: page.jobTitle,
      ...extraData
    });
  } finally {
    toggleButtons(false);
  }
}

function getCurrentVerdictScore() {
  if (!currentJobResult) {
    throw new Error(
      "Analyze the job first so SwapOpt can use the verdict score."
    );
  }

  const score = Number(
    currentJobResult.verdictScore ??
      currentJobResult.swapopt_verdict
        ?.apply_score ??
      currentJobResult.apply_score
  );

  if (!Number.isFinite(score)) {
    throw new Error(
      "No valid SwapOpt verdict score was found. Analyze the job again."
    );
  }

  return score;
}

analyzeButton?.addEventListener("click", async () => {
  try {
    const data = await sendJobToBackend(
      "analyze",
      "Analyzing job fit..."
    );

    chrome.storage.local.set({
      lastSwapOptResult: data
    });

    renderAnalysisResult(data);
  } catch (error) {
    setError(error);
  }
});

tailorButton?.addEventListener("click", async () => {
  try {
    const data = await sendJobToBackend(
      "tailor",
      "Generating tailoring strategy...",
{
  applyScore: getCurrentVerdictScore()
}
    );

    chrome.storage.local.set({
      lastSwapOptTailorResult: data
    });

    renderTailorResult(data);
  } catch (error) {
    setError(error);
  }
});

resumeDraftButton?.addEventListener("click", async () => {
  try {
    const data = await sendJobToBackend(
      "resume-draft",
      "Generating resume draft...",
{
  applyScore: getCurrentVerdictScore()
}
    );

    chrome.storage.local.set({
      lastSwapOptResumeDraft: data
    });

    renderResumeDraft(data);
  } catch (error) {
    setError(error);
  }
});

coverLetterButton?.addEventListener("click", async () => {
  try {
    const data = await sendJobToBackend(
      "cover-letter",
      "Generating cover letter..."
    );

    renderCoverLetter(data);
  } catch (error) {
    setError(error);
  }
});

networkButton?.addEventListener("click", async () => {
  try {
    const data = await sendJobToBackend(
      "network",
      "Building networking strategy..."
    );

    renderNetworkResult(data);
  } catch (error) {
    setError(error);
  }
});

applicationHelpButton?.addEventListener("click", async () => {
  try {
    const data = await sendJobToBackend(
      "application-help",
      "Generating application answers..."
    );

    renderApplicationHelp(data);
  } catch (error) {
    setError(error);
  }
});

copyInsightButton?.addEventListener("click", async () => {
  if (!currentJobResult) {
    alert("Analyze a job first.");
    return;
  }

  if (!currentTailorResult) {
    alert("Run Tailor first.");
    return;
  }

  const insight = `
SWAPOPT RESUME TAILORING INSIGHT

Role:
${currentJobResult.job_title || currentJobResult.jobTitle || "Unknown"}

Company:
${currentJobResult.company || currentJobResult.companyName || "Unknown"}

Location:
${currentJobResult.location || "Unknown"}

Verdict Score:
${
  currentJobResult.swapopt_verdict?.apply_score ??
  currentJobResult.apply_score ??
  currentJobResult.verdictScore ??
  "N/A"
}/10

Current Match:
${
  currentJobResult.current_match_percent ??
  currentJobResult.currentMatchPercent ??
  "N/A"
}%

Potential Match:
${
  currentJobResult.tailored_match_percent ??
  currentJobResult.tailoredMatchPercent ??
  "N/A"
}%

Decision:
${currentJobResult.decision || "N/A"}

Target Level:
${currentJobResult.target_level || currentJobResult.targetLevel || "N/A"}

Next Action:
${currentJobResult.next_action || currentJobResult.nextAction || "N/A"}

Resume Strategy
${currentTailorResult.resume_strategy || ""}

Recommended Resume Angle
${currentTailorResult.recommended_resume_angle || ""}

Summary Direction
${currentTailorResult.summary_direction || ""}

Skills To Emphasize
${(currentTailorResult.skills_to_emphasize || [])
  .map((item) => `- ${item}`)
  .join("\n")}

Keywords To Add
${(currentTailorResult.keywords_to_add || [])
  .map((item) => `- ${item}`)
  .join("\n")}

Interview Talking Points
${(currentTailorResult.interview_talking_points || [])
  .map((item) => `- ${item}`)
  .join("\n")}

Projects
${(
  currentJobResult.recommended_projects ||
  currentJobResult.recommendedProjects ||
  []
)
  .map((item) => `- ${item}`)
  .join("\n")}

Missing Keywords
${(
  currentJobResult.missing_keywords ||
  currentJobResult.missingKeywords ||
  []
)
  .map((item) => `- ${item}`)
  .join("\n")}

Instruction

Tailor my resume truthfully.

• Keep the same work history.
• Keep the same dates.
• Keep the same employers.
• Keep exactly 3 bullets per role.
• Keep exactly 2 projects.
• Never invent experience.
`.trim();

  try {
    await navigator.clipboard.writeText(insight);
    alert("Resume tailoring insight copied.");
  } catch {
    alert("Could not copy the insight to the clipboard.");
  }
});

saveJobButton?.addEventListener("click", async () => {
  if (!currentJobResult) {
    alert("Analyze a job before saving.");
    return;
  }

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  chrome.storage.local.get(["savedJobs"], (stored) => {
    const jobs = Array.isArray(stored.savedJobs)
      ? stored.savedJobs
      : [];

    const now = new Date().toLocaleString();

    const job = {
      id: crypto.randomUUID(),

      company:
        currentJobResult.company ||
        currentJobResult.companyName ||
        "",

      title:
        currentJobResult.job_title ||
        currentJobResult.jobTitle ||
        "",

      location:
        currentJobResult.location ||
        "",

      url:
        tab?.url ||
        "",

      currentMatch:
        currentJobResult.current_match_percent ??
        currentJobResult.currentMatchPercent ??
        "",

      tailoredMatch:
        currentJobResult.tailored_match_percent ??
        currentJobResult.tailoredMatchPercent ??
        "",

      hiringScore:
        currentJobResult.hiring_logic_score ??
        currentJobResult.hiringLogicScore ??
        "",

      decision:
        currentJobResult.decision ||
        "",

      target:
        currentJobResult.target_level ||
        currentJobResult.targetLevel ||
        "",

      fullAnalysis: currentJobResult,
      tailorAnalysis: currentTailorResult,
      resumeDraft: currentResumeDraft,
      coverLetter: currentCoverLetter,
      networkResult: currentNetworkResult,
      applicationHelp: currentApplicationHelp,

      status: "Interested",
      notes: "",
      savedAt: now,
      updatedAt: now
    };

    jobs.unshift(job);

    chrome.storage.local.set(
      {
        savedJobs: jobs
      },
      () => {
        alert("Job saved!");
      }
    );
  });
});

function updateJobStatus(id, status) {
  chrome.storage.local.get(
    ["savedJobs"],
    (stored) => {
      const jobs = (stored.savedJobs || []).map(
        (job) => {
          if (job.id !== id) {
            return job;
          }

          return {
            ...job,
            status,
            updatedAt: new Date().toLocaleString()
          };
        }
      );

      chrome.storage.local.set(
        {
          savedJobs: jobs
        },
        () => renderSavedJobs(jobs)
      );
    }
  );
}

function calculateRepostInfo(job, jobs) {
  const similarJobs = jobs.filter((other) => {
    if (other.id === job.id) {
      return false;
    }

    const companyMatch =
      String(other.company || "").toLowerCase() ===
      String(job.company || "").toLowerCase();

    if (!companyMatch) {
      return false;
    }

    const titleA = String(other.title || "")
      .toLowerCase();

    const titleB = String(job.title || "")
      .toLowerCase();

    return (
      titleA.includes(titleB.slice(0, 12)) ||
      titleB.includes(titleA.slice(0, 12))
    );
  });

  const seenCount = similarJobs.length + 1;

  let repostRisk = "Low";

  if (seenCount >= 3) {
    repostRisk = "High";
  } else if (seenCount === 2) {
    repostRisk = "Moderate";
  }

  return {
    seenCount,
    repostRisk,
    previousStatuses: [
      ...new Set(
        similarJobs
          .map((job) => job.status)
          .filter(Boolean)
      )
    ]
  };
}

function renderSavedJobs(
  jobs = [],
  title = "Saved Jobs",
  subtitle = ""
) {
  prepareResultArea();

  if (!jobs.length) {
    resultDiv.innerHTML = section(
      title,
      "<p>No jobs found.</p>"
    );
    return;
  }

  resultDiv.innerHTML = `
    <div
      style="
        background:#101010;
        border-radius:14px;
        padding:14px;
        margin-top:10px;
        border:1px solid #303030;
      "
    >
      <div
        style="
          font-size:11px;
          letter-spacing:1.5px;
          color:#999;
        "
      >
        SWAPOPT TRACKER
      </div>

      <div
        style="
          font-size:20px;
          font-weight:800;
          color:#fff;
          margin-top:5px;
        "
      >
        ${escapeHtml(title)}
      </div>

      <div
        style="
          font-size:13px;
          color:#bbb;
          margin-top:6px;
        "
      >
        ${escapeHtml(subtitle)}
      </div>
    </div>

    <input
      id="jobSearchInput"
      placeholder="Search company, role, location, status..."
      style="
        width:100%;
        margin-top:10px;
        padding:10px;
        border-radius:10px;
        border:1px solid #333;
        background:#111;
        color:#eee;
      "
    />

    ${jobs
      .map((job) => {
        const repost =
          calculateRepostInfo(job, jobs);

        return `
          <div
            data-job-card
            style="
              background:#171717;
              border:1px solid #303030;
              padding:12px;
              border-radius:12px;
              margin-top:10px;
            "
          >
            <b>${escapeHtml(job.title)}</b>

            <br>

            <span
              style="
                font-size:12px;
                color:#aaa;
              "
            >
              ${escapeHtml(job.company)}
              |
              ${escapeHtml(job.location)}
            </span>

            <div
              style="
                margin-top:8px;
                line-height:1.6;
              "
            >
              Match:
              ${escapeHtml(job.currentMatch)}%
              →
              ${escapeHtml(job.tailoredMatch)}%

              <br>

              Hiring:
              ${escapeHtml(job.hiringScore)}/10

              <br>

              Decision:
              ${escapeHtml(job.decision)}

              <br>

              Target:
              ${escapeHtml(job.target)}

              <br>

              Status:
              <b>${escapeHtml(job.status)}</b>

              <br>

              Seen Similar:
              <b>${repost.seenCount}</b>

              <br>

              Previous Statuses:
              ${
                repost.previousStatuses.length
                  ? escapeHtml(
                      repost.previousStatuses.join(", ")
                    )
                  : "None"
              }

              <br>

              Repost Risk:
              <b>${escapeHtml(repost.repostRisk)}</b>
            </div>

            <div
              style="
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:6px;
                margin-top:10px;
              "
            >

              <button
                class="status-btn"
                data-id="${job.id}"
                data-status="Interested"
              >
                Interested
              </button>

              <button
                class="status-btn"
                data-id="${job.id}"
                data-status="Applied"
              >
                Applied
              </button>

              <button
                class="status-btn"
                data-id="${job.id}"
                data-status="Interview"
              >
                Interview
              </button>

              <button
                class="status-btn"
                data-id="${job.id}"
                data-status="Rejected"
              >
                Rejected
              </button>
            </div>

            <div
              style="
                display:flex;
                gap:8px;
                margin-top:10px;
                flex-wrap:wrap;
              "
            >
              <button
                class="open-job-btn"
                data-url="${escapeHtml(job.url)}"
              >
                Open Posting
              </button>

              <button
                class="copy-analysis-btn"
                data-id="${job.id}"
              >
                Copy Analysis
              </button>

              <button
                class="delete-job-btn"
                data-id="${job.id}"
              >
                Delete
              </button>
            </div>

            <div
              style="
                margin-top:10px;
              "
            >
              <textarea
                class="job-note"
                data-id="${job.id}"
                placeholder="Notes..."
                style="
                  width:100%;
                  min-height:70px;
                  background:#111;
                  color:#eee;
                  border:1px solid #333;
                  border-radius:8px;
                  padding:8px;
                "
              >${escapeHtml(job.notes || "")}</textarea>

              <button
                class="save-note-btn"
                data-id="${job.id}"
                style="margin-top:6px;"
              >
                Save Notes
              </button>
            </div>
          </div>
        `;
      })
      .join("")}
  `;

  document
    .querySelectorAll(".status-btn")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          updateJobStatus(
            button.dataset.id,
            button.dataset.status
          );
        }
      );
    });

  document
    .querySelectorAll(".delete-job-btn")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          chrome.storage.local.get(
            ["savedJobs"],
            (stored) => {
              const jobs = (
                stored.savedJobs || []
              ).filter(
                (job) =>
                  job.id !==
                  button.dataset.id
              );

              chrome.storage.local.set(
                {
                  savedJobs: jobs
                },
                () =>
                  renderSavedJobs(jobs)
              );
            }
          );
        }
      );
    });

  document
    .querySelectorAll(".open-job-btn")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          chrome.tabs.create({
            url: button.dataset.url
          });
        }
      );
    });

  document
    .querySelectorAll(".save-note-btn")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const textarea =
            document.querySelector(
              `.job-note[data-id="${button.dataset.id}"]`
            );

          chrome.storage.local.get(
            ["savedJobs"],
            (stored) => {
              const jobs = (
                stored.savedJobs || []
              ).map((job) => {
                if (
                  job.id !==
                  button.dataset.id
                ) {
                  return job;
                }

                return {
                  ...job,
                  notes:
                    textarea?.value || "",
                  updatedAt:
                    new Date().toLocaleString()
                };
              });

              chrome.storage.local.set({
                savedJobs: jobs
              });
            }
          );
        }
      );
    });

  document
    .querySelectorAll(".copy-analysis-btn")
    .forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          chrome.storage.local.get(
            ["savedJobs"],
            async (stored) => {
              const job = (
                stored.savedJobs || []
              ).find(
                (item) =>
                  item.id ===
                  button.dataset.id
              );

              if (!job) return;

              try {
                await navigator.clipboard.writeText(
                  JSON.stringify(
                    job,
                    null,
                    2
                  )
                );

                alert(
                  "Analysis copied."
                );
              } catch {
                alert(
                  "Unable to copy."
                );
              }
            }
          );
        }
      );
    });

  const searchInput =
    document.getElementById(
      "jobSearchInput"
    );

  searchInput?.addEventListener(
    "input",
    () => {
      const value =
        searchInput.value.toLowerCase();

      document
        .querySelectorAll(
          "[data-job-card]"
        )
        .forEach((card) => {
          const text =
            card.textContent.toLowerCase();

          card.style.display =
            text.includes(value)
              ? ""
              : "none";
        });
    }
  );
}

viewJobsButton?.addEventListener(
  "click",
  () => {
    chrome.storage.local.get(
      ["savedJobs"],
      (stored) => {
        renderSavedJobs(
          stored.savedJobs || []
        );
      }
    );
  }
);

viewAllJobsButton?.addEventListener("click", () => {
  chrome.storage.local.get(["savedJobs"], ({ savedJobs = [] }) => {
    renderSavedJobs(
      savedJobs,
      "All Jobs",
      `${savedJobs.length} total jobs`
    );
  });
});

viewArchivedButton?.addEventListener("click", () => {
  chrome.storage.local.get(["savedJobs"], ({ savedJobs = [] }) => {
    const archived = savedJobs.filter(
      (job) =>
        String(job.status).toLowerCase() === "rejected" ||
        String(job.status).toLowerCase() === "archived"
    );

    renderSavedJobs(
      archived,
      "Archived Jobs",
      `${archived.length} archived`
    );
  });
});

exportJobsButton?.addEventListener("click", () => {
  chrome.storage.local.get(["savedJobs"], ({ savedJobs = [] }) => {
    if (!savedJobs.length) {
      alert("No jobs to export.");
      return;
    }

    const rows = [
      [
        "Company",
        "Title",
        "Location",
        "Current Match",
        "Tailored Match",
        "Hiring Score",
        "Decision",
        "Target",
        "Status",
        "Saved At",
        "Updated At",
        "URL",
        "Notes"
      ]
    ];

    savedJobs.forEach((job) => {
      rows.push([
        job.company || "",
        job.title || "",
        job.location || "",
        job.currentMatch || "",
        job.tailoredMatch || "",
        job.hiringScore || "",
        job.decision || "",
        job.target || "",
        job.status || "",
        job.savedAt || "",
        job.updatedAt || "",
        job.url || "",
        (job.notes || "").replace(/\r?\n/g, " ")
      ]);
    });

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv"
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `swapopt_jobs_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  });
});

clearTrackerButton?.addEventListener("click", () => {
  if (
    !confirm(
      "Delete every saved job from your SwapOpt tracker?"
    )
  ) {
    return;
  }

  chrome.storage.local.remove(
    ["savedJobs"],
    () => {
      renderSavedJobs(
        [],
        "Saved Jobs",
        "Tracker cleared."
      );

      alert("Tracker cleared.");
    }
  );
});

