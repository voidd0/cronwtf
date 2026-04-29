# cronwtf

**Explain cron expressions in plain English.** Preview next run times. Catch common gotchas (Feb 31, DOM+DOW overlap, accidental every-minute runs) before they fire. Handles `@daily`/`@hourly`/`@yearly` aliases and named weekdays/months (`MON-FRI`, `JAN,JUL`).

Free forever gift from [vøiddo](https://voiddo.com).

```
$ cronwtf "0 9 * * 1-5"

  0 9 * * 1-5

  → At 9:00 AM, on weekdays

  Next 5 runs:
    2026-04-23 09:00:00  in 10h
    2026-04-24 09:00:00  in 1d
    2026-04-27 09:00:00  in 4d
    2026-04-28 09:00:00  in 5d
    2026-04-29 09:00:00  in 6d
```

## Why cronwtf

Nobody remembers cron syntax. `0 */2 * * *` — is that every 2 hours or every 2 minutes? Does `0 0 15 * 1` run on the 15th OR on Mondays? (Answer: both — cron uses OR for DOM+DOW, and that's caused outages.) Does `0 0 31 2 *` ever run? (Answer: never — Feb doesn't have a 31st.)

`cronwtf` is the quick sanity check you run before pasting into your crontab:
- **explains** the expression in one readable sentence,
- **previews** the next N runs in your local timezone,
- **warns** about the 4 most common foot-guns: impossible dates, DOM+DOW overlap, every-minute runs, leap-year-only rules,
- **diffs** two expressions field-by-field so you can see what changed in a PR,
- **lists** 15 common patterns if you just want the recipe,
- **estimates frequency** over 30 days (runs/day, runs/week, runs/month).

## Install

```bash
npm install -g @v0idd0/cronwtf
```

Or one-shot with `npx`:

```bash
npx -y @v0idd0/cronwtf "@hourly"
```

## Quickstart

```bash
# Plain explain + next 5 runs
cronwtf "0 9 * * 1-5"

# Aliases work
cronwtf @daily
cronwtf @hourly -n 3

# Named months/weekdays
cronwtf "0 9 * * MON-FRI"
cronwtf "0 0 1 JAN,JUL *"

# Catch gotchas (exit code 2 on impossible dates)
cronwtf "0 0 31 2 *"

# Machine-readable output
cronwtf "*/15 * * * *" --json

# Frequency estimate
cronwtf "0 9 * * 1-5" --freq

# Field-level diff between two expressions
cronwtf diff "0 9 * * *" "0 10 * * 1-5"

# 15 common patterns with their English meanings
cronwtf patterns

# CI validator: exit 0 (valid) / 1 (invalid) / 2 (valid but will-never-fire)
cronwtf "$CRON_EXPR" --validate && echo OK

# Times in UTC instead of local
cronwtf @daily --utc
```

## Gotchas cronwtf catches

| Pattern | Warning |
|---------|---------|
| `0 0 31 2 *` | `ERROR` — Day 31 does not exist in February. Never fires. |
| `0 0 15 * 1` | `WARN` — DOM **and** DOW set. Cron runs when **either** matches (OR, not AND). |
| `* * * * *` | `INFO` — Fires every minute. Usually you want `*/5` or `0 * * * *`. |
| `0 0 29 2 *` | `INFO` — Feb 29 only exists in leap years. ~4-year gaps. |

These are the top crash causes in real cron outages. Catching them at paste-time is cheaper than at 3 AM.

## Options

### Core
| Flag | Description |
|------|-------------|
| `-n, --next <N>` | Next N run times (default 5) |
| `-j, --json` | Machine-readable output |
| `-v, --validate` | Exit only; code 0=valid, 1=invalid, 2=never-fires |
| `--freq` | Runs/day, /week, /month over next 30 days |
| `--no-warnings` | Skip gotcha detection |
| `--utc` | Print times in UTC instead of local |
| `-h, --help` | Show help |
| `--version` | Print version |

### Subcommands
| Command | Description |
|---------|-------------|
| `cronwtf diff <a> <b>` | Show field-level differences between two expressions |
| `cronwtf patterns` | List 15 common cron recipes with English meanings |

## Supported syntax

| Syntax | Example | Meaning |
|--------|---------|---------|
| `*` | `* * * * *` | Any value |
| `*/N` | `*/15 * * * *` | Every N units |
| `A-B` | `0 9 * * 1-5` | Range |
| `A,B,C` | `0 12 * * 1,3,5` | List |
| `A-B/N` | `0 9-17/2 * * 1-5` | Range with step |
| `@yearly` | — | `0 0 1 1 *` |
| `@annually` | — | `0 0 1 1 *` |
| `@monthly` | — | `0 0 1 * *` |
| `@weekly` | — | `0 0 * * 0` |
| `@daily` / `@midnight` | — | `0 0 * * *` |
| `@hourly` | — | `0 * * * *` |
| Named months | `JAN`, `FEB`, ..., `DEC` | 1–12 |
| Named weekdays | `SUN`, `MON`, ..., `SAT` | 0–6 |

## Programmatic use

```js
const {
  parseCron,        // "0 9 * * 1-5" → "At 9:00 AM, on weekdays"
  getNextRuns,      // (expr, count) → Date[]
  isValidCron,      // (expr) → boolean
  analyzeWarnings,  // (expr) → Warning[]  (DOM_AND_DOW, IMPOSSIBLE_DATE, etc.)
  diffExpressions,  // (a, b) → [{field, a, b}, ...]
  describeFrequency,// (expr, windowDays) → {runsInWindow, runsPerDay, ...}
  normalizeAliases, // "@daily" → "0 0 * * *"
  COMMON_PATTERNS,  // Array of {expr, meaning}
} = require('@v0idd0/cronwtf/src/parser');

// In a PR-bot:
for (const expr of pullRequest.changedCronExpressions) {
  const warnings = analyzeWarnings(expr);
  if (warnings.some(w => w.level === 'error')) {
    github.comment(`⚠ ${expr} — ${warnings[0].message}`);
  }
}
```

## Exit codes

| Code | Meaning |
|------|---------|
| `0`  | Valid, no errors |
| `1`  | Invalid syntax |
| `2`  | Syntactically valid but will never fire (impossible-date warning) |

Useful in CI:

```yaml
- run: cronwtf "$CRON_EXPR" --validate
```

## From the same studio

vøiddo builds sharp, free-forever CLIs for devs who are tired of paywalls:

- [`@v0idd0/jsonyo`](https://voiddo.com/tools/jsonyo/) — JSON that yells at you
- [`@v0idd0/tokcount`](https://voiddo.com/tools/tokcount/) — token counter for 60+ LLMs
- [`@v0idd0/ctxstuff`](https://voiddo.com/tools/ctxstuff/) — stuff a repo into an LLM context
- [`@v0idd0/promptdiff`](https://voiddo.com/tools/promptdiff/) — diff two prompts
- [`@v0idd0/httpwut`](https://voiddo.com/tools/httpwut/) — HTTP debugger
- [`@v0idd0/gitstats`](https://voiddo.com/tools/gitstats/) — local git analytics
- [`@v0idd0/licenseme`](https://voiddo.com/tools/licenseme/) — LICENSE generator + detector
- [`@v0idd0/envguard`](https://voiddo.com/tools/envguard/) — .env validator + secret scanner
- [`@v0idd0/depcheck`](https://voiddo.com/tools/depcheck/) — offline CVE scanner + unused-deps
- [`@v0idd0/logparse`](https://voiddo.com/tools/logparse/) — structured log parser + aggregator

Full catalog: [voiddo.com/tools](https://voiddo.com/tools/).

## License

MIT © [vøiddo](https://voiddo.com) — free forever, no asterisks.

## Links

- Docs: https://voiddo.com/tools/cronwtf/
- Source: https://github.com/voidd0/cronwtf
- npm: https://npmjs.com/package/@v0idd0/cronwtf
- Studio: https://voiddo.com
- Issues: https://github.com/voidd0/cronwtf/issues
- Support: support@voiddo.com

---

Built by [vøiddo](https://voiddo.com/) — a small studio shipping AI-flavoured products, free dev tools, Chrome extensions and weird browser games.
