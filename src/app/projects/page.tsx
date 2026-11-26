import type { Metadata } from "next";
import { Collection } from "@/components/project/Collection";

export const metadata: Metadata = {
  title: "Projects",
  description: "Six worlds and a few side builds: a personal AI assistant, smart-home automation, the INFINOS website and telemetry platform, an EEG research workstation and a school ERP.",
  alternates: { canonical: "/projects" },
};

export default function ProjectsPage() {
  return <Collection />;
}
