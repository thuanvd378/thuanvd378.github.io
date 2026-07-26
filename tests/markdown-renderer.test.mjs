import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// The production file is a browser-native ES module. Importing it through a
// data URL keeps this test runnable with plain `node --test` even when the
// repository intentionally has no package.json / "type": "module".
const parserSource = await readFile(
  new URL("../assets/js/markdown-parser.js", import.meta.url),
  "utf8",
);
const parserUrl = `data:text/javascript;base64,${Buffer.from(parserSource).toString("base64")}`;
const rendererSource = await readFile(
  new URL("../assets/js/markdown-renderer.js", import.meta.url),
  "utf8",
);
const linkedRendererSource = rendererSource.replace("./markdown-parser.js", parserUrl);
const moduleUrl = `data:text/javascript;base64,${Buffer.from(linkedRendererSource).toString("base64")}`;
const {
  classifySection,
  parseReadme,
  renderReadme,
  resolveReadmeUrl,
} = await import(moduleUrl);

const context = {
  owner: "thuanvd378",
  repo: "sensor-node",
  defaultBranch: "main",
  readmePath: "docs/README.md",
  repoUrl: "https://github.com/thuanvd378/sensor-node",
};

test("classifySection recognizes English and Vietnamese section intent", () => {
  assert.equal(classifySection("Key Features"), "features");
  assert.equal(classifySection("Ảnh chụp & Demo"), "gallery");
  assert.equal(classifySection("Kiến trúc hệ thống"), "architecture");
  assert.equal(classifySection("Quick Start"), "setup");
  assert.equal(classifySection("Cách sử dụng"), "usage");
  assert.equal(classifySection("Lộ trình 2027"), "roadmap");
  assert.equal(classifySection("License & Contributors"), "utility");
  assert.equal(classifySection("Why I built this"), "editorial");
});

test("resolveReadmeUrl resolves repository links and rejects executable schemes", () => {
  assert.equal(
    resolveReadmeUrl("../media/demo.png", { ...context, kind: "image" }),
    "https://raw.githubusercontent.com/thuanvd378/sensor-node/main/media/demo.png",
  );
  assert.equal(
    resolveReadmeUrl("./guide.md#run", { ...context, kind: "link" }),
    "https://github.com/thuanvd378/sensor-node/blob/main/docs/guide.md#run",
  );
  assert.equal(resolveReadmeUrl("#configuration", context), "#configuration");
  assert.equal(resolveReadmeUrl("javascript:alert(1)", context), null);
  assert.equal(resolveReadmeUrl("java\nscript:alert(1)", context), null);
  assert.equal(resolveReadmeUrl("data:text/html,<script>", context), null);
  assert.equal(
    resolveReadmeUrl("https://example.com/a?q=1", context),
    "https://example.com/a?q=1",
  );
});

test("Vietnamese README fragments are rewritten to generated heading IDs", () => {
  const model = parseReadme(
    `# CodeX Photo

[Tính năng](#tính-năng-chính) · [Cài đặt](#cài-đặt-và-chạy)

## Tính năng chính

Desktop editing without a cloud round-trip.

## Cài đặt và chạy

### Cấu hình API key

[Đi tới cấu hình](#cấu-hình-api-key)`,
    context,
  );

  assert.equal(model.titleId, "codex-photo");
  assert.deepEqual(
    model.sections.map((section) => section.id),
    ["tinh-nang-chinh", "cai-dat-va-chay"],
  );
  assert.deepEqual(
    model.lead.tokens.filter((token) => token.type === "link").map((token) => token.href),
    ["#tinh-nang-chinh", "#cai-dat-va-chay"],
  );
  const setup = model.sections[1];
  const subheading = setup.blocks.find((block) => block.type === "heading");
  assert.equal(subheading.id, "cau-hinh-api-key");
  const jump = setup.blocks
    .flatMap((block) => block.tokens || [])
    .find((token) => token.type === "link");
  assert.equal(jump.href, "#cau-hinh-api-key");
});

test("parseReadme builds a deterministic portfolio model from a rich README", () => {
  const fixture = `# Sensor Node

An **edge-first** telemetry node for small labs.

[![Build](https://github.com/thuanvd378/sensor-node/actions/workflows/test.yml/badge.svg)](https://github.com/thuanvd378/sensor-node/actions)
![Version](https://img.shields.io/badge/version-1.2-blue)

[![Sensor Node dashboard](../media/dashboard.png "Dashboard")](https://example.com/demo)

## Key Features

- [x] Reads three sensors
- [ ] Add LoRa transport
- Publishes to [the gateway](./gateway.md)

> Designed for intermittent networks.

## Architecture

| Layer | Runtime | State |
| :--- | ---: | :---: |
| Edge | C++ | Ready |
| Cloud | Python | Beta |

## Installation

\`\`\`bash
cmake -S . -B build
cmake --build build
\`\`\`

## Usage

Run \`./sensor-node --config config.toml\`.

<script>alert("never execute")</script>
[bad](javascript:alert(1))

## Roadmap

1. CAN bus
2. OTA updates
`;

  const model = parseReadme(fixture, context);
  assert.equal(model.version, 1);
  assert.equal(model.title, "Sensor Node");
  assert.equal(model.lead.text, "An edge-first telemetry node for small labs.");
  assert.equal(model.badges.filter((token) => token.type === "link").length, 1);
  assert.equal(
    model.hero.src,
    "https://raw.githubusercontent.com/thuanvd378/sensor-node/main/media/dashboard.png",
  );
  assert.equal(model.hero.href, "https://example.com/demo");

  assert.deepEqual(
    model.sections.filter((section) => section.title).map((section) => section.kind),
    ["features", "architecture", "setup", "usage", "roadmap"],
  );

  const features = model.sections.find((section) => section.kind === "features");
  const taskList = features.blocks.find((block) => block.type === "list");
  assert.deepEqual(
    taskList.items.map((item) => item.checked),
    [true, false, null],
  );
  const gateway = taskList.items[2].tokens.find((token) => token.type === "link");
  assert.equal(
    gateway.href,
    "https://github.com/thuanvd378/sensor-node/blob/main/docs/gateway.md",
  );

  const architecture = model.sections.find((section) => section.kind === "architecture");
  const table = architecture.blocks.find((block) => block.type === "table");
  assert.deepEqual(table.align, ["left", "right", "center"]);
  assert.equal(table.rows.length, 2);

  const setup = model.sections.find((section) => section.kind === "setup");
  const code = setup.blocks.find((block) => block.type === "codeBlock");
  assert.equal(code.language, "bash");
  assert.match(code.value, /cmake --build build/);

  const usage = model.sections.find((section) => section.kind === "usage");
  const serializedUsage = JSON.stringify(usage);
  assert.match(serializedUsage, /<script>alert/);
  assert.doesNotMatch(serializedUsage, /"type":"html"/);
  const unsafeLink = usage.blocks
    .flatMap((block) => block.tokens || [])
    .find((token) => token.type === "link" && token.originalUrl.startsWith("javascript:"));
  assert.equal(unsafeLink.href, null);
});

test("common GitHub README HTML is converted through an allowlist, never executed", () => {
  const model = parseReadme(
    `<p align="center">
  <img src="assets/banner.svg" alt="Project banner" width="100%" onerror="alert(1)">
</p>
<h1 align="center">Edge Console</h1>
<p align="center"><strong>Observe every node from one calm screen.</strong></p>
<p align="center">
  <a href="https://example.com/actions"><img src="https://img.shields.io/badge/build-passing-green" alt="Build status"></a>
</p>

## Demo

Ready.`,
    context,
  );

  assert.equal(model.title, "Edge Console");
  assert.equal(model.lead.text, "Observe every node from one calm screen.");
  assert.equal(
    model.hero.src,
    "https://raw.githubusercontent.com/thuanvd378/sensor-node/main/docs/assets/banner.svg",
  );
  assert.ok(model.badges.some((token) => token.type === "link"));
  assert.doesNotMatch(JSON.stringify(model), /onerror/);
  assert.equal(model.sections.find((section) => section.title === "Demo").kind, "gallery");
});

test("allowlisted HTML media is sanitized and dangerous attributes are discarded", () => {
  const model = parseReadme(
    `# Safe\n\n<img src=x onerror=alert(1)>\n\n[unfinished](javascript:alert(1))`,
    context,
  );
  const serialized = JSON.stringify(model);
  assert.doesNotMatch(serialized, /"type":"html"/);
  assert.doesNotMatch(serialized, /onerror/);
  assert.equal(
    model.hero.src,
    "https://raw.githubusercontent.com/thuanvd378/sensor-node/main/docs/x",
  );
  assert.match(serialized, /"href":null/);
});

class FakeNode {
  constructor(tagName, document, nodeType = 1, value = "") {
    this.tagName = tagName;
    this.ownerDocument = document;
    this.nodeType = nodeType;
    this.value = value;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this._textContent = "";
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  addEventListener(name, handler) {
    this.listeners.set(name, handler);
  }

  remove() {}
  select() {}

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  get textContent() {
    return this._textContent;
  }
}

class FakeDocument {
  constructor() {
    this.body = new FakeNode("BODY", this);
  }

  createElement(tagName) {
    return new FakeNode(tagName.toUpperCase(), this);
  }

  createTextNode(value) {
    return new FakeNode("#text", this, 3, String(value));
  }
}

function descendants(node) {
  return [node, ...node.children.flatMap(descendants)];
}

test("renderReadme creates semantic DOM and never creates input HTML as elements", () => {
  const model = parseReadme(
    `# Device\n\nLead.\n\n## Setup\n\n<script>alert(1)</script>\n\n\`\`\`sh\necho safe\n\`\`\``,
    context,
  );
  const document = new FakeDocument();
  const container = new FakeNode("MAIN", document);
  const article = renderReadme(model, container, { copyLabel: "Copy" });
  const nodes = descendants(article);

  assert.equal(container.children[0], article);
  assert.equal(article.tagName, "ARTICLE");
  assert.ok(nodes.some((node) => node.tagName === "H1" && node.attributes.get("id") === "device"));
  assert.ok(
    nodes.some((node) => node.tagName === "SECTION" && node.attributes.get("id") === "setup"),
  );
  assert.ok(nodes.some((node) => node.tagName === "PRE"));
  assert.ok(nodes.some((node) => node.tagName === "BUTTON"));
  assert.ok(!nodes.some((node) => node.tagName === "SCRIPT"));
  assert.ok(
    nodes.some(
      (node) => node.nodeType === 3 && node.value.includes("<script>alert(1)</script>"),
    ),
  );
});
