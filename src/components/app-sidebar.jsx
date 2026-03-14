import {
  Activity,
  BookOpenText,
  BrainCircuit,
  Calculator,
  Droplets,
  FileStack,
  FolderOpen,
  LayoutDashboard,
  Microscope,
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
} from "@/components/ui/sidebar";

const sidebarChildren = {
  dashboard: [
    { id: "overview", label: "Overview" },
    { id: "analytics", label: "Analytics" },
  ],
  algorithms: [
    { id: "perioperative", label: "Perioperative" },
    { id: "vitt", label: "VITT" },
  ],
  scores: [
    { id: "wells", label: "Wells" },
    { id: "stroke", label: "Stroke risk" },
  ],
  guides: [
    { id: "library", label: "Library" },
    { id: "references", label: "References" },
  ],
  pdfs: [
    { id: "vault", label: "Companion vault" },
    { id: "linked", label: "Linked records" },
  ],
};

const quickActions = [
  {
    id: "algorithms",
    label: "Open algorithms",
    caption: "Decision pathways",
    icon: BrainCircuit,
  },
  {
    id: "guides",
    label: "Browse guides",
    caption: "Markdown subpages",
    icon: BookOpenText,
  },
  {
    id: "pdfs",
    label: "Review vault",
    caption: "Companion records",
    icon: FolderOpen,
  },
];

const pageIconById = {
  dashboard: LayoutDashboard,
  algorithms: BrainCircuit,
  scores: Calculator,
  guides: BookOpenText,
  pdfs: FolderOpen,
};

export function AppSidebar({ currentPage, onNavigate, sidebarOpen, stats, siteName }) {
  return (
    <Sidebar open={sidebarOpen}>
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
                const children = sidebarChildren[page.id] ?? [];

                return (
                  <SidebarMenuItem key={page.id}>
                    <SidebarMenuButton active={currentPage === page.id} onClick={() => onNavigate(page.id)}>
                      <span className="sidebar-menu-leading">
                        <Icon size={16} />
                        <span>{page.label}</span>
                      </span>
                      <SidebarMenuMeta>{page.meta}</SidebarMenuMeta>
                    </SidebarMenuButton>
                    <SidebarSubmenu>
                      {children.map((child) => (
                        <SidebarSubmenuButton
                          key={`${page.id}-${child.id}`}
                          active={currentPage === page.id}
                          onClick={() => onNavigate(page.id)}
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

        <SidebarGroup>
          <SidebarGroupLabel>
            <Microscope size={14} />
            Quick actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="sidebar-quick-grid">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <SidebarMenuItem key={action.id}>
                    <SidebarMenuButton className="sidebar-action-button" onClick={() => onNavigate(action.id)}>
                      <span className="sidebar-menu-leading">
                        <Icon size={16} />
                        <span>{action.label}</span>
                      </span>
                      <SidebarMenuMeta>{action.caption}</SidebarMenuMeta>
                    </SidebarMenuButton>
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

        <SidebarGroup className="sidebar-footer-note">
          <SidebarGroupContent>
            <div className="sidebar-footer-card">
              <FileStack size={15} />
              <div>
                <strong>Cleaner reading flow</strong>
                <p>Use the guide pages for main reading, then jump into linked vault records only when needed.</p>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
