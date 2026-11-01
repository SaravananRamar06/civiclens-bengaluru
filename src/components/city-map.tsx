"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { PublicReport } from "@/lib/accountability";
export default function CityMap() {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: container.current,
        center: [77.5946, 12.9716],
        zoom: 11.3,
        attributionControl: { compact: true },
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
              maxzoom: 19,
            },
          },
          layers: [
            {
              id: "osm",
              type: "raster",
              source: "osm",
              paint: { "raster-saturation": -0.7, "raster-contrast": -0.08 },
            },
          ],
        },
      });
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "bottom-right",
      );
      map.on("load", async () => {
        try {
          const open = await fetch("/api/public-reports").then((r) => (r.ok ? r.json() : null));
          // Rounded locations collide, so reports at one spot share a pin.
          const spots = new Map<string, PublicReport[]>();
          for (const report of (open?.reports ?? []) as PublicReport[]) {
            const key = report.latitude + "," + report.longitude;
            spots.set(key, [...(spots.get(key) ?? []), report]);
          }
          for (const reports of spots.values()) {
            const pin = document.createElement("span");
            pin.className = "public-pin";
            const critical = reports.some((r) => r.severity === "Critical");
            pin.dataset.severity = critical ? "Critical" : reports[0].severity;
            if (reports.length > 1) pin.dataset.count = String(reports.length);
            new maplibregl.Marker({ element: pin })
              .setLngLat([reports[0].longitude, reports[0].latitude])
              .setPopup(
                new maplibregl.Popup().setText(
                  reports
                    .slice(0, 4)
                    .map((r) => `${r.category}. ${r.severity} severity. ${r.status}. Assigned to ${r.authority}.`)
                    .join(" ") + (reports.length > 4 ? ` And ${reports.length - 4} more.` : ""),
                ),
              )
              .addTo(map);
          }
        } catch {
          /* The map stays useful without the public pins. */
        }
        try {
          const session = await fetch("/api/session").then((r) => r.json());
          if (!session.signedIn) return;
          const response = await fetch("/api/reports");
          if (!response.ok) return;
          const body = await response.json();
          for (const report of body.reports || []) {
            if (
              !Number.isFinite(report.latitude) ||
              !Number.isFinite(report.longitude)
            )
              continue;
            const marker = new maplibregl.Marker({
              color: report.priority === "Critical" ? "#b8123a" : "#2f27c9",
            })
              .setLngLat([report.longitude, report.latitude])
              .setPopup(
                new maplibregl.Popup().setText(
                  `Your report: ${report.category}, ${report.status}`,
                ),
              );
            marker.addTo(map);
          }
        } catch {
          /* The archive list remains available if private reports cannot load. */
        }
      });
      return () => map.remove();
    } catch {
      setFailed(true);
    }
  }, []);
  return (
    <div ref={container} className="city-map">
      {failed && (
        <div className="map-loading">
          Map unavailable. Civic records remain accessible in the list below.
        </div>
      )}
    </div>
  );
}
