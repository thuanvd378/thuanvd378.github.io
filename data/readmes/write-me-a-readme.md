<p align="center">
  <img src="assets/readme/banner.svg" alt="Write Me a README — an agent skill for evidence-based repository READMEs" width="100%">
</p>

<h1 align="center">Write Me a README</h1>

<p align="center">
  <strong>Your code already knows the story. Give it a README people actually want to try.</strong>
</p>

<p align="center">
  An open-source Agent Skill that inspects the project, finds the proof, chooses the voice,<br>
  writes the reader journey, designs editable visuals, and checks the result before handoff.
</p>

<p align="center">
  <a href="https://github.com/thuanvd378/write-me-a-readme/actions/workflows/test.yml"><img src="https://github.com/thuanvd378/write-me-a-readme/actions/workflows/test.yml/badge.svg" alt="Test workflow"></a>
  <a href="https://github.com/thuanvd378/write-me-a-readme/releases"><img src="https://img.shields.io/github/v/release/thuanvd378/write-me-a-readme?display_name=tag&sort=semver" alt="Latest release"></a>
  <a href="https://skills.sh/thuanvd378/write-me-a-readme"><img src="https://skills.sh/b/thuanvd378/write-me-a-readme" alt="skills.sh installs"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/thuanvd378/write-me-a-readme" alt="MIT license"></a>
</p>

<p align="center">
  <a href="#install-it-before-your-coffee-cools"><strong>Install</strong></a> ·
  <a href="#watch-the-reader-journey-appear"><strong>Watch the demo</strong></a> ·
  <a href="#give-it-a-vibe"><strong>Pick a voice</strong></a> ·
  <a href="#minimal-on-purpose-memorable-by-design"><strong>View banners</strong></a> ·
  <a href="docs/compatibility.md"><strong>Compatibility</strong></a>
</p>

> [!NOTE]
> **Early release, real workflow.** Write Me a README is pre-1.0. The workflow, renderer, installer, and validators are tested; the edges will keep getting smoother.

## Install it before your coffee cools

Install the portable `readme` skill globally, then choose the agent clients you use:

```bash
npx skills add thuanvd378/write-me-a-readme --skill readme -g
```

For a non-interactive Codex install:

```bash
npx skills add thuanvd378/write-me-a-readme --skill readme -g -a codex -y
```

Open any project and ask:

```text
$readme Make this README bold, useful, and impossible to confuse with a template.
Verify every command and create a minimalist editable banner.
```

Success looks pleasantly uneventful: the project-root `README.md` is created or refreshed, checks are reported, and a visual run can write `assets/readme/banner.svg`, `banner.png`, and `social-preview.png`.

> [!IMPORTANT]
> The one-command route uses the third-party [`skills` CLI](https://skills.sh/docs), which requires Node.js/npm and collects anonymous install telemetry by default. Text-only workflows need no Python package. PNG and social-preview rendering require Python 3.10+ and Pillow; the skill checks for it and asks before installing the bundled requirement.

## Watch the reader journey appear

<p align="center">
  <a href="assets/readme/demo-poster.png"><img src="assets/readme/demo.gif" alt="Animated walkthrough: install the readme skill, ask for a voice, inspect project evidence, create README assets, and validate the result" width="100%"></a>
</p>

<p align="center"><sub>Illustrated from the tested skill discovery, repository workflow, and generated outputs. <a href="assets/readme/demo-poster.png">Open the still version</a>.</sub></p>

Most repositories do not have a word-count problem. They have a translation problem: the code knows what the project does, but a first-time visitor does not.

Write Me a README closes that gap without inventing benchmarks, compatibility, popularity, or “viral” promises.

## One prompt. A complete README system.

The agent turns a normal-language request into a small style brief, then follows the evidence:

```text
$readme Refresh this for first-time CLI users.
Use a playful but restrained voice, show the fastest real win first,
create a cinematic dark banner, and keep setup instructions literal.
```

A typical create run can leave you with:

```text
README.md
assets/readme/banner.svg          # editable hero
assets/readme/banner.png          # 1600×640 fallback
assets/readme/social-preview.png  # 1280×640 link card
agent handoff message             # evidence, checks, assets, commands
```

No rigid questionnaire. No universal corporate voice. No adjectives wandering around without evidence.

## What the agent actually does

<p align="center">
  <img src="assets/readme/workflow.svg" alt="Five steps: inspect the repository, choose audience and voice, write the reader journey, design visuals, and validate the result" width="100%">
</p>

1. **Look before writing.** Inspect manifests, entry points, tests, CI, docs, examples, licenses, and the existing README without executing project code.
2. **Choose the reader and the vibe.** Lock the audience, language, depth, structure, and one deliberate voice.
3. **Write the path to first success.** Shape the positioning, Quickstart, examples, proof, limitations, and next step around the actual project type.
4. **Give the repo a face.** Crop and blur one meaningful visual, add the project name, and render self-contained SVG, PNG, and social-preview assets.
5. **Bring the red pen.** Check links, path casing, placeholders, risky commands, unsupported claims, accessibility, and active or remote SVG content.

The agent owns narrative judgment. Small deterministic tools handle the parts that should not depend on vibes.

## Give it a vibe

One README should feel like a launch; another should read like careful infrastructure docs. Voice is a first-class choice, not a coat of generic startup paint.

| Voice | Reader impression | Try saying… |
|---|---|---|
| **Confident-friendly** · default | Capable, human, easy to follow | `Write like a helpful maintainer. Keep it direct and welcoming.` |
| **Bold / launch** | Energetic, decisive, action-first | `Give the opening launch energy, then back it up with a real demo.` |
| **Playful / witty** | Memorable without becoming careless | `Use light developer humor in headings, never in commands or warnings.` |
| **Professional** | Polished, composed, dependable | `Write for a platform engineering team. Precise language, no emoji.` |
| **Technical / serious** | Rigorous, transparent, expert-friendly | `Lead with boundaries, inputs, outputs, compatibility, and limitations.` |
| **Minimal / premium** | Calm, intentional, low-noise | `Use fewer, stronger words and generous breathing room.` |
| **Custom brand voice** | Sounds like the project, not the generator | `Match docs/brand-voice.md and avoid its banned phrases.` |

Combine one profile with one modifier when useful: `professional + warm`, `playful + restrained`, `technical + accessible`, or `minimal + energetic`.

> [!IMPORTANT]
> **Voice changes the delivery, not the facts.** A playful README still gets literal install steps. A bold README still needs evidence. Security, limitations, warnings, and legal text stay unambiguous.

The full writing system lives in [voice-and-style.md](plugins/write-a-readme/skills/readme/references/voice-and-style.md).

## Before → after, minus the marketing fog

### Positioning that says something

```diff
- A powerful, easy-to-use solution that streamlines your workflow.
+ Inspect the project, write the shortest verified path to first success,
+ and catch broken local links before the README ships.
```

### Visuals a maintainer can reproduce

```diff
- Create beautiful banners in seconds.
+ Render an editable SVG, a 1600×640 PNG, and a 1280×640 social preview
+ from one local design spec.
```

### Discoverability without fortune-telling

```diff
- SEO-optimized to make your project go viral.
+ Clarify the category and audience, suggest focused GitHub topics,
+ and generate a social preview without promising rank, stars, or adoption.
```

Same facts. Better framing. Fewer empty adjectives.

## Minimal on purpose. Memorable by design.

The default banner recipe is almost suspiciously small:

```text
one strong image -> intentional crop -> soft blur -> readable scrim
                 -> project name -> optional eight-word tagline
```

No floating card. No filler grid. No invented logo. The background carries the mood while native SVG text keeps the title editable.

This README uses a visually reviewed [CC0 desk photograph](assets/readme/ATTRIBUTION.md), not an AI image. When no safe image belongs in the design, the renderer falls back to a quiet gradient:

<p align="center">
  <img src="assets/readme/examples/neon-muse.png" alt="Neon Muse fictional creative-tool banner in a violet and pink Candy theme" width="88%"><br>
  <strong>Gradient + tagline / Candy</strong> · <a href="assets/readme/examples/neon-muse.svg">Open SVG</a> · <a href="assets/readme/examples/neon-muse.spec.json">Remix the spec</a>
</p>

<p align="center">
  <img src="assets/readme/examples/campfire-club.png" alt="Campfire Club fictional community-app banner in a warm Ember theme" width="88%"><br>
  <strong>Warm minimal / Ember</strong> · <a href="assets/readme/examples/campfire-club.svg">Open SVG</a> · <a href="assets/readme/examples/campfire-club.spec.json">Remix the spec</a>
</p>

<p align="center">
  <img src="assets/readme/examples/plainspoken-docs.png" alt="Plainspoken Docs fictional wordmark-only banner in a restrained Paper theme" width="88%"><br>
  <strong>Wordmark only / Paper</strong> · <a href="assets/readme/examples/plainspoken-docs.svg">Open SVG</a> · <a href="assets/readme/examples/plainspoken-docs.spec.json">Remix the spec</a>
</p>

Ask for `cinematic dark`, `mist light`, `product blur`, `brand glow`, or `wordmark only`, or let the agent infer the calmest fit. Six bundled themes cover quieter technical repos and louder creative ones.

Rebuild this repository's hero and social preview from the checked-in spec:

```bash
python plugins/write-a-readme/skills/readme/scripts/banner.py --spec assets/readme/banner-spec.json --force
```

## Pick your installation path

### Universal skill install

Use the one-command [`npx skills`](https://github.com/vercel-labs/skills) route shown at the top for Codex, Claude Code, GitHub Copilot CLI, Gemini CLI, OpenCode, and other Agent Skills clients.

### Codex plugin install

Codex can install the packaged plugin from this repository's marketplace:

```bash
codex plugin marketplace add thuanvd378/write-me-a-readme
codex plugin add write-a-readme@write-me-a-readme
```

Then invoke `$readme` or select the skill through `/skills`.

### Bundled multi-client installer

For the repository-managed adapters, clone the project and preview every destination before writing:

```bash
git clone https://github.com/thuanvd378/write-me-a-readme.git
cd write-me-a-readme
python -m pip install -r plugins/write-a-readme/skills/readme/requirements.txt
python scripts/install.py --target user --agents all --dry-run
python scripts/install.py --target user --agents all
```

The installer stops on unmanaged or locally modified destination files unless replacement is explicitly requested with `--force`.

| Client | Invocation | Project discovery path |
|---|---|---|
| **Codex** | `$readme` or `/skills` | `.agents/skills/readme/` |
| **Claude Code** | `/readme` | `.claude/skills/readme/` |
| **GitHub Copilot CLI** | `/readme` | `.agents/skills/readme/` |
| **Gemini CLI** | `/readme` | `.agents/skills/readme/` + `.gemini/commands/readme.toml` |
| **OpenCode** | `/readme` | `.agents/skills/readme/` + `.opencode/commands/readme.md` |

Exact client behavior and user-scope paths live in [compatibility.md](docs/compatibility.md).

## Steal these prompts

```text
$readme Create a bold README for first-time CLI users. Show the command before the architecture.

$readme Refresh this in a playful but restrained voice. Keep setup literal and preserve warnings.

$readme Use minimal, premium-feeling copy. Keep install, first use, capabilities, limits, support, and license.

$readme Match docs/brand-voice.md, generate a Candy banner, and suggest a repository description plus focused topics.

$readme Audit only. Flag vague claims, broken paths, onboarding gaps, and visual clutter. Do not change files.
```

Create, refresh, redesign, translate, and audit-only workflows are supported. Text-only requests are first-class too; say so and the pixels stay put.

## Creative on the surface. Fussy about facts underneath.

| Guardrail | What it means |
|---|---|
| **Evidence before adjectives** | Project files outrank inference. Unsupported commands, metrics, compatibility, maturity, and adoption claims are omitted. |
| **Read-only inspection** | Inventory skips common secrets, dependencies, generated output, caches, and binaries; it does not execute repository code. |
| **Original local visuals** | Final assets live in the target project. SVGs reject scripts, event handlers, `foreignObject`, iframes, and remote resources. |
| **License-aware image search** | Optional Commons acquisition is HTTPS-only, bounded, MIME-checked, policy-filtered, and recorded for review. |
| **Safe installation** | Dry-run, traversal checks, managed hashes, atomic writes, and conflict protection prevent casual overwrites. |
| **Human still in the loop** | The validator catches documentation mistakes; it does not replace maintainer review or project tests. |

Write Me a README can improve clarity, onboarding, visual identity, and discoverability. It cannot guarantee GitHub Trending placement, search rank, stars, or adoption. Crystal balls remain an optional dependency.

## Ship proof, not promises

The test suite is offline and deterministic. CI runs it on Ubuntu and Windows with Python 3.10 and 3.13.

```bash
python -m pip install -r plugins/write-a-readme/skills/readme/requirements.txt
python -m unittest discover -s tests -v
python plugins/write-a-readme/skills/readme/scripts/validate_readme.py --root . --readme README.md --format text --strict
```

The canonical skill lives in `plugins/write-a-readme/skills/readme/`. Thin client adapters activate it; they do not fork the writing workflow. See [architecture.md](docs/architecture.md) for the component boundary and [research-sources.md](plugins/write-a-readme/skills/readme/references/research-sources.md) for the dated pattern study behind the guidance.

## Bring a repo. Leave with a showcase.

Try Write Me a README on a real project, then share the before/after in [Discussions](https://github.com/thuanvd378/write-me-a-readme/discussions). Useful reports are welcome too:

- [Report a bug](https://github.com/thuanvd378/write-me-a-readme/issues/new?template=bug.yml)
- [Suggest an idea](https://github.com/thuanvd378/write-me-a-readme/issues/new?template=feature.yml)
- [Read the contribution guide](CONTRIBUTING.md)
- [Report a vulnerability privately](SECURITY.md)

## License

MIT. Use it, remix it, and make the next project easier to understand. The bundled Space Grotesk font remains under SIL Open Font License 1.1; source, checksum, and design-lineage notes live in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
