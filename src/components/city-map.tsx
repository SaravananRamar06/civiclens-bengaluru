"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
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
              color: report.priority === "Critical" ? "#c85454" : "#177a6b",
            })
              .setLngLat([report.longitude, report.latitude])
              .setPopup(
                new maplibregl.Popup().setText(
                  `Your private report: ${report.category} · ${report.status}`,
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
