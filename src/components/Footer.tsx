import Link from "next/link";
import type { FooterSettings } from "@/lib/footer-settings";

function isExternal(path: string) {
  return path.startsWith("http://") || path.startsWith("https://");
}

export default function Footer({
  locale,
  footer,
}: {
  locale: string;
  footer?: FooterSettings | null;
}) {
  const isFr = locale === "fr";
  const f = footer ?? null;

  const brandTitle = f ? (isFr ? f.brand_title_fr : f.brand_title_en) : "Ciavaglia Timepieces";
  const brandDesc = f ? (isFr ? f.brand_description_fr : f.brand_description_en) : (isFr ? "Montres sur mesure, conçues à Montréal." : "Custom timepieces, crafted in Montreal.");
  const exploreHeading = f ? (isFr ? f.explore_heading_fr : f.explore_heading_en) : (isFr ? "Explorer" : "Explore");
  const exploreLinks = f?.explore_links ?? [
    { label_en: "Watches", label_fr: "Montres", path: "/shop" },
    { label_en: "Configurator", label_fr: "Configurateur", path: "/configurator" },
    { label_en: "Contact", label_fr: "Contact", path: "/contact" },
  ];
  const resourcesHeading = f ? (isFr ? f.resources_heading_fr : f.resources_heading_en) : (isFr ? "Ressources" : "Resources");
  const resourcesLinks = f?.resources_links ?? [
    { label_en: "Track Order", label_fr: "Suivre une commande", path: "/track-order" },
    { label_en: "Shipping", label_fr: "Expédition", path: "/faq" },
    { label_en: "Contact", label_fr: "Contact", path: "/contact" },
    { label_en: "Privacy Policy", label_fr: "Politique de confidentialité", path: "/privacy-policy" },
    { label_en: "Terms of Service", label_fr: "Conditions d'utilisation", path: "/terms-of-service" },
  ];
  const contactHeading = f ? (isFr ? f.contact_heading_fr : f.contact_heading_en) : "Contact";
  const contactEmail = f?.contact_email ?? "ciavagliatimepieces@gmail.com";
  const contactPhone = f?.contact_phone ?? "+1 514 243 2116";
  const contactCity = f ? (isFr ? f.contact_city_fr : f.contact_city_en) : (isFr ? "Montréal" : "Montreal");
  const copyrightText = f ? (isFr ? f.copyright_text_fr : f.copyright_text_en) : (isFr ? "Ciavaglia Timepieces · Montréal" : "Ciavaglia Timepieces · Montreal");

  const renderLink = (link: { label_en: string; label_fr: string; path: string }) => {
    const label = isFr ? link.label_fr : link.label_en;
    const href = isExternal(link.path) ? link.path : `/${locale}${link.path.startsWith("/") ? link.path : `/${link.path}`}`;
    if (isExternal(link.path)) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="transition hover:text-white">
          {label}
        </a>
      );
    }
    return (
      <Link href={href} className="transition hover:text-white">
        {label}
      </Link>
    );
  };

  return (
    <footer className="mt-32 border-t border-white/20 bg-[var(--logo-green)] px-6 py-16 text-white md:mt-40">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">{brandTitle}</p>
          <p className="mt-4 text-white/70">{brandDesc}</p>
        </div>
        <div className="text-sm uppercase tracking-[0.2em]">
          <p className="font-semibold text-white/80">{exploreHeading}</p>
          <div className="mt-4 flex flex-col gap-2 text-white/80">
            {exploreLinks.map((link, i) => (
              <span key={i}>{renderLink(link)}</span>
            ))}
          </div>
        </div>
        <div className="text-sm uppercase tracking-[0.2em]">
          <p className="font-semibold text-white/80">{resourcesHeading}</p>
          <div className="mt-4 flex flex-col gap-2 text-white/80">
            {resourcesLinks.map((link, i) => (
              <span key={i}>{renderLink(link)}</span>
            ))}
          </div>
        </div>
        <div className="text-sm uppercase tracking-[0.2em]">
          <p className="font-semibold text-white/80">{contactHeading}</p>
          <div className="mt-4 flex flex-col gap-2 text-white/80">
            <a href={`mailto:${contactEmail}`} className="transition hover:text-white">{contactEmail}</a>
            <a href={`tel:${contactPhone.replace(/\s/g, "")}`} className="transition hover:text-white">{contactPhone}</a>
            <span>{contactCity}</span>
          </div>
        </div>
      </div>
      <p className="mt-12 text-center text-xs uppercase tracking-[0.3em] text-white/40">
        © {new Date().getFullYear()} {copyrightText}
      </p>
    </footer>
  );
}
