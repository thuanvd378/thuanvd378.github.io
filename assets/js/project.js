import {
  categorizeRepository,
  fetchLiveRepositories,
  findRepository,
  getReadmeMarkdown,
  isSnapshotFresh,
  loadSnapshot,
  mergePortfolioData,
  normalizePortfolioData
} from "./data-service.js";
import { parseReadme, renderReadme } from "./markdown-renderer.js";

const OWNER = "thuanvd378";
const query = new URLSearchParams(location.search);
const requestedName = query.get("repo") || "";
const repositoryName = /^[a-zA-Z0-9._-]+$/.test(requestedName) ? requestedName : "";

const ui = {
  route: document.querySelector("#project-route"),
  port: document.querySelector("#project-port"),
  title: document.querySelector("#project-title"),
  lead: document.querySelector("#project-lead"),
  badges: document.querySelector("#project-badges"),
  actions: document.querySelector("#project-actions"),
  sourceLink: document.querySelector("#source-link"),
  sourceLinkTop: document.querySelector("#source-link-top"),
  status: document.querySelector("#fact-status"),
  language: document.querySelector("#fact-language"),
  updated: document.querySelector("#fact-updated"),
  readmeFact: document.querySelector("#fact-readme"),
  readmeSource: document.querySelector("#readme-source"),
  media: document.querySelector("#project-media"),
  mediaImage: document.querySelector("#project-media-image"),
  mediaCaption: document.querySelector("#project-media-caption"),
  toc: document.querySelector("#readme-toc"),
  root: document.querySelector("#readme-root"),
  related: document.querySelector("#related-list")
};

function createElement(tag, options = {}) {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = String(options.text);
  Object.entries(options.attributes || {}).forEach(([name, value]) => {
    if (value !== undefined && value !== null) element.setAttribute(name, String(value));
  });
  return element;
}

function formatDate(value) {
  if (!value) return "No public timestamp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No public timestamp";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
}

function repositoryStatus(repository) {
  if (repository.archived) return "Archived";
  if (repository.fork) return "Public fork";
  return repository.stars
    ? `Original · ${repository.stars} ${repository.stars === 1 ? "star" : "stars"}`
    : "Original public repository";
}

function setMetaDescription(value) {
  const content = String(value || "").trim();
  if (!content) return;
  document.querySelector('meta[name="description"]')?.setAttribute("content", content);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", content);
}

function addHomepageAction(repository) {
  if (!repository.homepage || !/^https?:\/\//i.test(repository.homepage)) return;
  const existing = ui.actions.querySelector("[data-homepage]");
  if (existing) existing.remove();
  const homepage = createElement("a", {
    className: "action-link action-link--quiet",
    text: "Open live project",
    attributes: {
      href: repository.homepage,
      target: "_blank",
      rel: "noreferrer",
      "data-homepage": ""
    }
  });
  ui.actions.insertBefore(homepage, ui.actions.lastElementChild);
}

function updateRepositoryIdentity(repository, model = null) {
  const sourceUrl = repository.htmlUrl || `https://github.com/${OWNER}/${repository.name}`;
  const lead = model?.lead?.text || repository.description || "README summary unavailable.";
  const title = model?.title || repository.name;

  document.title = `${title} — Vũ Đức Thuận`;
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", `${title} — Vũ Đức Thuận`);
  setMetaDescription(lead);

  ui.route.textContent = `Repository / ${repository.name}`;
  ui.port.textContent = `Port / ${categorizeRepository(repository).join(" + ")}`;
  ui.title.textContent = title;
  ui.lead.textContent = lead;
  ui.sourceLink.href = sourceUrl;
  ui.sourceLinkTop.href = sourceUrl;
  ui.sourceLink.setAttribute("aria-label", `Open ${repository.name} on GitHub`);
  ui.sourceLinkTop.setAttribute("aria-label", `Open ${repository.name} on GitHub`);
  ui.status.textContent = repositoryStatus(repository);
  ui.language.textContent = repository.language || Object.keys(repository.languages || {})[0] || "Not detected";
  ui.updated.textContent = formatDate(repository.pushedAt || repository.updatedAt);
  addHomepageAction(repository);
}

function renderHeroMedia(model, repository) {
  if (!model.hero?.src) {
    ui.media.hidden = true;
    return;
  }
  ui.mediaImage.src = model.hero.src;
  ui.mediaImage.alt = model.hero.alt || `${repository.name} project media`;
  ui.mediaCaption.textContent = `${repository.name} / first meaningful README image`;
  ui.media.hidden = false;
}

function renderBadges(model) {
  const appendToken = (token, parent) => {
    if (token.type === "image" && token.src) {
      const image = createElement("img", {
        attributes: {
          src: token.src,
          alt: token.alt || "Repository status",
          loading: "eager",
          decoding: "async"
        }
      });
      parent.append(image);
      return;
    }
    if (token.type === "link" && token.href && /^https?:\/\//i.test(token.href)) {
      const anchor = createElement("a", {
        attributes: { href: token.href, target: "_blank", rel: "noreferrer" }
      });
      (token.children || []).forEach((child) => appendToken(child, anchor));
      if (anchor.childNodes.length) parent.append(anchor);
      return;
    }
    (token.children || []).forEach((child) => appendToken(child, parent));
  };

  const fragment = document.createDocumentFragment();
  (model.badges || []).forEach((token) => appendToken(token, fragment));
  ui.badges.replaceChildren(fragment);
  ui.badges.hidden = !ui.badges.childNodes.length;
}

function renderToc(model) {
  const sections = model.sections.filter((section) => section.title);
  if (!sections.length) {
    ui.toc.replaceChildren(
      createElement("p", {
        className: "index-placeholder",
        text: "This README has no named sections."
      })
    );
    return;
  }
  const fragment = document.createDocumentFragment();
  sections.forEach((section, index) => {
    fragment.append(
      createElement("a", {
        text: section.title,
        attributes: {
          href: `#${section.id}`,
          "data-index": String(index + 1).padStart(2, "0")
        }
      })
    );
  });
  ui.toc.replaceChildren(fragment);
}

function decorateReadmeSections() {
  [...ui.root.querySelectorAll(".readme-section")].forEach((section, index) => {
    section.dataset.layout = section.dataset.sectionKind || "editorial";
    section.dataset.sectionIndex = String(index + 1).padStart(2, "0");
  });
}

function renderReadmeUnavailable(repository) {
  const wrapper = createElement("div", { className: "readme-empty" });
  wrapper.append(
    createElement("strong", { text: "README signal unavailable." }),
    createElement("p", {
      text: "This repository does not expose a readable README in the current snapshot. The source remains available on GitHub."
    })
  );
  const link = createElement("a", {
    className: "action-link",
    text: "Inspect repository source",
    attributes: {
      href: repository.htmlUrl,
      target: "_blank",
      rel: "noreferrer"
    }
  });
  wrapper.append(link);
  ui.root.replaceChildren(wrapper);
  ui.toc.replaceChildren(
    createElement("p", { className: "index-placeholder", text: "No README headings available." })
  );
}

function renderSparseReadme(repository) {
  const wrapper = createElement("div", { className: "readme-empty" });
  wrapper.append(
    createElement("strong", { text: "README signal detected." }),
    createElement("p", {
      text: "The current README only identifies this repository, so there are no documented sections to route yet."
    }),
    createElement("a", {
      className: "action-link",
      text: "Inspect repository source",
      attributes: {
        href: repository.htmlUrl,
        target: "_blank",
        rel: "noreferrer"
      }
    })
  );
  ui.root.replaceChildren(wrapper);
}

function similarityScore(current, candidate) {
  if (current.name === candidate.name) return -Infinity;
  const currentCategories = new Set(categorizeRepository(current));
  const candidateCategories = new Set(categorizeRepository(candidate));
  const categoryOverlap = [...currentCategories].filter((value) => candidateCategories.has(value)).length;
  const topicOverlap = (current.topics || []).filter((value) => (candidate.topics || []).includes(value)).length;
  const languageMatch = current.language && current.language === candidate.language ? 1 : 0;
  return categoryOverlap * 6 + topicOverlap * 3 + languageMatch * 2 + (candidate.fork ? -4 : 0);
}

function renderRelated(repository, portfolioData) {
  const candidates = portfolioData.repositories
    .map((candidate) => ({ candidate, score: similarityScore(repository, candidate) }))
    .filter((item) => Number.isFinite(item.score))
    .sort((a, b) => b.score - a.score || Date.parse(b.candidate.pushedAt || 0) - Date.parse(a.candidate.pushedAt || 0))
    .slice(0, 3);

  if (!candidates.length) {
    ui.related.replaceChildren(createElement("p", { text: "No nearby public signal is available." }));
    return;
  }

  const fragment = document.createDocumentFragment();
  candidates.forEach(({ candidate }) => {
    const item = createElement("article", { className: "related__item" });
    item.append(
      createElement("strong", { text: candidate.name }),
      createElement("p", { text: candidate.description || "README summary unavailable." }),
      createElement("a", {
        text: "Inspect",
        attributes: {
          href: `project.html?repo=${encodeURIComponent(candidate.name)}`,
          "aria-label": `Inspect ${candidate.name}`
        }
      })
    );
    fragment.append(item);
  });
  ui.related.replaceChildren(fragment);
}

function renderFatal(message) {
  document.title = "Repository not found — Vũ Đức Thuận";
  ui.route.textContent = "Repository / unresolved";
  ui.port.textContent = "Port / No signal";
  ui.title.textContent = "Signal not found.";
  ui.lead.textContent = message;
  ui.status.textContent = "Unavailable";
  ui.language.textContent = "—";
  ui.updated.textContent = "—";
  ui.readmeFact.textContent = "Unavailable";
  ui.readmeSource.textContent = "Unavailable";
  ui.media.hidden = true;
  if (repositoryName) {
    const unresolvedSource = `https://github.com/${OWNER}/${encodeURIComponent(repositoryName)}`;
    ui.sourceLink.href = unresolvedSource;
    ui.sourceLinkTop.href = unresolvedSource;
  }
  ui.toc.replaceChildren(
    createElement("p", { className: "index-placeholder", text: "No README route is available." })
  );
  ui.related.replaceChildren(
    createElement("p", { text: "No related repositories can be resolved for this route." })
  );
  const error = createElement("div", { className: "project-error" });
  error.append(
    createElement("h2", { text: "Return to the live index." }),
    createElement("p", { text: "The repository may be private, renamed, deleted, or missing from the public GitHub signal." }),
    createElement("a", {
      className: "action-link",
      text: "Open repository index",
      attributes: { href: "index.html#repositories" }
    })
  );
  ui.root.replaceChildren(error);
  ui.root.setAttribute("aria-busy", "false");
}

async function resolvePortfolioData() {
  let snapshot = null;
  try {
    snapshot = await loadSnapshot();
  } catch (error) {
    console.warn("Bundled snapshot unavailable on the project route.", error);
  }

  let repository = snapshot ? findRepository(snapshot, repositoryName) : null;
  let data = snapshot || normalizePortfolioData({ repositories: [] });

  if (!repository || !isSnapshotFresh(data)) {
    try {
      const live = await fetchLiveRepositories();
      data = mergePortfolioData(data, live.repositories);
      repository = findRepository(data, repositoryName);
    } catch (error) {
      console.info("Live repository lookup unavailable.", error);
    }
  }

  return { data, repository };
}

async function initialize() {
  if (!repositoryName) {
    renderFatal("A valid repository name was not provided.");
    return;
  }

  const { data, repository } = await resolvePortfolioData();
  if (!repository) {
    renderFatal(`The public repository “${repositoryName}” could not be resolved.`);
    return;
  }

  updateRepositoryIdentity(repository);
  renderRelated(repository, data);

  const readmeResult = await getReadmeMarkdown(repository, { preferLive: false });
  ui.readmeFact.textContent =
    readmeResult.source === "live"
      ? "Live GitHub"
      : readmeResult.source === "snapshot"
        ? "Bundled snapshot"
        : "Unavailable";
  ui.readmeSource.textContent = ui.readmeFact.textContent;

  if (!readmeResult.markdown) {
    renderReadmeUnavailable(repository);
    ui.root.setAttribute("aria-busy", "false");
    return;
  }

  const model = parseReadme(readmeResult.markdown, {
    owner: OWNER,
    repo: repository.name,
    defaultBranch: repository.defaultBranch,
    readmePath: repository.readme?.path || "README.md",
    repoUrl: repository.htmlUrl
  });

  updateRepositoryIdentity(repository, model);
  renderHeroMedia(model, repository);
  renderBadges(model);
  renderToc(model);
  if (model.sections.length) {
    renderReadme(model, ui.root, {
      renderHeader: false,
      copyLabel: "Copy",
      copiedLabel: "Copied"
    });
    decorateReadmeSections();
  } else {
    renderSparseReadme(repository);
  }
  ui.root.setAttribute("aria-busy", "false");
}

initialize().catch((error) => {
  console.error("Project route failed.", error);
  renderFatal("An unexpected rendering error interrupted this repository signal.");
});
