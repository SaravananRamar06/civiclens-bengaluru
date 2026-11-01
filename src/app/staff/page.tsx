import type { Metadata } from "next";
import { StaffHome } from "@/components/staff-portal";
export const metadata: Metadata = { title: "Staff · CivicLens" };
export default function Staff() {
  return <StaffHome />;
}
