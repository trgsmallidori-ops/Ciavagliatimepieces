import Image from "next/image";
import Link from "next/link";
import Parallax from "@/components/Parallax";
import ScrollReveal from "@/components/ScrollReveal";
import FeaturedScroll from "@/components/FeaturedScroll";
import StorySection from "@/components/StorySection";
import { getDictionary, Locale } from "@/lib/i18n";
import { getWatchCategories } from "@/lib/watch-categories";
import { getFeaturedSlides } from "@/app/[locale]/account/admin/actions";
import { builtWatches } from "@/data/watches";

const heroFallbackImage =
  "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=1200&q=80";
const collectionWatchImages = [
  "https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?w=800&q=80",
  "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80",
  "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=800&q=80",
];

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const hero = dictionary.hero;
  const home = dictionary.home;
  const isFr = locale === "fr";
  const [watchCategories, featuredSlides] = await Promise.all([
    getWatchCategories(),
    getFeaturedSlides(),
  ]);

  return (
    <div className="space-y-0">
      <FeaturedScroll
        slides={featuredSlides}
        locale={locale}
        purchaseLabel={hero.purchaseLabel}
        jumpLabel={home.jumpToWatches}
        fallbackImage={heroFallbackImage}
      />

      <StorySection
        id="watch-collections"
        minHeight="100vh"
        className="border-t border-foreground/10 bg-[var(--background)]"
        contentCenter={false}
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <ScrollReveal>
            <h2 className="text-center text-2xl uppercase tracking-[0.25em] text-foreground/80 md:text-3xl">
              {home.selectStyle}
            </h2>
          </ScrollReveal>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <ScrollReveal key="customizer">
              <Link
                href={`/${locale}/configurator`}
                className="group flex flex-col rounded-[28px] border-2 border-dashed border-foreground/25 bg-foreground/5 p-6 transition hover:border-foreground/40 hover:bg-foreground/10"
              >
                <div className="flex h-52 items-center justify-center rounded-[22px] bg-white/60">
                  <span className="text-4xl text-foreground/40 group-hover:text-foreground/60">+</span>
                </div>
                <h3 className="mt-5 text-xl">{dictionary.nav.configurator}</h3>
                <p className="mt-2 text-sm text-foreground/70">{home.buildYourOwnSub}</p>
              </Link>
            </ScrollReveal>
            <ScrollReveal key="shop">
              <Link
                href={`/${locale}/shop`}
                className="group block rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_90px_rgba(15,20,23,0.1)] transition hover:shadow-[0_28px_100px_rgba(15,20,23,0.14)]"
              >
                <Image
                  src={collectionWatchImages[0]}
                  alt={dictionary.nav.shop}
                  width={320}
                  height={280}
                  className="h-52 w-full rounded-[22px] object-cover transition duration-500 group-hover:scale-[1.02]"
                />
                <h3 className="mt-5 text-xl">{dictionary.nav.shop}</h3>
              </Link>
            </ScrollReveal>
            {watchCategories.map((cat, index) => {
              const label = isFr ? cat.label_fr : cat.label_en;
              const image = collectionWatchImages[(index + 1) % collectionWatchImages.length];
              return (
                <ScrollReveal key={cat.id}>
                  <Link
                    href={`/${locale}/shop/${cat.slug}`}
                    className="group block rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_90px_rgba(15,20,23,0.1)] transition hover:shadow-[0_28px_100px_rgba(15,20,23,0.14)]"
                  >
                    <Image
                      src={image}
                      alt={label}
                      width={320}
                      height={280}
                      className="h-52 w-full rounded-[22px] object-cover transition duration-500 group-hover:scale-[1.02]"
                    />
                    <h3 className="mt-5 text-xl">{label}</h3>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </StorySection>

      <StorySection
        minHeight="100vh"
        className="bg-white/50"
        contentCenter={false}
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <ScrollReveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-2xl uppercase tracking-[0.25em] text-foreground/80 md:text-3xl">
              {home.bestOfAtelier}
            </h2>
            <Link
              href={`/${locale}/shop`}
              className="text-sm uppercase tracking-[0.2em] text-foreground/70 underline underline-offset-4 transition hover:text-foreground"
            >
              {home.seeMore} →
            </Link>
          </ScrollReveal>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {builtWatches.map((watch) => (
              <ScrollReveal key={watch.id}>
                <Link
                  href={`/${locale}/shop`}
                  className="group block overflow-hidden rounded-[28px] border border-white/70 bg-white/80 shadow-[0_24px_90px_rgba(15,20,23,0.1)] transition hover:shadow-[0_28px_100px_rgba(15,20,23,0.14)]"
                >
                  <Image
                    src={watch.image}
                    alt={watch.name}
                    width={400}
                    height={360}
                    className="h-64 w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                  />
                  <div className="p-6">
                    <h3 className="text-xl">{watch.name}</h3>
                    <p className="mt-1 text-sm text-foreground/70 line-clamp-2">{watch.description}</p>
                    <p className="mt-3 text-sm font-medium uppercase tracking-[0.15em] text-foreground">
                      ${watch.price.toLocaleString()}
                    </p>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </StorySection>

      <StorySection
        minHeight="100vh"
        className="bg-foreground text-white"
        contentCenter={true}
      >
        <ScrollReveal>
          <h2 className="text-3xl font-medium md:text-4xl lg:text-5xl">{home.buildYourOwn}</h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/85">{home.buildYourOwnSub}</p>
          <Link
            href={`/${locale}/configurator`}
            className="btn-hover mt-10 inline-block rounded-full border border-white/50 bg-white px-10 py-4 text-sm uppercase tracking-[0.35em] text-foreground transition hover:bg-white/95"
          >
            {hero.ctaPrimary}
          </Link>
        </ScrollReveal>
      </StorySection>

      <StorySection
        minHeight="100vh"
        className="bg-[var(--background)]"
        contentCenter={false}
      >
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 md:grid-cols-[1fr_1fr] md:items-center">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.4em] text-foreground/50">
              {home.theProcess}
            </p>
            <h2 className="mt-6 text-3xl font-medium md:text-4xl">{home.theProcessSub}</h2>
            <p className="mt-6 text-foreground/75">
              {isFr
                ? "Le configurateur vous guide pour creer la piece parfaite, validee avant expedition."
                : "Our configurator lets you sculpt the dial, case, movement, and strap with live pricing. Each build is reviewed before it ships."}
            </p>
            <div className="mt-10 grid gap-3 text-sm uppercase tracking-[0.25em] text-foreground/60">
              <span>01 · {isFr ? "Consultation" : "Consultation"}</span>
              <span>02 · {isFr ? "Configuration" : "Configuration"}</span>
              <span>03 · {isFr ? "Artisanat" : "Craftsmanship"}</span>
              <span>04 · {isFr ? "Assemblage" : "Assembly"}</span>
              <span>05 · {isFr ? "Tests" : "Testing"}</span>
              <span>06 · {isFr ? "Livraison" : "Delivery"}</span>
            </div>
          </ScrollReveal>
          <Parallax speed={0.12}>
            <Image
              src="/images/workshop.svg"
              alt="Ciavaglia workshop"
              width={520}
              height={640}
              className="h-[420px] w-full rounded-[28px] object-cover shadow-[0_30px_120px_rgba(15,20,23,0.16)] md:h-[520px]"
            />
          </Parallax>
        </div>
      </StorySection>

      <StorySection
        minHeight="90vh"
        className="bg-gradient-to-br from-[#f6efe6] via-[#f2e7d6] to-[#efe0cb]"
        contentCenter={true}
      >
        <ScrollReveal>
          <h2 className="text-3xl font-medium md:text-4xl lg:text-5xl">{home.finalCtaTitle}</h2>
          <p className="mx-auto mt-6 max-w-xl text-foreground/75">{home.finalCtaSub}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href={`/${locale}/configurator`}
              className="btn-hover rounded-full bg-foreground px-10 py-4 text-xs uppercase tracking-[0.35em] text-white transition hover:bg-foreground/90"
            >
              {home.startConfiguring}
            </Link>
            <Link
              href={`/${locale}/blog`}
              className="btn-hover rounded-full border-2 border-foreground/30 px-10 py-4 text-xs uppercase tracking-[0.35em] text-foreground/80 transition hover:border-foreground hover:text-foreground"
            >
              {home.readJournal}
            </Link>
          </div>
        </ScrollReveal>
      </StorySection>
    </div>
  );
}
