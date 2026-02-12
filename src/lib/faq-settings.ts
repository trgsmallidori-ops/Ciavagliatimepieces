/**
 * FAQ page content for admin editing.
 * Stored in site_settings as key "faq" (JSON).
 */

export type FaqItem = {
  question_en: string;
  question_fr: string;
  answer_en: string;
  answer_fr: string;
};

export type FaqSettings = {
  heading_en: string;
  heading_fr: string;
  intro_en: string;
  intro_fr: string;
  items: FaqItem[];
};

export const DEFAULT_FAQ: FaqSettings = {
  heading_en: "Questions answered in full.",
  heading_fr: "Questions détaillées.",
  intro_en: "If you need more detail, email us and we will respond within one business day.",
  intro_fr: "Si vous avez besoin de plus de détails, écrivez-nous et nous répondrons sous un jour ouvrable.",
  items: [
    {
      question_en: "How long does a custom build take?",
      question_fr: "Combien de temps prend une construction sur mesure ?",
      answer_en: "Custom builds take 4-8 weeks depending on movement complexity and hand-finishing requirements.",
      answer_fr: "Les constructions sur mesure prennent 4 à 8 semaines selon la complexité du mouvement et les finitions à la main.",
    },
    {
      question_en: "Do you ship internationally?",
      question_fr: "Livrez-vous à l'international ?",
      answer_en: "Yes. We ship worldwide with insured, tracked delivery and signature confirmation.",
      answer_fr: "Oui. Nous livrons dans le monde entier avec assurance, suivi et signature.",
    },
    {
      question_en: "Can I update my configuration after payment?",
      question_fr: "Puis-je modifier ma configuration après le paiement ?",
      answer_en: "Minor adjustments are possible within 48 hours of purchase. Contact our support team immediately.",
      answer_fr: "Des ajustements mineurs sont possibles dans les 48 heures suivant l'achat. Contactez notre équipe sans tarder.",
    },
  ],
};
