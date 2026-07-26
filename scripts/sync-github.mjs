#!/usr/bin/env node

/**
 * Build the public GitHub snapshot consumed by the portfolio.
 *
 * Runtime requirements:
 * - Node.js 20+ (only built-in modules and the native Fetch API)
 * - GITHUB_TOKEN is optional. GitHub Actions supplies it for scheduled builds;
 *   local runs intentionally work against the anonymous public API too.
 *
 * The script never writes credentials into generated files.
 */

import {
  access,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const USERNAME = "thuanvd378";
const API_VERSION = "2022-11-28";
const API_ROOT = (process.env.GITHUB_API_URL || "https://api.github.com").replace(
  /\/+$/,
  "",
);
const TOKEN = process.env.GITHUB_TOKEN?.trim() || "";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 2;
const CONCURRENCY = 5;

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = dirname(SCRIPT_DIR);
const DATA_FILE = join(ROOT_DIR, "data", "github.json");
const README_DIR = join(ROOT_DIR, "data", "readmes");

const JSON_ACCEPT = "application/vnd.github+json";
const BASE_HEADERS = {
  Accept: JSON_ACCEPT,
  "User-Agent": `${USERNAME}-portfolio-sync`,
  "X-GitHub-Api-Version": API_VERSION,
};

if (TOKEN) {
  BASE_HEADERS.Authorization = `Bearer ${TOKEN}`;
}

class GitHubRequestError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "GitHubRequestError";
    Object.assign(this, details);
  }
}

let observedRateLimit = null;

function integerHeader(headers, name) {
  const value = Number.parseInt(headers.get(name) || "", 10);
  return Number.isFinite(value) ? value : null;
}

function observeRateLimit(headers) {
  const limit = integerHeader(headers, "x-ratelimit-limit");
  const remaining = integerHeader(headers, "x-ratelimit-remaining");
  const used = integerHeader(headers, "x-ratelimit-used");
  const reset = integerHeader(headers, "x-ratelimit-reset");
  const resource = headers.get("x-ratelimit-resource");

  if (limit === null && remaining === null && used === null && reset === null) {
    return;
  }

  observedRateLimit = {
    limit,
    remaining:
      observedRateLimit?.remaining === null ||
      observedRateLimit?.remaining === undefined
        ? remaining
        : remaining === null
          ? observedRateLimit.remaining
          : Math.min(observedRateLimit.remaining, remaining),
    used:
      observedRateLimit?.used === null || observedRateLimit?.used === undefined
        ? used
        : used === null
          ? observedRateLimit.used
          : Math.max(observedRateLimit.used, used),
    resource: resource || observedRateLimit?.resource || null,
    resetAt: reset ? new Date(reset * 1000).toISOString() : null,
  };
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function shouldRetry(status, headers) {
  return (
    status === 429 ||
    status >= 500 ||
    (status === 403 && Boolean(headers.get("retry-after")))
  );
}

function retryDelay(attempt, headers) {
  const retryAfter = Number.parseInt(headers.get("retry-after") || "", 10);
  if (Number.isFinite(retryAfter) && retryAfter >= 0) {
    return Math.min(retryAfter * 1000, 30_000);
  }

  return 600 * 2 ** attempt;
}

async function request(url, { accept = JSON_ACCEPT, responseType = "json" } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: { ...BASE_HEADERS, Accept: accept },
        redirect: "follow",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      observeRateLimit(response.headers);

      if (!response.ok) {
        const body = (await response.text()).slice(0, 600);
        const requestError = new GitHubRequestError(
          `GitHub API returned ${response.status} ${response.statusText}`,
          {
            status: response.status,
            url,
            body,
          },
        );

        if (attempt < MAX_RETRIES && shouldRetry(response.status, response.headers)) {
          await wait(retryDelay(attempt, response.headers));
          lastError = requestError;
          continue;
        }

        throw requestError;
      }

      const data =
        responseType === "text" ? await response.text() : await response.json();
      return { data, headers: response.headers, url: response.url };
    } catch (error) {
      clearTimeout(timeout);
      const normalized =
        error?.name === "AbortError"
          ? new GitHubRequestError(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`, {
              url,
            })
          : error;

      if (
        attempt < MAX_RETRIES &&
        !(normalized instanceof GitHubRequestError && normalized.status < 500)
      ) {
        lastError = normalized;
        await wait(600 * 2 ** attempt);
        continue;
      }

      throw normalized;
    }
  }

  throw lastError;
}

async function requestExternalText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    // Deliberately do not forward the GitHub API token to another host.
    const response = await fetch(url, {
      headers: { "User-Agent": `${USERNAME}-portfolio-sync` },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new GitHubRequestError(
        `README download returned ${response.status} ${response.statusText}`,
        { status: response.status, url },
      );
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function nextLink(linkHeader) {
  if (!linkHeader) return null;

  for (const item of linkHeader.split(",")) {
    const match = item.match(/<([^>]+)>\s*;\s*rel="([^"]+)"/);
    if (match?.[2] === "next") return match[1];
  }

  return null;
}

async function fetchAllRepositories() {
  const query = new URLSearchParams({
    type: "owner",
    sort: "updated",
    direction: "desc",
    per_page: "100",
  });
  let url = `${API_ROOT}/users/${encodeURIComponent(USERNAME)}/repos?${query}`;
  const repositories = [];

  while (url) {
    const response = await request(url);
    if (!Array.isArray(response.data)) {
      throw new Error("GitHub returned an invalid repositories payload");
    }

    repositories.push(...response.data);
    url = nextLink(response.headers.get("link"));
  }

  return repositories;
}

function safeFileSegment(value) {
  let result = value
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/[. ]+$/g, "");

  if (!result) result = "repository";
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(result)) {
    result = `_${result}`;
  }

  return result;
}

function publicError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    message: TOKEN ? message.replaceAll(TOKEN, "[redacted]") : message,
    status: Number.isFinite(error?.status) ? error.status : null,
  };
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function atomicWrite(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.tmp`;
  await writeFile(temporaryPath, contents, "utf8");

  try {
    await rename(temporaryPath, path);
  } catch {
    // Windows can reject replacing an existing file with rename(). Keep the
    // original intact until the complete replacement has been written.
    await writeFile(path, contents, "utf8");
    await rm(temporaryPath, { force: true });
  }
}

async function loadPreviousSnapshot() {
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn(`Ignoring unreadable previous snapshot: ${error.message}`);
    }
    return null;
  }
}

function previousRepositoryMap(snapshot) {
  return new Map(
    (snapshot?.repositories || []).map((repository) => [
      repository.fullName?.toLowerCase(),
      repository,
    ]),
  );
}

function orderedLanguages(languages) {
  return Object.fromEntries(
    Object.entries(languages || {}).sort(
      ([leftName, leftBytes], [rightName, rightBytes]) =>
        Number(rightBytes || 0) - Number(leftBytes || 0) ||
        leftName.localeCompare(rightName),
    ),
  );
}

async function fetchLanguages(repository, previous) {
  try {
    const response = await request(repository.languages_url);
    return {
      value: orderedLanguages(response.data),
      issue: null,
    };
  } catch (error) {
    const fallback =
      previous?.languages && Object.keys(previous.languages).length > 0
        ? previous.languages
        : repository.language
          ? { [repository.language]: null }
          : {};

    return {
      value: fallback,
      issue: {
        scope: "languages",
        repository: repository.full_name,
        retainedPrevious: Boolean(previous?.languages),
        ...publicError(error),
      },
    };
  }
}

async function decodeReadmeContent(payload) {
  if (payload.encoding === "base64" && typeof payload.content === "string") {
    return Buffer.from(payload.content.replace(/\s/g, ""), "base64").toString(
      "utf8",
    );
  }

  if (payload.download_url) {
    return requestExternalText(payload.download_url);
  }

  throw new Error(`Unsupported README encoding: ${payload.encoding || "unknown"}`);
}

function gitBlobSha(contents) {
  const header = Buffer.from(`blob ${contents.length}\0`, "utf8");
  return createHash("sha1").update(header).update(contents).digest("hex");
}

function urlPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function retainedReadme(previous, error, repository) {
  const repositoryName = repository.full_name;
  const repositoryShortName = repository.name;
  const inferredLocalPath = `data/readmes/${safeFileSegment(repositoryShortName)}.md`;
  const localPath = previous?.readme?.localPath || inferredLocalPath;
  const absolutePath = join(ROOT_DIR, ...localPath.split("/"));
  const canRetain = await pathExists(absolutePath);
  const contents = canRetain ? await readFile(absolutePath) : null;
  const readmePath = previous?.readme?.path || "README.md";
  const inferredSourceUrl = `https://raw.githubusercontent.com/${encodeURIComponent(
    repository.owner.login,
  )}/${encodeURIComponent(repository.name)}/${urlPath(
    repository.default_branch,
  )}/${urlPath(readmePath)}`;

  return {
    value: canRetain
      ? {
          available: true,
          path: readmePath,
          localPath,
          sourceUrl: previous?.readme?.sourceUrl || inferredSourceUrl,
          htmlUrl:
            previous?.readme?.htmlUrl ||
            `https://github.com/${repositoryName}#readme`,
          sha: previous?.readme?.sha || gitBlobSha(contents),
          size: previous?.readme?.size ?? contents.length,
          fetchedAt: previous?.readme?.fetchedAt || null,
          sourceExtension: previous?.readme?.sourceExtension || ".md",
          stale: true,
        }
      : {
          available: false,
          path: null,
          localPath: null,
          sourceUrl: null,
          htmlUrl: null,
          sha: null,
          size: null,
          fetchedAt: null,
          stale: true,
        },
    issue: {
      scope: "readme",
      repository: repositoryName,
      retainedPrevious: canRetain,
      ...publicError(error),
    },
  };
}

async function fetchConventionalRawReadme(repository) {
  const branch = urlPath(repository.default_branch);
  const base = `https://raw.githubusercontent.com/${encodeURIComponent(
    repository.owner.login,
  )}/${encodeURIComponent(repository.name)}/${branch}`;

  for (const candidate of ["README.md", "README.MD", "readme.md"]) {
    const sourceUrl = `${base}/${candidate}`;
    try {
      const markdown = await requestExternalText(sourceUrl);
      return { markdown, candidate, sourceUrl };
    } catch (error) {
      if (error?.status !== 404) throw error;
    }
  }

  return null;
}

async function fetchReadme(repository, previous) {
  const endpoint = `${API_ROOT}/repos/${encodeURIComponent(
    repository.owner.login,
  )}/${encodeURIComponent(repository.name)}/readme`;

  try {
    // This endpoint applies GitHub's preferred-README selection rules. The
    // returned base64 payload is decoded and stored as untouched raw source.
    const response = await request(endpoint);
    const payload = response.data;
    const markdown = await decodeReadmeContent(payload);
    const fileName = `${safeFileSegment(repository.name)}.md`;
    const localPath = `data/readmes/${fileName}`;

    await atomicWrite(join(README_DIR, fileName), markdown);

    return {
      value: {
        available: true,
        path: payload.path || payload.name || "README.md",
        localPath,
        sourceUrl: payload.download_url || endpoint,
        htmlUrl: payload.html_url || `${repository.html_url}#readme`,
        sha: payload.sha || null,
        size: Number.isFinite(payload.size)
          ? payload.size
          : Buffer.byteLength(markdown, "utf8"),
        fetchedAt: new Date().toISOString(),
        sourceExtension: extname(payload.path || payload.name || "").toLowerCase(),
        stale: false,
      },
      issue: null,
    };
  } catch (error) {
    if (error instanceof GitHubRequestError && error.status === 404) {
      return {
        value: {
          available: false,
          path: null,
          localPath: null,
          sourceUrl: null,
          htmlUrl: null,
          sha: null,
          size: null,
          fetchedAt: new Date().toISOString(),
          stale: false,
        },
        issue: null,
      };
    }

    const retained = await retainedReadme(
      previous,
      error,
      repository,
    );
    if (retained.value.available) return retained;

    // When the API budget is temporarily exhausted and there is no prior
    // snapshot, a conventional root README still gives the site useful source
    // material. Normal authenticated runs always use the preferred endpoint.
    try {
      const rawFallback = await fetchConventionalRawReadme(repository);
      if (rawFallback) {
        const fileName = `${safeFileSegment(repository.name)}.md`;
        const localPath = `data/readmes/${fileName}`;
        await atomicWrite(join(README_DIR, fileName), rawFallback.markdown);
        return {
          value: {
            available: true,
            path: rawFallback.candidate,
            localPath,
            sourceUrl: rawFallback.sourceUrl,
            htmlUrl: `${repository.html_url}/blob/${repository.default_branch}/${rawFallback.candidate}`,
            sha: null,
            size: Buffer.byteLength(rawFallback.markdown, "utf8"),
            fetchedAt: new Date().toISOString(),
            sourceExtension: ".md",
            stale: true,
          },
          issue: retained.issue,
        };
      }
    } catch {
      // Preserve the original API error as the actionable sync diagnostic.
    }

    return retainedReadme(previous, error, repository);
  }
}

function normalizeLicense(license) {
  if (!license) return null;
  return {
    key: license.key || null,
    name: license.name || null,
    spdxId: license.spdx_id || null,
    url: license.url || null,
  };
}

function normalizeOwner(owner) {
  return {
    login: owner.login,
    id: owner.id,
    avatarUrl: owner.avatar_url,
    htmlUrl: owner.html_url,
  };
}

function normalizeRepository(repository, languages, readme, fetchedAt) {
  return {
    id: repository.id,
    nodeId: repository.node_id,
    name: repository.name,
    fullName: repository.full_name,
    description: repository.description,
    url: repository.html_url,
    htmlUrl: repository.html_url,
    apiUrl: repository.url,
    homepage: repository.homepage || null,
    defaultBranch: repository.default_branch,
    language: repository.language,
    languages,
    stars: repository.stargazers_count,
    forks: repository.forks_count,
    watchers: repository.subscribers_count ?? repository.watchers_count,
    openIssues: repository.open_issues_count,
    topics: [...(repository.topics || [])].sort((a, b) => a.localeCompare(b)),
    license: normalizeLicense(repository.license),
    archived: repository.archived,
    disabled: repository.disabled,
    fork: repository.fork,
    template: repository.is_template,
    visibility: repository.visibility || "public",
    sizeKb: repository.size,
    hasPages: repository.has_pages,
    createdAt: repository.created_at,
    updatedAt: repository.updated_at,
    pushedAt: repository.pushed_at,
    owner: normalizeOwner(repository.owner),
    readme,
    source: {
      provider: "GitHub REST API",
      apiUrl: repository.url,
      fetchedAt,
    },
  };
}

function normalizeProfile(profile) {
  return {
    login: profile.login,
    id: profile.id,
    nodeId: profile.node_id,
    name: profile.name,
    bio: profile.bio,
    company: profile.company,
    location: profile.location,
    blog: profile.blog || null,
    publicEmail: profile.email || null,
    twitterUsername: profile.twitter_username || null,
    hireable: profile.hireable,
    avatarUrl: profile.avatar_url,
    url: profile.html_url,
    htmlUrl: profile.html_url,
    apiUrl: profile.url,
    publicRepos: profile.public_repos,
    followers: profile.followers,
    following: profile.following,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

function statsFor(repositories) {
  const originalRepositories = repositories.filter((repository) => !repository.fork);
  const languageCounts = {};

  for (const repository of originalRepositories) {
    const language = repository.language || "Unspecified";
    languageCounts[language] = (languageCounts[language] || 0) + 1;
  }

  const sortedLanguageCounts = Object.fromEntries(
    Object.entries(languageCounts).sort(
      ([leftLanguage, leftCount], [rightLanguage, rightCount]) =>
        rightCount - leftCount || leftLanguage.localeCompare(rightLanguage),
    ),
  );

  return {
    totalRepos: repositories.length,
    originalRepos: originalRepositories.length,
    forkRepos: repositories.length - originalRepositories.length,
    totalStars: repositories.reduce(
      (total, repository) => total + repository.stars,
      0,
    ),
    languageCounts: sortedLanguageCounts,
    languageCountsScope: "originalRepositories",
    readmesAvailable: repositories.filter(
      (repository) => repository.readme.available,
    ).length,
    archivedRepos: repositories.filter((repository) => repository.archived).length,
  };
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

async function removeOrphanedReadmes(repositories) {
  const referenced = new Set(
    repositories
      .map((repository) => repository.readme?.localPath)
      .filter(Boolean)
      .map((path) => path.split("/").at(-1).toLowerCase()),
  );

  const entries = await readdir(README_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (
      entry.isFile() &&
      entry.name.toLowerCase().endsWith(".md") &&
      !referenced.has(entry.name.toLowerCase())
    ) {
      await rm(join(README_DIR, entry.name), { force: true });
    }
  }
}

function repositorySort(left, right) {
  const rightDate = Date.parse(right.pushedAt || right.updatedAt || 0);
  const leftDate = Date.parse(left.pushedAt || left.updatedAt || 0);
  return rightDate - leftDate || left.name.localeCompare(right.name);
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }

  return value;
}

function semanticSnapshot(snapshot) {
  const normalized = structuredClone(snapshot || {});

  // These fields describe the fetch operation, not the public GitHub content.
  // Excluding them prevents a scheduled run from producing a data-only commit
  // when repositories and README sources have not actually changed.
  delete normalized.generatedAt;
  delete normalized.sync;

  for (const repository of normalized.repositories || []) {
    if (repository.source) {
      delete repository.source.fetchedAt;
    }
    if (repository.readme) {
      delete repository.readme.fetchedAt;
      delete repository.readme.stale;
    }
  }

  return canonicalize(normalized);
}

async function contentFingerprint() {
  const snapshot = await loadPreviousSnapshot();
  const hash = createHash("sha256");
  const snapshotBytes = Buffer.from(
    JSON.stringify(semanticSnapshot(snapshot)),
    "utf8",
  );

  hash.update(`snapshot:${snapshotBytes.length}\0`);
  hash.update(snapshotBytes);

  let entries = [];
  try {
    entries = await readdir(README_DIR, { withFileTypes: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  for (const entry of entries
    .filter((candidate) => candidate.isFile())
    .sort((left, right) => left.name.localeCompare(right.name))) {
    const contents = await readFile(join(README_DIR, entry.name));
    hash.update(`\0readme:${entry.name}:${contents.length}\0`);
    hash.update(contents);
  }

  return hash.digest("hex");
}

async function printSyncStatus() {
  const snapshot = await loadPreviousSnapshot();
  process.stdout.write(`${snapshot?.sync?.status || "unknown"}\n`);
}

async function main() {
  const startedAt = new Date().toISOString();
  const previousSnapshot = await loadPreviousSnapshot();
  const previousByName = previousRepositoryMap(previousSnapshot);
  const errors = [];

  console.log(
    `Syncing public GitHub data for ${USERNAME} (${TOKEN ? "authenticated" : "anonymous"} API requests)`,
  );

  const [profileResult, repositoriesResult] = await Promise.allSettled([
    request(`${API_ROOT}/users/${encodeURIComponent(USERNAME)}`),
    fetchAllRepositories(),
  ]);

  let apiRepositories;
  let normalizedProfile;
  let snapshotStatus = "fresh";

  if (repositoriesResult.status === "fulfilled") {
    apiRepositories = repositoriesResult.value;
  } else if (previousSnapshot?.repositories?.length) {
    const completedAt = new Date().toISOString();
    const issue = {
      scope: "repositories",
      retainedPrevious: true,
      ...publicError(repositoriesResult.reason),
    };

    const staleSnapshot = {
      ...previousSnapshot,
      sync: {
        status: "stale",
        startedAt,
        completedAt,
        errors: [issue],
        rateLimit: observedRateLimit,
      },
    };

    await atomicWrite(DATA_FILE, `${JSON.stringify(staleSnapshot, null, 2)}\n`);
    console.warn("Repository listing failed; retained the previous complete snapshot.");
    return;
  } else {
    throw repositoriesResult.reason;
  }

  if (profileResult.status === "fulfilled") {
    normalizedProfile = normalizeProfile(profileResult.value.data);
  } else if (previousSnapshot?.profile) {
    normalizedProfile = previousSnapshot.profile;
    snapshotStatus = "partial";
    errors.push({
      scope: "profile",
      retainedPrevious: true,
      ...publicError(profileResult.reason),
    });
  } else if (apiRepositories[0]?.owner) {
    normalizedProfile = {
      login: apiRepositories[0].owner.login,
      id: apiRepositories[0].owner.id,
      nodeId: apiRepositories[0].owner.node_id,
      name: null,
      bio: null,
      company: null,
      location: null,
      blog: null,
      publicEmail: null,
      twitterUsername: null,
      hireable: null,
      avatarUrl: apiRepositories[0].owner.avatar_url,
      url: apiRepositories[0].owner.html_url,
      htmlUrl: apiRepositories[0].owner.html_url,
      apiUrl: apiRepositories[0].owner.url,
      publicRepos: apiRepositories.length,
      followers: null,
      following: null,
      createdAt: null,
      updatedAt: null,
    };
    snapshotStatus = "partial";
    errors.push({
      scope: "profile",
      retainedPrevious: false,
      ...publicError(profileResult.reason),
    });
  } else {
    throw profileResult.reason;
  }

  await mkdir(README_DIR, { recursive: true });

  const enriched = await mapLimit(
    apiRepositories,
    CONCURRENCY,
    async (repository, index) => {
      const previous = previousByName.get(repository.full_name.toLowerCase());
      console.log(
        `[${index + 1}/${apiRepositories.length}] ${repository.full_name}`,
      );

      const [languagesResult, readmeResult] = await Promise.all([
        fetchLanguages(repository, previous),
        fetchReadme(repository, previous),
      ]);

      if (languagesResult.issue) errors.push(languagesResult.issue);
      if (readmeResult.issue) errors.push(readmeResult.issue);

      return normalizeRepository(
        repository,
        languagesResult.value,
        readmeResult.value,
        new Date().toISOString(),
      );
    },
  );

  const repositories = enriched.sort(repositorySort);
  const completedAt = new Date().toISOString();
  if (errors.length > 0) snapshotStatus = "partial";
  await removeOrphanedReadmes(repositories);

  const snapshot = {
    schemaVersion: 1,
    generatedAt: completedAt,
    source: {
      provider: "GitHub REST API",
      username: USERNAME,
      apiVersion: API_VERSION,
      profileUrl: `${API_ROOT}/users/${USERNAME}`,
      repositoriesUrl: `${API_ROOT}/users/${USERNAME}/repos`,
    },
    profile: normalizedProfile,
    repositories,
    stats: statsFor(repositories),
    sync: {
      status: snapshotStatus,
      startedAt,
      completedAt,
      errors,
      rateLimit: observedRateLimit,
    },
  };

  await atomicWrite(DATA_FILE, `${JSON.stringify(snapshot, null, 2)}\n`);

  console.log(
    `Wrote ${repositories.length} repositories and ${snapshot.stats.readmesAvailable} README snapshots to data/.`,
  );
  if (errors.length > 0) {
    console.warn(`Completed with ${errors.length} recoverable API error(s).`);
  }
}

async function run() {
  const command = process.argv[2] || "--sync";

  if (command === "--content-hash") {
    process.stdout.write(`${await contentFingerprint()}\n`);
    return;
  }

  if (command === "--status") {
    await printSyncStatus();
    return;
  }

  if (command !== "--sync") {
    throw new Error(`Unknown argument: ${command}`);
  }

  await main();
}

run().catch((error) => {
  console.error(`GitHub sync failed: ${publicError(error).message}`);
  process.exitCode = 1;
});
