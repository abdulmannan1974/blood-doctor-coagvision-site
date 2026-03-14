const markdownModules = import.meta.glob("../../*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

const byFileName = Object.entries(markdownModules).reduce((accumulator, [path, content]) => {
  const fileName = path.split("/").pop();
  accumulator[fileName] = content;
  return accumulator;
}, {});

const toolFileMap = {
  perioperative: "01_Perioperative_Anticoagulant_Algorithm.md",
  "af-dosing": "02_Anticoagulant_Dosing_AF.md",
  thrombophilia: "03_Thrombophilia_Testing_Algorithm.md",
  vitt: "04_VITT_Algorithm.md",
  "wells-pe": "05_Wells_PE.md",
  "wells-dvt": "06_Wells_DVT.md",
  chads2: "07_CHADS2.md",
  "cha2ds2-vasc": "08_CHA2DS2_VASc.md",
  "has-bled": "09_HAS_BLED.md",
  perc: "10_PERC_Rule.md",
  pesi: "11_PESI.md",
  spesi: "12_Simplified_PESI.md",
  "timi-ua": "13_TIMI_UA_NSTEMI.md",
  "timi-stemi": "14_TIMI_STEMI.md",
  khorana: "15_Khorana_VTE_Cancer.md",
  "creatinine-clearance": "16_Creatinine_Clearance.md",
  abcd2: "17_ABCD2_TIA.md",
};

const metaPrefixes = [
  "# ",
  "**Source**:",
  "**Type**:",
  "**Scraped**:",
  "**Total Tools**:",
];

const sectionTitleBlacklist = [
  "access urls",
];

const genericSourcePatterns = [
  /clinical guide/i,
  /clinical_tools\?calc=/i,
  /\/tools\/\?calc=/i,
  /base url pattern:/i,
  /alternative url pattern:/i,
  /bilingual/i,
  /ongoing expert review and regular updates ensure/i,
  /your support helps protect the quality and continuity/i,
  /donate-2/i,
];

const tabMeta = {
  overview: {
    label: "Overview",
    descriptor: "Clinical summary and orientation",
  },
  criteria: {
    label: "Criteria & workflow",
    descriptor: "Inputs, rules, formulas, and decision steps",
  },
  interpretation: {
    label: "Interpretation",
    descriptor: "Score meaning, thresholds, and risk bands",
  },
  application: {
    label: "Clinical application",
    descriptor: "How to apply the tool in practice",
  },
  references: {
    label: "References",
    descriptor: "Supporting evidence and source literature",
  },
};

const collapseWhitespace = (value) => value.replace(/\s+/g, " ").trim();

const normalizeMarkdownStructure = (markdown) =>
  markdown
    .replace(/\r/g, "")
    .replace(/([^\n])\s+---\s+(#{1,4}\s+)/g, "$1\n\n$2")
    .replace(/([^\n])\s+(#{1,4}\s+)/g, "$1\n\n$2")
    .replace(/^(#{1,4})\s+\*\*([^*]+?)\*\*:?\s*$/gm, "$1 $2")
    .replace(/^(#{1,4})\s+(.+?):\s*$/gm, "$1 $2")
    .replace(/\n{3,}/g, "\n\n");

const stripMarkdown = (value) =>
  collapseWhitespace(
    value
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
  );

const debrandContent = (markdown) =>
  markdown
    .replace(/Other Relevant Thrombosis Canada Clinical Guides/gi, "Related Clinical Guides")
    .replace(/Relevant Thrombosis Canada Clinical Tool/gi, "Related Clinical Tool")
    .replace(/Thrombosis Canada Clinical Guides/gi, "Clinical Guide Collection")
    .replace(/Thrombosis Canada Clinical Guide/gi, "Clinical Guide")
    .replace(/Thrombosis Canada website/gi, "clinical workspace")
    .replace(/Thrombosis Canada Perioperative Management Clinical Guides/gi, "perioperative management clinical guides")
    .replace(/Thrombosis Canada/gi, "")
    .replace(/\s{2,}/g, " ");

export const sanitizeMarkdown = (markdown) =>
  normalizeMarkdownStructure(markdown)
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return true;
      }

      if (trimmed === "---" || trimmed === "```") {
        return true;
      }

      if (metaPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
        return false;
      }

      if (genericSourcePatterns.some((pattern) => pattern.test(trimmed))) {
        return false;
      }

      return true;
    })
    .join("\n")
    .replace(/##\s+Access URLs[\s\S]*$/i, "")
    .replace(/```\s*```/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n+\*Source:[^\n]*$/gim, "")
    .replace(/\n+source:[^\n]*$/gim, "")
    .replace(/\n+\*Scraped from[^\n]*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const buildClinicalContent = (markdown) => {
  const cleaned = debrandContent(sanitizeMarkdown(markdown))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const sections = splitSections(cleaned);
  const grouped = sections.reduce((accumulator, section) => {
    const group = groupForSection(section.title);
    if (!accumulator[group]) {
      accumulator[group] = [];
    }

    const blocks = parseBlocks(section.content);

    accumulator[group].push({
      title: debrandContent(section.title).trim(),
      summary: summarizeCard(blocks),
      blocks,
      wide: blocks.some((block) => block.type === "table" || block.type === "code"),
    });
    return accumulator;
  }, {});

  return {
    tabs: Object.entries(tabMeta)
      .filter(([groupId]) => grouped[groupId]?.length)
      .map(([groupId, tab]) => ({
        id: groupId,
        label: tab.label,
        descriptor: tab.descriptor,
        cards: grouped[groupId],
      })),
    searchIndex: sections.map((section) => stripMarkdown(section.title)).join(" • "),
  };
};

const splitSections = (markdown) => {
  const sections = [];
  const lines = markdown.split("\n");
  let current = null;
  let hasSeenPrimaryTitle = false;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);

    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingTitle = headingMatch[2].trim();

      if (level === 1 && !hasSeenPrimaryTitle) {
        hasSeenPrimaryTitle = true;
        continue;
      }

      if (current) {
        sections.push({
          ...current,
          content: current.content.join("\n").trim(),
        });
      }

      current = {
        title: headingTitle,
        content: [],
      };
      continue;
    }

    if (!current) {
      current = {
        title: "Overview",
        content: [],
      };
    }

    current.content.push(line);
  }

  if (current) {
    sections.push({
      ...current,
      content: current.content.join("\n").trim(),
    });
  }

  return sections.filter((section) => {
    const normalizedTitle = section.title.toLowerCase();
    return section.content && !sectionTitleBlacklist.includes(normalizedTitle);
  });
};

const parseTable = (lines, startIndex) => {
  const firstLine = lines[startIndex];
  const secondLine = lines[startIndex + 1];

  if (!firstLine?.includes("|") || !secondLine) {
    return null;
  }

  const delimiterCells = secondLine
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);

  if (
    !delimiterCells.length ||
    !delimiterCells.every((cell) => /^:?-{3,}:?$/.test(cell))
  ) {
    return null;
  }

  const rows = [];
  let cursor = startIndex;

  while (cursor < lines.length && lines[cursor].includes("|")) {
    rows.push(lines[cursor].trim());
    cursor += 1;
  }

  const parseCells = (row) =>
    row
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => collapseWhitespace(cell));

  const headers = parseCells(rows[0]);
  const bodyRows = rows.slice(2).map(parseCells);

  return {
    nextIndex: cursor,
    block: {
      type: "table",
      headers,
      rows: bodyRows,
    },
  };
};

const parseFence = (lines, startIndex) => {
  if (!lines[startIndex].startsWith("```")) {
    return null;
  }

  let cursor = startIndex + 1;
  const content = [];

  while (cursor < lines.length && !lines[cursor].startsWith("```")) {
    content.push(lines[cursor]);
    cursor += 1;
  }

  return {
    nextIndex: cursor + 1,
    block: {
      type: "code",
      content: content.join("\n").trim(),
    },
  };
};

const parseList = (lines, startIndex, kind) => {
  const pattern = kind === "ordered" ? /^\d+\.\s+/ : /^[-*]\s+/;
  if (!pattern.test(lines[startIndex])) {
    return null;
  }

  const items = [];
  let cursor = startIndex;

  while (cursor < lines.length && pattern.test(lines[cursor])) {
    items.push(lines[cursor].replace(pattern, "").replace(/^\d+\.\s*/, "").trim());
    cursor += 1;
  }

  return {
    nextIndex: cursor,
    block: {
      type: kind === "ordered" ? "ordered-list" : "bullet-list",
      items,
    },
  };
};

const parseFact = (line) => {
  const match = line.match(/^\*\*([^*]+)\*\*:\s*(.+)$/);
  if (!match) {
    return null;
  }

  const label = collapseWhitespace(match[1]);
  const value = collapseWhitespace(match[2]);
  const calloutLabel = label.toLowerCase();

  if (["note", "important", "warning", "caution", "clinical pearl", "key point"].includes(calloutLabel)) {
    return {
      type: "callout",
      tone: calloutLabel === "warning" || calloutLabel === "caution" ? "warning" : "note",
      label,
      value,
    };
  }

  return {
    type: "fact",
    label,
    value,
  };
};

const parseBlocks = (content) => {
  const lines = content.split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line || line === "---") {
      index += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push({
        type: "subheading",
        level: 3,
        text: line.replace(/^###\s+/, "").trim(),
      });
      index += 1;
      continue;
    }

    if (line.startsWith("#### ")) {
      blocks.push({
        type: "subheading",
        level: 4,
        text: line.replace(/^####\s+/, "").trim(),
      });
      index += 1;
      continue;
    }

    const table = parseTable(lines, index);
    if (table) {
      blocks.push(table.block);
      index = table.nextIndex;
      continue;
    }

    const fence = parseFence(lines, index);
    if (fence) {
      blocks.push(fence.block);
      index = fence.nextIndex;
      continue;
    }

    const orderedList = parseList(lines, index, "ordered");
    if (orderedList) {
      blocks.push(orderedList.block);
      index = orderedList.nextIndex;
      continue;
    }

    const bulletList = parseList(lines, index, "unordered");
    if (bulletList) {
      blocks.push(bulletList.block);
      index = bulletList.nextIndex;
      continue;
    }

    const fact = parseFact(line);
    if (fact) {
      blocks.push(fact);
      index += 1;
      continue;
    }

    const paragraph = [line];
    index += 1;

    while (index < lines.length) {
      const next = lines[index].trim();
      if (
        !next ||
        next === "---" ||
        next.startsWith("### ") ||
        next.startsWith("#### ") ||
        next.startsWith("```") ||
        /^[-*]\s+/.test(next) ||
        /^\d+\.\s+/.test(next) ||
        parseFact(next) ||
        parseTable(lines, index)
      ) {
        break;
      }
      paragraph.push(next);
      index += 1;
    }

    blocks.push({
      type: "paragraph",
      text: paragraph.join(" "),
    });
  }

  return blocks;
};

const groupForSection = (title) => {
  const normalized = title.toLowerCase();

  if (normalized === "overview") {
    return "overview";
  }

  if (normalized.includes("reference")) {
    return "references";
  }

  if (
    normalized.includes("interpretation") ||
    normalized.includes("risk class") ||
    normalized.includes("risk category") ||
    normalized.includes("mortality") ||
    normalized.includes("diagnostic criteria")
  ) {
    return "interpretation";
  }

  if (
    normalized.includes("criteria") ||
    normalized.includes("step") ||
    normalized.includes("formula") ||
    normalized.includes("required inputs") ||
    normalized.includes("panel") ||
    normalized.includes("threshold") ||
    normalized.includes("interaction") ||
    normalized.includes("selection") ||
    normalized.includes("protocol")
  ) {
    return "criteria";
  }

  if (
    normalized.includes("clinical application") ||
    normalized.includes("management") ||
    normalized.includes("when to test") ||
    normalized.includes("when not to test") ||
    normalized.includes("consideration") ||
    normalized.includes("important note") ||
    normalized.includes("limitations") ||
    normalized.includes("restart") ||
    normalized.includes("surgery")
  ) {
    return "application";
  }

  return "application";
};

const summarizeCard = (blocks) => {
  const paragraph = blocks.find((block) => block.type === "paragraph")?.text;
  if (paragraph) {
    return paragraph;
  }

  const list = blocks.find(
    (block) => block.type === "bullet-list" || block.type === "ordered-list"
  );
  if (list?.items?.length) {
    return `${list.items.length} key items`;
  }

  const table = blocks.find((block) => block.type === "table");
  if (table?.rows?.length) {
    return `${table.rows.length} comparison rows`;
  }

  return "";
};

export const clinicalContentByToolId = Object.fromEntries(
  Object.entries(toolFileMap).map(([toolId, fileName]) => [
    toolId,
    buildClinicalContent(byFileName[fileName] ?? ""),
  ]),
);
