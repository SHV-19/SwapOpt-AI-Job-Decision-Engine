import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const forbiddenPaths = [
  "profile",
  ".env",
  ".swapopt-batch-backup",
  ".swapopt-fix-backup"
];

const sourceRoots = [
  path.join(root, "backend"),
  path.join(root, "tests")
];

const sourceExtensions = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".txt",
  ".yml",
  ".yaml"
]);

const forbiddenContent = [
  {
    label: "owner-specific private name data",
    pattern: /swapnil[_\s-]*herwadkar|swapnil[_-]|herwadkar/iu
  },
  {
    label: "owner-specific private location/employer data",
    pattern: /\bglendale\b|\bsebring\b|\bpune\b|\baccenture\b|community dreams/iu
  },
  {
    label: "candidate-specific race preference",
    pattern: /preferredRaceOrder\s*:\s*\[\s*["']Asian["']/u
  },
  {
    label: "hard-coded EEO answer",
    pattern: /\b(?:gender|race|hispanicLatino|veteranStatus|disabilityStatus)\s*:\s*(?:["'][^"']+["']|true|false)/u
  },
  {
    label: "OpenAI-style secret",
    pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/u
  },
  {
    label: "GitHub token",
    pattern: /\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}\b/u
  },
  {
    label: "Google API key",
    pattern: /\bAIza[0-9A-Za-z_-]{20,}\b/u
  },
  {
    label: "private key material",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u
  }
];

const findings = [];

for (const relativePath of forbiddenPaths) {
  if (fs.existsSync(path.join(root, relativePath))) {
    findings.push(`forbidden path exists: ${relativePath}`);
  }
}

for (const sourceRoot of sourceRoots) {
  if (!fs.existsSync(sourceRoot)) {
    continue;
  }

  for (const file of walkFiles(sourceRoot)) {
    if (!sourceExtensions.has(path.extname(file).toLowerCase())) {
      continue;
    }

    const relative = path.relative(root, file);
    const text = fs.readFileSync(file, "utf8");

    for (const check of forbiddenContent) {
      if (check.pattern.test(text)) {
        findings.push(`${relative}: ${check.label}`);
      }
    }

    for (const email of text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu)) {
      if (!isAllowedSyntheticEmail(email[0])) {
        findings.push(`${relative}: non-synthetic email literal`);
      }
    }
  }
}

if (findings.length > 0) {
  console.error("Public showcase verification failed:");
  for (const finding of [...new Set(findings)].sort()) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("Public showcase verification passed.");

function* walkFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      yield* walkFiles(fullPath);
      continue;
    }

    if (entry.isFile()) {
      yield fullPath;
    }
  }
}

function isAllowedSyntheticEmail(value) {
  const email = value.toLowerCase();

  return (
    email.endsWith("@example.com") ||
    email.endsWith("@jobs.example.com") ||
    email.endsWith("@exampleanalytics.com") ||
    email.endsWith("@users.noreply.github.com")
  );
}
