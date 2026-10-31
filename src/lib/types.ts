export type Priority = "Critical" | "High" | "Medium" | "Low" | "Unassessed";
export type CivicReport = {
  id: string;
  category: string;
  detail: string;
  ward: string;
  date: string;
  status: string;
  remarks: string;
  source: "Sahaaya archive" | "Citizen report";
  priority: Priority;
  latitude?: number;
  longitude?: number;
  analysis?: string;
};
export type DashboardData = {
  reports: CivicReport[];
  total: number;
  closed: number;
  wards: number;
  categories: { name: string; count: number }[];
  fetchedAt: string | null;
  dateRange: { from: string; to: string } | null;
  configured: { auth: boolean; ai: boolean };
};
