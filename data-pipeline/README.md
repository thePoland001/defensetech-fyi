# Market data pipeline

Real, public pay data for Huntsville defense employers, compiled into one database.

```bash
node data-pipeline/fetch_bls.mjs   # refresh BLS benchmarks (BLS v1 API, no key, 25 requests/day)
node data-pipeline/build.mjs       # rebuild out/ and server/data/market.json from raw/
```

## Sources (`raw/`)

| File | What it is |
| --- | --- |
| `indeed_postings.tsv` | Huntsville job postings and their pay, pulled through the Indeed connector. Ranges with cents are Indeed's own fill-in estimates, not employer-posted, and are flagged `pay_is_indeed_estimate`. |
| `careers_*.tsv` | Employer-posted pay ranges read from company career sites (Workday, Greenhouse, eightfold, iCIMS…) or from boards that copy the employer's range (ClearanceJobs, Dice, WayUp). Every row has a `source_url`. |
| `bls_oews_huntsville.json` | BLS OEWS May 2025 wage percentiles (p10–p90) for 34 occupations in the Huntsville MSA. |

Glassdoor, Salary.com and levels.fyi are not used: they block automated access and their terms prohibit scraping.

## Outputs (`out/`)

- `market.db`: SQLite database with these tables and views:
  - Tables: `postings`, `bls_oews_huntsville`.
  - Views: `company_summary`, `family_level_summary`, `intern_summary`.
- `postings.csv`, `bls_oews_huntsville.csv`: the same tables as CSV.
- `unmatched.csv`: postings from employers that aren't in the company directory. Add an alias in `build.mjs`, or add the company to `server/data/companies.js`.

`build.mjs` also does the following:

- Maps each title to the site's job families and L1–L6 levels.
- Picks up clearance levels named in titles.
- Drops non-Huntsville locations, recruiters, part-time "AI trainer" gigs and implausible values.
- De-duplicates postings found by more than one source.

## Caveats

- Postings are **ranges**, not individual salaries. Big-company bands are wide because one band covers several years of experience.
- Alabama has no pay-transparency law, so many Huntsville-only postings omit pay. Coverage leans toward companies that publish one national range: Northrop, Lockheed, BAE, SAIC, Booz Allen, Leidos, MITRE and Anduril.
- Levels are inferred from titles and company ladder names. Treat them as approximate.
- Some multi-site postings (Lockheed, Blue Origin interns, i3, Parry Labs) list Huntsville among several locations, with one shared range.
- Booz Allen's "University" intern postings show the full entry-level salary band rather than an intern rate.
