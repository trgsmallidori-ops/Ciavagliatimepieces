/**
 * Footer content structure for admin-editable footer.
 * Stored in site_settings as key "footer" (JSON).
 */

export type FooterLink = {
  label_en: string;
  label_fr: string;
  path: string; // e.g. /shop or https://...
};

export type FooterSettings = {
  brand_title_en: string;
  brand_title_fr: string;
  brand_description_en: string;
  brand_description_fr: string;
  explore_heading_en: string;
  explore_heading_fr: string;
  explore_links: FooterLink[];
  resources_heading_en: string;
  resources_heading_fr: string;
  resources_links: FooterLink[];
  contact_heading_en: string;
  contact_heading_fr: string;
  contact_email: string;
  contact_phone: string;
  contact_city_en: string;
  contact_city_fr: string;
  copyright_text_en: string;
  copyright_text_fr: string;
};

export const DEFAULT_FOOTER: FooterSettings = {
  brand_title_en: "Ciavaglia Timepieces",
  brand_title_fr: "Ciavaglia Timepieces",
  brand_description_en: "Custom timepieces, crafted in Montreal.",
  brand_description_fr: "Montres sur mesure, conçues à Montréal.",
  explore_heading_en: "Explore",
  explore_heading_fr: "Explorer",
  explore_links: [
    { label_en: "Watches", label_fr: "Montres", path: "/shop" },
    { label_en: "Configurator", label_fr: "Configurateur", path: "/configurator" },
    { label_en: "Contact", label_fr: "Contact", path: "/contact" },
  ],
  resources_heading_en: "Resources",
  resources_heading_fr: "Ressources",
  resources_links: [
    { label_en: "Track Order", label_fr: "Suivre une commande", path: "/track-order" },
    { label_en: "Shipping", label_fr: "Expédition", path: "/faq" },
    { label_en: "Contact", label_fr: "Contact", path: "/contact" },
    { label_en: "Privacy Policy", label_fr: "Politique de confidentialité", path: "/privacy-policy" },
    { label_en: "Terms of Service", label_fr: "Conditions d'utilisation", path: "/terms-of-service" },
  ],
  contact_heading_en: "Contact",
  contact_heading_fr: "Contact",
  contact_email: "ciavagliatimepieces@gmail.com",
  contact_phone: "+1 514 243 2116",
  contact_city_en: "Montreal",
  contact_city_fr: "Montréal",
  copyright_text_en: "Ciavaglia Timepieces · Montreal",
  copyright_text_fr: "Ciavaglia Timepieces · Montréal",
};
