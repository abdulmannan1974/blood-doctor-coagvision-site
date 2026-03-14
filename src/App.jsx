import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  BookOpenText,
  BrainCircuit,
  Calculator,
  ChartColumnBig,
  CircleAlert,
  CircleCheckBig,
  Eye,
  FileSearch,
  FolderOpen,
  HeartPulse,
  LayoutDashboard,
  Microscope,
  Pill,
  Search,
  ShieldAlert,
  TestTubeDiagonal,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toolCategories, tools } from "./data/tools";
import { clinicalContentByToolId } from "./data/markdownContent";
import { guideLibrary, pdfLibrary, resolveMarkdownTarget, vaultLibrary } from "./data/library";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

const siteName = "Blood🩸Doctor CoagVision";

const toneMeta = {
  success: {
    label: "Low-friction",
    icon: CircleCheckBig,
  },
  warning: {
    label: "Clinical caution",
    icon: CircleAlert,
  },
  danger: {
    label: "High-risk output",
    icon: ShieldAlert,
  },
  neutral: {
    label: "Decision support",
    icon: BadgeCheck,
  },
};

const chartPalette = ["#d24755", "#f0a23b", "#0f766e", "#0f172a", "#d97706", "#8b1e3f"];

const normalizeValue = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const getPageForToolId = (toolId) =>
  tools.find((tool) => tool.id === toolId)?.category === "algorithm" ? "algorithms" : "scores";
const buildGuideHref = (guideId, pageId = "guides") => `?guide=${encodeURIComponent(guideId)}#${pageId}`;
const buildToolHref = (toolId) => `?tool=${encodeURIComponent(toolId)}#${getPageForToolId(toolId)}`;

const pageDefinitions = [
  { id: "dashboard", label: "Dashboard", shortLabel: "Dashboard", icon: LayoutDashboard },
  { id: "algorithms", label: "Interactive Algorithms", shortLabel: "Algorithms", icon: BrainCircuit },
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
  const [toolValues, setToolValues] = useState(toolStateDefaults);
  const [activeClinicalTab, setActiveClinicalTab] = useState("overview");
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

  const activeTool =
    visibleTools.find((tool) => tool.id === activeToolId) ??
    searchableTools.find((tool) => tool.id === activeToolId) ??
    tools.find((tool) => tool.id === activeToolId) ??
    tools[0];

  const activeValues = activeTool ? toolValues[activeTool.id] ?? {} : {};
  const result = activeTool ? activeTool.calculate(activeValues) : null;
  const activeClinicalContent = activeTool
    ? clinicalContentByToolId[activeTool.id] ?? { tabs: [] }
    : { tabs: [] };
  const completion = activeTool ? getCompletion(activeTool, activeValues) : { completed: 0, total: 1, percent: 0 };
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

  useEffect(() => {
    const firstTabId = activeClinicalContent.tabs[0]?.id ?? "overview";
    setActiveClinicalTab(firstTabId);
  }, [activeToolId, activeClinicalContent.tabs]);

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

  const categoryChartData = useMemo(
    () =>
      toolCategories
        .filter((category) => category.id !== "all")
        .map((category) => ({
          name: category.label,
          total: tools.filter((tool) => tool.category === category.id).length,
        })),
    []
  );

  const complexityChartData = useMemo(
    () =>
      [...tools]
        .map((tool) => ({
          name: tool.shortTitle,
          inputs: tool.inputs.filter((input) => input.type !== "hidden").length,
        }))
        .sort((left, right) => right.inputs - left.inputs)
        .slice(0, 6),
    []
  );

  const knowledgeMixData = useMemo(
    () => [
      { name: "Calculators", value: tools.length },
      { name: "Guides", value: guideLibrary.length },
      { name: "Vault entries", value: vaultLibrary.length },
    ],
    []
  );

  const activeToolRadarData = useMemo(() => {
    if (!activeTool || !result) {
      return [];
    }

    const resultMetricCount = result.metrics?.length ?? 0;
    const referenceCardCount = activeClinicalContent.tabs.reduce(
      (total, tab) => total + tab.cards.length,
      0
    );

    return [
      {
        subject: "Inputs",
        value: activeTool.inputs.filter((input) => input.type !== "hidden").length,
        fullMark: 14,
      },
      {
        subject: "Tags",
        value: activeTool.tags.length,
        fullMark: 8,
      },
      {
        subject: "Metrics",
        value: resultMetricCount,
        fullMark: 6,
      },
      {
        subject: "Reference cards",
        value: Math.min(referenceCardCount, 14),
        fullMark: 14,
      },
      {
        subject: "Guide matches",
        value: Math.min(relatedGuides.length, 6),
        fullMark: 6,
      },
    ];
  }, [activeClinicalContent.tabs, activeTool, relatedGuides.length, result]);

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

    return [...toolResults, ...guideResults, ...pdfResults].slice(0, 10);
  }, [filteredGuides, filteredVaultEntries, searchableTools, toolSearch]);

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
        activeToolId={activeToolId}
        activeGuideId={activeGuideId}
        activePdfId={activePdfId}
        algorithmItems={algorithmTools}
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

          <div className="topbar-actions">
            <button type="button" className="ghost-button" onClick={() => navigateToPage("algorithms")}>
              Algorithms
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => navigateToPage("pdfs")}
            >
              <Eye size={16} />
              Open clinical vault
            </button>
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

          <section className="analytics-grid">
            <ChartCard
              title="Tool footprint"
              description="Distribution of calculator types across the platform."
              icon={ChartColumnBig}
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} />
                  <Bar dataKey="total" radius={[10, 10, 0, 0]} fill="#8b1e3f" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Most detailed calculators"
              description="Highest-input calculators for richer bedside decision support."
              icon={HeartPulse}
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart layout="vertical" data={complexityChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis dataKey="name" type="category" width={88} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} />
                  <Bar dataKey="inputs" radius={[0, 10, 10, 0]} fill="#f0a23b" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Knowledge mix"
              description="How the platform balances calculators, markdown guides, and connected vault entries."
              icon={TestTubeDiagonal}
            >
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={knowledgeMixData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={88}
                    paddingAngle={4}
                  >
                    {knowledgeMixData.map((entry, index) => (
                      <Cell key={entry.name} fill={chartPalette[index % chartPalette.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="chart-legend">
                {knowledgeMixData.map((entry, index) => (
                  <div key={entry.name} className="legend-row">
                    <span
                      className="legend-dot"
                      style={{ backgroundColor: chartPalette[index % chartPalette.length] }}
                    />
                    <span>{entry.name}</span>
                    <strong>{entry.value}</strong>
                  </div>
                ))}
              </div>
            </ChartCard>
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

                      <div className="progress-card">
                        <span className="eyebrow">Input completion</span>
                        <strong>{completion.percent}%</strong>
                        <div className="progress-bar">
                          <span style={{ width: `${completion.percent}%` }} />
                        </div>
                        <p>
                          {completion.completed} of {completion.total} visible inputs populated.
                        </p>
                      </div>
                    </div>

                    <div className="tool-notes-grid">
                      {activeTool.notes.map((note) => (
                        <div key={note} className="note-chip">
                          <Pill size={15} />
                          <span>{note}</span>
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

                <ChartCard
                  title="Calculator richness"
                  description="A quick visual read of how much structure supports the active decision tool."
                  icon={BrainCircuit}
                >
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart data={activeToolRadarData}>
                      <PolarGrid stroke="#e7e5e4" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "#475569" }} />
                      <PolarRadiusAxis angle={30} domain={[0, "dataMax"]} tick={false} axisLine={false} />
                      <Radar
                        dataKey="value"
                        stroke="#8b1e3f"
                        fill="#8b1e3f"
                        fillOpacity={0.32}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              <ClinicalReference
                title={activeTool?.title}
                content={activeClinicalContent}
                activeTab={activeClinicalTab}
                onTabChange={setActiveClinicalTab}
              />
            </div>
          </section>
          </>
          ) : null}

          {currentPage === "guides" ? (
          <>
          <PageLead
            eyebrow={pageCopy.guides.eyebrow}
            title={pageCopy.guides.title}
            description={pageCopy.guides.description}
          />
          <section className="focus-layout">
            <div key={`guide-panel-${activeGuide?.id ?? "empty"}`} className="panel guide-detail-panel spotlight-panel">
              {activeGuide ? (
                <>
                  <div className="section-card-header">
                    <div>
                      <span className="eyebrow">Selected guide</span>
                      <h3>{activeGuide.title}</h3>
                    </div>

                    {activeGuide.pdfId ? (
                      <div className="button-cluster">
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => {
                            setActivePdfId(activeGuide.pdfId);
                            navigateToPage("pdfs");
                          }}
                        >
                          <Eye size={16} />
                          Open in clinical vault
                        </button>
                      </div>
                    ) : null}
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

                  <article className="guide-story-card">
                    <p>{activeGuide.objective || activeGuide.excerpt}</p>

                    <div className="guide-heading-grid">
                      {activeGuide.headings.slice(0, 8).map((heading) => (
                        <div key={heading} className="guide-heading-chip">
                          <ArrowUpRight size={14} />
                          <span>{heading}</span>
                        </div>
                      ))}
                    </div>
                  </article>

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
          <PageLead
            eyebrow={pageCopy.pdfs.eyebrow}
            title={pageCopy.pdfs.title}
            description={pageCopy.pdfs.description}
          />
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

                  <article className="guide-story-card">
                    <p>{activeVaultEntry.objective || activeVaultEntry.excerpt}</p>
                    <div className="guide-heading-grid">
                      {activeVaultEntry.headings.slice(0, 6).map((heading) => (
                        <div key={heading} className="guide-heading-chip">
                          <ArrowUpRight size={14} />
                          <span>{heading}</span>
                        </div>
                      ))}
                    </div>
                  </article>

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

function ChartCard({ title, description, icon: Icon, children }) {
  return (
    <section className="panel chart-card">
      <div className="section-card-header">
        <div>
          <span className="eyebrow">Analytics</span>
          <h3>{title}</h3>
        </div>
        <Icon size={17} />
      </div>
      <p className="section-copy">{description}</p>
      {children}
    </section>
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

      {result.supporting?.length ? (
        <ul className="support-list">
          {result.supporting.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
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

  return (
    <section className="panel reference-panel">
      <div className="section-card-header">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h3>{title ? `${title} reference stack` : "Reference stack"}</h3>
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
              <div className="reference-intro">
                <div>
                  <span className="eyebrow">Section focus</span>
                  <p>{visibleTab.descriptor}</p>
                </div>
                <strong>{visibleTab.cards.length} cards</strong>
              </div>

              <div className="accordion-list">
                {visibleTab.cards.map((card) => (
                  <details key={`${visibleTab.id}-${card.title}`} className="accordion-card" open>
                    <summary>
                      <div>
                        <span className="badge soft">Section</span>
                        <strong>{card.title}</strong>
                      </div>
                      {card.summary ? <p>{card.summary}</p> : null}
                    </summary>
                    <div className="accordion-content">
                      {card.blocks.map((block, index) => (
                        <ContentBlock key={`${card.title}-${block.type}-${index}`} block={block} />
                      ))}
                    </div>
                  </details>
                ))}
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
    match = pattern.exec(text);
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
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "")
    .replace(/\$\$([^$]+)\$\$/g, "$1")
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/\\([_%#&])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export default App;
