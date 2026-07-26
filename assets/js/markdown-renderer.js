import { classifySection, parseReadme, resolveReadmeUrl } from "./markdown-parser.js";

export { classifySection, parseReadme, resolveReadmeUrl };

function addClass(element, ...names) {
  const value = names.filter(Boolean).join(" ");
  if (value) element.setAttribute("class", value);
}

function appendInline(tokens, parent, options) {
  const document = parent.ownerDocument;
  for (const token of tokens || []) {
    if (token.type === "text") {
      parent.append(document.createTextNode(token.value));
      continue;
    }
    if (token.type === "break") {
      parent.append(document.createElement("br"));
      continue;
    }
    if (token.type === "code") {
      const code = document.createElement("code");
      code.textContent = token.value;
      parent.append(code);
      continue;
    }
    if (token.type === "strong" || token.type === "emphasis" || token.type === "delete") {
      const tag = token.type === "strong" ? "strong" : token.type === "emphasis" ? "em" : "del";
      const element = document.createElement(tag);
      appendInline(token.children, element, options);
      parent.append(element);
      continue;
    }
    if (token.type === "link") {
      const safeHref = resolveReadmeUrl(token.href, { kind: "link" });
      if (!safeHref) {
        appendInline(token.children, parent, options);
        continue;
      }
      const anchor = document.createElement("a");
      anchor.setAttribute("href", safeHref);
      if (token.title) anchor.setAttribute("title", token.title);
      if (/^https?:\/\//i.test(safeHref) && options.externalLinksNewTab !== false) {
        anchor.setAttribute("target", "_blank");
        anchor.setAttribute("rel", "noopener noreferrer");
      }
      if (typeof options.onNavigate === "function") {
        anchor.addEventListener("click", (event) => options.onNavigate(event, token));
      }
      appendInline(token.children, anchor, options);
      parent.append(anchor);
      continue;
    }
    if (token.type === "image") {
      const safeSource = resolveReadmeUrl(token.src, { kind: "image" });
      if (!safeSource) {
        if (token.alt) parent.append(document.createTextNode(token.alt));
        continue;
      }
      const image = document.createElement("img");
      image.setAttribute("src", safeSource);
      image.setAttribute("alt", token.alt || "");
      image.setAttribute("loading", "lazy");
      image.setAttribute("decoding", "async");
      if (token.title) image.setAttribute("title", token.title);
      parent.append(image);
    }
  }
}

async function copyCode(value, button, options) {
  const initial = options.copyLabel || "Copy";
  try {
    if (typeof options.copyText === "function") {
      await options.copyText(value);
    } else if (globalThis.navigator?.clipboard?.writeText) {
      await globalThis.navigator.clipboard.writeText(value);
    } else {
      const document = button.ownerDocument;
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.setAttribute("aria-hidden", "true");
      textarea.setAttribute(
        "style",
        "position:fixed;inset:auto auto 0 -9999px;opacity:0;pointer-events:none",
      );
      document.body.append(textarea);
      textarea.select();
      if (!document.execCommand?.("copy")) throw new Error("Copy is unavailable");
      textarea.remove();
    }
    button.textContent = options.copiedLabel || "Copied";
    button.setAttribute("data-copy-state", "success");
  } catch {
    button.textContent = options.copyErrorLabel || "Copy failed";
    button.setAttribute("data-copy-state", "error");
  }
  globalThis.setTimeout?.(() => {
    button.textContent = initial;
    button.setAttribute("data-copy-state", "idle");
  }, 1600);
}

function renderBlock(block, parent, options) {
  const document = parent.ownerDocument;
  const headingOffset = Math.max(0, Math.min(3, Number(options.headingOffset) || 0));

  if (block.type === "paragraph") {
    const paragraph = document.createElement("p");
    addClass(paragraph, "readme-paragraph");
    appendInline(block.tokens, paragraph, options);
    parent.append(paragraph);
    return;
  }

  if (block.type === "heading") {
    const level = Math.min(6, Math.max(3, block.level + headingOffset));
    const heading = document.createElement(`h${level}`);
    addClass(heading, "readme-subheading");
    if (block.id) heading.setAttribute("id", block.id);
    appendInline(block.tokens, heading, options);
    parent.append(heading);
    return;
  }

  if (block.type === "thematicBreak") {
    parent.append(document.createElement("hr"));
    return;
  }

  if (block.type === "blockquote") {
    const quote = document.createElement("blockquote");
    addClass(quote, "readme-quote");
    for (const child of block.blocks) renderBlock(child, quote, options);
    parent.append(quote);
    return;
  }

  if (block.type === "list") {
    const list = document.createElement(block.ordered ? "ol" : "ul");
    addClass(
      list,
      "readme-list",
      block.items.some((item) => item.checked !== null) ? "readme-task-list" : "",
    );
    if (block.ordered && block.start !== 1) list.setAttribute("start", String(block.start));
    for (const item of block.items) {
      const listItem = document.createElement("li");
      if (item.checked !== null) {
        addClass(listItem, "readme-task");
        const checkbox = document.createElement("input");
        checkbox.setAttribute("type", "checkbox");
        checkbox.setAttribute("disabled", "");
        checkbox.setAttribute("aria-label", item.checked ? "Completed" : "Not completed");
        if (item.checked) checkbox.setAttribute("checked", "");
        listItem.append(checkbox);
      }
      appendInline(item.tokens, listItem, options);
      list.append(listItem);
    }
    parent.append(list);
    return;
  }

  if (block.type === "codeBlock") {
    const figure = document.createElement("figure");
    addClass(figure, "readme-code");
    const toolbar = document.createElement("figcaption");
    addClass(toolbar, "readme-code__toolbar");
    const language = document.createElement("span");
    language.textContent = block.language || "text";
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute("data-copy-state", "idle");
    button.setAttribute("aria-label", `${options.copyLabel || "Copy"} code`);
    button.textContent = options.copyLabel || "Copy";
    button.addEventListener("click", () => copyCode(block.value, button, options));
    toolbar.append(language, button);
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    if (block.language) {
      code.setAttribute("class", `language-${block.language.replace(/[^\w-]/g, "")}`);
      code.setAttribute("data-language", block.language);
    }
    code.textContent = block.value;
    pre.append(code);
    figure.append(toolbar, pre);
    parent.append(figure);
    return;
  }

  if (block.type === "table") {
    const wrapper = document.createElement("div");
    addClass(wrapper, "readme-table-wrap");
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("tabindex", "0");
    wrapper.setAttribute("aria-label", "Scrollable data table");
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headingRow = document.createElement("tr");
    block.header.forEach((cell, cellIndex) => {
      const headingCell = document.createElement("th");
      headingCell.setAttribute("scope", "col");
      if (block.align[cellIndex]) {
        headingCell.setAttribute("data-align", block.align[cellIndex]);
      }
      appendInline(cell, headingCell, options);
      headingRow.append(headingCell);
    });
    thead.append(headingRow);
    const tbody = document.createElement("tbody");
    for (const row of block.rows) {
      const tableRow = document.createElement("tr");
      row.forEach((cell, cellIndex) => {
        const tableCell = document.createElement("td");
        if (block.align[cellIndex]) tableCell.setAttribute("data-align", block.align[cellIndex]);
        appendInline(cell, tableCell, options);
        tableRow.append(tableCell);
      });
      tbody.append(tableRow);
    }
    table.append(thead, tbody);
    wrapper.append(table);
    parent.append(wrapper);
  }
}

/**
 * Render a parseReadme model into a container. Returns the created <article>.
 */
export function renderReadme(model, container, options = {}) {
  if (!model || typeof model !== "object") {
    throw new TypeError("renderReadme requires a parsed README model");
  }
  if (!container?.ownerDocument || typeof container.replaceChildren !== "function") {
    throw new TypeError("renderReadme requires a DOM container");
  }

  const document = container.ownerDocument;
  const article = document.createElement("article");
  addClass(article, "readme-document");
  article.setAttribute("data-readme-version", String(model.version || 1));

  if (options.renderHeader !== false) {
    const header = document.createElement("header");
    addClass(header, "readme-header");
    const title = document.createElement("h1");
    addClass(title, "readme-title");
    if (model.titleId) title.setAttribute("id", model.titleId);
    appendInline(model.titleTokens || [{ type: "text", value: model.title }], title, options);
    header.append(title);

    if (model.lead?.tokens?.length) {
      const lead = document.createElement("p");
      addClass(lead, "readme-lead");
      appendInline(model.lead.tokens, lead, options);
      header.append(lead);
    }

    if (model.badges?.length) {
      const badges = document.createElement("div");
      addClass(badges, "readme-badges");
      badges.setAttribute("role", "list");
      const badge = document.createElement("span");
      badge.setAttribute("role", "listitem");
      appendInline(model.badges, badge, options);
      badges.append(badge);
      header.append(badges);
    }

    const safeHeroSource = resolveReadmeUrl(model.hero?.src, { kind: "image" });
    if (safeHeroSource) {
      const figure = document.createElement("figure");
      addClass(figure, "readme-hero");
      const image = document.createElement("img");
      image.setAttribute("src", safeHeroSource);
      image.setAttribute("alt", model.hero.alt || "");
      image.setAttribute("loading", "eager");
      image.setAttribute("decoding", "async");
      image.setAttribute("fetchpriority", "high");
      if (model.hero.title) image.setAttribute("title", model.hero.title);
      const safeHeroHref = resolveReadmeUrl(model.hero.href, { kind: "link" });
      if (safeHeroHref) {
        const anchor = document.createElement("a");
        anchor.setAttribute("href", safeHeroHref);
        if (/^https?:\/\//i.test(safeHeroHref) && options.externalLinksNewTab !== false) {
          anchor.setAttribute("target", "_blank");
          anchor.setAttribute("rel", "noopener noreferrer");
        }
        anchor.append(image);
        figure.append(anchor);
      } else {
        figure.append(image);
      }
      header.append(figure);
    }
    article.append(header);
  }

  for (const sectionModel of model.sections || []) {
    const section = document.createElement("section");
    addClass(
      section,
      "readme-section",
      `readme-section--${sectionModel.kind || "editorial"}`,
    );
    section.setAttribute("data-section-kind", sectionModel.kind || "editorial");
    if (sectionModel.id) section.setAttribute("id", sectionModel.id);

    if (sectionModel.title) {
      const heading = document.createElement("h2");
      addClass(heading, "readme-section__title");
      appendInline(
        sectionModel.titleTokens || [{ type: "text", value: sectionModel.title }],
        heading,
        options,
      );
      section.append(heading);
    }
    for (const block of sectionModel.blocks || []) renderBlock(block, section, options);
    article.append(section);
  }

  container.replaceChildren(article);
  return article;
}
