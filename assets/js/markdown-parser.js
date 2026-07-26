const SAFE_SCHEMES = new Set(["http:", "https:", "mailto:", "tel:"]);
const BLOCKED_SCHEME = /^(?:javascript|vbscript|data|file|blob|about):/i;
const BADGE_HOST_OR_PATH =
  /(?:shields\.io|badge\.fury\.io|badgen\.net|\/badge(?:s)?\/|\/actions\/workflows\/[^/]+\/badge\.svg)/i;
const BADGE_ALT = /\b(?:badge|status|build|coverage|license|version|downloads?|ci|cd)\b/i;

function asText(value) {
  return value == null ? "" : String(value);
}

function decodeHtmlEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: "\u00a0",
    quot: '"',
    mdash: "\u2014",
    ndash: "\u2013",
    middot: "\u00b7",
  };
  return asText(value).replace(
    /&(?:#(\d{1,7})|#x([a-fA-F\d]{1,6})|([a-zA-Z][a-zA-Z\d]+));/g,
    (entity, decimal, hexadecimal, name) => {
      if (name) return Object.hasOwn(named, name.toLowerCase()) ? named[name.toLowerCase()] : entity;
      const codePoint = Number.parseInt(decimal || hexadecimal, hexadecimal ? 16 : 10);
      if (
        !Number.isFinite(codePoint) ||
        codePoint <= 0 ||
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff)
      ) {
        return "\uFFFD";
      }
      return String.fromCodePoint(codePoint);
    },
  );
}

function normalizeContext(context = {}) {
  const ownerValue =
    typeof context.owner === "object" && context.owner
      ? context.owner.login || context.owner.name
      : context.owner;

  return {
    owner: asText(ownerValue || context.login).trim(),
    repo: asText(context.repo || context.repository || context.name).trim(),
    branch: asText(context.defaultBranch || context.branch || "main").trim() || "main",
    readmePath: asText(context.readmePath || context.path || "README.md")
      .replaceAll("\\", "/")
      .replace(/^\/+/, ""),
    repoUrl: asText(context.repoUrl || context.htmlUrl).trim(),
    baseUrl: asText(context.baseUrl).trim(),
    rawBaseUrl: asText(context.rawBaseUrl).trim(),
    kind: context.kind === "link" ? "link" : "image",
  };
}

function encodePath(path) {
  return path
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function relativePathFromReadme(value, readmePath) {
  const directory = readmePath.includes("/")
    ? readmePath.slice(0, readmePath.lastIndexOf("/") + 1)
    : "";
  const root = "https://readme.invalid/";
  const cleanValue = value.startsWith("/") ? value.replace(/^\/+/, "") : value;
  const encodedDirectory = encodePath(directory);

  try {
    const resolved = new URL(
      cleanValue,
      `${root}${encodedDirectory}${encodedDirectory ? "/" : ""}`,
    );
    return `${decodeURIComponent(resolved.pathname).replace(/^\/+/, "")}${resolved.search}${resolved.hash}`;
  } catch {
    return null;
  }
}

export function resolveReadmeUrl(url, context = {}) {
  const original = asText(url).trim().replace(/^<|>$/g, "");
  if (!original) return null;

  const compactPrefix = original.slice(0, 48).replace(/[\u0000-\u0020]+/g, "");
  if (BLOCKED_SCHEME.test(compactPrefix)) return null;
  if (original.startsWith("#")) return original;

  if (original.startsWith("//")) {
    try {
      const resolved = new URL(`https:${original}`);
      return resolved.protocol === "https:" ? resolved.href : null;
    } catch {
      return null;
    }
  }

  const explicitScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(original);
  if (explicitScheme) {
    try {
      const resolved = new URL(original);
      return SAFE_SCHEMES.has(resolved.protocol) ? resolved.href : null;
    } catch {
      return null;
    }
  }

  const normalized = normalizeContext(context);

  if (normalized.baseUrl) {
    try {
      const base = new URL(normalized.baseUrl);
      if (!SAFE_SCHEMES.has(base.protocol)) return null;
      const resolved = new URL(original, base);
      return SAFE_SCHEMES.has(resolved.protocol) ? resolved.href : null;
    } catch {
      return null;
    }
  }

  const relativePath = relativePathFromReadme(original, normalized.readmePath);
  if (!relativePath) return null;

  if (normalized.rawBaseUrl && normalized.kind === "image") {
    try {
      const rawBase = normalized.rawBaseUrl.endsWith("/")
        ? normalized.rawBaseUrl
        : `${normalized.rawBaseUrl}/`;
      const resolved = new URL(relativePath, rawBase);
      return SAFE_SCHEMES.has(resolved.protocol) ? resolved.href : null;
    } catch {
      return null;
    }
  }

  if (normalized.owner && normalized.repo) {
    const owner = encodeURIComponent(normalized.owner);
    const repo = encodeURIComponent(normalized.repo);
    const branch = encodePath(normalized.branch);
    const path = encodePath(relativePath.split(/[?#]/, 1)[0]);
    const suffix = relativePath.slice(relativePath.split(/[?#]/, 1)[0].length);

    if (normalized.kind === "link") {
      const repoUrl =
        normalized.repoUrl && /^https:\/\/github\.com\//i.test(normalized.repoUrl)
          ? normalized.repoUrl.replace(/\/+$/, "")
          : `https://github.com/${owner}/${repo}`;
      return `${repoUrl}/blob/${branch}/${path}${suffix}`;
    }

    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}${suffix}`;
  }

  // A relative URL is safe when no repository context exists. Keeping it
  // relative also makes the module useful for locally hosted Markdown.
  return original;
}

function normalizedHeading(title) {
  return asText(title)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[`*_~[\]():/\\|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SECTION_PATTERNS = [
  ["features", /\b(?:features?|capabilities|highlights|benefits|what it does|functionality)\b|tinh nang|chuc nang|diem noi bat/],
  ["gallery", /\b(?:demos?|screenshots?|gallery|preview|showcase|media|video)\b|hinh anh|minh hoa|trinh dien/],
  ["architecture", /\b(?:architecture|system design|structure|workflow|pipeline|how it works|data flow|design overview)\b|kien truc|so do|luong du lieu|cach hoat dong/],
  ["setup", /\b(?:install(?:ation)?|setup|getting started|quick ?start|prerequisites|requirements|build from source)\b|cai dat|thiet lap|bat dau|yeu cau/],
  ["usage", /\b(?:usage|how to use|examples?|commands?|cli|api|running|configuration)\b|cach dung|su dung|vi du|cau hinh|chay du an/],
  ["roadmap", /\b(?:roadmap|todo|future|planned|next steps|milestones?)\b|ke hoach|lo trinh|du kien|tuong lai/],
  ["utility", /\b(?:license|contributing|contributors|acknowledg(?:e)?ments?|contact|references|resources|support|faq|credits?|authors?|community|security)\b|giay phep|dong gop|lien he|tham khao|tac gia|cam on/],
];

export function classifySection(title) {
  const value = normalizedHeading(title);
  return SECTION_PATTERNS.find(([, pattern]) => pattern.test(value))?.[0] || "editorial";
}

function appendTextToken(tokens, value) {
  if (!value) return;
  const decodedValue = decodeHtmlEntities(value);
  const previous = tokens[tokens.length - 1];
  if (previous?.type === "text") previous.value += decodedValue;
  else tokens.push({ type: "text", value: decodedValue });
}

function findUnescaped(source, needle, from) {
  let cursor = from;
  while (cursor < source.length) {
    const found = source.indexOf(needle, cursor);
    if (found < 0) return -1;
    let slashCount = 0;
    for (let index = found - 1; index >= 0 && source[index] === "\\"; index -= 1) {
      slashCount += 1;
    }
    if (slashCount % 2 === 0) return found;
    cursor = found + needle.length;
  }
  return -1;
}

function findClosingBracket(source, from) {
  let depth = 0;
  for (let index = from; index < source.length; index += 1) {
    if (source[index] === "\\" && index + 1 < source.length) {
      index += 1;
      continue;
    }
    if (source[index] === "[") depth += 1;
    if (source[index] === "]") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function findClosingParenthesis(source, from) {
  let depth = 0;
  let quote = "";
  for (let index = from; index < source.length; index += 1) {
    const char = source[index];
    if (char === "\\" && index + 1 < source.length) {
      index += 1;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function parseDestination(value) {
  const trimmed = value.trim();
  if (!trimmed) return { url: "", title: "" };

  let url = "";
  let rest = "";
  if (trimmed.startsWith("<")) {
    const close = trimmed.indexOf(">");
    if (close < 0) return { url: trimmed, title: "" };
    url = trimmed.slice(1, close);
    rest = trimmed.slice(close + 1).trim();
  } else {
    let quote = "";
    let splitAt = -1;
    for (let index = 0; index < trimmed.length; index += 1) {
      const char = trimmed[index];
      if (char === "\\" && index + 1 < trimmed.length) {
        index += 1;
        continue;
      }
      if (quote) {
        if (char === quote) quote = "";
        continue;
      }
      if (char === '"' || char === "'") quote = char;
      if (!quote && /\s/.test(char)) {
        splitAt = index;
        break;
      }
    }
    url = splitAt < 0 ? trimmed : trimmed.slice(0, splitAt);
    rest = splitAt < 0 ? "" : trimmed.slice(splitAt).trim();
  }

  let title = "";
  const titleMatch = rest.match(/^(?:"([^"]*)"|'([^']*)'|\(([^)]*)\))$/);
  if (titleMatch) title = titleMatch[1] ?? titleMatch[2] ?? titleMatch[3] ?? "";
  return {
    url: decodeHtmlEntities(url.replace(/\\([() ])/g, "$1")),
    title: decodeHtmlEntities(title),
  };
}

function parseHtmlAttributes(source) {
  const attributes = Object.create(null);
  const tagBody = source
    .replace(/^<\/?[a-zA-Z][\w:-]*/, "")
    .replace(/\/?>\s*$/, "");
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = pattern.exec(tagBody))) {
    const name = match[1].toLowerCase();
    if (Object.hasOwn(attributes, name)) continue;
    attributes[name] = decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function findClosingHtmlTag(source, tagName, from) {
  const expression = new RegExp(`<\\/${tagName}\\s*>`, "gi");
  expression.lastIndex = from;
  const match = expression.exec(source);
  return match ? { index: match.index, end: expression.lastIndex } : null;
}

function parseInline(source, context, depth = 0) {
  const text = asText(source);
  const tokens = [];
  if (depth > 8) return [{ type: "text", value: text }];

  let index = 0;
  while (index < text.length) {
    const char = text[index];

    if (char === "\\" && index + 1 < text.length) {
      appendTextToken(tokens, text[index + 1]);
      index += 2;
      continue;
    }

    if (char === "\n") {
      tokens.push({ type: "break" });
      index += 1;
      continue;
    }

    if (char === "`") {
      let markerLength = 1;
      while (text[index + markerLength] === "`") markerLength += 1;
      const marker = "`".repeat(markerLength);
      const close = findUnescaped(text, marker, index + markerLength);
      if (close >= 0) {
        let value = text.slice(index + markerLength, close).replace(/\n/g, " ");
        if (/^ .+ $/.test(value) && !/^ +$/.test(value)) value = value.slice(1, -1);
        tokens.push({ type: "code", value });
        index = close + markerLength;
        continue;
      }
    }

    const isImage = char === "!" && text[index + 1] === "[";
    const isLink = char === "[";
    if (isImage || isLink) {
      const bracketStart = isImage ? index + 1 : index;
      const bracketEnd = findClosingBracket(text, bracketStart);
      if (bracketEnd >= 0 && text[bracketEnd + 1] === "(") {
        const parenEnd = findClosingParenthesis(text, bracketEnd + 1);
        if (parenEnd >= 0) {
          const label = text.slice(bracketStart + 1, bracketEnd);
          const destination = parseDestination(text.slice(bracketEnd + 2, parenEnd));
          if (isImage) {
            tokens.push({
              type: "image",
              alt: label.replace(/[*_~`]/g, "").trim(),
              src: resolveReadmeUrl(destination.url, { ...context, kind: "image" }),
              title: destination.title,
              originalUrl: destination.url,
            });
          } else {
            tokens.push({
              type: "link",
              children: parseInline(label, context, depth + 1),
              href: resolveReadmeUrl(destination.url, { ...context, kind: "link" }),
              title: destination.title,
              originalUrl: destination.url,
            });
          }
          index = parenEnd + 1;
          continue;
        }
      }
    }

    if (char === "<") {
      const close = text.indexOf(">", index + 1);
      if (close >= 0) {
        const candidate = text.slice(index + 1, close).trim();
        if (/^(?:https?:\/\/|mailto:)/i.test(candidate)) {
          const href = resolveReadmeUrl(candidate, { ...context, kind: "link" });
          tokens.push({
            type: "link",
            children: [{ type: "text", value: candidate.replace(/^mailto:/i, "") }],
            href,
            title: "",
            originalUrl: candidate,
          });
          index = close + 1;
          continue;
        }
        if (/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(candidate)) {
          tokens.push({
            type: "link",
            children: [{ type: "text", value: candidate }],
            href: `mailto:${candidate}`,
            title: "",
            originalUrl: candidate,
          });
          index = close + 1;
          continue;
        }
      }

      const remainder = text.slice(index);
      const forbidden = remainder.match(
        /^<(script|style|iframe|object|embed|form)\b[^>]*>/i,
      );
      if (forbidden) {
        const tagName = forbidden[1];
        const closing = findClosingHtmlTag(text, tagName, index + forbidden[0].length);
        const end = closing ? closing.end : text.length;
        appendTextToken(tokens, text.slice(index, end));
        index = end;
        continue;
      }

      const htmlImage = remainder.match(/^<img\b[^>]*\/?>/i);
      if (htmlImage) {
        const attributes = parseHtmlAttributes(htmlImage[0]);
        tokens.push({
          type: "image",
          alt: attributes.alt || "",
          src: resolveReadmeUrl(attributes.src, { ...context, kind: "image" }),
          title: attributes.title || "",
          originalUrl: attributes.src || "",
        });
        index += htmlImage[0].length;
        continue;
      }

      const htmlLink = remainder.match(/^<a\b[^>]*>/i);
      if (htmlLink) {
        const closing = findClosingHtmlTag(text, "a", index + htmlLink[0].length);
        if (closing) {
          const attributes = parseHtmlAttributes(htmlLink[0]);
          const label = text.slice(index + htmlLink[0].length, closing.index);
          tokens.push({
            type: "link",
            children: parseInline(label, context, depth + 1),
            href: resolveReadmeUrl(attributes.href, { ...context, kind: "link" }),
            title: attributes.title || "",
            originalUrl: attributes.href || "",
          });
          index = closing.end;
          continue;
        }
      }

      const pairedHtml = remainder.match(/^<(strong|b|em|i|code|del|s)\b[^>]*>/i);
      if (pairedHtml) {
        const tagName = pairedHtml[1];
        const closing = findClosingHtmlTag(text, tagName, index + pairedHtml[0].length);
        if (closing) {
          const inner = text.slice(index + pairedHtml[0].length, closing.index);
          const tokenType = /^(?:strong|b)$/i.test(tagName)
            ? "strong"
            : /^(?:em|i)$/i.test(tagName)
              ? "emphasis"
              : /^(?:del|s)$/i.test(tagName)
                ? "delete"
                : "code";
          if (tokenType === "code") {
            tokens.push({ type: "code", value: decodeHtmlEntities(inner) });
          } else {
            tokens.push({
              type: tokenType,
              children: parseInline(inner, context, depth + 1),
            });
          }
          index = closing.end;
          continue;
        }
      }

      const htmlBreak = remainder.match(/^<br\b[^>]*\/?>/i);
      if (htmlBreak) {
        tokens.push({ type: "break" });
        index += htmlBreak[0].length;
        continue;
      }

      const structuralHtml = remainder.match(
        /^<\/?(?:p|div|span|center|picture|source|table|thead|tbody|tfoot|tr|td|th|details|summary|small|sup|sub|h[1-6])\b[^>]*>/i,
      );
      if (structuralHtml) {
        index += structuralHtml[0].length;
        continue;
      }
    }

    const pairedMarkers = [
      ["**", "strong"],
      ["__", "strong"],
      ["~~", "delete"],
      ["*", "emphasis"],
      ["_", "emphasis"],
    ];
    let matchedPair = false;
    for (const [marker, type] of pairedMarkers) {
      if (!text.startsWith(marker, index)) continue;
      const close = findUnescaped(text, marker, index + marker.length);
      if (close <= index + marker.length) continue;
      const inner = text.slice(index + marker.length, close);
      tokens.push({ type, children: parseInline(inner, context, depth + 1) });
      index = close + marker.length;
      matchedPair = true;
      break;
    }
    if (matchedPair) continue;

    const special = /[\\`\n![<*_~]/;
    let end = index + 1;
    while (end < text.length && !special.test(text[end])) end += 1;
    appendTextToken(tokens, text.slice(index, end));
    index = end;
  }

  return tokens;
}

function inlineText(tokens) {
  return (tokens || [])
    .map((token) => {
      if (token.type === "text" || token.type === "code") return token.value;
      if (token.type === "image") return token.alt;
      if (token.type === "break") return " ";
      if (token.children) return inlineText(token.children);
      return "";
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function isFence(line) {
  return line.match(/^ {0,3}(`{3,}|~{3,})\s*(.*)$/);
}

function listMatch(line) {
  const unordered = line.match(/^(\s{0,3})[-+*]\s+(.+)$/);
  if (unordered) return { ordered: false, marker: "-", value: unordered[2], start: 1 };
  const ordered = line.match(/^(\s{0,3})(\d+)[.)]\s+(.+)$/);
  if (ordered) {
    return {
      ordered: true,
      marker: ordered[2],
      value: ordered[3],
      start: Number.parseInt(ordered[2], 10) || 1,
    };
  }
  return null;
}

function isThematicBreak(line) {
  return /^ {0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(line.trim());
}

function splitTableRow(line) {
  let value = line.trim();
  if (value.startsWith("|")) value = value.slice(1);
  if (value.endsWith("|") && !value.endsWith("\\|")) value = value.slice(0, -1);

  const cells = [];
  let current = "";
  let codeMarker = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "\\" && value[index + 1] === "|") {
      current += "|";
      index += 1;
      continue;
    }
    if (char === "`") codeMarker = !codeMarker;
    if (char === "|" && !codeMarker) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function tableDelimiter(line) {
  const cells = splitTableRow(line);
  if (!cells.length || !cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")))) {
    return null;
  }
  return cells.map((cell) => {
    const clean = cell.replace(/\s/g, "");
    if (clean.startsWith(":") && clean.endsWith(":")) return "center";
    if (clean.endsWith(":")) return "right";
    if (clean.startsWith(":")) return "left";
    return null;
  });
}

function isBlockStart(lines, index) {
  const line = lines[index] ?? "";
  if (!line.trim()) return true;
  if (isFence(line)) return true;
  if (/^ {0,3}#{1,6}\s+/.test(line)) return true;
  if (/^ {0,3}>\s?/.test(line)) return true;
  if (listMatch(line)) return true;
  if (isThematicBreak(line)) return true;
  if (
    index + 1 < lines.length &&
    line.includes("|") &&
    tableDelimiter(lines[index + 1])
  ) {
    return true;
  }
  return false;
}

function parseBlocks(markdown, context) {
  const lines = asText(markdown).replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = isFence(line);
    if (fence) {
      const marker = fence[1];
      const info = fence[2].trim();
      const language = info.split(/\s+/, 1)[0].replace(/[^\w#+.-]/g, "");
      const code = [];
      index += 1;
      while (index < lines.length && !new RegExp(`^ {0,3}${marker[0]}{${marker.length},}\\s*$`).test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({
        type: "codeBlock",
        language,
        meta: info.slice(language.length).trim(),
        value: code.join("\n"),
      });
      continue;
    }

    const heading = line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const tokens = parseInline(heading[2], context);
      blocks.push({
        type: "heading",
        level: heading[1].length,
        tokens,
        text: inlineText(tokens),
      });
      index += 1;
      continue;
    }

    if (isThematicBreak(line)) {
      blocks.push({ type: "thematicBreak" });
      index += 1;
      continue;
    }

    if (/^ {0,3}>\s?/.test(line)) {
      const quoteLines = [];
      while (index < lines.length && (/^ {0,3}>\s?/.test(lines[index]) || !lines[index].trim())) {
        quoteLines.push(lines[index].replace(/^ {0,3}>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", blocks: parseBlocks(quoteLines.join("\n"), context) });
      continue;
    }

    const firstListItem = listMatch(line);
    if (firstListItem) {
      const ordered = firstListItem.ordered;
      const items = [];
      const start = firstListItem.start;
      while (index < lines.length) {
        const match = listMatch(lines[index]);
        if (!match || match.ordered !== ordered) break;
        let itemValue = match.value;
        index += 1;
        while (
          index < lines.length &&
          lines[index].trim() &&
          !listMatch(lines[index]) &&
          !isBlockStart(lines, index) &&
          /^\s{2,}/.test(lines[index])
        ) {
          itemValue += ` ${lines[index].trim()}`;
          index += 1;
        }
        const task = itemValue.match(/^\[([ xX])]\s+(.*)$/);
        items.push({
          tokens: parseInline(task ? task[2] : itemValue, context),
          checked: task ? task[1].toLowerCase() === "x" : null,
        });
      }
      blocks.push({ type: "list", ordered, start, items });
      continue;
    }

    if (
      line.includes("|") &&
      index + 1 < lines.length &&
      tableDelimiter(lines[index + 1])
    ) {
      const align = tableDelimiter(lines[index + 1]);
      const header = splitTableRow(line).map((cell) => parseInline(cell, context));
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].trim() && lines[index].includes("|")) {
        const cells = splitTableRow(lines[index]);
        while (cells.length < header.length) cells.push("");
        rows.push(cells.slice(0, header.length).map((cell) => parseInline(cell, context)));
        index += 1;
      }
      blocks.push({ type: "table", header, align, rows });
      continue;
    }

    const paragraphLines = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    let paragraph = "";
    for (const paragraphLine of paragraphLines) {
      if (!paragraph) {
        paragraph = paragraphLine;
      } else if (/ {2}$/.test(paragraph)) {
        paragraph = `${paragraph.trimEnd()}\n${paragraphLine}`;
      } else {
        paragraph += ` ${paragraphLine}`;
      }
    }
    blocks.push({ type: "paragraph", tokens: parseInline(paragraph, context) });
  }

  return blocks;
}

function tokenImages(tokens, link = null, result = []) {
  for (const token of tokens || []) {
    if (token.type === "image") result.push({ image: token, link });
    if (token.children) {
      tokenImages(token.children, token.type === "link" ? token : link, result);
    }
  }
  return result;
}

function tokenIsOnlyMedia(token) {
  if (token.type === "text") return !token.value.trim();
  if (token.type === "image") return true;
  if (token.type === "link") return token.children.length > 0 && token.children.every(tokenIsOnlyMedia);
  return false;
}

function badgeParagraph(block) {
  if (block.type !== "paragraph" || !block.tokens.length) return false;
  const mediaOnly = block.tokens.every(tokenIsOnlyMedia);
  if (!mediaOnly) return false;
  const images = tokenImages(block.tokens);
  return (
    images.length > 0 &&
    images.some(({ image }) => BADGE_HOST_OR_PATH.test(image.originalUrl) || BADGE_ALT.test(image.alt))
  );
}

function meaningfulImage(block) {
  if (block.type !== "paragraph") return null;
  const images = tokenImages(block.tokens);
  const candidate = images.find(
    ({ image }) =>
      image.src &&
      !BADGE_HOST_OR_PATH.test(image.originalUrl) &&
      !BADGE_ALT.test(image.alt),
  );
  if (!candidate) return null;
  return {
    ...candidate,
    standalone: images.length === 1 && block.tokens.every(tokenIsOnlyMedia),
  };
}

function slugify(value) {
  const slug = normalizedHeading(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

function uniqueSlug(value, used) {
  const base = slugify(value);
  let slug = base;
  let suffix = 1;
  while (used.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(slug);
  return slug;
}

function fragmentSlug(value) {
  const source = asText(value).replace(/^#/, "");
  try {
    return slugify(decodeURIComponent(source));
  } catch {
    return slugify(source);
  }
}

function rewriteLocalFragments(value, targets, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (typeof value.href === "string" && value.href.startsWith("#")) {
    value.href = targets.get(fragmentSlug(value.href)) ? `#${targets.get(fragmentSlug(value.href))}` : value.href;
  }
  for (const nested of Object.values(value)) rewriteLocalFragments(nested, targets, seen);
}

function normalizeSafeHtmlStructure(markdown) {
  return asText(markdown)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi,
      (_match, level, content) =>
        `\n${"#".repeat(Number.parseInt(level, 10))} ${content
          .replace(/\r?\n/g, " ")
          .trim()}\n`,
    )
    .replace(
      /(<\/(?:p|div|center|table|details|summary)\s*>)\s*(?=<)/gi,
      "$1\n\n",
    );
}

export function parseReadme(markdown, context = {}) {
  const normalizedMarkdown = normalizeSafeHtmlStructure(
    asText(markdown).replace(/^\uFEFF/, ""),
  );
  const blocks = parseBlocks(normalizedMarkdown, context);
  const working = [...blocks];

  const titleIndex = working.findIndex(
    (block) => block.type === "heading" && block.level === 1,
  );
  const titleBlock = titleIndex >= 0 ? working.splice(titleIndex, 1)[0] : null;
  const title =
    titleBlock?.text ||
    asText(context.title || context.repo || context.repository || "README").trim() ||
    "README";
  const usedSlugs = new Set();
  const fragmentTargets = new Map();
  const titleId = uniqueSlug(title, usedSlugs);
  fragmentTargets.set(slugify(title), titleId);
  fragmentTargets.set(titleId, titleId);

  const badges = [];
  let firstSectionIndex = working.findIndex(
    (block) => block.type === "heading" && block.level === 2,
  );
  if (firstSectionIndex < 0) firstSectionIndex = working.length;
  for (let cursor = firstSectionIndex - 1; cursor >= 0; cursor -= 1) {
    if (badgeParagraph(working[cursor])) {
      badges.unshift(...working[cursor].tokens);
      working.splice(cursor, 1);
    }
  }

  firstSectionIndex = working.findIndex(
    (block) => block.type === "heading" && block.level === 2,
  );
  if (firstSectionIndex < 0) firstSectionIndex = working.length;
  const leadIndex = working.findIndex(
    (block, blockIndex) =>
      blockIndex < firstSectionIndex &&
      block.type === "paragraph" &&
      !tokenImages(block.tokens).length &&
      inlineText(block.tokens),
  );
  const leadBlock = leadIndex >= 0 ? working.splice(leadIndex, 1)[0] : null;

  let hero = null;
  for (let cursor = 0; cursor < working.length; cursor += 1) {
    const candidate = meaningfulImage(working[cursor]);
    if (!candidate) continue;
    hero = {
      src: candidate.image.src,
      alt: candidate.image.alt,
      title: candidate.image.title,
      href: candidate.link?.href || null,
    };
    if (candidate.standalone) working.splice(cursor, 1);
    break;
  }

  const sections = [];
  let current = {
    id: "readme-overview",
    title: "",
    kind: "editorial",
    blocks: [],
  };

  for (const block of working) {
    if (block.type === "heading") {
      block.id = uniqueSlug(block.text, usedSlugs);
      const fragment = slugify(block.text);
      if (!fragmentTargets.has(fragment)) fragmentTargets.set(fragment, block.id);
      fragmentTargets.set(block.id, block.id);
    }
    if (block.type === "heading" && block.level === 2) {
      if (current.blocks.length || current.title) sections.push(current);
      current = {
        id: block.id,
        title: block.text,
        titleTokens: block.tokens,
        kind: classifySection(block.text),
        blocks: [],
      };
    } else {
      current.blocks.push(block);
    }
  }
  if (current.blocks.length || current.title) sections.push(current);

  const model = {
    version: 1,
    title,
    titleId,
    titleTokens: titleBlock?.tokens || [{ type: "text", value: title }],
    lead: leadBlock
      ? { text: inlineText(leadBlock.tokens), tokens: leadBlock.tokens }
      : null,
    badges,
    hero,
    sections,
    context: {
      owner: normalizeContext(context).owner,
      repo: normalizeContext(context).repo,
      branch: normalizeContext(context).branch,
      readmePath: normalizeContext(context).readmePath,
    },
  };
  rewriteLocalFragments(model, fragmentTargets);
  return model;
}
