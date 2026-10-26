import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "./ContactForm";
import { JoinActions } from "./JoinActions";
import styles from "./landing.module.css";

// Landing page for visitors who are not signed in (signed-in members go to /feed, see proxy.ts).
const features = [
  {
    icon: "/Landing/Icon.svg",
    size: [27, 23],
    title: "Vibrant Eco Community",
    text: "Meet like-minded people, follow what they share and start a conversation.",
    href: "/sign-up",
    link: "Meet the members",
  },
  {
    icon: "/Landing/Icon-1.svg",
    size: [32, 38],
    title: "Share Ideas & Stories",
    text: "Post tips, photos and thoughts, add #topics and get likes and comments.",
    href: "/sign-up",
    link: "Start sharing",
  },
  {
    icon: "/Landing/Union.svg",
    size: [25, 25],
    title: "Grow Your Forest",
    text: "Every post, comment and like earns points and grows your own tree.",
    href: "/sign-up",
    link: "Plant your first tree",
  },
  {
    icon: "/Landing/Icon-2.svg",
    size: [24, 24],
    title: "Guides & Insights",
    text: "Practical articles and expert tips for living more sustainably.",
    href: "/coming-soon",
    link: "Read more",
    soon: true,
  },
  {
    icon: "/Landing/Icon-3.svg",
    size: [26, 25],
    title: "Events & Workshops",
    text: "Join clean-ups, workshops and webinars with the community.",
    href: "/coming-soon",
    link: "Read more",
    soon: true,
  },
] as const;

function Arrow() {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
      <path d="M1 6h15M11 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className={`container ${styles.hero}`} aria-labelledby="hero-title">
        <Image
          src="/Landing/Banner%20landing.png"
          alt="Two hands holding young green seedlings"
          width={746}
          height={423}
          priority
          sizes="(min-width: 1024px) 746px, 100vw"
          className={styles.heroImage}
        />
        <div className={styles.heroText}>
          <h1 id="hero-title" className={styles.h1}>
            Welcome to EcoHub
          </h1>
          <p className={styles.lead}>Where eco-minded people meet, share ideas and grow together</p>
          <p className={styles.text}>
            Join a friendly community that cares about the planet. Share your stories, find people
            who think like you and send them a message. Small ideas become big change when we talk
            about them together.
          </p>
          <JoinActions label="Join EcoHub" showSignIn />
        </div>
      </section>

      {/* Why EcoHub */}
      <section className={`container ${styles.section}`} aria-labelledby="why-title">
        <h2 id="why-title" className={styles.h2}>
          Why EcoHub?
        </h2>
        <ul className={styles.cards}>
          {features.map((item) => (
            <li key={item.title} className={styles.card}>
              <div className={styles.cardIcon}>
                <Image src={item.icon} alt="" width={item.size[0]} height={item.size[1]} unoptimized />
              </div>
              <h3 className={styles.cardTitle}>
                {item.title}
                {"soon" in item ? <span className={styles.badge}>Coming soon</span> : null}
              </h3>
              <p className={styles.cardText}>{item.text}</p>
              <Link href={item.href} className={styles.cardLink}>
                {item.link} <Arrow />
              </Link>
            </li>
          ))}
          <li className={`${styles.card} ${styles.cta}`}>
            <p className={styles.ctaText}>
              EcoHub is a social platform for people who care about a greener future. Talk to each
              other, share what works and inspire your neighbours. Join us and plant your first tree
              today.
            </p>
            <JoinActions label="Join us" inline />
          </li>
        </ul>
      </section>

      {/* Better together (replaces the video showcase) */}
      <section className={`container ${styles.together}`} aria-labelledby="together-title">
        <Image
          src="/Landing/community.jpg"
          alt="Volunteers working together outdoors"
          width={746}
          height={604}
          sizes="(min-width: 1024px) 746px, 100vw"
          className={styles.togetherImage}
        />
        <div className={styles.togetherText}>
          <h2 id="together-title" className={styles.h2}>
            Better Together
          </h2>
          <p className={styles.lead}>Great ideas start with a conversation</p>
          <p className={styles.text}>
            Neighbours, volunteers and curious beginners swap tips on recycling, gardening and
            living lighter. You only need to care.
          </p>
          <ul className={styles.points}>
            <li>
              <h3 className={styles.pointTitle}>Share what works</h3>
              <p className={styles.pointText}>Post a tip, a photo or a small win from your week.</p>
            </li>
            <li>
              <h3 className={styles.pointTitle}>Talk to each other</h3>
              <p className={styles.pointText}>Comment, reply or send a private message.</p>
            </li>
            <li>
              <h3 className={styles.pointTitle}>Grow together</h3>
              <p className={styles.pointText}>Every post, comment and like grows your own tree.</p>
            </li>
          </ul>
          <JoinActions label="Join the community" />
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className={`container ${styles.section} ${styles.contact}`} aria-labelledby="contact-title">
        <h2 id="contact-title" className={styles.h2}>
          Contact us
        </h2>
        <div className={styles.contactGrid}>
          <div className={styles.contactForm}>
            <p className={styles.contactLead}>
              Feel free to contact us any time. We will get back to you as soon as possible.
            </p>
            <ContactForm />
          </div>
          <Image
            src="/Landing/map.png"
            alt="Map showing our office in Toronto"
            width={526}
            height={357}
            sizes="(min-width: 526px) 526px, 100vw"
            className={styles.map}
          />
          <ul className={styles.details}>
            <li>
              <Image src="/icons/address.svg" alt="" width={24} height={24} unoptimized />
              <address>
                77 Canlish Road,
                <br />
                City of Toronto, ON, Canada
              </address>
            </li>
            <li>
              <Image src="/icons/email.svg" alt="" width={24} height={19} unoptimized />
              <a href="mailto:info@ecospherehub.com">info@ecospherehub.com</a>
            </li>
            <li>
              <Image src="/icons/schedule.svg" alt="" width={24} height={24} unoptimized />
              <span>
                Monday - Friday
                <br />
                08:00 - 18:00
              </span>
            </li>
            <li>
              <Image src="/icons/phone.svg" alt="" width={24} height={24} unoptimized />
              <a href="tel:+17779990000">+1 777 999 0000</a>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
