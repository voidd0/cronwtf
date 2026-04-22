// cronwtf — cron expression parser/explainer. free forever from vøiddo.
// https://voiddo.com/tools/cronwtf/

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MONTH_ALIASES = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};
const WEEKDAY_ALIASES = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

const ALIASES = {
  '@yearly':   '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly':  '0 0 1 * *',
  '@weekly':   '0 0 * * 0',
  '@daily':    '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly':   '0 * * * *',
};

const RANGES = [
  { name: 'minute',  min: 0, max: 59 },
  { name: 'hour',    min: 0, max: 23 },
  { name: 'day',     min: 1, max: 31 },
  { name: 'month',   min: 1, max: 12 },
  { name: 'weekday', min: 0, max: 7  },
];

const COMMON_PATTERNS = [
  { expr: '* * * * *',     meaning: 'Every minute' },
  { expr: '*/5 * * * *',   meaning: 'Every 5 minutes' },
  { expr: '*/15 * * * *',  meaning: 'Every 15 minutes' },
  { expr: '*/30 * * * *',  meaning: 'Every 30 minutes' },
  { expr: '0 * * * *',     meaning: 'Every hour on the hour' },
  { expr: '0 */2 * * *',   meaning: 'Every 2 hours' },
  { expr: '0 */6 * * *',   meaning: 'Every 6 hours' },
  { expr: '0 0 * * *',     meaning: 'Every day at midnight' },
  { expr: '0 12 * * *',    meaning: 'Every day at noon' },
  { expr: '0 9 * * 1-5',   meaning: 'Weekdays at 9 AM' },
  { expr: '0 17 * * 1-5',  meaning: 'Weekdays at 5 PM (end of day)' },
  { expr: '0 0 * * 0',     meaning: 'Every Sunday at midnight' },
  { expr: '0 0 1 * *',     meaning: 'First of every month' },
  { expr: '0 0 1 1 *',     meaning: 'New Year' },
  { expr: '0 0 * * 1,3,5', meaning: 'Monday, Wednesday, Friday at midnight' },
];

function normalizeAliases(expr) {
  const trimmed = expr.trim().toLowerCase();
  return ALIASES[trimmed] || expr.trim();
}

function substituteNames(field, aliases) {
  const upper = field.toUpperCase();
  let out = upper;
  for (const [name, num] of Object.entries(aliases)) {
    out = out.split(name).join(String(num));
  }
  return out;
}

function splitFields(raw) {
  const expr = normalizeAliases(raw);
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  parts[3] = substituteNames(parts[3], MONTH_ALIASES);
  parts[4] = substituteNames(parts[4], WEEKDAY_ALIASES);
  return parts;
}

function isValidCron(expr) {
  const parts = splitFields(expr);
  if (!parts) return false;
  for (let i = 0; i < 5; i++) {
    if (!isValidField(parts[i], RANGES[i].min, RANGES[i].max)) return false;
  }
  return true;
}

function isValidField(field, min, max) {
  if (field === '*') return true;
  const listParts = field.split(',');
  for (const part of listParts) {
    if (!isValidPart(part, min, max)) return false;
  }
  return true;
}

function isValidPart(part, min, max) {
  if (part.includes('/')) {
    const [range, step] = part.split('/');
    if (isNaN(parseInt(step, 10)) || parseInt(step, 10) <= 0) return false;
    if (range === '*') return true;
    return isValidPart(range, min, max);
  }
  if (part.includes('-')) {
    const [start, end] = part.split('-').map(Number);
    return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end;
  }
  const num = parseInt(part, 10);
  return !isNaN(num) && num >= min && num <= max;
}

function parseCron(expr) {
  const parts = splitFields(expr);
  if (!parts) return 'Invalid cron expression';
  const [minute, hour, day, month, weekday] = parts;
  const segments = [];

  const timeStr = parseTime(minute, hour);
  if (timeStr) segments.push(timeStr);

  const dayStr = parseDayOfMonth(day);
  if (dayStr) segments.push(dayStr);

  const monthStr = parseMonth(month);
  if (monthStr) segments.push(monthStr);

  const weekdayStr = parseWeekday(weekday);
  if (weekdayStr) segments.push(weekdayStr);

  if (segments.length === 0) return 'Every minute';
  return capitalizeFirst(segments.join(', '));
}

function parseTime(minute, hour) {
  if (minute === '*' && hour === '*') return 'every minute';

  if (!minute.includes('*') && !minute.includes('/') && !minute.includes('-') && !minute.includes(',') &&
      !hour.includes('*') && !hour.includes('/') && !hour.includes('-') && !hour.includes(',')) {
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    return `at ${h12}:${String(m).padStart(2, '0')} ${period}`;
  }

  if (minute.startsWith('*/') && hour === '*') {
    const interval = minute.split('/')[1];
    return `every ${interval} minutes`;
  }

  if (!minute.includes('*') && !minute.includes('/') && !minute.includes('-') && !minute.includes(',') && hour === '*') {
    const m = parseInt(minute, 10);
    if (m === 0) return 'every hour';
    return `every hour at minute ${m}`;
  }

  if (hour.startsWith('*/')) {
    const interval = hour.split('/')[1];
    const m = minute === '0' ? '' : ` at minute ${minute}`;
    return `every ${interval} hours${m}`;
  }

  if (minute === '*' && !hour.includes('*')) {
    return `every minute during hour ${hour}`;
  }

  if (minute.includes(',') && !hour.includes('*')) {
    return `at minutes ${minute} past hour ${hour}`;
  }

  if (!minute.includes('*') && hour.includes(',')) {
    const m = parseInt(minute, 10);
    return `at minute ${m} of hours ${hour}`;
  }

  if (minute.includes('-')) {
    return `at minutes ${minute} past hour ${hour}`;
  }

  return `at minute ${minute} of hour ${hour}`;
}

function parseDayOfMonth(day) {
  if (day === '*') return null;
  if (day.startsWith('*/')) {
    const interval = day.split('/')[1];
    return `every ${interval} days`;
  }
  if (day.includes('-')) {
    const [start, end] = day.split('-');
    return `on days ${start} through ${end}`;
  }
  if (day.includes(',')) {
    return `on days ${day}`;
  }
  const d = parseInt(day, 10);
  return `on the ${d}${getOrdinalSuffix(d)}`;
}

function parseMonth(month) {
  if (month === '*') return null;
  if (month.startsWith('*/')) {
    return `every ${month.split('/')[1]} months`;
  }
  if (month.includes('-')) {
    const [start, end] = month.split('-').map(Number);
    return `from ${MONTHS[start - 1]} to ${MONTHS[end - 1]}`;
  }
  if (month.includes(',')) {
    const months = month.split(',').map((m) => MONTHS[parseInt(m, 10) - 1]);
    return `in ${months.join(', ')}`;
  }
  return `in ${MONTHS[parseInt(month, 10) - 1]}`;
}

function parseWeekday(weekday) {
  if (weekday === '*') return null;
  if (weekday.startsWith('*/')) {
    return `every ${weekday.split('/')[1]} weekdays`;
  }
  if (weekday.includes('-')) {
    const [start, end] = weekday.split('-').map(Number);
    if (start === 1 && end === 5) return 'on weekdays';
    return `from ${DAYS[start % 7]} to ${DAYS[end % 7]}`;
  }
  if (weekday.includes(',')) {
    const days = weekday.split(',').map((d) => DAYS[parseInt(d, 10) % 7]);
    if (days.length === 2 && days.includes('Saturday') && days.includes('Sunday')) {
      return 'on weekends';
    }
    return `on ${days.join(', ')}`;
  }
  const d = parseInt(weekday, 10) % 7;
  return `on ${DAYS[d]}`;
}

function getOrdinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Warnings: catch common gotchas.
function analyzeWarnings(expr) {
  const warnings = [];
  const parts = splitFields(expr);
  if (!parts) return warnings;
  const [minute, hour, day, month, weekday] = parts;

  if (day !== '*' && weekday !== '*') {
    warnings.push({
      code: 'DOM_AND_DOW',
      level: 'warn',
      message: 'Day-of-month AND day-of-week are both set. Cron runs when EITHER matches (OR), not both (AND). This is almost always a mistake.',
    });
  }

  if (month !== '*' && !month.startsWith('*/') && !month.includes('-')) {
    const mNums = month.split(',').map((m) => parseInt(m, 10));
    const dNums = day !== '*' && !day.startsWith('*/') && !day.includes('-')
      ? day.split(',').map((d) => parseInt(d, 10))
      : [];
    const daysInMonth = { 2: 29, 4: 30, 6: 30, 9: 30, 11: 30 };
    for (const m of mNums) {
      const max = daysInMonth[m];
      if (max) {
        for (const d of dNums) {
          if (d > max) {
            warnings.push({
              code: 'IMPOSSIBLE_DATE',
              level: 'error',
              message: `Day ${d} does not exist in ${MONTHS[m - 1]}. This rule will never fire.`,
            });
          }
        }
      }
    }
  }

  if (minute === '*' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
    warnings.push({
      code: 'EVERY_MINUTE',
      level: 'info',
      message: 'Fires every minute. Usually you want to scope this (e.g. */5 or 0 * * * *).',
    });
  }

  if (minute === '0' && hour === '0' && day === '29' && month === '2') {
    warnings.push({
      code: 'LEAP_ONLY',
      level: 'info',
      message: 'Feb 29 only exists in leap years. Expect ~4-year gaps between runs.',
    });
  }

  return warnings;
}

function getNextRuns(expr, count = 5, options = {}) {
  const parts = splitFields(expr);
  if (!parts) return [];
  const [minExpr, hourExpr, dayExpr, monthExpr, weekdayExpr] = parts;

  const runs = [];
  const from = options.from ? new Date(options.from) : new Date();
  let current = new Date(from);
  current.setSeconds(0);
  current.setMilliseconds(0);
  current.setMinutes(current.getMinutes() + 1);

  const maxIterations = 525600 * 4;
  let iterations = 0;

  const dowSet = weekdayExpr !== '*';
  const domSet = dayExpr !== '*';

  while (runs.length < count && iterations < maxIterations) {
    iterations++;
    const minute = current.getMinutes();
    const hour = current.getHours();
    const day = current.getDate();
    const month = current.getMonth() + 1;
    const weekday = current.getDay();

    const timeOk = matchesField(minute, minExpr) && matchesField(hour, hourExpr) && matchesField(month, monthExpr);

    let dateOk;
    if (dowSet && domSet) {
      dateOk = matchesField(day, dayExpr) || matchesField(weekday, weekdayExpr, true);
    } else if (dowSet) {
      dateOk = matchesField(weekday, weekdayExpr, true);
    } else {
      dateOk = matchesField(day, dayExpr);
    }

    if (timeOk && dateOk) runs.push(new Date(current));
    current.setMinutes(current.getMinutes() + 1);
  }
  return runs;
}

function matchesField(value, expr, isWeekday = false) {
  if (expr === '*') return true;
  if (expr.includes(',')) {
    return expr.split(',').some((part) => matchesField(value, part, isWeekday));
  }
  if (expr.includes('/')) {
    const [range, step] = expr.split('/');
    const stepNum = parseInt(step, 10);
    if (range === '*') return value % stepNum === 0;
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(Number);
      return value >= start && value <= end && (value - start) % stepNum === 0;
    }
    const base = parseInt(range, 10);
    return value >= base && (value - base) % stepNum === 0;
  }
  if (expr.includes('-')) {
    const [start, end] = expr.split('-').map(Number);
    return value >= start && value <= end;
  }
  let target = parseInt(expr, 10);
  if (isWeekday && target === 7) target = 0;
  return value === target;
}

function diffExpressions(a, b) {
  const aParts = splitFields(a);
  const bParts = splitFields(b);
  if (!aParts || !bParts) return null;
  const labels = ['minute', 'hour', 'day', 'month', 'weekday'];
  const diffs = [];
  for (let i = 0; i < 5; i++) {
    if (aParts[i] !== bParts[i]) {
      diffs.push({ field: labels[i], a: aParts[i], b: bParts[i] });
    }
  }
  return diffs;
}

function describeFrequency(expr, windowDays = 30) {
  const now = new Date();
  const end = new Date(now.getTime() + windowDays * 86400000);
  const runs = getNextRuns(expr, 100000, { from: now });
  const inWindow = runs.filter((r) => r <= end).length;
  const perDay = inWindow / windowDays;
  return {
    runsInWindow: inWindow,
    windowDays,
    runsPerDay: Math.round(perDay * 100) / 100,
    runsPerWeek: Math.round(perDay * 7 * 100) / 100,
    runsPerMonth: Math.round(perDay * 30 * 100) / 100,
  };
}

module.exports = {
  parseCron,
  getNextRuns,
  isValidCron,
  analyzeWarnings,
  diffExpressions,
  describeFrequency,
  normalizeAliases,
  splitFields,
  COMMON_PATTERNS,
  ALIASES,
};
