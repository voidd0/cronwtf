#!/usr/bin/env node
// cronwtf — explain cron. free forever from vøiddo. https://voiddo.com/tools/cronwtf/

const {
  parseCron, getNextRuns, isValidCron, analyzeWarnings, diffExpressions,
  describeFrequency, normalizeAliases, COMMON_PATTERNS,
} = require('../src/parser');

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';

const args = process.argv.slice(2);

function printHelp() {
  console.log(`
  ${BOLD}cronwtf${RESET} — explain cron expressions, preview next runs, catch gotchas.
  ${DIM}free forever from vøiddo.${RESET}

  ${BOLD}Usage${RESET}
    cronwtf <expression>           explain + next 5 runs
    cronwtf <expression> -n 10     next N runs
    cronwtf <expression> --json    machine-readable output
    cronwtf <expression> --freq    frequency estimate (per day/week/month)
    cronwtf <expression> --validate    exit 0/1/2 (CI gate)
    cronwtf diff <a> <b>           show field differences
    cronwtf patterns               print 15 common cron recipes

  ${BOLD}Options${RESET}
    -n, --next <num>        Next N run times (default: 5)
    -j, --json              JSON output
    -v, --validate          Validate and exit
        --freq              Runs/day, /week, /month over next 30 days
        --no-warnings       Skip gotcha detection
        --utc               Show times in UTC instead of local
    -h, --help              This help
        --version           Print version

  ${BOLD}Aliases${RESET} (recognized)
    @yearly  @annually  @monthly  @weekly  @daily  @midnight  @hourly
    MON-FRI, JAN,JUL, etc. — named weekdays + months work too.

  ${BOLD}Examples${RESET}
    cronwtf "0 9 * * 1-5"
    cronwtf @daily -n 3
    cronwtf "0 0 31 2 *" --json      ${DIM}# catches "Feb 31 never fires"${RESET}
    cronwtf diff "0 9 * * *" "0 10 * * *"
    cronwtf patterns

  ${BOLD}Links${RESET}
    Docs:    https://voiddo.com/tools/cronwtf/
    Source:  https://github.com/voidd0/cronwtf
    Studio:  https://voiddo.com
    Catalog: https://voiddo.com/tools/
`);
}

function readPkgVersion() {
  try {
    const pkg = require('../package.json');
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

const flags = { next: 5, json: false, validate: false, freq: false, warnings: true, utc: false };
let expression = null;
let subcommand = null;
const positional = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '-h' || arg === '--help') { printHelp(); process.exit(0); }
  if (arg === '--version') { console.log(readPkgVersion()); process.exit(0); }
  if (arg === '-n' || arg === '--next') { flags.next = parseInt(args[++i], 10) || 5; continue; }
  if (arg === '-j' || arg === '--json') { flags.json = true; continue; }
  if (arg === '-v' || arg === '--validate') { flags.validate = true; continue; }
  if (arg === '--freq') { flags.freq = true; continue; }
  if (arg === '--no-warnings') { flags.warnings = false; continue; }
  if (arg === '--utc') { flags.utc = true; continue; }
  if (arg === 'patterns' || arg === 'diff') { subcommand = arg; continue; }
  if (!arg.startsWith('-')) positional.push(arg);
}

if (args.length === 0) { printHelp(); process.exit(0); }
if (!subcommand) expression = positional[0];

function formatDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  if (flags.utc) {
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function relativeTime(date) {
  const diffMs = date.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return `in ${diffSec}s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `in ${diffMin}m`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `in ${diffHr}h`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `in ${diffDay}d`;
  return `in ${Math.round(diffDay / 30)}mo`;
}

function printPatterns() {
  if (flags.json) {
    console.log(JSON.stringify(COMMON_PATTERNS, null, 2));
    return;
  }
  console.log(`\n  ${BOLD}${CYAN}COMMON CRON PATTERNS${RESET}`);
  console.log(`  ${DIM}────────────────────${RESET}\n`);
  for (const p of COMMON_PATTERNS) {
    console.log(`    ${GREEN}${p.expr.padEnd(16)}${RESET}  ${p.meaning}`);
  }
  console.log('');
}

function runDiff() {
  const [a, b] = positional;
  if (!a || !b) {
    console.error('Usage: cronwtf diff "<expr A>" "<expr B>"');
    process.exit(1);
  }
  if (!isValidCron(a) || !isValidCron(b)) {
    console.error('One or both expressions are invalid.');
    process.exit(1);
  }
  const diffs = diffExpressions(a, b);
  if (flags.json) {
    console.log(JSON.stringify({ a, b, diffs, aMeans: parseCron(a), bMeans: parseCron(b) }, null, 2));
    return;
  }
  console.log(`\n  ${BOLD}A${RESET}  ${a}`);
  console.log(`     ${DIM}→ ${parseCron(a)}${RESET}`);
  console.log(`  ${BOLD}B${RESET}  ${b}`);
  console.log(`     ${DIM}→ ${parseCron(b)}${RESET}\n`);
  if (diffs.length === 0) {
    console.log(`  ${GREEN}Identical schedule.${RESET}\n`);
    return;
  }
  console.log(`  ${BOLD}Field differences:${RESET}`);
  for (const d of diffs) {
    console.log(`    ${CYAN}${d.field.padEnd(10)}${RESET}  A: ${YELLOW}${d.a}${RESET}  →  B: ${YELLOW}${d.b}${RESET}`);
  }
  console.log('');
}

function explain() {
  if (!expression) {
    console.error('Error: No cron expression provided.');
    console.error('Usage: cronwtf "0 9 * * 1-5"');
    console.error('Help:  cronwtf --help');
    process.exit(1);
  }

  if (!isValidCron(expression)) {
    if (flags.json) {
      console.log(JSON.stringify({ valid: false, expression, error: 'Invalid cron expression' }));
    } else {
      console.error(`Error: Invalid cron expression: "${expression}"`);
      console.error('Expected format: "minute hour day month weekday" or an @alias.');
      console.error('Aliases: @yearly @monthly @weekly @daily @hourly');
      console.error('Docs:    https://voiddo.com/tools/cronwtf/');
    }
    process.exit(flags.validate ? 1 : 1);
  }

  if (flags.validate && !flags.freq) {
    if (flags.json) {
      console.log(JSON.stringify({ valid: true, expression, normalized: normalizeAliases(expression) }));
    } else {
      console.log(`${GREEN}✓ Valid cron expression${RESET}`);
    }
    const warnings = flags.warnings ? analyzeWarnings(expression) : [];
    if (warnings.some((w) => w.level === 'error')) process.exit(2);
    process.exit(0);
  }

  const normalized = normalizeAliases(expression);
  const explanation = parseCron(expression);
  const nextRuns = getNextRuns(expression, flags.next);
  const warnings = flags.warnings ? analyzeWarnings(expression) : [];
  const freq = flags.freq ? describeFrequency(expression) : null;

  if (flags.json) {
    console.log(JSON.stringify({
      expression,
      normalized,
      explanation,
      nextRuns: nextRuns.map((d) => d.toISOString()),
      warnings,
      frequency: freq,
    }, null, 2));
    if (warnings.some((w) => w.level === 'error')) process.exit(2);
    return;
  }

  console.log(`\n  ${BOLD}${expression}${RESET}`);
  if (normalized !== expression.trim()) {
    console.log(`  ${DIM}resolved: ${normalized}${RESET}`);
  }
  console.log(`\n  ${CYAN}→ ${explanation}${RESET}\n`);

  if (warnings.length > 0) {
    for (const w of warnings) {
      const color = w.level === 'error' ? RED : (w.level === 'warn' ? YELLOW : DIM);
      const label = w.level.toUpperCase().padEnd(5);
      console.log(`  ${color}${label}${RESET}  ${w.message}`);
    }
    console.log('');
  }

  if (flags.next > 0 && nextRuns.length > 0) {
    console.log(`  ${BOLD}Next ${flags.next} runs:${RESET}`);
    for (const date of nextRuns) {
      console.log(`    ${GREEN}${formatDate(date)}${RESET}  ${DIM}${relativeTime(date)}${RESET}`);
    }
    console.log('');
  } else if (flags.next > 0) {
    console.log(`  ${YELLOW}No runs found in the next 4 years.${RESET}\n`);
  }

  if (freq) {
    console.log(`  ${BOLD}Frequency${RESET} ${DIM}(next 30 days)${RESET}`);
    console.log(`    ${freq.runsInWindow} runs total`);
    console.log(`    ~${freq.runsPerDay} per day, ~${freq.runsPerWeek} per week, ~${freq.runsPerMonth} per month\n`);
  }

  if (warnings.some((w) => w.level === 'error')) process.exit(2);
}

if (subcommand === 'patterns') {
  printPatterns();
  process.exit(0);
}

if (subcommand === 'diff') {
  runDiff();
  process.exit(0);
}

explain();
