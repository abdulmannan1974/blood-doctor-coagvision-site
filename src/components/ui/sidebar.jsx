const cn = (...values) => values.filter(Boolean).join(" ");

export function Sidebar({ className = "", open = false, children }) {
  return <aside className={cn("bd-sidebar sidebar-root", open && "open", className)}>{children}</aside>;
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
