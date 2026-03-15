import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  BrainCircuit,
  Calculator,
  ChevronDown,
  ChevronRight,
  Droplets,
  FolderOpen,
  HeartPulse,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuMeta,
  SidebarSubmenu,
  SidebarSubmenuButton,
  useSidebar,
} from "@/components/ui/sidebar";

const toNodeId = (...values) =>
  values
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const groupByLabel = (items, getGroupLabel) =>
  items.reduce((accumulator, item) => {
    const label = getGroupLabel(item) || "General";
    if (!accumulator[label]) {
      accumulator[label] = [];
    }
    accumulator[label].push(item);
    return accumulator;
  }, {});

const pageIconById = {
  dashboard: LayoutDashboard,
  algorithms: BrainCircuit,
  acute: HeartPulse,
  scores: Calculator,
  guides: BookOpenText,
  pdfs: FolderOpen,
};

const pageMetaById = {
  dashboard: {
    subtitle: "Overview and key workspace signals",
  },
  algorithms: {
    subtitle: "Decision pathways and treatment flowcharts",
  },
  acute: {
    subtitle: "Urgent bedside pathways and escalation prompts",
  },
  scores: {
    subtitle: "Risk scores and renal dosing tools",
  },
  guides: {
    subtitle: "Structured clinical guide library",
  },
  pdfs: {
    subtitle: "Linked vault records and companion views",
  },
};

const countLeaves = (nodes) =>
  nodes.reduce((total, node) => {
    if (node.children?.length) {
      return total + countLeaves(node.children);
    }

    return total + 1;
  }, 0);

export function AppSidebar({
  currentPage,
  onNavigate,
  onSelectTool,
  onSelectGuide,
  onSelectVault,
  onSelectAcute,
  activeToolId,
  activeAcuteId,
  activeGuideId,
  activePdfId,
  algorithmItems,
  acuteItems,
  scoreItems,
  guideItems,
  vaultItems,
  siteName,
}) {
  const { setOpen } = useSidebar();
  const [expandedSection, setExpandedSection] = useState(currentPage);
  const [expandedFolders, setExpandedFolders] = useState({});

  useEffect(() => {
    setExpandedSection(currentPage);
  }, [currentPage]);

  const handleNavigate = (pageId) => {
    onNavigate(pageId);
    setOpen(false);
  };

  const sidebarSections = useMemo(
    () => {
      const scoreBuckets = {
        "Scoring tools": scoreItems.filter((tool) => tool.category === "score"),
        "Renal tools": scoreItems.filter((tool) => tool.category === "renal"),
      };
      const guideBuckets = groupByLabel(guideItems, (guide) => guide.category);
      const vaultBuckets = groupByLabel(vaultItems, (entry) => entry.category);
      const acuteBuckets = groupByLabel(acuteItems, (item) => item.category);

      return {
      dashboard: [
        {
          id: "dashboard-overview",
          label: "Command center",
          action: () => handleNavigate("dashboard"),
          active: currentPage === "dashboard",
        },
      ],
      algorithms: [
        {
          id: "algorithms-decision-pathways",
          label: "Decision pathways",
          children: algorithmItems.map((tool) => ({
            id: tool.id,
            label: tool.shortTitle,
            action: () => {
              onSelectTool(tool.id);
              setOpen(false);
            },
            active: activeToolId === tool.id && currentPage === "algorithms",
          })),
        },
      ],
      acute: Object.entries(acuteBuckets).map(([label, itemsInBucket]) => ({
        id: toNodeId("acute", label),
        label,
        children: itemsInBucket.map((item) => ({
          id: item.id,
          label: item.shortTitle,
          action: () => {
            onSelectAcute(item.id);
            setOpen(false);
          },
          active: activeAcuteId === item.id && currentPage === "acute",
        })),
      })),
      scores: Object.entries(scoreBuckets)
        .filter(([, toolsInBucket]) => toolsInBucket.length)
        .map(([label, toolsInBucket]) => ({
          id: toNodeId("scores", label),
          label,
          children: toolsInBucket.map((tool) => ({
            id: tool.id,
            label: tool.shortTitle,
            action: () => {
              onSelectTool(tool.id);
              setOpen(false);
            },
            active: activeToolId === tool.id && currentPage === "scores",
          })),
        })),
      guides: Object.entries(guideBuckets).map(([label, guidesInBucket]) => ({
        id: toNodeId("guides", label),
        label,
        children: guidesInBucket.map((guide) => ({
          id: guide.id,
          label: guide.title,
          action: () => {
            onSelectGuide(guide.id);
            setOpen(false);
          },
          active: activeGuideId === guide.id,
        })),
      })),
      pdfs: Object.entries(vaultBuckets).map(([label, vaultInBucket]) => ({
        id: toNodeId("pdfs", label),
        label,
        children: vaultInBucket.map((guide) => ({
          id: guide.pdfId,
          label: guide.title,
          action: () => {
            onSelectVault(guide.pdfId, guide.id);
            setOpen(false);
          },
          active: activePdfId === guide.pdfId,
        })),
      })),
    };
    },
    [
      activeGuideId,
      activeAcuteId,
      activePdfId,
      activeToolId,
      acuteItems,
      algorithmItems,
      currentPage,
      guideItems,
      onSelectAcute,
      onSelectGuide,
      onSelectTool,
      onSelectVault,
      scoreItems,
      setOpen,
      vaultItems,
    ]
  );

  useEffect(() => {
    const nextExpandedFolders = {};
    const currentNodes = sidebarSections[currentPage] ?? [];

    currentNodes.forEach((node) => {
      if (node.children?.length) {
        nextExpandedFolders[node.id] = true;
      }
    });

    setExpandedFolders((current) => ({
      ...current,
      ...nextExpandedFolders,
    }));
  }, [currentPage, sidebarSections]);

  const handlePagePress = (pageId) => {
    setExpandedSection(pageId);
    onNavigate(pageId);
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders((current) => ({
      ...current,
      [folderId]: !current[folderId],
    }));
  };

  const renderSidebarNodes = (pageId, nodes, depth = 0) =>
    nodes.map((node) => {
      const isFolder = Array.isArray(node.children) && node.children.length > 0;
      const isExpanded = expandedFolders[node.id] ?? depth === 0;

      if (isFolder) {
        return (
          <div key={`${pageId}-${node.id}`} className="sidebar-tree-node">
            <SidebarSubmenuButton
              className={`sidebar-folder-button depth-${depth}`}
              active={node.children.some((child) => child.active)}
              onClick={() => toggleFolder(node.id)}
            >
              <span className="sidebar-folder-content">
                <span className="sidebar-label-text">{node.label}</span>
                <span className="sidebar-folder-meta">{countLeaves(node.children)}</span>
              </span>
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </SidebarSubmenuButton>
            <SidebarSubmenu className={`nested ${isExpanded ? "open" : "closed"}`}>
              {renderSidebarNodes(pageId, node.children, depth + 1)}
            </SidebarSubmenu>
          </div>
        );
      }

      return (
        <SidebarSubmenuButton
          key={`${pageId}-${node.id}`}
          className={`sidebar-leaf-button depth-${depth}`}
          active={node.active ?? false}
          onClick={node.action ?? (() => handleNavigate(pageId))}
        >
          <span className="sidebar-label-text">{node.label}</span>
        </SidebarSubmenuButton>
      );
    });

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="sidebar-brand sidebar-brand-card">
          <div className="sidebar-logo">
            <Droplets />
          </div>
          <div>
            <span className="eyebrow">Blood🩸Doctor</span>
            <h1>{siteName}</h1>
            <p>Clear clinical navigation with actionable calculators, guide folders, and linked vault records.</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <Sparkles size={14} />
            Primary navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
                {[
                  { id: "dashboard", label: "Dashboard" },
                  { id: "algorithms", label: "Interactive Algorithms" },
                  { id: "acute", label: "Acute Management" },
                  { id: "scores", label: "Scoring Calculators" },
                  { id: "guides", label: "Clinical Guides" },
                  { id: "pdfs", label: "Clinical Vault" },
                ].map((page) => {
                  const Icon = pageIconById[page.id];
                  const meta = pageMetaById[page.id];
                  const children = sidebarSections[page.id] ?? [];
                  const isExpanded = expandedSection === page.id;
                  const itemCount = countLeaves(children);

                  return (
                    <SidebarMenuItem key={page.id}>
                      <SidebarMenuButton
                        className={isExpanded ? "section-open" : ""}
                        active={currentPage === page.id}
                        onClick={() => handlePagePress(page.id)}
                      >
                        <span className="sidebar-menu-leading">
                          <span className="sidebar-menu-icon-shell">
                            <Icon size={16} />
                          </span>
                          <span className="sidebar-section-copy">
                            <span className="sidebar-section-title">{page.label}</span>
                            <span className="sidebar-section-subtitle">{meta.subtitle}</span>
                          </span>
                        </span>
                        <SidebarMenuMeta>
                          <span className="sidebar-menu-trailing">
                            <span className="sidebar-count-badge">{itemCount}</span>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </span>
                        </SidebarMenuMeta>
                      </SidebarMenuButton>
                      <SidebarSubmenu className={isExpanded ? "open" : "closed"}>
                        {renderSidebarNodes(page.id, children)}
                      </SidebarSubmenu>
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
