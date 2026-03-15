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
  "related clinical guides",
  "other relevant clinical guides",
  "other relevant clinical tool",
  "related clinical tool",
  "help sustain trusted thrombosis guidance",
  "clinical guide collection",
  "source",
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
  /help sustain trusted thrombosis guidance/i,
  /please note that the information contained herein/i,
  /date of version/i,
  /^\*?source:/i,
  /^\*?scraped/i,
  /^title:/i,
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

const splitCollapsedPipeRows = (markdown) =>
  markdown
    .split("\n")
    .flatMap((line) => {
      const trimmed = line.trim();

      if (!trimmed.includes("|") || !trimmed.startsWith("|")) {
        return [line];
      }

      return trimmed
        .replace(/\|\s+\|(?=\s*(?:\*\*[^*]+\*\*|[^|\n]{2,}\|))/g, "|\n|")
        .split("\n");
    })
    .join("\n");

const splitHeadingTableJoins = (markdown) =>
  markdown.replace(
    /^(#{1,4}\s+[^|\n]+?)\s+(\|[^|\n].*)$/gm,
    "$1\n\n$2"
  );

const normalizeMarkdownStructure = (markdown) =>
  splitCollapsedPipeRows(
    splitHeadingTableJoins(
      markdown
    .replace(/\r/g, "")
    .replace(/([^\n])\s+---\s+(#{1,4}\s+)/g, "$1\n\n$2")
    .replace(/([^\n])\s+(#{1,4}\s+)/g, "$1\n\n$2")
    .replace(/^(#{1,4})\s+\*\*([^*]+?)\*\*:\s*(.+)$/gm, "$1 $2\n\n$3")
    .replace(/^(#{1,4})\s+([^:\n]+):\s*(.+)$/gm, "$1 $2\n\n$3")
    .replace(/^(#{1,4})\s+\*\*([^*]+?)\*\*:?\s*$/gm, "$1 $2")
    .replace(/^(#{1,4})\s+(.+?):\s*$/gm, "$1 $2")
    .replace(/^\*\*\*([^*]+?)\*\*\*:\s*(.+)$/gm, "### $1\n\n$2")
    .replace(/^\*\*([^*]+)\*\*:\s*(.+)$/gm, "### $1\n\n$2")
    .replace(/^\*\*([^*]+)\*\*:\s*$/gm, "### $1")
    .replace(/^\*\*\*([^*]+?)\*\*\*$/gm, "### $1")
    .replace(/^\*\*([^*]+?)\*\*$/gm, "### $1")
    .replace(/^\*\*(\d+\.\s*[^*]+)\*\*$/gm, "### $1")
    .replace(/^([A-Z][A-Za-z /()-]{2,}):\s*$/gm, "### $1")
    .replace(/^([A-Z][A-Za-z /()-]{2,}):\s+(.+)$/gm, "### $1\n\n$2")
    .replace(/^###\s*$/gm, "")
    .replace(/\n{2,}(#{1,4}\s+[^\n]+)\n+\1\n+/g, "\n\n$1\n\n")
    .replace(/\n{3,}/g, "\n\n")
    )
  );

const stripMarkdown = (value) =>
  collapseWhitespace(
    value
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
  );

const isDiscardableLine = (value) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return true;
  }

  if (
    /^!\[[^\]]*\]\([^)]+\)$/.test(trimmed) ||
    genericSourcePatterns.some((pattern) => pattern.test(trimmed))
  ) {
    return true;
  }

  if (
    /^(\[https?:\/\/[^\]]+\]\([^)]+\)|https?:\/\/\S+)$/i.test(trimmed) ||
    /^(\*+)?source:/i.test(trimmed) ||
    /^(\*+)?scraped/i.test(trimmed) ||
    /^(\*+)?date of version/i.test(trimmed)
  ) {
    return true;
  }

  return false;
};

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

      if (isDiscardableLine(trimmed)) {
        return false;
      }

      return true;
    })
    .join("\n")
    .replace(/##\s+Access URLs[\s\S]*$/i, "")
    .replace(/```\s*```/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n+###\s+Help sustain trusted thrombosis guidance[\s\S]*$/i, "")
    .replace(/\n+\*Please note that the information contained herein[\s\S]*$/i, "")
    .replace(/\n+\*\*Date of Version\**:?[^\n]*$/gim, "")
    .replace(/\n+\*Source:[^\n]*$/gim, "")
    .replace(/\n+source:[^\n]*$/gim, "")
    .replace(/\n+\*Scraped from[^\n]*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const normalizeSectionTitle = (value) =>
  stripMarkdown(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const buildStructuredCard = (section, title = section.title, summary = "") => {
  const blocks = parseBlocks(section.content, title);

  return {
    title: debrandContent(title).trim(),
    summary: summary || summarizeCard(blocks),
    blocks,
    wide: blocks.some(
      (block) =>
        block.type === "table" ||
        block.type === "code" ||
        block.type === "reference-list" ||
        ((block.type === "bullet-list" || block.type === "ordered-list") && block.items.length > 5)
    ),
  };
};

function buildAsaGuideContent(markdown) {
  const sections = splitSections(markdown);
  const usedIndexes = new Set();

  const takeSection = (matcher) => {
    const index = sections.findIndex((section, sectionIndex) => {
      if (usedIndexes.has(sectionIndex)) {
        return false;
      }

      const normalized = normalizeSectionTitle(section.title);
      return typeof matcher === "function" ? matcher(normalized, section) : normalized.includes(matcher);
    });

    if (index === -1) {
      return null;
    }

    usedIndexes.add(index);
    return sections[index];
  };

  const overviewCards = [
    takeSection((title) => title === "objective"),
    takeSection((title) => title === "background"),
    takeSection((title) => title.includes("mechanism of action")),
  ]
    .filter(Boolean)
    .map((section) => buildStructuredCard(section));

  const applicationCards = [
    [takeSection((title) => title === "indications"), "Indications", "Core clinical uses and indications for ASA therapy."],
    [takeSection((title) => title === "cardiac"), "Cardiac indications", "Symptomatic coronary disease, coronary intervention, and prosthetic valve use cases."],
    [takeSection((title) => title.includes("cerebrovascular")), "Cerebrovascular indications", "Stroke, TIA, and carotid endarterectomy indications."],
    [takeSection((title) => title.includes("peripheral arterial disease")), "Peripheral arterial disease", "Symptomatic PAD and vascular intervention considerations."],
    [takeSection((title) => title.includes("primary prevention")), "Primary prevention", "When ASA should generally not be used for first-event prevention."],
    [takeSection((title) => title.includes("secondary prevention of recurrent vte")), "Secondary prevention of recurrent VTE", "Where ASA may be considered only if extended anticoagulation is unacceptable."],
    [takeSection((title) => title.includes("thromboprophylaxis following joint arthroplasty")), "Thromboprophylaxis after arthroplasty", "Joint arthroplasty pathways using rivaroxaban followed by ASA."],
    [takeSection((title) => title.includes("prevention of preeclampsia")), "Pregnancy and preeclampsia prevention", "Moderate- to high-risk pregnancy prevention timing."],
    [takeSection((title) => title === "dosing"), "Dosing", "Standard daily dosing, ACS loading, stroke dosing, and gastrointestinal protection notes."],
    [takeSection((title) => title.includes("adverse effects")), "Adverse effects", "Common and serious adverse effects that should be reviewed with patients."],
    [takeSection((title) => title.includes("peri procedural management")), "Peri-procedural management", "How to approach interruption and restart around procedures."],
    [takeSection((title) => title.includes("special considerations")), "Special considerations", "Concomitant anticoagulation, NSAID avoidance, bleeding risk, and asthma cautions."],
    [takeSection((title) => title.includes("pediatrics")), "Pediatrics", "When paediatric or haematology expertise should be involved."],
  ]
    .filter(([section]) => Boolean(section))
    .map(([section, title, summary]) => buildStructuredCard(section, title, summary));

  const referenceCards = [
    takeSection((title) => title === "references"),
  ]
    .filter(Boolean)
    .map((section) => buildStructuredCard(section, "References", "Supporting evidence and bibliography for ASA guidance."));

  return {
    tabs: [
      overviewCards.length
        ? {
            id: "overview",
            label: tabMeta.overview.label,
            descriptor: tabMeta.overview.descriptor,
            cards: overviewCards,
          }
        : null,
      applicationCards.length
        ? {
            id: "application",
            label: tabMeta.application.label,
            descriptor: tabMeta.application.descriptor,
            cards: applicationCards,
          }
        : null,
      referenceCards.length
        ? {
            id: "references",
            label: tabMeta.references.label,
            descriptor: tabMeta.references.descriptor,
            cards: referenceCards,
          }
        : null,
    ].filter(Boolean),
    searchIndex: [...overviewCards, ...applicationCards, ...referenceCards]
      .map((card) => stripMarkdown(card.title))
      .join(" • "),
  };
}

export const buildClinicalContent = (markdown) => {
  const cleaned = debrandContent(sanitizeMarkdown(markdown))
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (/acetylsalicylic acid \(asa\)/i.test(cleaned)) {
    return buildAsaGuideContent(cleaned);
  }

  const sections = splitSections(cleaned);
  const grouped = sections.reduce((accumulator, section) => {
    const group = groupForSection(section.title);
    if (!accumulator[group]) {
      accumulator[group] = [];
    }

    const blocks = parseBlocks(section.content, section.title);

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
  let primaryTitle = "";

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);

    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingTitle = headingMatch[2].trim();
      const cleanedHeadingTitle = stripMarkdown(debrandContent(headingTitle));
      const normalizedHeadingTitle = cleanedHeadingTitle.toLowerCase();

      if (level === 1 && !hasSeenPrimaryTitle) {
        hasSeenPrimaryTitle = true;
        primaryTitle = normalizedHeadingTitle;
        continue;
      }

      if (level === 1 && normalizedHeadingTitle === primaryTitle) {
        continue;
      }

      if (current) {
        sections.push({
          ...current,
          content: current.content.join("\n").trim(),
        });
      }

      current = {
        title: cleanedHeadingTitle,
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
    const normalizedTitle = stripMarkdown(section.title).toLowerCase();
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
  const bodyRows = rows
    .slice(2)
    .map(parseCells)
    .map((row) => {
      if (row.length >= headers.length) {
        return row.slice(0, headers.length);
      }

      return [...row, ...Array.from({ length: headers.length - row.length }, () => "")];
    })
    .filter((row) => row.some((cell) => cell));

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
  const match = line.match(/^(?:\*\*([^*]+)\*\*|([A-Z][A-Za-z /()-]{2,})):\s*(.+)$/);
  if (!match) {
    return null;
  }

  const label = collapseWhitespace(match[1] ?? match[2]);
  const value = collapseWhitespace(match[3]);
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

const parseReferenceItems = (content) =>
  content
    .split(/\n\s*\n|\n/)
    .map((line) =>
      collapseWhitespace(
        line
          .replace(/^[-*]\s+/, "")
          .replace(/^\d+\.\s+/, "")
          .replace(/^•\s+/, "")
          .replace(/^References?:?\s*/i, "")
      )
    )
    .filter(
      (line) =>
        line &&
        !/^date of version/i.test(line) &&
        !/^please note that/i.test(line) &&
        !/^source:/i.test(line) &&
        !/^help sustain/i.test(line)
    );

const parseBlocks = (content, sectionTitle = "") => {
  if (/reference/i.test(sectionTitle)) {
    const references = parseReferenceItems(content);
    if (references.length) {
      return [
        {
          type: "reference-list",
          items: references,
        },
      ];
    }
  }

  const lines = content.split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line || line === "---" || isDiscardableLine(line)) {
      index += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push({
        type: "subheading",
        level: 1,
        text: line.replace(/^#\s+/, "").trim(),
      });
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push({
        type: "subheading",
        level: 2,
        text: line.replace(/^##\s+/, "").trim(),
      });
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
        isDiscardableLine(next) ||
        next.startsWith("# ") ||
        next.startsWith("## ") ||
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
  const normalized = stripMarkdown(title).toLowerCase();

  if (
    normalized === "overview" ||
    normalized.includes("objective") ||
    normalized.includes("background") ||
    normalized.includes("anatomy")
  ) {
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
    normalized.includes("diagnostic criteria") ||
    normalized.includes("score interpretation")
  ) {
    return "interpretation";
  }

  if (
    normalized.includes("criteria") ||
    normalized.includes("diagnosis") ||
    normalized.includes("diagnostic strategy") ||
    normalized.includes("step") ||
    normalized.includes("formula") ||
    normalized.includes("required inputs") ||
    normalized.includes("panel") ||
    normalized.includes("threshold") ||
    normalized.includes("interaction") ||
    normalized.includes("selection") ||
    normalized.includes("protocol") ||
    normalized.includes("algorithm") ||
    normalized.includes("figure") ||
    normalized.includes("table ")
  ) {
    return "criteria";
  }

  if (
    normalized.includes("clinical application") ||
    normalized.includes("recommendation") ||
    normalized.includes("preventative") ||
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
