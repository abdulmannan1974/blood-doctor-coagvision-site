const markdownModules = import.meta.glob("../../*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

import { buildClinicalContent, sanitizeMarkdown } from "./markdownContent";
import { pdfFiles } from "./pdfIndex";

const ignoredMarkdown = new Set(["README.md", "00_INDEX.md", "00_Thrombosis_Canada_Index.md"]);
const guideIdPattern = /guideID=([^&#\s"]+)/i;
const markdownLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
const dateVersionPattern = /\*\*Date of Version\**:?\**\s*([^\n*]+)/i;
const legacyToolIdMap = {
  perioperativeAnticoagulantAlgorithm: "perioperative",
  anticoagulantDosingInAF: "af-dosing",
  thrombophiliaTestingAlgorithm: "thrombophilia",
  VITT: "vitt",
  wellsPE: "wells-pe",
  wellsDVT: "wells-dvt",
  chads2: "chads2",
  chads2v: "cha2ds2-vasc",
  hasBled: "has-bled",
  perc: "perc",
  pesi: "pesi",
  simplifiedPesi: "spesi",
  timiUA: "timi-ua",
  timiSTEMI: "timi-stemi",
  khoranaRiskScore: "khorana",
  creatinineClearance: "creatinine-clearance",
  abcd2: "abcd2",
};

const stripMarkdown = (value) =>
  value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toStem = (fileName) => fileName.replace(/\.[^.]+$/, "");
const unique = (values) => [...new Set(values.filter(Boolean))];

const humanizeStem = (stem) =>
  stem
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const baseAssetUrl = `${(import.meta.env.BASE_URL || "./").replace(/\/?$/, "/")}sanitized-pdfs/`;
const cleanBranding = (value) =>
  value
    .replace(/Thrombosis Canada/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

const parseFrontmatter = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    return {
      meta: {},
      body: content,
    };
  }

  const meta = match[1].split("\n").reduce((accumulator, line) => {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      return accumulator;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    accumulator[key] = rawValue.replace(/^"(.*)"$/, "$1");
    return accumulator;
  }, {});

  return {
    meta,
    body: match[2],
  };
};

const extractGuideAlias = (value) => {
  if (!value) {
    return null;
  }

  const directMatch = value.match(guideIdPattern);
  if (directMatch) {
    return directMatch[1];
  }

  const jsMatch = value.match(/openLinkedGuide\('([^']+)'\)/i);
  if (jsMatch) {
    return jsMatch[1];
  }

  return null;
};

const extractToolAlias = (value) => {
  if (!value) {
    return null;
  }

  const jsMatch = value.match(/openLinkedClinicalTool\('([^']+)'\)/i);
  if (jsMatch) {
    return jsMatch[1];
  }

  try {
    const parsed = new URL(value, "https://blooddoctor.local");
    return parsed.searchParams.get("calc");
  } catch {
    return null;
  }
};

const extractObjective = (body) => {
  const match = body.match(/\*\*Objective[s]?\*\*:\s*([^\n]+)/i);
  return cleanBranding(match?.[1] ?? "");
};

const extractDateVersion = (body) => {
  const match = body.match(dateVersionPattern);
  return match?.[1]?.trim() ?? "";
};

const extractMarkdownLinks = (body) =>
  [...body.matchAll(markdownLinkPattern)].map((match) => ({
    label: cleanBranding(match[1]).trim(),
    target: match[2].trim(),
  }));

const getCategory = (value) => {
  const haystack = normalize(value);

  if (haystack.includes("pregnancy")) {
    return "Pregnancy";
  }

  if (haystack.includes("stroke") || haystack.includes("tia")) {
    return "Stroke";
  }

  if (haystack.includes("antiplatelet") || haystack.includes("aspirin") || haystack.includes("clopidogrel") || haystack.includes("prasugrel") || haystack.includes("ticagrelor")) {
    return "Antiplatelet";
  }

  if (haystack.includes("warfarin") || haystack.includes("apixaban") || haystack.includes("rivaroxaban") || haystack.includes("dabigatran") || haystack.includes("edoxaban") || haystack.includes("doac")) {
    return "Anticoagulants";
  }

  if (haystack.includes("thrombophilia") || haystack.includes("vitt") || haystack.includes("hit")) {
    return "Thrombophilia";
  }

  if (haystack.includes("thromboprophylaxis") || haystack.includes("surgery") || haystack.includes("perioperative")) {
    return "Perioperative";
  }

  return "Thrombosis";
};

const pdfLibraryBase = pdfFiles
  .map((fileName) => {
    const stem = toStem(fileName);
    const title = humanizeStem(stem);

    return {
      id: stem,
      stem,
      fileName,
      title,
      url: `${baseAssetUrl}${encodeURIComponent(fileName)}`,
      category: getCategory(title),
      searchableText: normalize(`${title} ${fileName}`),
      pageLabel: "Viewer copy",
    };
  })
  .sort((left, right) => left.title.localeCompare(right.title));

const pdfByStem = pdfLibraryBase.reduce((accumulator, pdf) => {
  accumulator[pdf.stem] = pdf;
  return accumulator;
}, {});

const guideLibraryBase = Object.entries(markdownModules)
  .map(([path, content]) => {
    const fileName = path.split("/").pop();

    if (ignoredMarkdown.has(fileName) || /^\d{2}_/.test(fileName)) {
      return null;
    }

    const stem = toStem(fileName);
    const { meta, body } = parseFrontmatter(content);
    const safeMarkdown = sanitizeMarkdown(body);
    const titleMatch = safeMarkdown.match(/^#\s+(.+)$/m);
    const title = cleanBranding(titleMatch?.[1]?.trim() || meta.title || humanizeStem(stem));
    const cleanBody = stripMarkdown(safeMarkdown);
    const headings = [...safeMarkdown.matchAll(/^##\s+(.+)$/gm)].map((match) =>
      cleanBranding(match[1].trim())
    );
    const excerpt = cleanBody.slice(0, 260).trim() + (cleanBody.length > 260 ? "..." : "");
    const guideKey = extractGuideAlias(meta.url) ?? stem;
    const markdownLinks = extractMarkdownLinks(safeMarkdown);
    const linkedGuideAliases = markdownLinks.map((link) => extractGuideAlias(link.target)).filter(Boolean);
    const linkedToolAliases = markdownLinks.map((link) => extractToolAlias(link.target)).filter(Boolean);
    const searchTokens = normalize(`${title} ${excerpt} ${headings.join(" ")}`)
      .split(" ")
      .filter((token) => token.length > 2);
    const pdfAsset = pdfByStem[stem] ?? null;
    const clinicalContent = buildClinicalContent(body);

    return {
      id: stem,
      stem,
      fileName,
      title,
      excerpt,
      headings,
      objective: extractObjective(safeMarkdown),
      updatedAt: meta.date_updated ?? "",
      versionDate: extractDateVersion(safeMarkdown),
      guideKey,
      guideAliases: unique([guideKey, guideKey.toLowerCase(), stem, stem.toLowerCase(), fileName]),
      linkedGuideAliases: unique(linkedGuideAliases),
      linkedToolAliases: unique(linkedToolAliases),
      content: clinicalContent,
      category: getCategory(`${title} ${fileName}`),
      pdfId: pdfAsset?.id ?? null,
      pdfUrl: pdfAsset?.url ?? null,
      pdfAsset,
      searchableText: normalize(
        `${title} ${excerpt} ${headings.join(" ")} ${cleanBody} ${clinicalContent.searchIndex}`
      ),
      searchTokens,
    };
  })
  .filter(Boolean)
  .sort((left, right) => left.title.localeCompare(right.title));

export const guideAliasIndex = guideLibraryBase.reduce((accumulator, guide) => {
  guide.guideAliases.forEach((alias) => {
    accumulator[alias] = guide.id;
    accumulator[alias.toLowerCase()] = guide.id;
  });

  return accumulator;
}, {});

export const guideLibrary = guideLibraryBase.map((guide) => ({
  ...guide,
  linkedGuideIds: unique(
    guide.linkedGuideAliases
      .map((alias) => guideAliasIndex[alias] ?? guideAliasIndex[alias.toLowerCase?.() ?? alias])
      .filter((id) => id && id !== guide.id)
  ),
  linkedToolIds: unique(
    guide.linkedToolAliases
      .map((alias) => legacyToolIdMap[alias] ?? legacyToolIdMap[alias?.trim?.() ?? ""])
      .filter(Boolean)
  ),
}));

export const pdfLibrary = pdfLibraryBase;
export const vaultLibrary = guideLibrary.filter((guide) => guide.pdfId);
export const toolRouteIndex = legacyToolIdMap;

export const resolveMarkdownTarget = (target) => {
  const guideAlias = extractGuideAlias(target);
  if (guideAlias) {
    const guideId = guideAliasIndex[guideAlias] ?? guideAliasIndex[guideAlias.toLowerCase()];
    if (guideId) {
      return {
        kind: "guide",
        id: guideId,
      };
    }
  }

  const toolAlias = extractToolAlias(target);
  if (toolAlias) {
    const toolId = legacyToolIdMap[toolAlias];
    if (toolId) {
      return {
        kind: "tool",
        id: toolId,
      };
    }
  }

  if (/\.pdf($|[?#])/i.test(target) || /\/uploads\//i.test(target)) {
    return null;
  }

  if (/^https?:\/\//i.test(target)) {
    return {
      kind: "external",
      href: target,
    };
  }

  return null;
};
