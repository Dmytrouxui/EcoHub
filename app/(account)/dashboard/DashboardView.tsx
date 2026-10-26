import Link from "next/link";
import { GrowingTree } from "@/components/account/EcoRating";
import type { getDashboard } from "@/lib/dashboard";
import { POINTS, POINTS_PER_TREE } from "@/lib/ecoPoints";
import { timeAgo } from "@/lib/posts";
import { ActivityChart } from "./ActivityChart";
import styles from "./dashboard.module.css";

function postLabel(title: string | null, body: string) {
  const text = (title || body).replace(/\s+/g, " ").trim();
  return text.length > 70 ? `${text.slice(0, 70)}…` : text;
}

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;

export function DashboardView({ score, stats, weeks, recent, checklist }: DashboardData) {
  const { breakdown } = score;
  const rows = [
    { label: "Posts", count: breakdown.posts, points: breakdown.posts * POINTS.post },
    { label: "Comments", count: breakdown.comments, points: breakdown.comments * POINTS.comment },
    { label: "Likes on your posts", count: breakdown.likes, points: breakdown.likes * POINTS.like },
    { label: "Complete profile", count: breakdown.profileComplete ? 1 : 0, points: breakdown.profileComplete ? POINTS.profile : 0 },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className={styles.stack}>
      <section className={`${styles.tile} ${styles.level}`} aria-labelledby="level-title">
        <GrowingTree progress={score.progress} size={96} />
        <div className={styles.levelBody}>
          <h2 id="level-title" className={styles.tileTitle}>
            {score.level === 1 ? "Your forest starts with one tree" : `Your forest has ${score.level - 1} ${score.level === 2 ? "tree" : "trees"}`}
          </h2>
          <p className={styles.big}>
            {score.points} <span>points</span>
          </p>
          <div className={styles.track} role="progressbar" aria-label="Progress to your next tree" aria-valuemin={0} aria-valuemax={POINTS_PER_TREE} aria-valuenow={score.progress}>
            <div className={styles.fill} style={{ width: `${score.progress}%` }} />
          </div>
          <p className={styles.sub}>
            {score.progress} / {POINTS_PER_TREE} points. {POINTS_PER_TREE - score.progress} more to grow your next tree.
          </p>
        </div>
        <ul className={styles.breakdown}>
          {rows.map((r) => (
            <li key={r.label}>
              <span>
                {r.label}
                {r.label !== "Complete profile" ? ` (${r.count})` : ""}
              </span>
              <b>+{r.points}</b>
            </li>
          ))}
        </ul>
      </section>

      <ul className={styles.stats}>
        <li className={styles.tile}>
          <span className={styles.statLabel}>Posts</span>
          <span className={styles.statValue}>{stats.posts}</span>
        </li>
        <li className={styles.tile}>
          <span className={styles.statLabel}>Comments</span>
          <span className={styles.statValue}>{stats.comments}</span>
        </li>
        <li className={styles.tile}>
          <span className={styles.statLabel}>Likes received</span>
          <span className={styles.statValue}>{stats.likes}</span>
        </li>
        <li className={styles.tile}>
          <span className={styles.statLabel}>Saved posts</span>
          <span className={styles.statValue}>{stats.saved}</span>
        </li>
      </ul>

      <ActivityChart weeks={weeks} />

      <div className={styles.twoCols}>
        <section className={styles.tile} aria-labelledby="recent-title">
          <h2 id="recent-title" className={styles.tileTitle}>
            My recent posts
          </h2>
          {recent.length === 0 ? (
            <p className={styles.empty}>
              You haven’t posted yet. <Link href="/feed">Share something on the feed</Link> to earn your first points.
            </p>
          ) : (
            <ul className={styles.recent}>
              {recent.map((p) => (
                <li key={p.id}>
                  <Link href={`/feed?post=${p.id}`} className={styles.recentLink}>
                    <span className={styles.recentTitle}>{postLabel(p.title, p.body)}</span>
                    <span className={styles.recentMeta}>
                      {timeAgo(p.created_at)} · {p.likes} {p.likes === 1 ? "like" : "likes"} · {p.comments} {p.comments === 1 ? "comment" : "comments"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.tile} aria-labelledby="checklist-title">
          <h2 id="checklist-title" className={styles.tileTitle}>
            Complete your profile
          </h2>
          <p className={styles.sub}>
            {doneCount} of {checklist.length} done. Photo, location and bio together give +{POINTS.profile} points.
          </p>
          <ul className={styles.checklist}>
            {checklist.map((item) => (
              <li key={item.label} className={item.done ? styles.done : undefined}>
                <span className={styles.tick} aria-hidden="true">
                  {item.done ? "✓" : ""}
                </span>
                <span>
                  {item.label}
                  <span className="sr-only">{item.done ? " (done)" : " (not done yet)"}</span>
                </span>
              </li>
            ))}
          </ul>
          {doneCount < checklist.length ? (
            <Link href="/profile" className={styles.textLink}>
              Edit my profile
            </Link>
          ) : null}
        </section>
      </div>
    </div>
  );
}

