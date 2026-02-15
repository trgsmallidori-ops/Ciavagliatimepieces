import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import FeaturedScroll from "@/components/FeaturedScroll";
import StorySection from "@/components/StorySection";
import HomeStyleCardsSection from "@/components/HomeStyleCardsSection";
import HomeBestOfSection from "@/components/HomeBestOfSection";
import { getDictionary, Locale } from "@/lib/i18n";
import { getWatchCategories } from "@/lib/watch-categories";
import { createAuthServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { getFeaturedSlides, getActiveGiveaway, getHomeStyleCards, getHomeBestOf } from "@/app/[locale]/account/admin/actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isFr = locale === "fr";
  return {
    title: isFr
      ? "Accueil | Montres de luxe sur mesure Montréal"
      : "Home | Custom Luxury Watches Montreal",
    description: isFr
      ? "Bienvenue chez Ciavaglia Timepieces. Montres sur mesure, configurateur et collections prêtes à expédier."
      : "Welcome to Ciavaglia Timepieces. Custom timepieces, watch configurator, and ready-to-ship collections.",
    openGraph: {
      title: isFr ? "Ciavaglia Timepieces | Accueil" : "Ciavaglia Timepieces | Home",
    },
  };
}

const heroFallbackImage =
  "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=1200&q=80";

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const hero = dictionary.hero;
  const home = dictionary.home;
  const isFr = locale === "fr";
  const [watchCategories, featuredSlidesRaw, activeGiveaway, cookieStore, styleCards, bestOfItems, supabase] = await Promise.all([
    getWatchCategories(),
    getFeaturedSlides(),
    getActiveGiveaway(),
    cookies(),
    getHomeStyleCards(),
    getHomeBestOf(),
    createAuthServerClient(),
  ]);
  const { data: { user } } = await supabase.auth.getUser();
  const isAdminUser = isAdmin(user?.id);

  const heroFallbackForGiveaway = heroFallbackImage;
  const featuredSlides =
    activeGiveaway && (activeGiveaway.title || activeGiveaway.description || activeGiveaway.image_url)
      ? [
          {
            id: activeGiveaway.id,
            image_url: activeGiveaway.image_url || heroFallbackForGiveaway,
            image_url_secondary: activeGiveaway.image_url || heroFallbackForGiveaway,
            title: activeGiveaway.title,
            subtitle: null,
            description: activeGiveaway.description,
            link_url: activeGiveaway.link_url,
            sort_order: -1,
          },
          ...featuredSlidesRaw,
        ]
      : featuredSlidesRaw;

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
        className="border-t border-foreground/10 bg-[var(--background)] text-foreground"
        contentCenter={false}
      >
        <HomeStyleCardsSection
          locale={locale}
          isAdmin={!!isAdminUser}
          styleCards={styleCards}
          categories={watchCategories.filter((c) => c.slug !== "womens")}
          sectionHeading={home.selectStyle}
        />
      </StorySection>

      <StorySection
        minHeight="100vh"
        className="bg-white/50 text-foreground"
        contentCenter={false}
      >
        <HomeBestOfSection
          locale={locale}
          isAdmin={!!isAdminUser}
          items={bestOfItems}
          sectionHeading={home.bestOfAtelier}
          seeMoreLabel={home.seeMore}
        />
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
        minHeight="90vh"
        className="bg-gradient-to-br from-[#f6efe6] via-[#f2e7d6] to-[#efe0cb] text-foreground"
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
          </div>
        </ScrollReveal>
      </StorySection>
    </div>
  );
}
