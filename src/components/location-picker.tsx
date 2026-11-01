"use client";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
export type Point = { latitude: number; longitude: number };
export default function LocationPicker({
  value,
  onChange,
}: {
  value: Point | null;
  onChange: (point: Point) => void;
}) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<maplibregl.Map | null>(null),
    marker = useRef<maplibregl.Marker | null>(null),
    report = useRef(onChange);
  report.current = onChange;
  useEffect(() => {
    if (!container.current) return;
    const instance = new maplibregl.Map({
      container: container.current,
      center: [77.5946, 12.9716],
      zoom: 10.6,
      maxBounds: [
        [77.2, 12.65],
        [77.95, 13.3],
      ],
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
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
    });
    instance.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );
    instance.on("click", (event) =>
      report.current({
        latitude: Number(event.lngLat.lat.toFixed(6)),
        longitude: Number(event.lngLat.lng.toFixed(6)),
      }),
    );
    map.current = instance;
    return () => {
      marker.current = null;
      map.current = null;
      instance.remove();
    };
  }, []);
  useEffect(() => {
    if (!map.current || !value) return;
    const position: [number, number] = [value.longitude, value.latitude];
    if (marker.current) marker.current.setLngLat(position);
    else
      marker.current = new maplibregl.Marker({ color: "#ee6847" })
        .setLngLat(position)
        .addTo(map.current);
    map.current.easeTo({ center: position, duration: 300 });
  }, [value]);
  return (
    <div
      ref={container}
      className="location-picker"
      role="application"
      aria-label="Map of Bengaluru. Select the location of the issue."
    />
  );
}
