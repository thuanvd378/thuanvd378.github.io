<p align="center">
  <img src="docs/assets/ossmark-hero.png" alt="OSSMark hero banner for a local-first repository launch and agent-readiness audit tool." width="100%">
</p>

<p align="center">
  <strong>Launch-ready repos. Agent-ready workflows.</strong>
</p>

<p align="center">
  Audit README clarity, OSS hygiene, CI outputs, and coding-agent instructions before your repository goes public.
</p>

<p align="center">
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/python-3.10%2B-blue" alt="Python 3.10+"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License: MIT"></a>
  <a href=".github/workflows/ci.yml"><img src="https://img.shields.io/badge/ci-ready-informational" alt="CI ready"></a>
  <a href="https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html"><img src="https://img.shields.io/badge/SARIF-2.1.0-informational" alt="SARIF 2.1.0"></a>
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a>
  | <a href="#why-ossmark">Why OSSMark</a>
  | <a href="#common-workflows">Workflows</a>
  | <a href="#github-action">GitHub Action</a>
  | <a href="#resources">Docs</a>
</p>

<p align="center">
  <em>Will developers and coding agents understand, try, trust, and contribute to this repo?</em>
</p>

<p align="center">
  No LLM. No token. No network. No command execution from the repository being audited.
</p>

## Quickstart

> [!TIP]
> Run OSSMark before publishing a repo, opening it to contributors, or asking coding agents to work in it.

Clone and install:

```bash
git clone https://github.com/thuanvd378/ossmark.git
cd ossmark
python -m pip install -e .
ossmark audit .
```

> [!NOTE]
> OSSMark has no third-party runtime dependencies. There is no `requirements.txt` to install; `python -m pip install -e .` reads `pyproject.toml` and registers the `ossmark` command.

Run without installing:

```bash
PYTHONPATH=src python -m ossmark audit .
```

On Windows PowerShell:

```powershell
$env:PYTHONPATH = "src"
python -m ossmark audit .
```

Example output:

```text
OSSMark audit for /path/to/repo
Score: 88.0/100

Category scores:
  - README/SEO: 35.0/40.0
  - Launch hygiene: 33.0/35.0
  - Agent readiness: 20.0/25.0

Top action items:
  [WARN] agent.safety_boundaries: Agent docs do not clearly constrain risky actions.
    Fix: Tell agents how to handle secrets, network calls, destructive operations, and user approval.
```

## Why OSSMark

Most repository tools inspect code quality, security, dependencies, or published GitHub metadata. OSSMark focuses on the first 30 seconds of trust before a repo is public or popular:

| Question | OSSMark checks |
| --- | --- |
| Can a visitor understand the value quickly? | README positioning, quickstart, examples, demo proof, differentiation, discovery keywords |
| Can a maintainer launch with confidence? | License, contributing/security files, tests, CI, docs/examples, package metadata, changelog |
| Can coding agents work safely? | Agent instruction files, exact validation commands, project map, safety boundaries, risky/vague instructions |
| Can CI and GitHub understand the result? | JSON, Markdown, SARIF 2.1.0, GitHub Actions annotations, composite action wrapper |

## Common Workflows

| Goal | Command |
| --- | --- |
| Audit the current repo | `ossmark audit .` |
| Fail CI below a score | `ossmark audit . --fail-under 80` |
| Print JSON | `ossmark audit . --json` |
| Write Markdown | `ossmark audit . --markdown ossmark-report.md` |
| Write SARIF | `ossmark audit . --sarif ossmark.sarif` |
| Emit GitHub annotations | `ossmark audit . --github-annotations` |
| Use a policy profile | `ossmark audit . --profile cli` |
| Limit noisy action items | `ossmark audit . --max-action-items 5` |
| Scaffold config, AGENTS.md, and workflow | `ossmark init .` |
| Explain rules | `ossmark explain --markdown docs/rules.md` |

## GitHub Action

After the repository is published and tagged, use the composite action from another repository:

```yaml
- id: ossmark
  uses: thuanvd378/ossmark@v1
  with:
    fail-under: "80"
    sarif: ossmark.sarif
```

The action emits annotations, writes a job summary, and exposes outputs such as `steps.ossmark.outputs.score`.

For local smoke testing before a release tag exists:

```yaml
- id: ossmark
  uses: ./
  with:
    fail-under: "80"
```

## Configuration

OSSMark works without config. Add `.ossmark.json` when a repo needs local policy:

```json
{
  "profile": "agent-tool",
  "fail_under": 85,
  "max_action_items": 10,
  "ignore_checks": ["readme.demo"],
  "category_weights": {
    "README/SEO": 1.2,
    "Launch hygiene": 1.0,
    "Agent readiness": 1.4
  }
}
```

Built-in profiles: `default`, `library`, `cli`, `docs`, `app`, and `agent-tool`.

> [!NOTE]
> Profiles are presets, not hidden magic. Explicit config values override profile weights and ignored checks.

## Ecosystem Detection

OSSMark detects repository ecosystems to improve topic suggestions and `ossmark init` command hints:

> [!IMPORTANT]
> Detection is read-only. OSSMark suggests commands from manifests and scripts, but never runs project commands.

| Ecosystem | Signals |
| --- | --- |
| Python | `pyproject.toml`, `setup.py`, `requirements.txt`, `*.py` |
| Node.js | `package.json`, lockfiles, workspaces, Turborepo, Nx, Lerna, Rush |
| Rust, Go | `Cargo.toml`, `go.mod` |
| Swift, Zig, Elixir, Kotlin | SwiftPM, Zig build files, Mix, Kotlin Gradle |
| Java, Ruby, PHP, .NET | Maven/Gradle, Bundler/gemspec, Composer, `.csproj`/`.sln` |
| C/C++ | CMake, Meson, conservative Makefile detection |

## Examples

Fixture repos live in `examples/` so detector and scoring behavior stays reviewable:

```bash
ossmark audit examples/healthy-repo
ossmark audit examples/thin-repo
ossmark audit examples/node-workspace --json
ossmark audit examples/cmake-cpp --json
```

## How It Is Different

| Tool category | Usually focuses on | OSSMark focuses on |
| --- | --- | --- |
| Code linters | Formatting and language correctness | Repository launch surface and first-run trust |
| Security scorecards | Supply-chain and security posture | Pre-publish clarity, hygiene, and agent-readiness |
| README generators | Producing documentation text | Auditing whether docs communicate value and action |
| Agent instruction linters | Agent docs only | Agent docs plus README/SEO and OSS launch hygiene |
| Repo health dashboards | Published GitHub metadata | Local repos before they are public |

## Project Structure

```text
src/ossmark/       CLI, scoring, ecosystem detection, reports, init templates
tests/             Unit and fixture-backed coverage
examples/          Small repositories used by tests and docs
docs/              Rule catalog, configuration, ecosystem, action, and upload docs
.github/           CI, issue forms, Dependabot, release notes, PR template
action.yml         Composite GitHub Action wrapper
```

## Resources

| Read | Build |
| --- | --- |
| [Architecture](docs/architecture.md)<br>How the CLI, scoring model, rules, and renderers fit together. | [Rule catalog](docs/rules.md)<br>Every check, point value, example, recommendation, and false-positive note. |
| [Configuration](docs/configuration.md)<br>Profiles, thresholds, ignored checks, weights, and action-item limits. | [Ecosystem detection](docs/ecosystems.md)<br>Manifest signals and command hints for supported language families. |
| [GitHub Action](docs/github-action.md)<br>Composite action inputs, outputs, annotations, SARIF, and job summaries. | [Upload checklist](docs/upload-checklist.md)<br>Release, Marketplace, topics, CI, and public repo settings. |

## Roadmap

| Area | Next |
| --- | --- |
| Ecosystems | More framework detectors, workspace presets, and fixture-backed edge cases. |
| Reports | Example report gallery from real public repos and richer summaries. |
| Configuration | More presets and explain output for ignored checks. |
| Distribution | GitHub Marketplace polish and PyPI trusted publishing after the first release. |

## FAQ

| Question | Answer |
| --- | --- |
| Does OSSMark guarantee stars? | No. It improves clarity and trust signals; it does not promise popularity. |
| Does it execute README commands? | No. OSSMark only reads files and suggests commands. |
| Is this a security scanner? | No. It is not a replacement for OpenSSF Scorecard, dependency review, secret scanning, or code security tools. |
| Does it need the network? | No. The audit is local and works before a repository is published. |

## Project Info

|  |  |
| --- | --- |
| Topics | `cli` `python` `developer-tools` `open-source` `github-actions` `sarif` `readme` `repository-audit` `launch-readiness` `agent-readiness` `ai-agents` `maintainer-tools` `local-first` `ci` `oss` |
| Contributing | See [CONTRIBUTING.md](CONTRIBUTING.md). Good first contributions include ecosystem detectors, rule wording, and fixture repos. |
| Security | See [SECURITY.md](SECURITY.md) for private vulnerability reporting. |
| License | MIT. See [LICENSE](LICENSE). |
