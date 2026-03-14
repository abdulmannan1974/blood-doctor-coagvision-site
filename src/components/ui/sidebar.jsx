import { createContext, useContext, useMemo, useState } from "react";
import { PanelLeft } from "lucide-react";

const cn = (...values) => values.filter(Boolean).join(" ");
const SidebarContext = createContext(null);

export function SidebarProvider({ children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      toggleSidebar: () => setOpen((current) => !current),
    }),
    [open]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used inside SidebarProvider");
  }

  return context;
}

export function Sidebar({ className = "", children }) {
  const { open } = useSidebar();
  return <aside className={cn("bd-sidebar sidebar-root", open && "open", className)}>{children}</aside>;
}

export function SidebarTrigger({ className = "", ...props }) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      type="button"
      className={cn("icon-button sidebar-trigger", className)}
      onClick={toggleSidebar}
      aria-label="Toggle sidebar"
      {...props}
    >
      <PanelLeft size={18} />
    </button>
  );
}

export function SidebarHeader({ children, className = "" }) {
  return <div className={cn("sidebar-header", className)}>{children}</div>;
}

export function SidebarContent({ children, className = "" }) {
  return <div className={cn("sidebar-content", className)}>{children}</div>;
}

export function SidebarFooter({ children, className = "" }) {
  return <div className={cn("sidebar-footer", className)}>{children}</div>;
}

export function SidebarGroup({ children, className = "" }) {
  return <section className={cn("sidebar-group", className)}>{children}</section>;
}

export function SidebarGroupLabel({ children, className = "" }) {
  return <div className={cn("sidebar-group-label", className)}>{children}</div>;
}

export function SidebarGroupContent({ children, className = "" }) {
  return <div className={cn("sidebar-group-content", className)}>{children}</div>;
}

export function SidebarMenu({ children, className = "" }) {
  return <div className={cn("sidebar-menu", className)}>{children}</div>;
}

export function SidebarMenuItem({ children, className = "" }) {
  return <div className={cn("sidebar-menu-item", className)}>{children}</div>;
}

export function SidebarMenuButton({
  children,
  className = "",
  active = false,
  ...props
}) {
  return (
    <button
      type="button"
      className={cn("sidebar-menu-button", active && "active", className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function SidebarMenuMeta({ children, className = "" }) {
  return <span className={cn("sidebar-menu-meta", className)}>{children}</span>;
}

export function SidebarSubmenu({ children, className = "" }) {
  return <div className={cn("sidebar-submenu", className)}>{children}</div>;
}

export function SidebarSubmenuButton({
  children,
  className = "",
  active = false,
  ...props
}) {
  return (
    <button
      type="button"
      className={cn("sidebar-submenu-button", active && "active", className)}
      {...props}
    >
      {children}
    </button>
  );
}
