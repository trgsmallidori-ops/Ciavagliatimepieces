import Link from "next/link";

export default function Footer({ locale }: { locale: string }) {
  const isFr = locale === "fr";

  return (
    <footer className="mt-32 border-t border-white/20 bg-[var(--logo-green)] px-6 py-16 text-white md:mt-40">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">Ciavaglia Timepieces</p>
          <p className="mt-4 text-white/70">
            {isFr
              ? "Montres sur mesure, concues a Montreal."
              : "Custom timepieces, crafted in Montreal."}
          </p>
        </div>
        <div className="text-sm uppercase tracking-[0.2em]">
          <p className="font-semibold text-white/80">{isFr ? "Explorer" : "Explore"}</p>
          <div className="mt-4 flex flex-col gap-2 text-white/80">
            <Link href={`/${locale}/shop`} className="transition hover:text-white">{isFr ? "Montres" : "Watches"}</Link>
            <Link href={`/${locale}/configurator`} className="transition hover:text-white">{isFr ? "Configurateur" : "Configurator"}</Link>
            <Link href={`/${locale}/contact`} className="transition hover:text-white">{isFr ? "Contact" : "Contact"}</Link>
            <Link href={`/${locale}/blog`} className="transition hover:text-white">{isFr ? "Journal" : "Journal"}</Link>
          </div>
        </div>
        <div className="text-sm uppercase tracking-[0.2em]">
          <p className="font-semibold text-white/80">{isFr ? "Ressources" : "Resources"}</p>
          <div className="mt-4 flex flex-col gap-2 text-white/80">
            <Link href={`/${locale}/track-order`} className="transition hover:text-white">{isFr ? "Suivre une commande" : "Track Order"}</Link>
            <Link href={`/${locale}/faq`} className="transition hover:text-white">{isFr ? "Expédition" : "Shipping"}</Link>
            <Link href={`/${locale}/contact`} className="transition hover:text-white">{isFr ? "Contact" : "Contact"}</Link>
            <Link href={`/${locale}/privacy-policy`} className="transition hover:text-white">{isFr ? "Politique de confidentialité" : "Privacy Policy"}</Link>
            <Link href={`/${locale}/terms-of-service`} className="transition hover:text-white">{isFr ? "Conditions d'utilisation" : "Terms of Service"}</Link>
          </div>
        </div>
        <div className="text-sm uppercase tracking-[0.2em]">
          <p className="font-semibold text-white/80">{isFr ? "Contact" : "Contact"}</p>
          <div className="mt-4 flex flex-col gap-2 text-white/80">
            <a href="mailto:ciavagliatimepieces@gmail.com" className="transition hover:text-white">ciavagliatimepieces@gmail.com</a>
            <a href="tel:+15142432116" className="transition hover:text-white">+1 514 243 2116</a>
            <span>{isFr ? "Montréal" : "Montreal"}</span>
          </div>
        </div>
      </div>
      <p className="mt-12 text-center text-xs uppercase tracking-[0.3em] text-white/40">
        © {new Date().getFullYear()} Ciavaglia Timepieces · Montreal
      </p>
    </footer>
  );
}
