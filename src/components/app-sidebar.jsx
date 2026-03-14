import { useEffect, useMemo, useState } from "react";
import {
  Activity,
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
  SidebarFooter,
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
  stats,
  siteName,
}) {
  const { setOpen } = useSidebar();
  const [expandedSection, setExpandedSection] = useState(currentPage);

  useEffect(() => {
    setExpandedSection(currentPage);
  }, [currentPage]);

  const sidebarSections = useMemo(
    () => ({
      dashboard: [
        {
          id: "dashboard-overview",
          label: "Command center",
          action: () => handleNavigate("dashboard"),
          active: currentPage === "dashboard",
        },
      ],
      algorithms: algorithmItems.map((tool) => ({
        id: tool.id,
        label: tool.shortTitle,
        action: () => {
          onSelectTool(tool.id);
          setOpen(false);
        },
        active: activeToolId === tool.id && currentPage === "algorithms",
      })),
      scores: scoreItems.map((tool) => ({
        id: tool.id,
        label: tool.shortTitle,
        action: () => {
          onSelectTool(tool.id);
          setOpen(false);
        },
        active: activeToolId === tool.id && currentPage === "scores",
      })),
      guides: guideItems.slice(0, 8).map((guide) => ({
        id: guide.id,
        label: guide.title,
        action: () => {
          onSelectGuide(guide.id);
          setOpen(false);
        },
        active: activeGuideId === guide.id,
      })),
      pdfs: vaultItems.slice(0, 8).map((guide) => ({
        id: guide.pdfId,
        label: guide.title,
        action: () => {
          onSelectVault(guide.pdfId, guide.id);
          setOpen(false);
        },
        active: activePdfId === guide.pdfId,
      })),
    }),
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

  const handleNavigate = (pageId) => {
    onNavigate(pageId);
    setOpen(false);
  };

  const handlePagePress = (pageId) => {
    setExpandedSection(pageId);
    onNavigate(pageId);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="sidebar-brand sidebar-brand-card">
          <div className="sidebar-logo">
            <Droplets />
          </div>
          <div>
            <span className="eyebrow">Blood Doctor</span>
            <h1>{siteName}</h1>
            <p>Clinical navigation, calculators, markdown guides, and a cleaner linked vault.</p>
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
                { id: "dashboard", label: "Dashboard", meta: "Overview" },
                { id: "algorithms", label: "Interactive Algorithms", meta: "Decision tools" },
                { id: "scores", label: "Scoring Calculators", meta: "Risk scoring" },
                { id: "guides", label: "Clinical Guides", meta: "Markdown library" },
                { id: "pdfs", label: "Clinical Vault", meta: "Linked records" },
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
                          <span>{page.meta}</span>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      </SidebarMenuMeta>
                    </SidebarMenuButton>
                    <SidebarSubmenu className={isExpanded ? "open" : "closed"}>
                      {children.map((child) => (
                        <SidebarSubmenuButton
                          key={`${page.id}-${child.id}`}
                          active={child.active ?? currentPage === page.id}
                          onClick={child.action ?? (() => handleNavigate(page.id))}
                        >
                          {child.label}
                        </SidebarSubmenuButton>
                      ))}
                    </SidebarSubmenu>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarGroup className="sidebar-summary-group">
          <SidebarGroupLabel>
            <Activity size={14} />
            Workspace summary
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="sidebar-summary-card">
              <div className="sidebar-summary-row">
                <span>Live calculators</span>
                <strong>{stats.tools}</strong>
              </div>
              <div className="sidebar-summary-row">
                <span>Guides indexed</span>
                <strong>{stats.guides}</strong>
              </div>
              <div className="sidebar-summary-row">
                <span>Vault entries</span>
                <strong>{stats.pdfs}</strong>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
