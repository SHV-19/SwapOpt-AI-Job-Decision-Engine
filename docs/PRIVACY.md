# Privacy & Public Repository Boundary

SwapOpt handles sensitive career and application information.

The public showcase repository must therefore be treated differently from the active development/runtime environment.

## Never Commit

- `.env` files
- API keys
- OAuth tokens
- personal profile files
- resumes containing private contact details
- application-answer profiles
- demographic / EEO answers
- application history
- recruiter/contact history containing private data
- interview notes containing private information
- private outcome data
- local databases
- browser export artifacts containing private data
- batch backups or recovery snapshots

## Public Showcase Purpose

The public repository should demonstrate product thinking, architecture, engineering design, selected implementation patterns, non-sensitive screenshots, public documentation, and test/CI discipline where the corresponding public code is included.

It should not attempt to mirror every file from the private runtime environment.

## User Control

SwapOpt is designed for explicit user control.

It must not be represented as a mass-application bot.

The product does not intentionally fabricate candidate information, bypass CAPTCHA or anti-bot controls, submit applications without explicit user action, or send automated outreach without explicit approval.

## Historical Git Data

Deleting a sensitive file from the current branch does not remove it from older Git history.

If sensitive information was previously committed, history must be reviewed and, when appropriate, rewritten using a controlled process before considering the repository fully purged.
