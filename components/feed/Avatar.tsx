import styles from "./feed.module.css";

type AvatarProps = {
  url?: string | null;
  size?: number;
};

// Round profile photo, or the placeholder person when there is none
export function Avatar({ url, size = 40 }: AvatarProps) {
  return (
    <span className={styles.avatar} style={{ width: size, height: size }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className={styles.avatarImage} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/icons/avatar-placeholder.svg" alt="" className={styles.avatarEmpty} />
      )}
    </span>
  );
}
