"use client";

import { useState } from "react";
import type { WeekPoints } from "@/lib/dashboard";
import styles from "./dashboard.module.css";

const ranges = [
  { label: "4 weeks", weeks: 4 },
  { label: "8 weeks", weeks: 8 },
  { label: "12 weeks", weeks: 12 },
];

// Simple bar chart: points earned per week
export function ActivityChart({ weeks }: { weeks: WeekPoints[] }) {
  const [range, setRange] = useState(8);
  const shown = weeks.slice(-range);
  const max = Math.max(...shown.map((w) => w.points), 1);
  const total = shown.reduce((sum, w) => sum + w.points, 0);

  return (
    <section className={styles.tile} aria-labelledby="chart-title">
      <div className={styles.tileHead}>
        <h2 id="chart-title" className={styles.tileTitle}>
          Points per week
        </h2>
        <div className={styles.ranges} role="group" aria-label="Time range">
          {ranges.map((r) => (
            <button
              key={r.weeks}
              type="button"
              className={`${styles.range} ${range === r.weeks ? styles.rangeActive : ""}`}
              aria-pressed={range === r.weeks}
              onClick={() => setRange(r.weeks)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <p className={styles.empty}>No activity yet. Publish a post or write a comment and your first bar will appear here.</p>
      ) : (
        <ul className={styles.chart}>
          {shown.map((w) => (
            <li key={w.label} className={styles.barCol}>
              <span className={styles.barValue}>{w.points > 0 ? w.points : ""}</span>
              <span className={styles.barTrack}>
                <span className={styles.bar} style={{ height: `${(w.points / max) * 100}%` }} />
              </span>
              <span className={styles.barLabel}>
                <span className="sr-only">Week of </span>
                {w.label}
                <span className="sr-only">: {w.points} points</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
