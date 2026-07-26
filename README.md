# Vũ Đức Thuận · Portfolio

A static, data-driven portfolio for Embedded Systems, IoT, Edge AI, and open-source work.

## How the repository automation works

1. `scripts/sync-github.mjs` reads the public GitHub profile, repositories, language data, and preferred README files.
2. The generated snapshot is stored in `data/github.json`; raw README files are stored in `data/readmes/`.
3. GitHub Actions refreshes that data on deployment and every six hours, persisting only meaningful repository or README changes.
   Failed or partial refreshes leave the last successful deployment untouched.
4. The browser renders the bundled snapshot immediately and only checks GitHub directly when that snapshot is stale or a newly linked repository is missing.
5. `project.html?repo=<name>` turns README structure into a project page through deterministic JavaScript rules—no AI API and no client-side token.

## Local preview

Serve the repository over HTTP so browser modules and JSON requests work:

```powershell
python -m http.server 4173
```

Then open `http://127.0.0.1:4173/`.

## Manual data refresh

```powershell
node scripts/sync-github.mjs
```

`GITHUB_TOKEN` is optional locally and supplied automatically by GitHub Actions.
