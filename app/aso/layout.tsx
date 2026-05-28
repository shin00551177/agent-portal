import { NavShell } from "@/components/NavShell";

export default function AsoLayout({ children }: { children: React.ReactNode }) {
  return <NavShell>{children}</NavShell>;
}
