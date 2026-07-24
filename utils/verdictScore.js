const WEIGHTS = {
  skills: 35,
  experience: 25,
  keywords: 20,
  education: 10,
  bonus: 10
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalize(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return clamp(number);
}

export function calculateVerdictScore(scores = {}) {
  const weighted =
    normalize(scores.skills) * (WEIGHTS.skills / 100) +
    normalize(scores.experience) * (WEIGHTS.experience / 100) +
    normalize(scores.keywords) * (WEIGHTS.keywords / 100) +
    normalize(scores.education) * (WEIGHTS.education / 100) +
    normalize(scores.bonus) * (WEIGHTS.bonus / 100);

  return Math.round(clamp(weighted));
}

export function determineVerdict(score) {
  const finalScore = clamp(Number(score) || 0);

  if (finalScore >= 85) {
    return {
      label: "Excellent Match",
      color: "green"
    };
  }

  if (finalScore >= 70) {
    return {
      label: "Strong Match",
      color: "lightgreen"
    };
  }

  if (finalScore >= 55) {
    return {
      label: "Moderate Match",
      color: "orange"
    };
  }

  if (finalScore >= 40) {
    return {
      label: "Weak Match",
      color: "darkorange"
    };
  }

  return {
    label: "Poor Match",
    color: "red"
  };
}

export function buildVerdict(scores = {}) {
  const score = calculateVerdictScore(scores);
  const verdict = determineVerdict(score);

  return {
    score,
    ...verdict
  };
}