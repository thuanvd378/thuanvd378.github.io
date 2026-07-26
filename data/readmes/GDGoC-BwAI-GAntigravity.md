# Authoring Google Antigravity Skills

This repository is the working project for a codelab on **authoring Google Antigravity Skills**.

This codelab uses a practical throughline: **build a tool to clean event registration data stored in CSV files**. The use case is easy to understand, maps well to real operational work, and makes the value of reusable skills immediately obvious.

## Codelab Overview

Participants work with a messy event registration file and use Google Antigravity to progressively improve how that work gets done.

The session is organized around two focused parts:

1. **Use a few sample/common skills on a concrete problem**
   Participants explore the event registration dataset, review inconsistent values, and use Antigravity capabilities and existing workflows on a task that feels realistic rather than abstract.
2. **Prompt Antigravity to create a custom skill for that problem**
   Participants then author a custom skill that supports the CSV-cleaning workflow directly, turning an ad hoc prompt into a reusable capability.

This structure fits the product behavior well: Skills are loaded on demand through intent matching from their descriptions, so it is natural to first show how existing skills are invoked and then how to create a new one tailored to the exact task.

## What Participants Learn

By the end of the codelab, participants should understand:

- why Skills matter in Google Antigravity
- how on-demand skill loading works
- how a `SKILL.md` file is structured
- when to scope a skill globally versus at the workspace level
- how to use prompt-based skill authoring to create a task-specific workflow

They also get hands-on exposure to the broader Antigravity working model, including:

- Agent Manager
- Editor workflows
- Planning mode versus Fast mode
- terminal review and iteration
- Rules and Workflows

## Practical Scenario

The repository includes a sample CSV dataset: [registration_raw.csv](registration_raw.csv).

It represents event registration data with intentionally messy values.

This makes the codelab concrete: participants are not learning Skills in the abstract, they are using Skills to solve a recognizable data-cleaning problem.

## Outcome

At the end of the session, participants should leave with two things:

1. practical experience using Antigravity on a concrete task
2. a clear mental model for turning that task into a reusable custom Skill

---

Developed by [Minh N. Ta](https://tnminh.com).