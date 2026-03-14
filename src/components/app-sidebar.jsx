import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  BrainCircuit,
  Calculator,
  ChevronDown,
  ChevronRight,
  Droplets,
  FolderOpen,
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
  scores: Calculator,
  guides: BookOpenText,
  pdfs: FolderOpen,
};

export function AppSidebar({
  currentPage,
  onNavigate,
  onSelectTool,
  onSelectGuide,
  onSelectVault,
  activeToolId,
  activeGuideId,
  activePdfId,
  algorithmItems,
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
      activePdfId,
      activeToolId,
      algorithmItems,
      currentPage,
      guideItems,
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
              <span>{node.label}</span>
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
          {node.label}
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
                { id: "scores", label: "Scoring Calculators" },
                { id: "guides", label: "Clinical Guides" },
                { id: "pdfs", label: "Clinical Vault" },
              ].map((page) => {
                const Icon = pageIconById[page.id];
                const children = sidebarSections[page.id] ?? [];
                const isExpanded = expandedSection === page.id;

                return (
                  <SidebarMenuItem key={page.id}>
                    <SidebarMenuButton active={currentPage === page.id} onClick={() => handlePagePress(page.id)}>
                      <span className="sidebar-menu-leading">
                        <Icon size={16} />
                        <span>{page.label}</span>
                      </span>
                      <SidebarMenuMeta>
                        <span className="sidebar-menu-trailing">
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
