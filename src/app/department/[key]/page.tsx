import type { Metadata } from "next";
import { DepartmentView } from "@/components/staff-portal";
export const metadata: Metadata = { title: "Department · CivicLens" };
export default async function Department({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <DepartmentView department={key} />;
}
