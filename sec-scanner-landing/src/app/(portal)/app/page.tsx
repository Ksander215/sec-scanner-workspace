import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "App — Security Intelligence Platform",
  description: "Access the Security Intelligence Platform dashboard.",
};

export default function AppPage() {
  redirect("/app/dashboard");
}
