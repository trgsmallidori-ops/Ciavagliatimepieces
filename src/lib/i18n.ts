export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];

export const localeLabels: Record<Locale, string> = {
  en: "English",
  fr: "Francais",
};

export const dictionaries = {
  en: {
    nav: {
      home: "Home",
      shop: "Watches",
      configurator: "Custom Build",
      allWatches: "All watches",
      contact: "Contact",
      account: "Account",
      cart: "Cart",
      signIn: "Sign In",
      createAccount: "Create Account",
      logout: "Logout",
    },
    cart: {
      title: "Your cart",
      empty: "Your cart is empty.",
      continueShopping: "Continue shopping",
      subtotal: "Subtotal",
      checkout: "Proceed to checkout",
      remove: "Remove",
      quantity: "Quantity",
      editBuild: "Edit build",
    },
    contact: {
      title: "Contact",
      heading: "Get in touch.",
      subtitle: "Inquiries, custom requests, or simply a conversation about time. We reply within one business day.",
      name: "Name",
      email: "Email",
      message: "Message",
      send: "Send message",
      success: "Thank you. We will reply shortly.",
    },
    hero: {
      title: "Ciavaglia Timepieces",
      subtitle: "Mechanical art for wrists that command the room.",
      ctaPrimary: "Configure yours",
      ctaSecondary: "Explore built pieces",
      purchaseLabel: "Purchase this watch",
    },
    home: {
      promoBar: "Hand-finished timepieces · Limited runs",
      selectStyle: "Select your style",
      bestOfAtelier: "Best of the collection",
      seeMore: "See more",
      jumpToWatches: "Jump to watches",
      buildYourOwn: "Build your own",
      buildYourOwnSub: "Design dial, case, movement, and strap. Live pricing. Reviewed before it ships.",
      trustLine: "Hand-finished · Limited 12",
      finalCtaTitle: "Design a signature timepiece that is entirely yours.",
      finalCtaSub: "Build it in minutes. We will craft it in weeks.",
      startConfiguring: "Start configuring",
    },
    shop: {
      sortBy: "Sort by",
      priceAscending: "Price: Low to High",
      priceDescending: "Price: High to Low",
    },
  },
  fr: {
    nav: {
      home: "Accueil",
      shop: "Montres",
      configurator: "Construction sur mesure",
      allWatches: "Toutes les montres",
      contact: "Contact",
      account: "Compte",
      cart: "Panier",
      signIn: "Connexion",
      createAccount: "Creer un compte",
      logout: "Deconnexion",
    },
    cart: {
      title: "Votre panier",
      empty: "Votre panier est vide.",
      continueShopping: "Continuer les achats",
      subtotal: "Sous-total",
      checkout: "Passer la commande",
      remove: "Retirer",
      quantity: "Quantité",
      editBuild: "Modifier le build",
    },
    contact: {
      title: "Contact",
      heading: "Restons en contact.",
      subtitle: "Demandes, projets sur mesure ou simplement une conversation sur le temps. Nous repondons sous un jour ouvrable.",
      name: "Nom",
      email: "E-mail",
      message: "Message",
      send: "Envoyer",
      success: "Merci. Nous vous repondrons sous peu.",
    },
    hero: {
      title: "Ciavaglia Timepieces",
      subtitle: "Des montres mecaniques sur mesure pour des poignets qui s'imposent.",
      ctaPrimary: "Configurer la vôtre",
      ctaSecondary: "Découvrir les pièces",
      purchaseLabel: "Acheter cette montre",
    },
    home: {
      promoBar: "Pieces sur mesure · Finition main · Series limitees",
      selectStyle: "Choisissez votre style",
      bestOfAtelier: "Meilleures pieces",
      seeMore: "Voir plus",
      jumpToWatches: "Voir les montres",
      buildYourOwn: "Configurez la votre",
      buildYourOwnSub: "Dial, boitier, mouvement et bracelet. Tarification en direct. Valide avant expedition.",
      trustLine: "Finition main · Serie 12",
      finalCtaTitle: "Dessinez une montre signature entierement votre.",
      finalCtaSub: "Creez en quelques minutes. Nous fabriquons en quelques semaines.",
      startConfiguring: "Commencer",
    },
    shop: {
      sortBy: "Trier par",
      priceAscending: "Prix : croissant",
      priceDescending: "Prix : décroissant",
    },
  },
};

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
