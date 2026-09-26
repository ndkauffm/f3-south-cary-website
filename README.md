# F3 South Cary website

Static site for [F3 South Cary](https://f3southcary.com), hosted on GitHub Pages. Plain HTML, CSS, and JS: no build step, no dependencies.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Home: what F3 is, core principles, first-workout steps, next workouts |
| `new.html` | New guy guide: what to bring, how a workout runs, lingo, FAQ |
| `workouts.html` | Filterable schedule (day / type / by location), F3 Nation map, optional live feed |
| `about.html` | Mission, the three Fs, core principles, PAX resources |
| `contact.html` | Email and common reasons to reach out |

The header and footer are repeated in each page. Edit all five when you change them.

## Workout schedule

`data/workouts.json` comes from F3 Nation, the same data behind [map.f3nation.com](https://map.f3nation.com). **Don't hand-edit it.** Change workouts in F3 Nation instead.

- `scripts/refresh_workouts.py` pulls the schedule from the public region page at [regions.f3nation.com/south-cary](https://regions.f3nation.com/south-cary). No token needed.
- `.github/workflows/refresh-workouts.yml` runs it every Monday and commits any changes, which redeploys the site. To run it on demand, go to **Actions → Refresh workouts → Run workflow**.
- `data/places.json` maps addresses to friendly place names ("Ritter Park"). Edit it freely.

### Optional: live schedule with Qs and closures

With a token, `workouts.html` also shows the next 7 days from the F3 Nation API, including who is Q'ing and which AOs are closed. It uses the same approach as [F3-Nation/Website-Widgets](https://github.com/F3-Nation/Website-Widgets).

1. In [map.f3nation.com/admin](https://map.f3nation.com/admin), go to **Settings → API** and copy the region token (it starts with `f3_`).
2. Paste the token into `f3ApiToken` in `assets/js/config.js`.

The token is visible in the page source. F3 Nation documents it as read-only.

## Hosting

1. Go to **Settings → Pages → Build and deployment** and set it to *Deploy from a branch*, `main`, `/ (root)`.
2. When you're ready to move the domain, add a `CNAME` file containing `f3southcary.com`. Then point DNS at GitHub Pages: `A` records to 185.199.108–111.153, or `CNAME www` to `<owner>.github.io`.

## Local preview

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Caching

GitHub Pages lets browsers cache files for 10 minutes. When you change `site.css`, `site.js`, or `config.js`, bump the `?v=` number on their links in all six HTML files. Otherwise visitors may keep seeing the old version for a while.
