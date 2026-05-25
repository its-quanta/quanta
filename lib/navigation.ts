import {
  BookOpen01Icon,
  Calculator01Icon,
  DashboardSquare01Icon,
  FileEditIcon,
  Folder01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";

export type NavItem = {
  title: string;
  href: string;
  icon: typeof DashboardSquare01Icon;
};

export const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: DashboardSquare01Icon },
  { title: "Projects", href: "/projects", icon: Folder01Icon },
  { title: "Assemblies", href: "/templates", icon: FileEditIcon },
  { title: "Standards", href: "/standards", icon: BookOpen01Icon },
  { title: "Rates", href: "/rates", icon: Calculator01Icon },
  { title: "Settings", href: "/settings", icon: Settings01Icon },
];
