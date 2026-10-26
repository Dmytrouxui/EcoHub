import Image from "next/image";
import Link from "next/link";
import { Logo } from "./Logo";
import styles from "./Footer.module.css";

// V1 footer. The subscribe form, Marketplace, Learn With Us and Events come later.
const columns = [
  {
    title: "Quick Links",
    links: [
      { label: "Home", href: "/" },
      { label: "Community", href: "/feed" },
      { label: "Blog", href: "/coming-soon" },
      { label: "Contacts", href: "/coming-soon" },
    ],
  },
  {
    title: "Helpful Links",
    links: [
      { label: "Supports", href: "/coming-soon" },
      { label: "Terms & Conditions", href: "/coming-soon" },
      { label: "Privacy Policy", href: "/coming-soon" },
    ],
  },
  {
    title: "Our Services",
    links: [
      { label: "Community", href: "/feed" },
      { label: "Blog", href: "/coming-soon" },
    ],
  },
];

const legalLinks = [
  { label: "FAQ", href: "/coming-soon" },
  { label: "Privacy", href: "/coming-soon" },
  { label: "Terms & Condition", href: "/coming-soon" },
];

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.grid}>
          <div className={styles.brand}>
            <Logo />
          </div>

          {columns.map((column) => (
            <nav key={column.title} className={styles.column} aria-label={column.title}>
              <h2 className={styles.heading}>{column.title}</h2>
              <ul className={styles.links}>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className={styles.link}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className={`${styles.column} ${styles.contact}`}>
            <h2 className={styles.heading}>Contact us</h2>
            <ul className={styles.contactList}>
              <li>
                <Image src="/icons/email.svg" alt="" width={24} height={19} unoptimized />
                <a href="mailto:info@ecospherehub.com">info@ecospherehub.com</a>
              </li>
              <li>
                <Image src="/icons/phone.svg" alt="" width={24} height={24} unoptimized />
                <a href="tel:+17779990000">+1 777 999 0000</a>
              </li>
              <li>
                <Image src="/icons/address.svg" alt="" width={24} height={24} unoptimized />
                <address>
                  77 Canlish Road,
                  <br />
                  City of Toronto, ON, Canada
                </address>
              </li>
              <li>
                <Image src="/icons/schedule.svg" alt="" width={24} height={24} unoptimized />
                <span>
                  Monday - Friday
                  <br />
                  08:00 - 18:00
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>2024 © company.DTM. I All Rights reserved</p>
          <ul className={styles.legal}>
            {legalLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className={styles.link}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
