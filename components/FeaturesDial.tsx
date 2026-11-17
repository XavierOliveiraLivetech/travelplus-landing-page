import siteStyles from "@/app/site.module.css";
import { FEATURES } from "@/lib/site-data";
import styles from "./FeaturesDial.module.css";

const SNAP_ID = "produto-features";

function featureIndexLabel(index: number) {
  return String(index + 1).padStart(2, "0");
}

export function FeaturesDial() {
  return (
    <section
      className={styles.section}
      aria-labelledby="features-title"
      data-snap-section
      data-snap-id={SNAP_ID}
      data-snap-align="center"
    >
      <div className={`${siteStyles.sectionInner} ${styles.inner}`}>
        <header className={styles.header}>
          <h2 id="features-title" className={siteStyles.sectionTitle}>
            Tudo o que a agência precisa num só sítio
          </h2>
          <p className={siteStyles.sectionLead}>
            Do primeiro contacto com o cliente até à reserva confirmada — sem
            mudar de ferramenta a meio do processo.
          </p>
        </header>

        <ul className={styles.grid}>
          {FEATURES.map((feature, index) => (
            <li
              key={feature.title}
              className={styles.item}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <span className={styles.index} aria-hidden="true">
                <span className={styles.indexGlyph}>
                  {featureIndexLabel(index)}
                </span>
              </span>
              <h3 className={styles.title}>{feature.title}</h3>
              <p className={styles.body}>{feature.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
