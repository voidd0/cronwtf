# cronwtf

Explains cron expressions in plain English, lists the next run times and warns about common mistakes. Reach for it before you put a schedule into a crontab.

[![npm](https://img.shields.io/npm/v/@v0idd0/cronwtf?color=00f6d0&labelColor=050914)](https://www.npmjs.com/package/@v0idd0/cronwtf)
[![test](https://github.com/voidd0/cronwtf/actions/workflows/test.yml/badge.svg)](https://github.com/voidd0/cronwtf/actions/workflows/test.yml)
[![license](https://img.shields.io/badge/license-MIT-00f6d0?labelColor=050914)](LICENSE)

## Install

```bash
npm install -g @v0idd0/cronwtf
```

Or run it once without installing: `npx @v0idd0/cronwtf --help`. Needs Node.js 18 or newer. No dependencies.

## Example

Explain a weekday schedule and list its next runs. The next runs depend on the date and time zone of the machine, these were run on 2026-11-26:

```console
$ cronwtf '0 9 * * 1-5'
  0 9 * * 1-5

  → At 9:00 AM, on weekdays

  Next 5 runs:
    2026-11-27 09:00:00  in 19h
    2026-11-30 09:00:00  in 4d
    2026-12-01 09:00:00  in 5d
    2026-12-02 09:00:00  in 6d
    2026-12-03 09:00:00  in 7d
```

Catch a schedule that can never fire:

```console
$ cronwtf '0 0 31 2 *' -n 3
  0 0 31 2 *

  → At 12:00 AM, on the 31st, in February

  ERROR  Day 31 does not exist in February. This rule will never fire.

  No runs found in the next 4 years.
```


## Usage

```text
  cronwtf: explain cron expressions, preview next runs, catch gotchas.

  Usage
    cronwtf <expression>           explain + next 5 runs
    cronwtf <expression> -n 10     next N runs
    cronwtf <expression> --json    machine-readable output
    cronwtf <expression> --freq    frequency estimate (per day/week/month)
    cronwtf <expression> --validate    exit 0/1/2 (CI gate)
    cronwtf diff <a> <b>           show field differences
    cronwtf patterns               print 15 common cron recipes

  Options
    -n, --next <num>        Next N run times (default: 5)
    -j, --json              JSON output
    -v, --validate          Validate and exit
        --freq              Runs/day, /week, /month over next 30 days
        --no-warnings       Skip gotcha detection
        --utc               Show times in UTC instead of local
    -h, --help              This help
        --version           Print version

  Aliases (recognized)
    @yearly  @annually  @monthly  @weekly  @daily  @midnight  @hourly
    MON-FRI, JAN,JUL, etc.: named weekdays and months work too.

  Examples
    cronwtf "0 9 * * 1-5"
    cronwtf @daily -n 3
    cronwtf "0 0 31 2 *" --json      # catches "Feb 31 never fires"
    cronwtf diff "0 9 * * *" "0 10 * * *"
    cronwtf patterns

  Docs and issues: https://github.com/voidd0/cronwtf
```

## Gotchas it flags

It warns about dates that do not exist (Feb 31), schedules that set both day of month and day of week, and every minute schedules. Run times are shown in the local time zone of the machine, or in UTC with `--utc`.

## License

MIT, see [LICENSE](LICENSE).

---

Made by [vøiddo](https://voiddo.com/?src=gh). More command line tools: [voiddo.com/packages](https://voiddo.com/packages/?src=gh).
We also run data scrapers for job boards, shops and ad libraries: [voiddo.com/scrapers](https://voiddo.com/scrapers/?src=gh).
