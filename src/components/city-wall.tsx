"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Wall } from "@/lib/insights";
import type { CivicReport } from "@/lib/types";
const plainNames: Record<string, string> = {
  "Solid Waste (Garbage) Related": "Garbage",
  Electrical: "Street lights",
  "Road Maintenance(Engg)": "Roads",
  "Health Dept": "Health",
  Forest: "Trees",
  veterinary: "Stray animals",
};
const closed = (status: string) => /^closed$/i.test(status);
const reveal = 1500;
function formatted(date: string) {
  const parsed = new Date(date.replace(" ", "T"));
  return Number.isNaN(parsed.getTime())
    ? "Date unavailable"
    : parsed.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}
export default function CityWall({
  onOpen,
  onReady,
}: {
  onOpen: (report: CivicReport) => void;
  onReady: () => void;
}) {
  const [wall, setWall] = useState<Wall | null>(null),
    [failed, setFailed] = useState(false),
    [focus, setFocus] = useState(-1),
    [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null);
  const frame = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    grid = useRef({ pitch: 11, columns: 1 }),
    shown = useRef(0),
    ready = useRef(onReady);
  ready.current = onReady;
  useEffect(() => {
    fetch("/api/wall")
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setWall)
      .catch(() => {
        setFailed(true);
        ready.current();
      });
  }, []);
  const filters = useMemo(() => {
    if (!wall) return [];
    const counts = new Map<number, { total: number; closed: number }>();
    for (const row of wall.rows) {
      const entry = counts.get(row[1]) ?? { total: 0, closed: 0 };
      entry.total++;
      if (closed(wall.statuses[row[4]])) entry.closed++;
      counts.set(row[1], entry);
    }
    return [...counts]
      .map(([index, count]) => ({ index, ...count, name: plainNames[wall.categories[index]] ?? wall.categories[index] }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [wall]);
  const draw = useRef<(hovered?: number) => void>(() => {});
  useEffect(() => {
    const element = canvas.current,
      box = frame.current;
    if (!wall || !element || !box) return;
    const context = element.getContext("2d");
    if (!context) return;
    const paint = (hovered = -1) => {
      const { pitch, columns } = grid.current;
      const ratio = window.devicePixelRatio || 1;
      const styles = getComputedStyle(document.documentElement);
      const color = (name: string) => styles.getPropertyValue(name).trim();
      const solid = color("--cell-closed"), hollow = color("--cell-open"), dim = color("--cell-dim"), mark = color("--road");
      const size = pitch - 1;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, element.width, element.height);
      const limit = Math.min(shown.current, wall.rows.length);
      for (let i = 0; i < limit; i++) {
        const row = wall.rows[i];
        const x = (i % columns) * pitch, y = Math.floor(i / columns) * pitch;
        const isClosed = closed(wall.statuses[row[4]]);
        const inFocus = focus < 0 || row[1] === focus;
        if (i === hovered) {
          context.fillStyle = mark;
          context.fillRect(x - 1, y - 1, size + 2, size + 2);
        } else if (!inFocus) {
          context.fillStyle = dim;
          context.fillRect(x, y, size, size);
        } else if (isClosed) {
          context.fillStyle = solid;
          context.fillRect(x, y, size, size);
        } else {
          context.strokeStyle = hollow;
          context.lineWidth = 1;
          context.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
        }
      }
    };
    draw.current = paint;
    const layout = () => {
      const width = box.clientWidth;
      const pitch = width >= 1100 ? 11 : width >= 700 ? 9 : 7;
      const columns = Math.max(1, Math.floor(width / pitch));
      const height = Math.ceil(wall.rows.length / columns) * pitch;
      const ratio = window.devicePixelRatio || 1;
      grid.current = { pitch, columns };
      element.width = columns * pitch * ratio;
      element.height = height * ratio;
      element.style.width = columns * pitch + "px";
      element.style.height = height + "px";
      paint();
    };
    const sizes = new ResizeObserver(layout);
    sizes.observe(box);
    const theme = new MutationObserver(() => paint());
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    layout();
    return () => {
      sizes.disconnect();
      theme.disconnect();
    };
  }, [wall, focus]);
  useEffect(() => {
    if (!wall || shown.current >= wall.rows.length) return;
    const finish = () => {
      shown.current = wall.rows.length;
      draw.current();
      ready.current();
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || document.hidden) return finish();
    const started = performance.now();
    let request = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / reveal);
      shown.current = Math.floor(progress * progress * wall.rows.length);
      draw.current();
      if (progress < 1) request = requestAnimationFrame(step);
      else finish();
    };
    request = requestAnimationFrame(step);
    const fallback = setTimeout(finish, reveal + 600);
    return () => {
      cancelAnimationFrame(request);
      clearTimeout(fallback);
    };
  }, [wall]);
  const locate = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!wall) return -1;
    const bounds = event.currentTarget.getBoundingClientRect();
    const { pitch, columns } = grid.current;
    const column = Math.floor((event.clientX - bounds.left) / pitch);
    const row = Math.floor((event.clientY - bounds.top) / pitch);
    const index = row * columns + column;
    return column >= 0 && column < columns && index >= 0 && index < wall.rows.length ? index : -1;
  };
  const selected = hover && wall ? wall.rows[hover.index] : null;
  const active = filters.find((f) => f.index === focus);
  if (failed)
    return <p className="wall-failed">The complaint wall can’t load right now. The records page still works.</p>;
  return (
    <section className="wall" aria-label="Every complaint in the archive">
      <div className="wall-controls">
        <p className="wall-key">
          {wall ? (
            <>
              Each square is one real complaint, oldest first.{" "}
              <span className="key-pair">
                <span className="key-solid" /> Marked closed by the source.
              </span>{" "}
              <span className="key-pair">
                <span className="key-hollow" /> Not marked closed.
              </span>
              {active && (
                <strong>
                  {active.name}: {((active.closed / active.total) * 100).toFixed(0)}% of{" "}
                  {active.total.toLocaleString("en-IN")} marked closed.
                </strong>
              )}
            </>
          ) : (
            "Loading every complaint in the archive…"
          )}
        </p>
        {filters.length > 0 && (
          <div className="wall-filters" role="group" aria-label="Show one type of complaint">
            <button aria-pressed={focus < 0} onClick={() => setFocus(-1)}>
              All
            </button>
            {filters.map((filter) => (
              <button
                key={filter.index}
                aria-pressed={focus === filter.index}
                onClick={() => setFocus(focus === filter.index ? -1 : filter.index)}
              >
                {filter.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="wall-frame" ref={frame}>
        <canvas
          ref={canvas}
          role="img"
          aria-label={
            wall
              ? `${wall.rows.length.toLocaleString("en-IN")} squares, one for each complaint. The full list is on the records page.`
              : "Complaint wall loading"
          }
          onPointerMove={(event) => {
            const index = locate(event);
            draw.current(index);
            const bounds = event.currentTarget.getBoundingClientRect();
            setHover(index < 0 ? null : { index, x: event.clientX - bounds.left, y: event.clientY - bounds.top });
          }}
          onPointerLeave={() => {
            draw.current();
            setHover(null);
          }}
          onClick={(event) => {
            const index = wall ? locate(event as unknown as React.PointerEvent<HTMLCanvasElement>) : -1;
            if (!wall || index < 0) return;
            const row = wall.rows[index];
            onOpen({
              id: row[0],
              category: wall.categories[row[1]],
              detail: wall.details[row[2]],
              ward: wall.wards[row[3]],
              status: wall.statuses[row[4]],
              date: row[5],
              remarks: "Source remarks are omitted from the public view.",
              source: "Sahaaya archive",
              priority: "Unassessed",
            });
          }}
        />
        {selected && wall && hover && (
          <div
            className="wall-tip"
            data-flip={hover.x > (frame.current?.clientWidth ?? 0) - 280 ? "" : undefined}
            style={{ left: hover.x, top: hover.y }}
          >
            <strong>{wall.details[selected[2]]}</strong>
            <span>{wall.wards[selected[3]]}</span>
            <span>
              {formatted(selected[5])}. {closed(wall.statuses[selected[4]]) ? "Marked closed." : `Status: ${wall.statuses[selected[4]]}.`}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
