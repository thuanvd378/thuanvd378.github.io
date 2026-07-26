import {
  FEATURED_REPOSITORIES,
  categorizeRepository,
  fetchLiveRepositories,
  isSnapshotFresh,
  loadSnapshot,
  mergePortfolioData,
  normalizePortfolioData,
  repositorySearchText
} from "./data-service.js";

const PAGE_SIZE = 8;
const categoryLabels = {
  featured: "Featured",
  embedded: "Embedded / IoT",
  ai: "AI / ML",
  systems: "Systems / CUDA",
  tools: "Developer tools",
  coursework: "Coursework",
  forks: "Fork",
  other: "Repository"
};

const ui = {
  query: document.querySelector("#repo-query"),
  filters: [...document.querySelectorAll("[data-filter]")],
  status: document.querySelector("#repo-status"),
  list: document.querySelector("#repo-list"),
  loadMore: document.querySelector("#load-more"),
  dataNote: document.querySelector("#data-note"),
  totalRepos: document.querySelector("#public-repo-count"),
  composition: document.querySelector("#repo-composition"),
  copyrightYear: document.querySelector("#copyright-year")
};

const state = {
  activeFilter: "all",
  visibleLimit: PAGE_SIZE,
  data: normalizePortfolioData({ repositories: [] })
};

function createElement(tag, options = {}) {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = String(options.text);
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([name, value]) => {
      if (value !== undefined && value !== null) element.setAttribute(name, String(value));
    });
  }
  return element;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
}

function primaryCategory(repository) {
  const categories = categorizeRepository(repository);
  const priority = ["featured", "embedded", "ai", "systems", "tools", "coursework", "forks", "other"];
  return priority.find((category) => categories.includes(category)) || "other";
}

function repositoryScore(repository) {
  const featured = FEATURED_REPOSITORIES.has(repository.name) ? 2_000_000_000_000 : 0;
  const original = repository.fork ? 0 : 1_000_000_000_000;
  const pushed = Date.parse(repository.pushedAt || repository.updatedAt || 0) || 0;
  return featured + original + pushed + repository.stars * 1000;
}

function sortedRepositories(repositories) {
  return [...repositories].sort((a, b) => repositoryScore(b) - repositoryScore(a));
}

function matchesFilter(repository) {
  const categories = categorizeRepository(repository);
  if (state.activeFilter === "all") return !repository.fork;
  return categories.includes(state.activeFilter);
}

function filteredRepositories() {
  const term = ui.query?.value.trim().toLowerCase() || "";
  return sortedRepositories(state.data.repositories).filter((repository) => {
    const matchesTerm = !term || repositorySearchText(repository).includes(term);
    return matchesTerm && matchesFilter(repository);
  });
}

function repositoryMeta(repository) {
  const values = [];
  if (repository.language) values.push(repository.language);
  if (repository.stars) values.push(`${repository.stars} ${repository.stars === 1 ? "star" : "stars"}`);
  if (repository.readme?.available !== false && repository.readme) values.push("README");
  const updated = formatDate(repository.pushedAt || repository.updatedAt);
  if (updated) values.push(`pushed ${updated}`);
  return values.length ? values.join(" · ") : "Public source repository";
}

function createRepositoryRow(repository) {
  const categories = categorizeRepository(repository);
  const article = createElement("article", {
    className: "repo-row",
    attributes: {
      "data-kind": categories.join(" "),
      "data-search": repositorySearchText(repository)
    }
  });

  const name = createElement("strong", { className: "repo-row__name", text: repository.name });
  const kind = createElement("span", {
    className: "repo-row__kind",
    text: categoryLabels[primaryCategory(repository)]
  });
  const description = createElement("p", {
    text: repository.description || "README summary unavailable."
  });
  const meta = createElement("span", {
    className: "repo-row__meta",
    text: repositoryMeta(repository)
  });
  const links = createElement("span", { className: "repo-row__links" });
  const projectLink = createElement("a", {
    text: "Read",
    attributes: {
      href: `project.html?repo=${encodeURIComponent(repository.name)}`,
      "aria-label": `Read the ${repository.name} project page`
    }
  });
  const sourceLink = createElement("a", {
    text: "Git",
    attributes: {
      href: repository.htmlUrl,
      target: "_blank",
      rel: "noreferrer",
      "aria-label": `Open ${repository.name} on GitHub`
    }
  });
  links.append(projectLink, sourceLink);
  article.append(name, kind, description, meta, links);
  return article;
}

function renderRepositories() {
  if (!ui.list) return;
  const matches = filteredRepositories();
  const visible = matches.slice(0, state.visibleLimit);
  const fragment = document.createDocumentFragment();

  if (!visible.length) {
    fragment.append(
      createElement("p", {
        className: "repo-empty",
        text: "No repository matches this route. Try another signal or clear the search."
      })
    );
  } else {
    visible.forEach((repository) => fragment.append(createRepositoryRow(repository)));
  }

  ui.list.replaceChildren(fragment);
  ui.status.textContent = `Showing ${visible.length} of ${matches.length} matching · ${state.data.repositories.length} public repositories`;
  ui.loadMore.hidden = visible.length >= matches.length;
  ui.loadMore.textContent = `Show ${Math.min(PAGE_SIZE, matches.length - visible.length)} more`;
}

function updateFacts() {
  const stats = state.data.stats;
  if (ui.totalRepos) ui.totalRepos.textContent = String(stats.totalRepos || state.data.repositories.length);
  if (ui.composition) {
    ui.composition.textContent = `${stats.originalRepos || 0} original / ${stats.forkRepos || 0} forks`;
  }
  document.querySelectorAll("[data-featured-repo]").forEach((element) => {
    const repository = state.data.repositories.find(
      (repo) => repo.name === element.dataset.featuredRepo
    );
    if (!repository) return;
    const description = element.querySelector("[data-featured-description]");
    if (description && repository.description) description.textContent = repository.description;
  });
}

function describeDataSource(mode, timestamp) {
  if (!ui.dataNote) return;
  const date = formatDate(timestamp);
  if (mode === "live") {
    ui.dataNote.dataset.state = "live";
    ui.dataNote.textContent = `Live GitHub signal merged${date ? ` · ${date}` : ""}.`;
  } else {
    ui.dataNote.dataset.state = "fallback";
    ui.dataNote.textContent = `Bundled GitHub snapshot${date ? ` · ${date}` : ""}.`;
  }
}

function setData(data, mode) {
  state.data = normalizePortfolioData(data);
  updateFacts();
  renderRepositories();
  describeDataSource(mode, data.generatedAt);
}

function bindRepositoryControls() {
  ui.filters.forEach((button) => {
    button.addEventListener("click", () => {
      state.activeFilter = button.dataset.filter;
      state.visibleLimit = PAGE_SIZE;
      ui.filters.forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      renderRepositories();
    });
  });

  ui.query?.addEventListener("input", () => {
    state.visibleLimit = PAGE_SIZE;
    renderRepositories();
  });
  ui.query?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      ui.query.value = "";
      state.visibleLimit = PAGE_SIZE;
      renderRepositories();
    }
  });
  ui.loadMore?.addEventListener("click", () => {
    state.visibleLimit += PAGE_SIZE;
    renderRepositories();
  });
}

function setupReveals() {
  const targets = [...document.querySelectorAll(".reveal")];
  if (!targets.length || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    targets.forEach((target) => target.classList.add("is-visible"));
    return;
  }

  document.documentElement.classList.add("js");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
  );
  targets.forEach((target) => observer.observe(target));
}

async function initializeData() {
  let snapshot;
  try {
    snapshot = await loadSnapshot();
    setData(snapshot, "snapshot");
  } catch (error) {
    console.warn("Bundled GitHub snapshot unavailable; retaining the HTML fallback.", error);
    ui.status.textContent = "Showing the source-backed HTML fallback.";
  }

  if (snapshot && isSnapshotFresh(snapshot)) return;

  try {
    const live = await fetchLiveRepositories();
    const base = snapshot || normalizePortfolioData({ repositories: [] });
    const merged = mergePortfolioData(base, live.repositories);
    merged.generatedAt = live.fetchedAt;
    setData(merged, "live");
  } catch (error) {
    console.info("Live GitHub refresh unavailable; the bundled snapshot remains active.", error);
  }
}

bindRepositoryControls();
setupReveals();
if (ui.copyrightYear) ui.copyrightYear.textContent = String(new Date().getFullYear());
initializeData();
