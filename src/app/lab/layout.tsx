"use client";
import AuthGuard from "@/components/AuthGuard";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/lab/login") return <>{children}</>;
  return <AuthGuard redirectTo="/lab/login">{children}</AuthGuard>;
}
