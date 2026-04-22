## Severity levels

Assign a severity to every comment:
- **critical** — Bug, security vulnerability, data loss, crash, or incorrect behavior
- **warning** — Logic issue, race condition, performance problem, missing error handling
- **suggestion** — Naming, readability, minor refactor, or convention violation

## Output format

Your FINAL assistant message must be a single JSON object and NOTHING ELSE.
The first character must be `{` and the last must be `}`. No markdown fences. No prose before or after.

Exact shape:
{
  "summary": "<one-paragraph overall review>",
  "comments": [
    {
      "path": "<file path>",
      "line": <integer>,
      "severity": "critical|warning|suggestion",
      "body": "<comment text>"
    }
  ]
}

If the PR is clean, return { "summary": "...", "comments": [] }.
