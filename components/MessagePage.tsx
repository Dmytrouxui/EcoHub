import type { ReactNode } from "react";
import { ButtonLink } from "./ButtonLink";
import styles from "./MessagePage.module.css";

type MessagePageProps = {
  title: string;
  children: ReactNode;
};

/** Simple centred message with a way back. Used for 404 and "coming soon". */
export function MessagePage({ title, children }: MessagePageProps) {
  return (
    <div className={`container ${styles.wrap}`}>
      <h1>{title}</h1>
      <p>{children}</p>
      <ButtonLink href="/">Back to home</ButtonLink>
    </div>
  );
}
