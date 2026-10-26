import { POINTS, POINTS_PER_TREE } from "@/lib/ecoPoints";
import type { EcoScore } from "@/lib/ecoPoints";
import styles from "./account.module.css";

type EcoRatingProps = {
  score: EcoScore;
};

// The tree grows with the points: small sprout at 0, full tree at 99
export function GrowingTree({ progress, size = 48 }: { progress: number; size?: number }) {
  const p = Math.sqrt(progress / POINTS_PER_TREE); // grows fast at first so early progress is visible
  const trunk = 5 + 15 * p;
  const r = 4 + 10 * p;
  const cy = 44 - trunk - r * 0.5;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M8 44h32" />
      <path d={`M24 44V${44 - trunk}`} />
      <ellipse cx="24" cy={cy} rx={r * 0.9} ry={r} fill="var(--light-green)" />
    </svg>
  );
}

export function EcoRating({ score }: EcoRatingProps) {
  const { level, progress, breakdown } = score;
  const left = POINTS_PER_TREE - progress;

  return (
    <div className={styles.rating}>
      <div className={styles.ratingHead}>
        <p className={styles.ratingTitle}>{level === 1 ? "Your forest starts with one tree" : `Your forest has ${level - 1} ${level === 2 ? "tree" : "trees"}`}</p>
        <GrowingTree progress={progress} />
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-label="Progress to your next tree"
        aria-valuemin={0}
        aria-valuemax={POINTS_PER_TREE}
        aria-valuenow={progress}
      >
        <div className={styles.fill} style={{ width: `${progress}%` }} />
      </div>
      <p className={styles.ratingText}>
        <strong>
          {progress} / {POINTS_PER_TREE} points
        </strong>
        <br />
        {left} more to grow your next tree
      </p>

      <details className={styles.how}>
        <summary>How do I earn points?</summary>
        <p>Every {POINTS_PER_TREE} points grows a new tree in your forest.</p>
        <ul>
          <li>
            <span>Publish a post</span>
            <b>+{POINTS.post}</b>
          </li>
          <li>
            <span>Write a comment</span>
            <b>+{POINTS.comment}</b>
          </li>
          <li>
            <span>Get a like on your post</span>
            <b>+{POINTS.like}</b>
          </li>
          <li>
            <span>Complete your profile (photo, location, bio)</span>
            <b>+{POINTS.profile}</b>
          </li>
        </ul>
        <p className={styles.howYou}>
          So far: {breakdown.posts} {breakdown.posts === 1 ? "post" : "posts"}, {breakdown.comments}{" "}
          {breakdown.comments === 1 ? "comment" : "comments"}, {breakdown.likes} {breakdown.likes === 1 ? "like" : "likes"}
          {breakdown.profileComplete ? ", profile complete" : ", profile not complete yet"}.
        </p>
      </details>
    </div>
  );
}
