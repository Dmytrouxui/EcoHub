"use client";

import { useEffect, useState } from "react";
import styles from "./account.module.css";

const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Cell = { key: string; day: number; inMonth: boolean; isToday: boolean };

function buildCells(year: number, month: number, today: Date): Cell[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // week starts on Monday
  const start = new Date(year, month, 1 - offset);
  const cells: Cell[] = [];

  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({
      key: d.toISOString(),
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      isToday:
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate(),
    });
  }

  // Skip a last row that is entirely next month
  return cells.slice(0, cells[35].inMonth ? 42 : 35);
}

// Month calendar. Events and birthdays will be added when those features exist.
export function MiniCalendar() {
  // The date is read in the browser, so the page doesn't depend on when it was built
  const [today, setToday] = useState<Date | null>(null);
  const [view, setView] = useState<{ year: number; month: number } | null>(null);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setView({ year: now.getFullYear(), month: now.getMonth() });
  }, []);

  function move(step: number) {
    setView((current) => {
      if (!current) return current;
      const d = new Date(current.year, current.month + step, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  const cells = today && view ? buildCells(view.year, view.month, today) : [];

  return (
    <div className={styles.calendar}>
      <div className={styles.calendarHead}>
        <button type="button" className={styles.calendarNav} onClick={() => move(-1)} aria-label="Previous month" disabled={!view}>
          ‹
        </button>
        <p className={styles.calendarTitle} aria-live="polite">
          {view ? `${monthNames[view.month]} ${view.year}` : " "}
        </p>
        <button type="button" className={styles.calendarNav} onClick={() => move(1)} aria-label="Next month" disabled={!view}>
          ›
        </button>
      </div>

      <div className={styles.calendarGrid} role="grid" aria-label="Calendar">
        {weekdays.map((d) => (
          <span key={d} className={styles.weekday} role="columnheader">
            {d}
          </span>
        ))}
        {cells.map((cell) => (
          <span
            key={cell.key}
            role="gridcell"
            aria-current={cell.isToday ? "date" : undefined}
            className={`${styles.day} ${cell.inMonth ? "" : styles.dayMuted} ${cell.isToday ? styles.dayToday : ""}`}
          >
            {cell.day}
          </span>
        ))}
      </div>
    </div>
  );
}
