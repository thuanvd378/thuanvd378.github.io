const USERNAME = "thuanvd378";
const SNAPSHOT_URL = new URL("../../data/github.json", import.meta.url);
const RUNTIME_CACHE_KEY = "vdt:github-repositories:v2";
const README_CACHE_PREFIX = "vdt:readme:v2:";
const RUNTIME_TTL = 30 * 60 * 1000;
const README_TTL = 6 * 60 * 60 * 1000;
const SNAPSHOT_FRESHNESS = 12 * 60 * 60 * 1000;
const FEATURED_REPOSITORIES = new Set([
  "write-me-a-readme",
  "ossmark",
  "et4361-he-thong-nhung"
]);

function numberFrom(...values) {
  const value = values.find((item) => Number.isFinite(Number(item)));
  return value === undefined ? 0 : Number(value);
}

function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is an optimization. The site remains functional without it.
  }
}

function parseLinkHeader(value) {
  const links = {};
  String(value || "").split(",").forEach((part) => {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) links[match[2]] = match[1];
  });
  return links;
}

function apiHeaders(accept = "application/vnd.github+json") {
  return {
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

async function fetchWithTimeout(url, options = {}, timeout = 8_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function normalizeRepository(repository = {}) {
  const topics = Array.isArray(repository.topics) ? repository.topics.filter(Boolean) : [];
  const languages =
    repository.languages && typeof repository.languages === "object"
      ? repository.languages
      : {};
  const licenseValue =
    typeof repository.license === "string"
      ? repository.license
      : repository.license?.spdxId ||
        repository.license?.spdx_id ||
        repository.license?.name ||
        null;
  const name = repository.name || String(repository.fullName || repository.full_name || "").split("/").pop();
  const htmlUrl =
    repository.htmlUrl ||
    repository.html_url ||
    (name ? `https://github.com/${USERNAME}/${encodeURIComponent(name)}` : "");

  return {
    name,
    fullName: repository.fullName || repository.full_name || `${USERNAME}/${name}`,
    description: repository.description || "",
    htmlUrl,
    homepage: repository.homepage || "",
    defaultBranch: repository.defaultBranch || repository.default_branch || "main",
    language: repository.language || "",
    languages,
    stars: numberFrom(repository.stars, repository.stargazersCount, repository.stargazers_count),
    forks: numberFrom(repository.forks, repository.forksCount, repository.forks_count),
    openIssues: numberFrom(repository.openIssues, repository.open_issues_count),
    watchers: numberFrom(repository.watchers, repository.watchers_count),
    size: numberFrom(repository.size),
    topics,
    license: licenseValue,
    archived: Boolean(repository.archived),
    fork: Boolean(repository.fork),
    createdAt: repository.createdAt || repository.created_at || null,
    updatedAt: repository.updatedAt || repository.updated_at || null,
    pushedAt: repository.pushedAt || repository.pushed_at || null,
    readme: repository.readme && typeof repository.readme === "object" ? repository.readme : null
  };
}

export function categorizeRepository(repository) {
  const repo = normalizeRepository(repository);
  const haystack = [
    repo.name,
    repo.description,
    repo.language,
    ...repo.topics
  ].join(" ").toLowerCase();
  const categories = new Set();

  if (FEATURED_REPOSITORIES.has(repo.name)) categories.add("featured");
  if (repo.fork) categories.add("forks");
  if (/(embedded|iot|arduino|esp32|stm32|mqtt|sensor|hardware|firmware|rtos|uwb)/.test(haystack)) {
    categories.add("embedded");
  }
  if (/(machine.?learning|\bml\b|\bai\b|cnn|neural|yolo|deepstream|vision|tensorflow|localization)/.test(haystack)) {
    categories.add("ai");
  }
  if (/(cuda|gpu|linux|driver|parallel|kernel|compiler|system|c\+\+|operating)/.test(haystack)) {
    categories.add("systems");
  }
  if (/(agent|developer|tool|readme|oss|cli|automation|workflow|github.?action|generator|audit)/.test(haystack)) {
    categories.add("tools");
  }
  if (/(course|coursework|study|practice|assignment|homework|laboratory|\blab\b|et\d{3,})/.test(haystack)) {
    categories.add("coursework");
  }

  if (!categories.size) categories.add("other");
  return [...categories];
}

export function repositorySearchText(repository) {
  const repo = normalizeRepository(repository);
  return [
    repo.name,
    repo.description,
    repo.language,
    repo.license,
    ...repo.topics,
    ...Object.keys(repo.languages)
  ].filter(Boolean).join(" ").toLowerCase();
}

function deriveStats(repositories) {
  const originals = repositories.filter((repo) => !repo.fork);
  const languageCounts = {};
  originals.forEach((repo) => {
    if (repo.language) languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
  });
  return {
    totalRepos: repositories.length,
    originalRepos: originals.length,
    forkRepos: repositories.length - originals.length,
    totalStars: repositories.reduce((sum, repo) => sum + repo.stars, 0),
    languageCounts
  };
}

function normalizeProfile(profile = {}) {
  return {
    login: profile.login || USERNAME,
    name: profile.name || "Vũ Đức Thuận",
    avatarUrl: profile.avatarUrl || profile.avatar_url || "assets/brand/vu-duc-thuan-avatar.jpg",
    bio: profile.bio || "",
    company: profile.company || "",
    location: profile.location || "Hanoi, Vietnam",
    htmlUrl: profile.htmlUrl || profile.html_url || `https://github.com/${USERNAME}`,
    publicRepos: numberFrom(profile.publicRepos, profile.public_repos),
    followers: numberFrom(profile.followers),
    following: numberFrom(profile.following),
    createdAt: profile.createdAt || profile.created_at || null,
    updatedAt: profile.updatedAt || profile.updated_at || null
  };
}

export function normalizePortfolioData(payload = {}) {
  const repositories = (payload.repositories || payload.repos || [])
    .map(normalizeRepository)
    .filter((repo) => repo.name);
  return {
    generatedAt: payload.generatedAt || payload.generated_at || null,
    profile: normalizeProfile(payload.profile),
    repositories,
    stats: {
      ...deriveStats(repositories),
      ...(payload.stats || {})
    },
    errors: payload.errors || []
  };
}

export async function loadSnapshot() {
  const response = await fetch(SNAPSHOT_URL, { cache: "no-cache" });
  if (!response.ok) throw new Error(`Snapshot request failed with ${response.status}`);
  return normalizePortfolioData(await response.json());
}

export function isSnapshotFresh(portfolioData, maxAge = SNAPSHOT_FRESHNESS) {
  const generatedAt = Date.parse(portfolioData?.generatedAt || "");
  return Number.isFinite(generatedAt) && Date.now() - generatedAt <= maxAge;
}

export async function fetchLiveRepositories({ force = false } = {}) {
  const cached = readStorage(RUNTIME_CACHE_KEY);
  if (!force && cached?.savedAt && Date.now() - cached.savedAt < RUNTIME_TTL) {
    return {
      repositories: cached.repositories.map(normalizeRepository),
      fetchedAt: cached.fetchedAt,
      fromCache: true
    };
  }

  let url = `https://api.github.com/users/${USERNAME}/repos?per_page=100&type=owner&sort=pushed&direction=desc`;
  const repositories = [];
  let pageCount = 0;

  while (url && pageCount < 3) {
    const response = await fetchWithTimeout(url, {
      headers: apiHeaders(),
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`GitHub repository refresh failed with ${response.status}`);
    const page = await response.json();
    repositories.push(...page.map(normalizeRepository));
    url = parseLinkHeader(response.headers.get("link")).next || "";
    pageCount += 1;
  }

  const fetchedAt = new Date().toISOString();
  writeStorage(RUNTIME_CACHE_KEY, { savedAt: Date.now(), fetchedAt, repositories });
  return { repositories, fetchedAt, fromCache: false };
}

export function mergePortfolioData(snapshot, liveRepositories) {
  const base = normalizePortfolioData(snapshot);
  const bundled = new Map(base.repositories.map((repo) => [repo.name.toLowerCase(), repo]));
  const repositories = liveRepositories
    .map(normalizeRepository)
    .filter((repo) => repo.name)
    .map((liveRepo) => {
      const existing = bundled.get(liveRepo.name.toLowerCase()) || {};
      return {
      ...existing,
      ...liveRepo,
      languages: Object.keys(liveRepo.languages).length ? liveRepo.languages : existing.languages || {},
      readme: existing.readme || liveRepo.readme || null
      };
    });
  return {
    ...base,
    repositories,
    stats: deriveStats(repositories)
  };
}

export function findRepository(portfolioData, name) {
  const key = String(name || "").toLowerCase();
  return portfolioData.repositories.find((repo) => repo.name.toLowerCase() === key) || null;
}

async function fetchBundledReadme(repository) {
  const repo = normalizeRepository(repository);
  if (repo.readme?.available === false) {
    throw new Error("Bundled README is explicitly unavailable");
  }
  const localPath = repo.readme?.localPath || repo.readme?.local_path;
  if (!localPath) throw new Error("Bundled README path is unavailable");
  const relativePath = String(localPath).replace(/^\/+/, "");
  const url = new URL(`../../${relativePath}`, import.meta.url);
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) throw new Error(`Bundled README request failed with ${response.status}`);
  return response.text();
}

async function fetchLiveReadme(repository) {
  const repo = normalizeRepository(repository);
  const cacheKey = `${README_CACHE_PREFIX}${repo.name.toLowerCase()}`;
  const cached = readStorage(cacheKey);
  if (cached?.savedAt && Date.now() - cached.savedAt < README_TTL && typeof cached.markdown === "string") {
    return { markdown: cached.markdown, fromCache: true };
  }

  const url = `https://api.github.com/repos/${USERNAME}/${encodeURIComponent(repo.name)}/readme`;
  const response = await fetchWithTimeout(url, {
    headers: apiHeaders("application/vnd.github.raw+json"),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`GitHub README refresh failed with ${response.status}`);
  const markdown = await response.text();
  writeStorage(cacheKey, { savedAt: Date.now(), markdown });
  return { markdown, fromCache: false };
}

export async function getReadmeMarkdown(repository, { preferLive = true } = {}) {
  const repo = normalizeRepository(repository);
  if (!preferLive && repo.readme?.available === false) {
    return { markdown: "", source: "unavailable", fromCache: false };
  }

  if (preferLive) {
    try {
      const live = await fetchLiveReadme(repository);
      return { ...live, source: "live" };
    } catch {
      // Fall through to the durable bundled snapshot.
    }
  }

  try {
    return { markdown: await fetchBundledReadme(repository), source: "snapshot", fromCache: false };
  } catch {
    if (!preferLive) {
      try {
        const live = await fetchLiveReadme(repository);
        return { ...live, source: "live" };
      } catch {
        // Return the explicit unavailable state below.
      }
    }
  }

  return { markdown: "", source: "unavailable", fromCache: false };
}

export { FEATURED_REPOSITORIES, USERNAME };
