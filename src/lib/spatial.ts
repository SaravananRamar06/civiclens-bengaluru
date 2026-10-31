type LocatedReport = {
  id: string;
  latitude: number;
  longitude: number;
  category: string;
  created_at: string;
};
export function distanceMeters(
  a: Pick<LocatedReport, "latitude" | "longitude">,
  b: Pick<LocatedReport, "latitude" | "longitude">,
) {
  const radians = (n: number) => (n * Math.PI) / 180;
  const dLat = radians(b.latitude - a.latitude),
    dLon = radians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.latitude)) *
      Math.cos(radians(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function relatedReports(
  current: LocatedReport,
  reports: LocatedReport[],
) {
  return reports
    .filter(
      (r) =>
        r.id !== current.id &&
        r.category === current.category &&
        Math.abs(Date.parse(r.created_at) - Date.parse(current.created_at)) <=
          7 * 86400000 &&
        distanceMeters(current, r) <= 100,
    )
    .map((r) => ({
      id: r.id,
      distance: Math.round(distanceMeters(current, r)),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);
}
