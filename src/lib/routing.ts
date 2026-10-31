export function reviewQueue(category: string) {
  const queues: Record<string, string> = {
    "Road damage": "Roads and footpaths review",
    "Water or drainage": "Water and drainage review",
    Waste: "Sanitation review",
    Obstruction: "Street access review",
    Electrical: "Electrical safety review",
  };
  return queues[category] || "General civic review";
}
