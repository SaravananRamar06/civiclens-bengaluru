import type { Metadata } from "next";
import { AdminHome } from "@/components/staff-portal";
export const metadata: Metadata = { title: "Admin · CivicLens" };
export default function Admin() {
  return <AdminHome />;
}
