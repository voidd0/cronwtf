// cronwtf — tests. free forever from vøiddo. https://voiddo.com/tools/cronwtf/

const {
  parseCron, getNextRuns, isValidCron, analyzeWarnings, diffExpressions,
  describeFrequency, normalizeAliases, COMMON_PATTERNS, ALIASES,
} = require('./src/parser');

let passed = 0;
let failed = 0;

function test(name, condition, detail) {
  if (condition) {
    console.log(`\x1b[32m✓ ${name}\x1b[0m`);
    passed++;
  } else {
    console.log(`\x1b[31m✗ ${name}\x1b[0m`);
    if (detail !== undefined) console.log(`  got: ${JSON.stringify(detail)}`);
    failed++;
  }
}

// Validation
test('validates correct expression', isValidCron('0 9 * * 1-5'));
test('validates every minute', isValidCron('* * * * *'));
test('validates with steps', isValidCron('*/15 * * * *'));
test('rejects invalid expression', !isValidCron('invalid'));
test('rejects too few fields', !isValidCron('* * *'));
test('rejects out of range minute', !isValidCron('60 * * * *'));
test('rejects out of range hour', !isValidCron('* 25 * * *'));
test('rejects zero step', !isValidCron('*/0 * * * *'));

// Aliases
test('@daily → 0 0 * * *', normalizeAliases('@daily') === '0 0 * * *');
test('@hourly → 0 * * * *', normalizeAliases('@hourly') === '0 * * * *');
test('@yearly → 0 0 1 1 *', normalizeAliases('@yearly') === '0 0 1 1 *');
test('@daily validates', isValidCron('@daily'));
test('@weekly validates', isValidCron('@weekly'));
test('@midnight validates', isValidCron('@midnight'));

// Named month / weekday aliases
test('MON-FRI resolves', isValidCron('0 9 * * MON-FRI'));
test('JAN,JUL validates', isValidCron('0 0 1 JAN,JUL *'));
test('weekday MON parses to Monday',
  parseCron('0 9 * * MON').toLowerCase().includes('monday'),
  parseCron('0 9 * * MON'));

// Parsing
test('parses every minute', parseCron('* * * * *').toLowerCase().includes('every minute'));
test('parses specific time', parseCron('0 9 * * *').toLowerCase().includes('9'));
test('parses weekdays',
  parseCron('0 9 * * 1-5').toLowerCase().includes('weekday'),
  parseCron('0 9 * * 1-5'));
test('parses monthly', parseCron('0 0 1 * *').toLowerCase().includes('1'));
test('parses weekends',
  parseCron('0 10 * * 0,6').toLowerCase().includes('weekend'),
  parseCron('0 10 * * 0,6'));
test('parses every-N-hours',
  parseCron('0 */2 * * *').toLowerCase().includes('every 2 hours'),
  parseCron('0 */2 * * *'));
test('parses ranges in day-of-month',
  parseCron('0 0 1-15 * *').toLowerCase().includes('1 through 15'),
  parseCron('0 0 1-15 * *'));

// Next runs
const nextRuns = getNextRuns('* * * * *', 3);
test('returns correct number of runs', nextRuns.length === 3);
test('returns Date objects', nextRuns[0] instanceof Date);
test('runs are in future', nextRuns[0] > new Date());
test('runs are sequential', nextRuns[1] > nextRuns[0]);

// Next runs for alias
const hourly = getNextRuns('@hourly', 2);
test('@hourly has 2 future runs', hourly.length === 2 && hourly[1] > hourly[0]);

// Next runs for specific time find valid
const weekday9am = getNextRuns('0 9 * * 1-5', 3);
test('weekday 9am runs land on Mon-Fri',
  weekday9am.every((d) => d.getDay() >= 1 && d.getDay() <= 5),
  weekday9am.map((d) => d.toString()));
test('weekday 9am runs all at 9:00',
  weekday9am.every((d) => d.getHours() === 9 && d.getMinutes() === 0));

// Warnings
const w1 = analyzeWarnings('0 0 15 * 1');
test('detects DOM + DOW both set',
  w1.some((w) => w.code === 'DOM_AND_DOW'),
  w1);
const w2 = analyzeWarnings('0 0 31 2 *');
test('detects impossible date (Feb 31)',
  w2.some((w) => w.code === 'IMPOSSIBLE_DATE'),
  w2);
const w3 = analyzeWarnings('* * * * *');
test('flags every-minute as info',
  w3.some((w) => w.code === 'EVERY_MINUTE'));
const w4 = analyzeWarnings('0 9 * * 1-5');
test('clean expression has no warnings', w4.length === 0, w4);

// Diff
const d = diffExpressions('0 9 * * *', '0 10 * * *');
test('diff finds hour difference', d.length === 1 && d[0].field === 'hour', d);
const dsame = diffExpressions('@daily', '0 0 * * *');
test('diff of alias vs equivalent literal is empty', dsame.length === 0, dsame);

// Frequency
const f = describeFrequency('@hourly', 30);
test('@hourly fires ~720 times in 30 days',
  f.runsInWindow >= 715 && f.runsInWindow <= 725,
  f);
const f2 = describeFrequency('0 9 * * 1-5', 30);
test('weekday 9am fires ~21-22 times in 30 days',
  f2.runsInWindow >= 20 && f2.runsInWindow <= 24,
  f2);

// COMMON_PATTERNS export
test('COMMON_PATTERNS has 15 entries', COMMON_PATTERNS.length === 15);
test('ALIASES has @daily', ALIASES['@daily'] !== undefined);

console.log(`\n${passed}/${passed + failed} tests passed\n`);
if (failed > 0) process.exit(1);
