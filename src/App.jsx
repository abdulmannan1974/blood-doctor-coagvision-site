import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  BookOpenText,
  BrainCircuit,
  Calculator,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CircleAlert,
  CircleCheckBig,
  FileSearch,
  FileText,
  FolderOpen,
  HeartPulse,
  LayoutDashboard,
  Microscope,
  Pill,
  Printer,
  Search,
  ShieldAlert,
} from "lucide-react";
import { toolCategories, tools } from "./data/tools";
import { clinicalContentByToolId } from "./data/markdownContent";
import { guideLibrary, pdfLibrary, resolveMarkdownTarget, vaultLibrary } from "./data/library";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

const siteName = "Blood🩸Doctor CoagVision";

const toneMeta = {
  success: {
    label: "Ready to use",
    icon: CircleCheckBig,
  },
  warning: {
    label: "Review carefully",
    icon: CircleAlert,
  },
  danger: {
    label: "Urgent attention",
    icon: ShieldAlert,
  },
  neutral: {
    label: "Clinical support",
    icon: BadgeCheck,
  },
};

const globalToolDisclaimer = {
  text:
    "These general recommendations do not replace clinical judgement. Physicians must consider relative risks and benefits for each individual patient and consult with appropriate specialists.",
  source: "",
};

const normalizeValue = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const getPageForToolId = (toolId) =>
  tools.find((tool) => tool.id === toolId)?.category === "algorithm" ? "algorithms" : "scores";
const buildGuideHref = (guideId, pageId = "guides") => `?guide=${encodeURIComponent(guideId)}#${pageId}`;
const buildToolHref = (toolId) => `?tool=${encodeURIComponent(toolId)}#${getPageForToolId(toolId)}`;

const pageDefinitions = [
  { id: "dashboard", label: "Dashboard", shortLabel: "Dashboard", icon: LayoutDashboard },
  { id: "algorithms", label: "Interactive Algorithms", shortLabel: "Algorithms", icon: BrainCircuit },
  { id: "acute", label: "Acute Management", shortLabel: "Acute", icon: HeartPulse },
  { id: "followup", label: "DOAC Follow-up", shortLabel: "DOAC Follow-up", icon: ClipboardList },
  { id: "scores", label: "Scoring Calculators", shortLabel: "Scores", icon: Calculator },
  { id: "guides", label: "Clinical Guides", shortLabel: "Guides", icon: BookOpenText },
  { id: "pdfs", label: "Clinical Vault", shortLabel: "Vault", icon: FolderOpen },
];
const pageIds = new Set(pageDefinitions.map((page) => page.id));
const getPageFromHash = () => {
  const hashValue = window.location.hash.replace(/^#/, "").trim();
  return pageIds.has(hashValue) ? hashValue : "dashboard";
};
const pageCopy = {
  algorithms: {
    eyebrow: "Clinical tools index",
    title: "Interactive algorithms",
    description:
      "Decision pathways from the local clinical tools index, kept in a cleaner two-panel workspace with the active calculator and its reference stack side by side.",
  },
  acute: {
    eyebrow: "Acute pathways",
    title: "Acute management",
    description:
      "Rapid-access pathways for urgent rhythm, bleeding, DVT, and pulmonary embolism decisions, organized from the local acute-management reference file without carrying over source-site branding.",
  },
  followup: {
    eyebrow: "Clinical checklist",
    title: "DOAC follow-up",
    description:
      "Structured outpatient review checklist for direct oral anticoagulant therapy, with printable export for PDF and Word documentation.",
  },
  scores: {
    eyebrow: "Clinical tools index",
    title: "Scoring calculators",
    description:
      "Risk scores and renal dosing tools grouped into a calmer calculation workspace with faster switching and less visual clutter.",
  },
  guides: {
    eyebrow: "Clinical guides index",
    title: "Guide library",
    description:
      "A reading-focused guide browser built from the local markdown corpus, with authentic references preserved and a companion clinical vault for linked archive records.",
  },
  pdfs: {
    eyebrow: "Clinical vault",
    title: "Companion vault",
    description:
      "A cleaner index of companion records linked back to the guide library, so the main reading experience stays markdown-first and connected across the whole website.",
  },
};

const acuteManagementItems = [
  {
    id: "acute-af",
    title: "Atrial Fibrillation",
    shortTitle: "Atrial Fibrillation",
    category: "Rhythm instability",
    summary:
      "Urgent AF pathway focused on hemodynamic stability, valvular status, symptom duration, and recent stroke or TIA history.",
    prompts: [
      "Is the patient hemodynamically stable or unstable?",
      "Does the patient have valvular or non-valvular AF?",
      "For how long has the patient had non-valvular AF?",
      "Has the patient had a recent stroke or TIA?",
    ],
    action:
      "Use this section to triage urgent cardioversion questions and immediate anticoagulation context before moving into detailed dosing or long-term planning.",
  },
  {
    id: "acute-bleeding",
    title: "Bleed Management",
    shortTitle: "Bleed Management",
    category: "Bleeding emergencies",
    summary:
      "Urgent bleeding pathway centered on bleed severity, the anticoagulant involved, and INR-guided or drug-specific reversal planning.",
    prompts: [
      "What type of bleeding does the patient have?",
      "What type of anticoagulant did the patient receive?",
      "If the INR is known, please enter it.",
    ],
    action:
      "Use this section to structure initial stabilization, reversal decisions, and urgent escalation for clinically relevant or major bleeding.",
  },
  {
    id: "acute-dvt",
    title: "Deep Vein Thrombosis",
    shortTitle: "Deep Vein Thrombosis",
    category: "Venous thromboembolism",
    summary:
      "Acute DVT pathway emphasizing limb threat, iliofemoral involvement, cancer, pregnancy, and other features that change immediate treatment intensity.",
    prompts: [
      "Does the patient have massive iliofemoral DVT, such as phlegmasia?",
      "Please select all clinical modifiers that apply to the patient.",
    ],
    action:
      "Use this section to flag limb-threatening DVT, identify higher-risk subgroups, and separate standard anticoagulation from escalation pathways.",
  },
  {
    id: "acute-pe",
    title: "Pulmonary Embolism",
    shortTitle: "Pulmonary Embolism",
    category: "Venous thromboembolism",
    summary:
      "Acute PE pathway organized around hemodynamic stability, high-risk PE features, and escalation to reperfusion or ICU-level care when needed.",
    prompts: [
      "Is the patient stable or unstable?",
      "Please select all high-risk or contraindication features that apply.",
    ],
    action:
      "Use this section to separate unstable or deteriorating PE from lower-risk presentations and highlight when reperfusion discussions become urgent.",
  },
];

const doacFollowupInitialState = {
  patientName: "",
  patientAge: "",
  weightKg: "",
  weightLb: "",
  sex: "",
  doac: "",
  chads2: "",
  healthRelevantProblems: false,
  healthEmbolicEvents: false,
  healthNone: false,
  healthComments: "",
  missedDoses: "",
  timingIssues: "",
  adherenceComments: "",
  hasBled: "",
  bleedGi: false,
  bleedOther: false,
  bleedHemoglobin: false,
  bleedHypotension: false,
  bleedNone: false,
  egfrDate: "",
  egfrResult: "",
  dehydratingIllness: "",
  renalComments: "",
  drugAsa: false,
  drugNsaid: false,
  drugOther: false,
  drugNone: false,
  bpSystolic: "",
  bpDiastolic: "",
  bpStatus: "",
  gaitReferral: "",
  stableContinue: "",
  doseVerified: "",
  therapyChanges: "",
  counselRationale: "",
  counselBleeding: "",
  counselAdherence: "",
  counselInteractions: "",
  nextFollowupDate: "",
  nextBloodworkDate: "",
  finalComments: "",
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatFollowupChoice = (value) => {
  if (value === true) {
    return "Yes";
  }

  if (value === false) {
    return "No";
  }

  if (value === "" || value === null || value === undefined) {
    return "Not recorded";
  }

  return String(value);
};

const buildYesNoLabel = (value) => {
  if (value === "yes") {
    return "Yes";
  }

  if (value === "no") {
    return "No";
  }

  return "Not recorded";
};

const getCheckedFollowupItems = (entries) =>
  entries.filter((entry) => entry.checked).map((entry) => entry.label);

const getDoacFollowupSummaryRows = (form) => {
  const healthItems = getCheckedFollowupItems([
    { label: "Relevant medical problems or hospital visits", checked: form.healthRelevantProblems },
    { label: "Embolic events", checked: form.healthEmbolicEvents },
    { label: "No interval health issues reported", checked: form.healthNone },
  ]);

  const bleedItems = getCheckedFollowupItems([
    { label: "GI bleeding symptoms", checked: form.bleedGi },
    { label: "Other bleeding symptoms", checked: form.bleedOther },
    { label: "Drop in hemoglobin or new anemia", checked: form.bleedHemoglobin },
    { label: "Hypotension with syncope or falls", checked: form.bleedHypotension },
    { label: "No bleeding concerns identified", checked: form.bleedNone },
  ]);

  const interactionItems = getCheckedFollowupItems([
    { label: "ASA or other antiplatelets", checked: form.drugAsa },
    { label: "NSAID exposure", checked: form.drugNsaid },
    { label: "Other interacting drugs", checked: form.drugOther },
    { label: "No interaction concerns recorded", checked: form.drugNone },
  ]);

  return [
    ["Patient name", form.patientName || "Not recorded"],
    ["Age", form.patientAge || "Not recorded"],
    ["Weight", form.weightKg ? `${form.weightKg} kg` : form.weightLb ? `${form.weightLb} lb` : "Not recorded"],
    ["Sex", form.sex || "Not recorded"],
    ["DOAC", form.doac || "Not recorded"],
    ["CHADS2", form.chads2 || "Not recorded"],
    ["Health status since last assessment", healthItems.length ? healthItems.join("; ") : "No items selected"],
    ["Missed doses in an average week", form.missedDoses || "Not recorded"],
    ["Issues with DOAC timing or administration", buildYesNoLabel(form.timingIssues)],
    ["HAS-BLED", form.hasBled || "Not recorded"],
    ["Bleeding review", bleedItems.length ? bleedItems.join("; ") : "No items selected"],
    ["Renal function", form.egfrResult ? `${form.egfrResult} (${form.egfrDate || "date not entered"})` : "Not recorded"],
    ["Recent dehydrating illness or medication change", buildYesNoLabel(form.dehydratingIllness)],
    ["Drug interactions", interactionItems.length ? interactionItems.join("; ") : "No items selected"],
    ["Blood pressure", form.bpSystolic || form.bpDiastolic ? `${form.bpSystolic || "?"}/${form.bpDiastolic || "?"}` : "Not recorded"],
    ["Blood pressure status", form.bpStatus || "Not recorded"],
    ["Falls-prevention referral needed", buildYesNoLabel(form.gaitReferral)],
    ["Overall stable to continue therapy", buildYesNoLabel(form.stableContinue)],
    ["Dose verified", buildYesNoLabel(form.doseVerified)],
    ["Therapy changes needed", buildYesNoLabel(form.therapyChanges)],
    ["Counselling: rationale", buildYesNoLabel(form.counselRationale)],
    ["Counselling: bleeding", buildYesNoLabel(form.counselBleeding)],
    ["Counselling: adherence", buildYesNoLabel(form.counselAdherence)],
    ["Counselling: interactions", buildYesNoLabel(form.counselInteractions)],
    ["Next follow-up date", form.nextFollowupDate || "Not recorded"],
    ["Next bloodwork", form.nextBloodworkDate || "Not recorded"],
    ["Additional comments", form.finalComments || form.healthComments || form.renalComments || form.adherenceComments || "None entered"],
  ];
};

const buildDoacFollowupDocument = (form) => {
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const rows = getDoacFollowupSummaryRows(form)
    .map(
      ([label, value]) => `
        <tr>
          <th>${escapeHtml(label)}</th>
          <td>${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");

  const renderList = (items) =>
    items?.length
      ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : "<p>None recorded.</p>";

  const renderParagraph = (value) =>
    value ? `<p>${escapeHtml(value)}</p>` : "<p>None recorded.</p>";

  const healthItems = getCheckedFollowupItems([
    { label: "Relevant medical problems, ED visits, or hospitalizations", checked: form.healthRelevantProblems },
    { label: "Embolic events", checked: form.healthEmbolicEvents },
    { label: "None of the above", checked: form.healthNone },
  ]);

  const bleedItems = getCheckedFollowupItems([
    { label: "Signs or symptoms of GI bleeding", checked: form.bleedGi },
    { label: "Signs or symptoms of other bleeding", checked: form.bleedOther },
    { label: "Drop in hemoglobin or new anemia", checked: form.bleedHemoglobin },
    { label: "Hypotension with syncope or falls", checked: form.bleedHypotension },
    { label: "None of the above", checked: form.bleedNone },
  ]);

  const interactionItems = getCheckedFollowupItems([
    { label: "ASA or other antiplatelets", checked: form.drugAsa },
    { label: "NSAID", checked: form.drugNsaid },
    { label: "Other drug interactions", checked: form.drugOther },
    { label: "None of the above", checked: form.drugNone },
  ]);

  const counsellingRows = [
    ["Rationale for continued DOAC therapy", buildYesNoLabel(form.counselRationale)],
    ["Bleeding discussion completed", buildYesNoLabel(form.counselBleeding)],
    ["Dosing and missed-dose counselling completed", buildYesNoLabel(form.counselAdherence)],
    ["OTC ASA, NSAIDs, and alcohol advice completed", buildYesNoLabel(form.counselInteractions)],
  ]
    .map(
      ([label, value]) => `
        <tr>
          <th>${escapeHtml(label)}</th>
          <td>${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>DOAC Follow-up Checklist</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; margin: 32px; color: #111827; background: #fff; }
        .sheet { border: 2px solid #23376b; }
        .sheet-header { background: #23376b; color: #fff; padding: 18px 24px; }
        .sheet-header h1 { margin: 0; font-size: 30px; }
        .sheet-date { padding: 18px 24px; border-top: 2px solid #23376b; font-size: 16px; }
        .sheet-section-title { padding: 16px 24px; border-top: 2px solid #23376b; font-size: 18px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border-top: 1px solid #cbd5e1; padding: 14px 24px; vertical-align: top; text-align: left; }
        th { width: 34%; font-weight: 700; background: #f8fafc; }
        .content-section { padding: 0 24px 18px; border-top: 1px solid #cbd5e1; }
        .content-section h2 { font-size: 16px; margin: 18px 0 10px; color: #c2410c; text-transform: uppercase; letter-spacing: 0.04em; }
        .content-section p, .content-section li { line-height: 1.6; font-size: 15px; }
        .content-section ul { margin: 10px 0 0 20px; padding: 0; }
        .disclaimer { padding: 20px 24px; border-top: 2px solid #23376b; font-style: italic; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="sheet-header">
          <h1>Direct Oral Anticoagulant (DOAC) Follow-up Checklist</h1>
        </div>
        <div class="sheet-date">Date: ${escapeHtml(dateLabel)}</div>
        <div class="sheet-section-title">Summary of Patient Profile</div>
        <table>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="content-section">
          <h2>Health status since last assessment</h2>
          ${renderList(healthItems)}
          ${renderParagraph(form.healthComments)}
        </div>
        <div class="content-section">
          <h2>Adherence with DOAC therapy</h2>
          <p>Missed doses in an average week: ${escapeHtml(form.missedDoses || "Not recorded")}</p>
          <p>Issues with timing or administration: ${escapeHtml(buildYesNoLabel(form.timingIssues))}</p>
          ${renderParagraph(form.adherenceComments)}
        </div>
        <div class="content-section">
          <h2>Bleeding risk assessment</h2>
          <p>HAS-BLED: ${escapeHtml(form.hasBled || "Not recorded")}</p>
          ${renderList(bleedItems)}
        </div>
        <div class="content-section">
          <h2>Renal function</h2>
          <p>Latest eGFR: ${escapeHtml(form.egfrResult || "Not recorded")}</p>
          <p>Date measured: ${escapeHtml(form.egfrDate || "Not recorded")}</p>
          <p>Recent dehydrating illness or medication changes: ${escapeHtml(buildYesNoLabel(form.dehydratingIllness))}</p>
          ${renderParagraph(form.renalComments)}
        </div>
        <div class="content-section">
          <h2>Drug interactions and examination</h2>
          ${renderList(interactionItems)}
          <p>Blood pressure: ${escapeHtml(form.bpSystolic || "?")}/${escapeHtml(form.bpDiastolic || "?")} mmHg</p>
          <p>Blood pressure status: ${escapeHtml(form.bpStatus || "Not recorded")}</p>
          <p>Falls-prevention referral needed: ${escapeHtml(buildYesNoLabel(form.gaitReferral))}</p>
        </div>
        <div class="content-section">
          <h2>Final assessment and counselling</h2>
          <table>
            <tbody>
              <tr>
                <th>Overall stable to continue current therapy</th>
                <td>${escapeHtml(buildYesNoLabel(form.stableContinue))}</td>
              </tr>
              <tr>
                <th>Dose verified as appropriate</th>
                <td>${escapeHtml(buildYesNoLabel(form.doseVerified))}</td>
              </tr>
              <tr>
                <th>Changes to therapy required</th>
                <td>${escapeHtml(buildYesNoLabel(form.therapyChanges))}</td>
              </tr>
              ${counsellingRows}
            </tbody>
          </table>
          <p>Next follow-up date: ${escapeHtml(form.nextFollowupDate || "Not recorded")}</p>
          <p>Next bloodwork: ${escapeHtml(form.nextBloodworkDate || "Not recorded")}</p>
          ${renderParagraph(form.finalComments)}
        </div>
        <div class="disclaimer">
          These general recommendations do not replace clinical judgement. Physicians must consider relative risks and benefits for each individual patient.
        </div>
      </div>
    </body>
  </html>`;
};

const referenceTabIconById = {
  overview: BookOpenText,
  criteria: Microscope,
  interpretation: Activity,
  application: HeartPulse,
  references: FileSearch,
};

const getInitialValues = (tool) =>
  tool.inputs.reduce((accumulator, input) => {
    if (input.defaultValue !== undefined) {
      accumulator[input.id] = input.defaultValue;
      return accumulator;
    }

    if (input.type === "checkbox") {
      accumulator[input.id] = false;
      return accumulator;
    }

    if ((input.type === "radio" || input.type === "select") && input.options?.length) {
      accumulator[input.id] = input.options[0].value;
      return accumulator;
    }

    accumulator[input.id] = "";
    return accumulator;
  }, {});

const toolStateDefaults = tools.reduce((accumulator, tool) => {
  accumulator[tool.id] = getInitialValues(tool);
  return accumulator;
}, {});

const getCompletion = (tool, values) => {
  const visibleInputs = tool.inputs.filter((input) => input.type !== "hidden");

  const completed = visibleInputs.filter((input) => {
    const value = values?.[input.id];

    if (input.type === "checkbox") {
      return value === true;
    }

    return value !== undefined && value !== null && value !== "";
  }).length;

  const total = visibleInputs.length || 1;
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  };
};

const getToneClass = (tone) => tone ?? "neutral";

const getTab = (content, id) => content?.tabs?.find((tab) => tab.id === id) ?? null;
const getCards = (content, id) => getTab(content, id)?.cards ?? [];
const getBlocks = (content, id) => getCards(content, id).flatMap((card) => card.blocks ?? []);
const getFirstBlock = (content, id, type) => getBlocks(content, id).find((block) => block.type === type) ?? null;
const getFirstParagraphText = (content, id) => getFirstBlock(content, id, "paragraph")?.text ?? "";
const getFirstTable = (content, id) => getFirstBlock(content, id, "table");
const getFirstList = (content, id) => {
  const block = getBlocks(content, id).find(
    (item) => item.type === "bullet-list" || item.type === "ordered-list"
  );

  return block?.items ?? [];
};
const getReferenceItems = (content) => getBlocks(content, "references")
  .filter((block) => block.type === "reference-list")
  .flatMap((block) => block.items ?? []);
const trimSentence = (value, maxLength = 220) => {
  const safe = sanitizeDisplayText(value);
  if (safe.length <= maxLength) {
    return safe;
  }

  return `${safe.slice(0, maxLength).trim()}...`;
};

const getToolKeywords = (tool) =>
  normalizeValue([tool.title, tool.shortTitle, tool.blurb, ...(tool.tags ?? [])].join(" "))
    .split(" ")
    .filter((token) => token.length > 2);

const getRelatedGuides = (tool) => {
  const tokens = new Set(getToolKeywords(tool));

  return guideLibrary
    .map((guide) => {
      const score = guide.searchTokens.reduce(
        (total, token) => total + (tokens.has(token) ? 1 : 0),
        0
      );

      return {
        ...guide,
        matchScore: score,
      };
    })
    .filter((guide) => guide.matchScore > 0)
    .sort((left, right) => right.matchScore - left.matchScore || left.title.localeCompare(right.title))
    .slice(0, 6);
};

function App() {
  return (
    <SidebarProvider>
      <AppLayout />
    </SidebarProvider>
  );
}

function AppLayout() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(getPageFromHash);
  const [activeToolId, setActiveToolId] = useState(tools[0]?.id ?? "");
  const [activeAcuteId, setActiveAcuteId] = useState(acuteManagementItems[0]?.id ?? "");
  const [doacFollowup, setDoacFollowup] = useState(doacFollowupInitialState);
  const [toolValues, setToolValues] = useState(toolStateDefaults);
  const [activeGuideId, setActiveGuideId] = useState(guideLibrary[0]?.id ?? "");
  const [activeGuideTab, setActiveGuideTab] = useState("overview");
  const [activePdfId, setActivePdfId] = useState(pdfLibrary[0]?.id ?? "");
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();

  const toolSearch = searchTerm.trim().toLowerCase();
  const currentPageMeta = pageDefinitions.find((page) => page.id === currentPage) ?? pageDefinitions[0];

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, "", "#dashboard");
    }

    const syncPage = () => setCurrentPage(getPageFromHash());
    window.addEventListener("hashchange", syncPage);

    return () => window.removeEventListener("hashchange", syncPage);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toolParam = params.get("tool");
    const pdfParam = params.get("pdf");
    const guideParam = params.get("guide");
    const searchParam = params.get("search");
    const checklistParam = params.get("checklist");

    if (toolParam) {
      const matchedTool = tools.find((tool) => tool.id === toolParam);
      if (matchedTool) {
        setActiveToolId(matchedTool.id);
        setCurrentPage(matchedTool.category === "algorithm" ? "algorithms" : "scores");
      }
    }

    if (guideParam) {
      const matchedGuide = guideLibrary.find((guide) => guide.id === guideParam);
      if (matchedGuide) {
        setActiveGuideId(matchedGuide.id);
        if (matchedGuide.pdfId) {
          setActivePdfId(matchedGuide.pdfId);
        }
        setCurrentPage("guides");
      }
    }

    if (pdfParam) {
      const matchedPdf = pdfLibrary.find((pdf) => pdf.id === pdfParam || pdf.stem === pdfParam);
      if (matchedPdf) {
        setActivePdfId(matchedPdf.id);
        const matchedGuide = guideLibrary.find((guide) => guide.pdfId === matchedPdf.id);
        if (matchedGuide) {
          setActiveGuideId(matchedGuide.id);
        }
        setCurrentPage("pdfs");
      }
    }

    if (checklistParam === "doac-followup") {
      setCurrentPage("followup");
    }

    if (searchParam) {
      setSearchTerm(searchParam.replace(/\+/g, " "));
    }
  }, []);

  const navigateToPage = (pageId) => {
    if (!pageIds.has(pageId)) {
      return;
    }

    if (window.location.hash !== `#${pageId}`) {
      window.location.hash = pageId;
    }

    setCurrentPage(pageId);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const searchableTools = useMemo(
    () =>
      tools.filter((tool) => {
        if (!toolSearch) {
          return true;
        }

        return [tool.title, tool.shortTitle, tool.blurb, ...(tool.tags ?? [])]
          .join(" ")
          .toLowerCase()
          .includes(toolSearch);
      }),
    [toolSearch]
  );

  const algorithmTools = useMemo(
    () => searchableTools.filter((tool) => tool.category === "algorithm"),
    [searchableTools]
  );

  const scoreTools = useMemo(
    () => searchableTools.filter((tool) => tool.category === "score" || tool.category === "renal"),
    [searchableTools]
  );

  const filteredGuides = useMemo(
    () =>
      guideLibrary.filter((guide) => {
        if (!toolSearch) {
          return true;
        }

        return guide.searchableText.includes(toolSearch);
      }),
    [toolSearch]
  );

  const filteredVaultEntries = useMemo(
    () =>
      vaultLibrary.filter((guide) => {
        if (!toolSearch) {
          return true;
        }

        return guide.searchableText.includes(toolSearch);
      }),
    [toolSearch]
  );

  const filteredAcuteItems = useMemo(
    () =>
      acuteManagementItems.filter((item) => {
        if (!toolSearch) {
          return true;
        }

        return normalizeValue(`${item.title} ${item.category} ${item.summary} ${item.prompts.join(" ")}`).includes(toolSearch);
      }),
    [toolSearch]
  );

  const visibleTools =
    currentPage === "algorithms"
      ? algorithmTools
      : currentPage === "scores"
        ? scoreTools
        : searchableTools;

  useEffect(() => {
    if (visibleTools.length && !visibleTools.some((tool) => tool.id === activeToolId)) {
      setActiveToolId(visibleTools[0].id);
    }
  }, [activeToolId, visibleTools]);

  useEffect(() => {
    if (filteredGuides.length && !filteredGuides.some((guide) => guide.id === activeGuideId)) {
      setActiveGuideId(filteredGuides[0].id);
    }
  }, [activeGuideId, filteredGuides]);

  useEffect(() => {
    if (filteredVaultEntries.length && !filteredVaultEntries.some((guide) => guide.pdfId === activePdfId)) {
      setActivePdfId(filteredVaultEntries[0].pdfId);
    }
  }, [activePdfId, filteredVaultEntries]);

  useEffect(() => {
    if (filteredAcuteItems.length && !filteredAcuteItems.some((item) => item.id === activeAcuteId)) {
      setActiveAcuteId(filteredAcuteItems[0].id);
    }
  }, [activeAcuteId, filteredAcuteItems]);

  const activeTool =
    visibleTools.find((tool) => tool.id === activeToolId) ??
    searchableTools.find((tool) => tool.id === activeToolId) ??
    tools.find((tool) => tool.id === activeToolId) ??
    tools[0];

  const activeValues = activeTool ? toolValues[activeTool.id] ?? {} : {};
  const result = activeTool ? activeTool.calculate(activeValues) : null;
  const relatedGuides = activeTool ? getRelatedGuides(activeTool) : [];
  const activeGuide =
    filteredGuides.find((guide) => guide.id === activeGuideId) ??
    guideLibrary.find((guide) => guide.id === activeGuideId) ??
    filteredGuides[0] ??
    null;
  const activeVaultEntry =
    filteredVaultEntries.find((guide) => guide.pdfId === activePdfId) ??
    vaultLibrary.find((guide) => guide.pdfId === activePdfId) ??
    filteredVaultEntries[0] ??
    null;
  const activePdf = activeVaultEntry
    ? pdfLibrary.find((pdf) => pdf.id === activeVaultEntry.pdfId) ?? null
    : null;
  const activeGuideOverview = trimSentence(getFirstParagraphText(activeGuide?.content, "overview") || activeGuide?.objective || activeGuide?.excerpt || "");
  const activeGuideApplicationList = getFirstList(activeGuide?.content, "application").slice(0, 4);
  const activeGuideReferenceItems = getReferenceItems(activeGuide?.content).slice(0, 4);
  const activeVaultOverview = trimSentence(getFirstParagraphText(activeVaultEntry?.content, "overview") || activeVaultEntry?.objective || activeVaultEntry?.excerpt || "");
  const activeVaultApplicationList = getFirstList(activeVaultEntry?.content, "application").slice(0, 4);
  const activeVaultReferenceItems = getReferenceItems(activeVaultEntry?.content).slice(0, 5);
  const activeAcuteItem =
    filteredAcuteItems.find((item) => item.id === activeAcuteId) ??
    acuteManagementItems.find((item) => item.id === activeAcuteId) ??
    filteredAcuteItems[0] ??
    acuteManagementItems[0] ??
    null;

  useEffect(() => {
    const firstTabId = activeGuide?.content?.tabs?.[0]?.id ?? "overview";
    setActiveGuideTab(firstTabId);
  }, [activeGuide?.id, activeGuide?.content?.tabs]);

  const stats = {
    tools: tools.length,
    guides: guideLibrary.length,
    pdfs: vaultLibrary.length,
    categories: toolCategories.filter((category) => category.id !== "all").length,
  };

  const workspaceRows = useMemo(
    () =>
      tools.slice(0, 6).map((tool) => ({
        id: tool.id,
        name: tool.shortTitle,
        type: tool.badge,
        category:
          tool.category === "score"
            ? "Score"
            : tool.category === "algorithm"
              ? "Algorithm"
              : "Renal",
        inputs: tool.inputs.filter((input) => input.type !== "hidden").length,
        references: clinicalContentByToolId[tool.id]?.tabs.length ?? 0,
      })),
    []
  );

  const globalSearchResults = useMemo(() => {
    if (!toolSearch) {
      return [];
    }

    const toolResults = searchableTools.slice(0, 5).map((tool) => ({
      id: `tool-${tool.id}`,
      kind: "tool",
      title: tool.title,
      subtitle: tool.blurb,
      pageId: tool.category === "algorithm" ? "algorithms" : "scores",
      pageLabel: tool.category === "algorithm" ? "Algorithms" : "Scores",
      payloadId: tool.id,
      label: "Calculator",
    }));

    const guideResults = filteredGuides.slice(0, 4).map((guide) => ({
      id: `guide-${guide.id}`,
      kind: "guide",
      title: guide.title,
      subtitle: guide.category,
      pageId: "guides",
      pageLabel: "Guides",
      payloadId: guide.id,
      label: "Guide",
    }));

    const pdfResults = filteredVaultEntries.slice(0, 4).map((guide) => ({
      id: `pdf-${guide.id}`,
      kind: "pdf",
      title: guide.title,
      subtitle: guide.category,
      pageId: "pdfs",
      pageLabel: "Clinical Vault",
      payloadId: guide.pdfId,
      label: "Vault",
    }));

    const acuteResults = filteredAcuteItems.slice(0, 4).map((item) => ({
      id: `acute-${item.id}`,
      kind: "acute",
      title: item.title,
      subtitle: item.category,
      pageId: "acute",
      pageLabel: "Acute Management",
      payloadId: item.id,
      label: "Acute",
    }));

    const followupResults = toolSearch.includes("doac") || toolSearch.includes("follow") || toolSearch.includes("checklist")
      ? [
          {
            id: "followup-doac",
            kind: "followup",
            title: "DOAC Follow-up",
            subtitle: "Checklist and printable review page",
            pageId: "followup",
            pageLabel: "DOAC Follow-up",
            payloadId: "doac-followup",
            label: "Checklist",
          },
        ]
      : [];

    return [...toolResults, ...acuteResults, ...followupResults, ...guideResults, ...pdfResults].slice(0, 10);
  }, [filteredAcuteItems, filteredGuides, filteredVaultEntries, searchableTools, toolSearch]);

  const handleSearchSelection = (resultItem) => {
    if (resultItem.kind === "tool") {
      setActiveToolId(resultItem.payloadId);
    }

    if (resultItem.kind === "guide") {
      setActiveGuideId(resultItem.payloadId);
      const guide = guideLibrary.find((entry) => entry.id === resultItem.payloadId);
      if (guide?.pdfId) {
        setActivePdfId(guide.pdfId);
      }
    }

    if (resultItem.kind === "pdf") {
      setActivePdfId(resultItem.payloadId);
      const matchedGuide = vaultLibrary.find((guide) => guide.pdfId === resultItem.payloadId);
      if (matchedGuide) {
        setActiveGuideId(matchedGuide.id);
      }
    }

    if (resultItem.kind === "acute") {
      setActiveAcuteId(resultItem.payloadId);
    }

    if (resultItem.kind === "followup") {
      setCurrentPage("followup");
    }

    setSearchTerm("");
    navigateToPage(resultItem.pageId);
  };

  const updateValue = (toolId, inputId, value) => {
    setToolValues((current) => ({
      ...current,
      [toolId]: {
        ...current[toolId],
        [inputId]: value,
      },
    }));
  };

  const updateDoacFollowup = (field, value) => {
    setDoacFollowup((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetDoacFollowup = () => setDoacFollowup(doacFollowupInitialState);

  const handlePrintDoacFollowup = () => {
    const html = buildDoacFollowupDocument(doacFollowup);
    const popup = window.open("", "_blank", "width=980,height=860");
    if (!popup) {
      return;
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const handleWordDoacFollowup = () => {
    const html = buildDoacFollowupDocument(doacFollowup);
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "doac-followup-checklist.doc";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bd-shell">
      <div className="bd-background bd-background-a" />
      <div className="bd-background bd-background-b" />

      <button
        type="button"
        className={sidebarOpen ? "mobile-backdrop open" : "mobile-backdrop"}
        onClick={() => setSidebarOpen(false)}
        aria-label="Close navigation"
      />

      <AppSidebar
        currentPage={currentPage}
        onNavigate={navigateToPage}
        onSelectTool={(toolId) => {
          setActiveToolId(toolId);
          navigateToPage(getPageForToolId(toolId));
        }}
        onSelectGuide={(guideId) => {
          setActiveGuideId(guideId);
          const guide = guideLibrary.find((entry) => entry.id === guideId);
          if (guide?.pdfId) {
            setActivePdfId(guide.pdfId);
          }
          navigateToPage("guides");
        }}
        onSelectVault={(pdfId, guideId) => {
          setActivePdfId(pdfId);
          if (guideId) {
            setActiveGuideId(guideId);
          }
          navigateToPage("pdfs");
        }}
        onSelectAcute={(acuteId) => {
          setActiveAcuteId(acuteId);
          navigateToPage("acute");
        }}
        onSelectFollowup={() => {
          navigateToPage("followup");
        }}
        activeToolId={activeToolId}
        activeAcuteId={activeAcuteId}
        activeGuideId={activeGuideId}
        activePdfId={activePdfId}
        algorithmItems={algorithmTools}
        acuteItems={filteredAcuteItems}
        scoreItems={scoreTools}
        guideItems={filteredGuides}
        vaultItems={filteredVaultEntries}
        siteName={siteName}
      />

      <div className="bd-main">
        <header className="topbar">
          <div className="topbar-left">
            <SidebarTrigger className="mobile-only" />

            <div>
              <div className="breadcrumb-row">
                <span>Blood Doctor</span>
                <span>/</span>
                <span>{currentPageMeta.label}</span>
              </div>
              <h2>{siteName}</h2>
            </div>
          </div>

          <div className="search-group">
            <label className="search-shell">
              <Search size={16} />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && globalSearchResults.length) {
                    event.preventDefault();
                    handleSearchSelection(globalSearchResults[0]);
                  }
                }}
                placeholder="Search calculators, guides, references, or vault entries..."
              />
            </label>

            {toolSearch ? (
              <div className="search-results-panel">
                {globalSearchResults.length ? (
                  globalSearchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="search-result-item"
                      onClick={() => handleSearchSelection(item)}
                    >
                      <div>
                        <span className="search-result-label">{item.label}</span>
                        <strong>{item.title}</strong>
                        <p>{item.subtitle}</p>
                      </div>
                      <span className="search-result-page">{item.pageLabel}</span>
                    </button>
                  ))
                ) : (
                  <div className="search-empty-state">No results matched your search.</div>
                )}
              </div>
            ) : null}
          </div>

        </header>

        <main className="content-stack">
          {currentPage === "dashboard" ? (
            <>
          <section className="hero-grid">
            <div className="hero-panel">
              <span className="eyebrow with-icon">Overview</span>
              <h3>Anticoagulation operations dashboard</h3>
              <p>
                A unified workspace for bedside calculators, decision support content, and
                markdown-first clinical reading with a cleaner Shadcn-style dashboard structure.
              </p>

              <div className="hero-actions">
                <button type="button" className="primary-button" onClick={() => navigateToPage("algorithms")}>
                  Explore algorithms
                </button>
                <button type="button" className="ghost-button" onClick={() => navigateToPage("guides")}>
                  Browse clinical guides
                </button>
              </div>

              <div className="hero-badges">
                <span className="status-chip">
                  <Calculator size={14} />
                  Calculator engine active
                </span>
                <span className="status-chip">
                  <Microscope size={14} />
                  Markdown guide library
                </span>
                <span className="status-chip">
                  <FileSearch size={14} />
                  Connected clinical vault
                </span>
              </div>
            </div>

            <div className="stat-grid">
              <MetricCard
                icon={Calculator}
                label="Clinical tools"
                value={stats.tools}
                meta="Interactive algorithms and score calculators"
              />
              <MetricCard
                icon={BookOpenText}
                label="Guides in library"
                value={stats.guides}
                meta="Local markdown corpus surfaced as a searchable knowledge layer"
              />
              <MetricCard
                icon={FolderOpen}
                label="Clinical vault"
                value={stats.pdfs}
                meta="Companion archive entries linked back into the markdown guide library"
              />
              <MetricCard
                icon={BrainCircuit}
                label="Matched resources"
                value={relatedGuides.length}
                meta="Guide recommendations linked to the current calculator"
              />
            </div>
          </section>

          <section className="dashboard-secondary-grid">
            <section className="panel alert-panel">
              <div className="section-card-header slim">
                <div>
                  <span className="eyebrow">Clinical alert</span>
                  <h3>Decision support is live</h3>
                </div>
                <ShieldAlert size={17} />
              </div>
              <p>
                All calculator logic remains active. Use the dashboard for structured support, then
                confirm every recommendation against patient context and local policy.
              </p>
            </section>

            <section className="panel table-panel">
              <div className="section-card-header slim">
                <div>
                  <span className="eyebrow">Library table</span>
                  <h3>Core workspace modules</h3>
                </div>
                <Activity size={17} />
              </div>

              <div className="dashboard-table-shell">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Module</th>
                      <th>Type</th>
                      <th>Inputs</th>
                      <th>Reference tabs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspaceRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <button
                            type="button"
                            className="table-link-button"
                            onClick={() => {
                              setActiveToolId(row.id);
                              navigateToPage(
                                tools.find((tool) => tool.id === row.id)?.category === "algorithm"
                                  ? "algorithms"
                                  : "scores"
                              );
                            }}
                          >
                            {row.name}
                          </button>
                        </td>
                        <td>
                          <span className="badge soft">{row.category}</span>
                        </td>
                        <td>{row.inputs}</td>
                        <td>{row.references}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>

            </>
          ) : null}

          {currentPage === "algorithms" || currentPage === "scores" ? (
          <>
          <section className="focus-layout focus-layout-tight">
            <div className="studio-stack">
              <section key={`tool-panel-${activeTool?.id ?? "empty"}`} className="panel active-tool-panel spotlight-panel">
                {activeTool ? (
                  <>
                    <div className="section-card-header">
                      <div>
                        <span className="eyebrow">Current calculator</span>
                        <h3>{activeTool.title}</h3>
                      </div>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() =>
                          setToolValues((current) => ({
                            ...current,
                            [activeTool.id]: getInitialValues(activeTool),
                          }))
                        }
                      >
                        Reset
                      </button>
                    </div>

                    <div className="tool-hero">
                      <div>
                        <p>{activeTool.blurb}</p>
                        <div className="tag-row">
                          {activeTool.tags.map((tag) => (
                            <span key={tag} className="tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="tool-notes-grid">
                      {activeTool.notes.map((note) => (
                        <div key={note} className="note-chip">
                          <span className="note-chip-icon">
                            <Pill size={14} />
                          </span>
                          <p>{note}</p>
                        </div>
                      ))}
                    </div>

                    <div className="form-grid">
                      {activeTool.inputs
                        .filter((input) => input.type !== "hidden")
                        .map((input) => (
                          <FieldRenderer
                            key={input.id}
                            input={input}
                            value={activeValues[input.id]}
                            onChange={(value) => updateValue(activeTool.id, input.id, value)}
                          />
                        ))}
                    </div>
                  </>
                ) : (
                  <div className="empty-state left-aligned">
                    <CircleAlert size={24} />
                    <h4>No tools matched the current search.</h4>
                  </div>
                )}
              </section>

              <div className="insight-grid">
                <ResultPanel result={result} />
              </div>
            </div>
          </section>
          </>
          ) : null}

          {currentPage === "acute" ? (
          <>
          <section className="focus-layout">
            <div key={`acute-panel-${activeAcuteItem?.id ?? "empty"}`} className="panel guide-detail-panel spotlight-panel">
              {activeAcuteItem ? (
                <>
                  <div className="section-card-header">
                    <div>
                      <span className="eyebrow">Acute management</span>
                      <h3>{activeAcuteItem.title}</h3>
                    </div>
                    <HeartPulse size={18} />
                  </div>

                  <div className="guide-meta-row">
                    <div className="mini-stat">
                      <span>Category</span>
                      <strong>{activeAcuteItem.category}</strong>
                    </div>
                    <div className="mini-stat">
                      <span>Core prompts</span>
                      <strong>{activeAcuteItem.prompts.length}</strong>
                    </div>
                    <div className="mini-stat">
                      <span>Workspace</span>
                      <strong>Acute pathway</strong>
                    </div>
                  </div>

                  <div className="guide-summary-grid">
                    <ContentSummaryCard
                      eyebrow="Acute synopsis"
                      title="Overview"
                      description={activeAcuteItem.summary}
                    />
                    <ContentListPreview
                      eyebrow="Key prompts"
                      title="Decision sequence"
                      items={activeAcuteItem.prompts}
                      emptyLabel="Acute prompts will appear here."
                    />
                  </div>

                  <section className="panel reference-panel">
                    <div className="section-card-header slim">
                      <div>
                        <span className="eyebrow">Immediate use</span>
                        <h4>Clinical orientation</h4>
                      </div>
                    </div>
                    <div className="action-card">
                      <p>{activeAcuteItem.action}</p>
                    </div>
                    <div className="result-list">
                      {activeAcuteItem.prompts.map((prompt, index) => (
                        <div key={prompt} className="result-list-item">
                          <span>Step {index + 1}</span>
                          <strong>{prompt}</strong>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              ) : (
                <div className="empty-state left-aligned">
                  <CircleAlert size={24} />
                  <h4>No acute-management items matched the current search.</h4>
                </div>
              )}
            </div>
          </section>
          </>
          ) : null}

          {currentPage === "followup" ? (
          <>
          <DoacFollowupPage
            form={doacFollowup}
            onChange={updateDoacFollowup}
            onReset={resetDoacFollowup}
            onPrint={handlePrintDoacFollowup}
            onDownloadWord={handleWordDoacFollowup}
          />
          </>
          ) : null}

          {currentPage === "guides" ? (
          <>
          <section className="focus-layout">
            <div key={`guide-panel-${activeGuide?.id ?? "empty"}`} className="panel guide-detail-panel spotlight-panel">
              {activeGuide ? (
                <>
                  <div className="section-card-header">
                    <div>
                      <span className="eyebrow">Selected guide</span>
                      <h3>{activeGuide.title}</h3>
                    </div>

                  </div>

                  <div className="guide-meta-row">
                    <div className="mini-stat">
                      <span>Category</span>
                      <strong>{activeGuide.category}</strong>
                    </div>
                    <div className="mini-stat">
                      <span>Updated</span>
                      <strong>{activeGuide.versionDate || activeGuide.updatedAt || "Current"}</strong>
                    </div>
                    <div className="mini-stat">
                      <span>References</span>
                      <strong>
                        {activeGuide.content.tabs.find((tab) => tab.id === "references")?.cards.length ?? 0}
                      </strong>
                    </div>
                  </div>

                  <div className="guide-summary-grid">
                    <ContentSummaryCard
                      eyebrow="Guide synopsis"
                      title="Overview"
                      description={activeGuideOverview}
                    />
                    <ContentListPreview
                      eyebrow="Clinical application"
                      title="Practice points"
                      items={activeGuideApplicationList}
                      emptyLabel="Structured application points will appear here when listed in the guide."
                    />
                    <ContentOutlinePreview
                      eyebrow="Guide structure"
                      title="Key sections"
                      items={activeGuide.headings.slice(0, 8)}
                    />
                    <ContentListPreview
                      eyebrow="Reference preview"
                      title="Key bibliography"
                      items={activeGuideReferenceItems}
                      ordered
                      emptyLabel="Reference entries will appear here when available."
                    />
                  </div>

                  <ClinicalReference
                    eyebrow="Guide dossier"
                    title={activeGuide.title}
                    content={activeGuide.content}
                    activeTab={activeGuideTab}
                    onTabChange={setActiveGuideTab}
                    emptyMessage="No guide sections are available for this entry yet."
                  />

                  {activeGuide.linkedGuideIds.length || activeGuide.linkedToolIds.length ? (
                    <div className="related-panel">
                      <div className="section-card-header slim">
                        <div>
                          <span className="eyebrow">Connected navigation</span>
                          <h4>Linked guides and calculators</h4>
                        </div>
                      </div>

                      <div className="related-guide-list">
                        {guideLibrary
                          .filter((guide) => activeGuide.linkedGuideIds.includes(guide.id))
                          .map((guide) => (
                          <button
                            key={`guide-link-${guide.id}`}
                            type="button"
                            className="related-guide-card"
                            onClick={() => {
                              setActiveGuideId(guide.id);
                            }}
                          >
                            <div>
                              <strong>{guide.title}</strong>
                              <p>{guide.category}</p>
                            </div>
                            <ArrowUpRight size={15} />
                          </button>
                        ))}
                        {tools
                          .filter((tool) => activeGuide.linkedToolIds.includes(tool.id))
                          .map((tool) => (
                            <button
                              key={`tool-link-${tool.id}`}
                              type="button"
                              className="related-guide-card"
                              onClick={() => {
                                setActiveToolId(tool.id);
                                navigateToPage(getPageForToolId(tool.id));
                              }}
                            >
                              <div>
                                <strong>{tool.title}</strong>
                                <p>{tool.badge}</p>
                              </div>
                              <ArrowUpRight size={15} />
                            </button>
                          ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="empty-state left-aligned">
                  <CircleAlert size={24} />
                  <h4>No guides matched the current search.</h4>
                </div>
              )}
            </div>
          </section>
          </>
          ) : null}

          {currentPage === "pdfs" ? (
          <>
          <section className="focus-layout">
            <div key={`vault-panel-${activeVaultEntry?.id ?? "empty"}`} className="panel pdf-viewer-panel spotlight-panel">
              {activeVaultEntry ? (
                <>
                  <div className="section-card-header">
                    <div>
                      <span className="eyebrow">Vault record</span>
                      <h3>{activeVaultEntry.title}</h3>
                    </div>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => {
                        setActiveGuideId(activeVaultEntry.id);
                        navigateToPage("guides");
                      }}
                    >
                      Open guide page
                    </button>
                  </div>

                  <div className="pdf-meta-strip">
                    <div className="mini-stat">
                      <span>Topic</span>
                      <strong>{activeVaultEntry.category}</strong>
                    </div>
                    <div className="mini-stat">
                      <span>Guide sections</span>
                      <strong>{activeVaultEntry.headings.length}</strong>
                    </div>
                    <div className="mini-stat">
                      <span>References</span>
                      <strong>
                        {activeVaultEntry.content.tabs.find((tab) => tab.id === "references")?.cards.length ?? 0}
                      </strong>
                    </div>
                  </div>

                  <div className="guide-summary-grid">
                    <ContentSummaryCard
                      eyebrow="Vault synopsis"
                      title="Overview"
                      description={activeVaultOverview}
                    />
                    <ContentListPreview
                      eyebrow="Clinical application"
                      title="Practice points"
                      items={activeVaultApplicationList}
                      emptyLabel="Structured clinical points will appear here when listed in the vault summary."
                    />
                    <ContentOutlinePreview
                      eyebrow="Vault structure"
                      title="Key sections"
                      items={activeVaultEntry.headings.slice(0, 8)}
                    />
                    <ContentListPreview
                      eyebrow="Reference preview"
                      title="Bibliography"
                      items={activeVaultReferenceItems}
                      ordered
                      emptyLabel="Reference entries will appear here when available."
                    />
                  </div>

                  <ClinicalReference
                    eyebrow="Vault summary"
                    title={activeVaultEntry.title}
                    content={activeVaultEntry.content}
                    activeTab={activeGuideTab}
                    onTabChange={setActiveGuideTab}
                    emptyMessage="No structured vault summary is available for this entry yet."
                  />
                </>
              ) : (
                <div className="empty-state">
                  <FolderOpen size={28} />
                  <h3>No vault entries matched the current search</h3>
                </div>
              )}
            </div>
          </section>
          </>
          ) : null}
        </main>

        <footer className="footer">
          <p>Dr Abdul Mannan FRCPath FCPS I Blood🩸Doctor I blooddoctor.co@gmail.com</p>
        </footer>
      </div>
    </div>
  );
}

function DoacFollowupPage({ form, onChange, onReset, onPrint, onDownloadWord }) {
  const summaryRows = getDoacFollowupSummaryRows(form);

  return (
    <section className="focus-layout">
      <div className="panel doac-followup-panel spotlight-panel">
        <div className="doac-followup-hero">
          <div className="doac-followup-hero-bar">
            <h3>DOAC Follow-up</h3>
          </div>
          <div className="doac-followup-toolbar">
            <div>
              <span className="eyebrow">Checklist workspace</span>
              <p>Structured review template for outpatient DOAC follow-up, documentation, and counselling.</p>
            </div>
            <div className="button-cluster">
              <button type="button" className="ghost-button" onClick={onReset}>
                Reset
              </button>
              <button type="button" className="ghost-button" onClick={onPrint}>
                <Printer size={16} />
                Print / Save PDF
              </button>
              <button type="button" className="primary-button" onClick={onDownloadWord}>
                <FileText size={16} />
                Download Word
              </button>
            </div>
          </div>
        </div>

        <div className="doac-followup-body">
          <section className="doac-section-card">
            <div className="doac-field-grid">
              <DoacTextField
                label="Patient name"
                value={form.patientName}
                onChange={(value) => onChange("patientName", value)}
              />
              <DoacTextField
                label="Patient age"
                value={form.patientAge}
                inputMode="numeric"
                onChange={(value) => onChange("patientAge", value)}
              />
              <DoacTextField
                label="Weight (kg)"
                value={form.weightKg}
                inputMode="decimal"
                onChange={(value) => onChange("weightKg", value)}
              />
              <DoacTextField
                label="Weight (lb)"
                value={form.weightLb}
                inputMode="decimal"
                onChange={(value) => onChange("weightLb", value)}
              />
              <DoacRadioGroup
                label="Sex"
                value={form.sex}
                onChange={(value) => onChange("sex", value)}
                options={[
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                ]}
              />
              <DoacRadioGroup
                label="DOAC"
                value={form.doac}
                onChange={(value) => onChange("doac", value)}
                options={[
                  { value: "Apixaban", label: "Apixaban" },
                  { value: "Dabigatran", label: "Dabigatran" },
                  { value: "Edoxaban", label: "Edoxaban" },
                  { value: "Rivaroxaban", label: "Rivaroxaban" },
                ]}
              />
              <DoacSelectField
                label="CHADS2"
                value={form.chads2}
                onChange={(value) => onChange("chads2", value)}
                options={["", "0", "1", "2", "3", "4", "5", "6"]}
              />
            </div>
          </section>

          <DoacSectionTitle title="Health status since last assessment" />
          <section className="doac-section-card">
            <p className="doac-section-lead">Please check all that apply to the patient:</p>
            <DoacCheckboxList
              items={[
                ["healthRelevantProblems", "Relevant medical problems, ED visits, or hospitalizations"],
                ["healthEmbolicEvents", "Embolic events"],
                ["healthNone", "None of the above"],
              ]}
              form={form}
              onChange={onChange}
            />
            <DoacTextArea
              label="Other comments"
              value={form.healthComments}
              onChange={(value) => onChange("healthComments", value)}
            />
          </section>

          <DoacSectionTitle title="Adherence with DOAC therapy" />
          <section className="doac-section-card">
            <DoacRadioGroup
              label="How many doses has the patient missed in an average week?"
              value={form.missedDoses}
              onChange={(value) => onChange("missedDoses", value)}
              options={[
                { value: "0", label: "0" },
                { value: "1 - 2", label: "1 – 2" },
                { value: "≥ 3", label: "≥ 3" },
              ]}
            />
            <DoacRadioGroup
              label="Any issues with taking the DOAC properly, including food or timing?"
              value={form.timingIssues}
              onChange={(value) => onChange("timingIssues", value)}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
            <DoacTextArea
              label="Adherence comments"
              value={form.adherenceComments}
              onChange={(value) => onChange("adherenceComments", value)}
            />
          </section>

          <DoacSectionTitle title="Bleeding risk assessment" />
          <section className="doac-section-card">
            <DoacSelectField
              label="HAS-BLED"
              value={form.hasBled}
              onChange={(value) => onChange("hasBled", value)}
              options={["", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]}
            />
            <p className="doac-section-lead">Please check all that apply. A positive response prompts individualized review and does not by itself mean the DOAC should be stopped.</p>
            <DoacCheckboxList
              items={[
                ["bleedGi", "Signs or symptoms of GI bleeding"],
                ["bleedOther", "Signs or symptoms of other bleeding"],
                ["bleedHemoglobin", "Drop in hemoglobin or new anemia"],
                ["bleedHypotension", "Hypotension with syncope or falls"],
                ["bleedNone", "None of the above"],
              ]}
              form={form}
              onChange={onChange}
            />
          </section>

          <DoacSectionTitle title="Creatinine clearance / renal function" />
          <section className="doac-section-card">
            <div className="doac-field-grid">
              <DoacDateField
                label="When was eGFR last measured?"
                value={form.egfrDate}
                onChange={(value) => onChange("egfrDate", value)}
              />
              <DoacTextField
                label="eGFR result"
                value={form.egfrResult}
                onChange={(value) => onChange("egfrResult", value)}
              />
            </div>
            <DoacRadioGroup
              label="Any recent dehydrating illness or medications added or changed?"
              value={form.dehydratingIllness}
              onChange={(value) => onChange("dehydratingIllness", value)}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
            <DoacTextArea
              label="Other comments"
              value={form.renalComments}
              onChange={(value) => onChange("renalComments", value)}
            />
          </section>

          <DoacSectionTitle title="Drug interactions (review all concomitant medications)" />
          <section className="doac-section-card">
            <p className="doac-section-lead">Please check all that apply:</p>
            <DoacCheckboxList
              items={[
                ["drugAsa", "ASA or other antiplatelets"],
                ["drugNsaid", "NSAID"],
                ["drugOther", "Other drug interactions"],
                ["drugNone", "None of the above"],
              ]}
              form={form}
              onChange={onChange}
            />
          </section>

          <DoacSectionTitle title="Examination" />
          <section className="doac-section-card">
            <div className="doac-field-grid">
              <DoacTextField
                label="Actual BP systolic"
                value={form.bpSystolic}
                inputMode="numeric"
                onChange={(value) => onChange("bpSystolic", value)}
              />
              <DoacTextField
                label="Actual BP diastolic"
                value={form.bpDiastolic}
                inputMode="numeric"
                onChange={(value) => onChange("bpDiastolic", value)}
              />
            </div>
            <DoacRadioGroup
              label="Patient's blood pressure is"
              value={form.bpStatus}
              onChange={(value) => onChange("bpStatus", value)}
              options={[
                { value: "Within target", label: "Within target" },
                { value: "High", label: "High" },
                { value: "Low", label: "Low" },
              ]}
            />
            <DoacRadioGroup
              label="Does the patient need referral for gait assessment or walking aids for falls prevention?"
              value={form.gaitReferral}
              onChange={(value) => onChange("gaitReferral", value)}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </section>

          <DoacSectionTitle title="Final assessment and recommendations" />
          <section className="doac-section-card">
            <DoacBinaryMatrix
              rows={[
                [
                  "Overall patient appears stable from the anticoagulant standpoint; benefits of continued anticoagulant therapy outweigh risks; recommend continuation.",
                  form.stableContinue,
                  (value) => onChange("stableContinue", value),
                ],
                [
                  "Dose verified and appropriate for age, weight, renal function, and current health status.",
                  form.doseVerified,
                  (value) => onChange("doseVerified", value),
                ],
                [
                  "Any changes to current therapy are needed.",
                  form.therapyChanges,
                  (value) => onChange("therapyChanges", value),
                ],
              ]}
            />
          </section>

          <DoacSectionTitle title="Patient education and counselling" />
          <section className="doac-section-card">
            <DoacBinaryMatrix
              rows={[
                [
                  "The rationale for continued DOAC therapy was discussed.",
                  form.counselRationale,
                  (value) => onChange("counselRationale", value),
                ],
                [
                  "The potential for minor, major, or life-threatening bleeding was discussed.",
                  form.counselBleeding,
                  (value) => onChange("counselBleeding", value),
                ],
                [
                  "Dosing instructions, adherence, and handling of missed doses were reviewed.",
                  form.counselAdherence,
                  (value) => onChange("counselAdherence", value),
                ],
                [
                  "Avoiding OTC ASA and NSAIDs and minimizing alcohol intake were discussed.",
                  form.counselInteractions,
                  (value) => onChange("counselInteractions", value),
                ],
              ]}
            />
            <div className="doac-field-grid">
              <DoacDateField
                label="Next follow-up date"
                value={form.nextFollowupDate}
                onChange={(value) => onChange("nextFollowupDate", value)}
              />
              <DoacDateField
                label="Next bloodwork"
                value={form.nextBloodworkDate}
                onChange={(value) => onChange("nextBloodworkDate", value)}
              />
            </div>
            <DoacTextArea
              label="Final comments"
              value={form.finalComments}
              onChange={(value) => onChange("finalComments", value)}
            />
          </section>

          <section className="doac-summary-sheet">
            <div className="doac-summary-header">
              <h4>Direct Oral Anticoagulant (DOAC) Follow-up Checklist</h4>
            </div>
            <div className="doac-summary-date">
              Date: {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(new Date())}
            </div>
            <div className="doac-summary-title">Summary of patient profile</div>
            <div className="doac-summary-table">
              {summaryRows.map(([label, value]) => (
                <div key={label} className="doac-summary-row">
                  <strong>{label}</strong>
                  <span>{value}</span>
                </div>
              ))}
            </div>
            <div className="doac-summary-disclaimer">
              These general recommendations do not replace clinical judgement. Physicians must consider relative risks and benefits in each patient.
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function DoacSectionTitle({ title }) {
  return (
    <div className="doac-section-title">
      <h4>{title}</h4>
    </div>
  );
}

function DoacTextField({ label, value, onChange, inputMode = "text" }) {
  return (
    <label className="doac-input">
      <span>{label}</span>
      <input value={value} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function DoacDateField({ label, value, onChange }) {
  return (
    <label className="doac-input">
      <span>{label}</span>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function DoacTextArea({ label, value, onChange }) {
  return (
    <label className="doac-input doac-input-wide">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function DoacSelectField({ label, value, onChange, options }) {
  return (
    <label className="doac-input">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option || "empty"} value={option}>
            {option || "Select"}
          </option>
        ))}
      </select>
    </label>
  );
}

function DoacRadioGroup({ label, value, onChange, options }) {
  return (
    <div className="doac-input doac-input-wide">
      <span>{label}</span>
      <div className="doac-radio-list">
        {options.map((option) => (
          <label key={option.value} className={value === option.value ? "doac-choice active" : "doac-choice"}>
            <input
              type="radio"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function DoacCheckboxList({ items, form, onChange }) {
  return (
    <div className="doac-checkbox-list">
      {items.map(([field, label]) => (
        <label key={field} className={form[field] ? "doac-choice checkbox active" : "doac-choice checkbox"}>
          <input
            type="checkbox"
            checked={Boolean(form[field])}
            onChange={(event) => onChange(field, event.target.checked)}
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}

function DoacBinaryMatrix({ rows }) {
  return (
    <div className="doac-matrix">
      <div className="doac-matrix-head">
        <span />
        <strong>Yes</strong>
        <strong>No</strong>
      </div>
      {rows.map(([label, value, onChange]) => (
        <div key={label} className="doac-matrix-row">
          <div className="doac-matrix-label">{label}</div>
          <label className={value === "yes" ? "doac-matrix-choice active" : "doac-matrix-choice"}>
            <input type="radio" checked={value === "yes"} onChange={() => onChange("yes")} />
            <span />
          </label>
          <label className={value === "no" ? "doac-matrix-choice active" : "doac-matrix-choice"}>
            <input type="radio" checked={value === "no"} onChange={() => onChange("no")} />
            <span />
          </label>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, meta }) {
  return (
    <article className="metric-card">
      <div className="metric-icon">
        <Icon size={18} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{meta}</p>
    </article>
  );
}

function ContentSummaryCard({ eyebrow, title, description }) {
  return (
    <article className="guide-story-card">
      <div className="section-card-header slim">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h4>{title}</h4>
        </div>
      </div>
      <p className="guide-story-copy">{description || "No structured summary is available yet."}</p>
    </article>
  );
}

function ContentOutlinePreview({ eyebrow, title, items }) {
  return (
    <article className="guide-story-card">
      <div className="section-card-header slim">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h4>{title}</h4>
        </div>
      </div>
      {items?.length ? (
        <ul className="guide-outline-list">
          {items.map((item) => (
            <li key={item}>
              <ArrowUpRight size={14} />
              <span>{sanitizeDisplayText(item)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="guide-story-copy">Section headings will appear here when available.</p>
      )}
    </article>
  );
}

function ContentListPreview({ eyebrow, title, items, ordered = false, emptyLabel }) {
  const ListTag = ordered ? "ol" : "ul";

  return (
    <article className="guide-story-card">
      <div className="section-card-header slim">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h4>{title}</h4>
        </div>
      </div>
      {items?.length ? (
        <ListTag className={ordered ? "content-list compact ordered" : "content-list compact"}>
          {items.map((item) => (
            <li key={item}>{renderInlineContent(item)}</li>
          ))}
        </ListTag>
      ) : (
        <p className="guide-story-copy">{emptyLabel}</p>
      )}
    </article>
  );
}

function ContentTablePreview({ eyebrow, title, table }) {
  return (
    <article className="guide-story-card wide">
      <div className="section-card-header slim">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h4>{title}</h4>
        </div>
      </div>
      {table?.headers?.length && table?.rows?.length ? (
        <div className="content-table-shell compact">
          <table className="content-table compact">
            <thead>
              <tr>
                {table.headers.map((header) => (
                  <th key={header}>{renderInlineContent(header)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.slice(0, 5).map((row, rowIndex) => (
                <tr key={`${row.join("-")}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${cell}-${cellIndex}`}>{renderInlineContent(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="guide-story-copy">A structured comparison table will appear here when available.</p>
      )}
    </article>
  );
}

function PageLead({ eyebrow, title, description }) {
  return (
    <section className="page-lead panel">
      <span className="eyebrow">{eyebrow}</span>
      <div className="page-lead-grid">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
    </section>
  );
}

function FieldRenderer({ input, value, onChange }) {
  if (input.type === "checkbox") {
    return (
      <label className={value ? "field-card checkbox-card active" : "field-card checkbox-card"}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{input.label}</span>
      </label>
    );
  }

  if (input.type === "radio") {
    return (
      <fieldset className="field-card">
        <legend>{input.label}</legend>
        <div className="segmented-control">
          {input.options.map((option) => (
            <label
              key={option.value}
              className={value === option.value ? "segment active" : "segment"}
            >
              <input
                type="radio"
                name={input.id}
                value={option.value}
                checked={value === option.value}
                onChange={(event) => onChange(event.target.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (input.type === "select") {
    return (
      <label className="field-card">
        <span>{input.label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {input.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="field-card">
      <span>{input.label}</span>
      <input
        type="number"
        min={input.min}
        max={input.max}
        step={input.step ?? 1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ResultPanel({ result }) {
  if (!result) {
    return (
      <section className="panel result-panel neutral">
        <div className="section-card-header">
          <div>
            <span className="eyebrow">Outcome</span>
            <h3>Live interpretation</h3>
          </div>
          <Calculator size={17} />
        </div>
        <div className="empty-state left-aligned">
          <CircleAlert size={24} />
          <h4>Complete the inputs to generate an actionable recommendation.</h4>
        </div>
      </section>
    );
  }

  const tone = getToneClass(result.tone);
  const meta = toneMeta[tone];
  const ToneIcon = meta.icon;

  return (
    <section className={`panel result-panel ${tone}`}>
      <div className="section-card-header">
        <div>
          <span className="eyebrow">Outcome</span>
          <h3>Live interpretation</h3>
        </div>
        <ToneIcon size={18} />
      </div>

      <div className="result-callout">
        <span className="badge status">{meta.label}</span>
        <h4>{result.headline}</h4>
        {result.summary ? <p>{result.summary}</p> : null}
      </div>

      {result.action ? (
        <div className="action-card">
          <span className="eyebrow">Recommended move</span>
          <p>{result.action}</p>
        </div>
      ) : null}

      {result.metrics?.length ? (
        <div className="mini-stat-grid">
          {result.metrics.map((metric) => (
            <div key={`${metric.label}-${metric.value}`} className="mini-stat">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {result.recommendations?.length ? (
        <div className="result-list">
          {result.recommendations.map((item) => (
            <div key={`${item.label}-${item.value}`} className="result-list-item">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {result.tables?.length ? (
        <div className="result-table-stack">
          {result.tables.map((table) => (
            <div key={table.title} className="action-card result-table-card">
              <span className="eyebrow">{table.title}</span>
              <div className="content-table-shell compact">
                <table className="content-table compact">
                  <thead>
                    <tr>
                      {table.headers.map((header) => (
                        <th key={header}>{renderInlineContent(header)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, rowIndex) => (
                      <tr key={`${table.title}-${rowIndex}`}>
                        {row.map((cell, cellIndex) => (
                          <td key={`${table.title}-${rowIndex}-${cellIndex}`}>
                            {renderInlineContent(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {result.supporting?.length ? (
        <ul className="support-list">
          {result.supporting.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      <div className="tool-disclaimer">
        <span className="eyebrow">Clinical disclaimer</span>
        <p>{globalToolDisclaimer.text}</p>
        {globalToolDisclaimer.source ? <small>{globalToolDisclaimer.source}</small> : null}
      </div>
    </section>
  );
}

function ClinicalReference({
  title,
  content,
  activeTab,
  onTabChange,
  eyebrow = "Clinical detail",
  emptyMessage = "No clinical detail is available for this tool yet.",
}) {
  const visibleTab = content.tabs.find((tab) => tab.id === activeTab) ?? content.tabs[0] ?? null;
  const [openCardId, setOpenCardId] = useState("");

  useEffect(() => {
    if (!visibleTab?.cards?.length) {
      setOpenCardId("");
      return;
    }

    setOpenCardId(`${visibleTab.id}-${visibleTab.cards[0].title}`);
  }, [visibleTab]);

  const TabIcon = referenceTabIconById[visibleTab?.id] ?? BookOpenText;

  return (
    <section className="panel reference-panel">
      <div className="section-card-header">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h3>{title || "Clinical reference"}</h3>
        </div>
        <BookOpenText size={17} />
      </div>

      {content.tabs.length ? (
        <>
          <div className="tab-row" role="tablist" aria-label="Clinical reference sections">
            {content.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={visibleTab?.id === tab.id}
                className={visibleTab?.id === tab.id ? "tab-button active" : "tab-button"}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {visibleTab ? (
            <div className="reference-panel-body">
              <div className="accordion-list">
                {visibleTab.cards.map((card) => {
                  const cardId = `${visibleTab.id}-${card.title}`;
                  const isOpen = openCardId === cardId;

                  return (
                    <article key={cardId} className={isOpen ? "accordion-card open" : "accordion-card"}>
                      <button
                        type="button"
                        className="accordion-toggle"
                        onClick={() => setOpenCardId(isOpen ? "" : cardId)}
                        aria-expanded={isOpen}
                      >
                        <span className="accordion-toggle-copy">
                          <span className="accordion-toggle-icon">
                            <TabIcon size={16} />
                          </span>
                          <span>
                            <strong>{card.title}</strong>
                            {card.summary ? <p>{card.summary}</p> : null}
                          </span>
                        </span>
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>

                      {isOpen ? (
                        <div className="accordion-content">
                          {card.blocks.map((block, index) => (
                            <ContentBlock key={`${card.title}-${block.type}-${index}`} block={block} />
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="empty-state left-aligned">
          <CircleAlert size={24} />
          <h4>{emptyMessage}</h4>
        </div>
      )}
    </section>
  );
}

function ContentBlock({ block }) {
  if (block.type === "paragraph") {
    return <p className="content-paragraph">{renderInlineContent(block.text)}</p>;
  }

  if (block.type === "subheading") {
    return <h5 className="content-subheading">{renderInlineContent(block.text)}</h5>;
  }

  if (block.type === "fact") {
    return (
      <div className="fact-row">
        <span>{renderInlineContent(block.label)}</span>
        <strong>{renderInlineContent(block.value)}</strong>
      </div>
    );
  }

  if (block.type === "callout") {
    const Icon = block.tone === "warning" ? CircleAlert : BadgeCheck;
    return (
      <div className={`content-callout ${block.tone === "warning" ? "warning" : "note"}`}>
        <div className="content-callout-icon">
          <Icon size={16} />
        </div>
        <div>
          <strong>{renderInlineContent(block.label)}</strong>
          <p>{renderInlineContent(block.value)}</p>
        </div>
      </div>
    );
  }

  if (block.type === "reference-list") {
    return (
      <ol className="reference-list">
        {block.items.map((item) => (
          <li key={item} className="reference-item">
            {renderInlineContent(item)}
          </li>
        ))}
      </ol>
    );
  }

  if (block.type === "bullet-list" || block.type === "ordered-list") {
    const ListTag = block.type === "ordered-list" ? "ol" : "ul";
    return (
      <ListTag className="content-list">
        {block.items.map((item) => (
          <li key={item}>{renderInlineContent(item)}</li>
        ))}
      </ListTag>
    );
  }

  if (block.type === "table") {
    return (
      <div className="content-table-shell">
        <table className="content-table">
          <thead>
            <tr>
              {block.headers.map((header) => (
                <th key={header}>{renderInlineContent(header)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={`${row.join("-")}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`}>{renderInlineContent(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.type === "code") {
    return (
      <pre className="content-code">
        <code>{block.content}</code>
      </pre>
    );
  }

  return null;
}

function renderInlineContent(text) {
  const safeText = sanitizeDisplayText(text);
  const tokens = [];
  const pattern = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match = pattern.exec(safeText);

  while (match) {
    if (match.index > lastIndex) {
      tokens.push(safeText.slice(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      const resolvedTarget = resolveMarkdownTarget(match[3]);

      if (resolvedTarget?.kind === "guide") {
        tokens.push(
          <a
            key={`${match[2]}-${match.index}`}
            href={buildGuideHref(resolvedTarget.id)}
            className="content-link"
          >
            {match[2]}
          </a>
        );
      } else if (resolvedTarget?.kind === "tool") {
        tokens.push(
          <a
            key={`${match[2]}-${match.index}`}
            href={buildToolHref(resolvedTarget.id)}
            className="content-link"
          >
            {match[2]}
          </a>
        );
      } else if (
        resolvedTarget?.kind === "external" &&
        !/thrombosiscanada\.ca/i.test(resolvedTarget.href)
      ) {
        tokens.push(
          <a
            key={`${match[2]}-${match.index}`}
            href={resolvedTarget.href}
            target="_blank"
            rel="noreferrer"
            className="content-link"
          >
            {match[2]}
          </a>
        );
      } else {
        tokens.push(match[2]);
      }
    } else if (match[4]) {
      tokens.push(<strong key={`${match[4]}-${match.index}`}>{match[4]}</strong>);
    } else if (match[5]) {
      tokens.push(<code key={`${match[5]}-${match.index}`}>{match[5]}</code>);
    } else if (match[6]) {
      tokens.push(<em key={`${match[6]}-${match.index}`}>{match[6]}</em>);
    }

    lastIndex = pattern.lastIndex;
    match = pattern.exec(safeText);
  }

  if (lastIndex < safeText.length) {
    tokens.push(safeText.slice(lastIndex));
  }

  return tokens.map((token, index) => {
    if (typeof token === "string") {
      return <Fragment key={`${token}-${index}`}>{token}</Fragment>;
    }

    return token;
  });
}

function sanitizeDisplayText(value) {
  if (!value) {
    return "";
  }

  return value
    .replace(/^#{1,4}\s+/gm, "")
    .replace(/\s+#{1,4}\s+/g, " ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/^"\s*/gm, "")
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "")
    .replace(/\$\$([^$]+)\$\$/g, "$1")
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/\\([_%#&])/g, "$1")
    .replace(/(^|\s)---(\s|$)/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export default App;
