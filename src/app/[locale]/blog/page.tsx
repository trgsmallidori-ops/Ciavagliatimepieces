import ScrollReveal from "@/components/ScrollReveal";

const posts = [
  {
    title: "Inside the Civaglia atelier",
    excerpt: "A glimpse at the artisans shaping every bevel and bridge.",
    date: "Jan 12, 2026",
  },
  {
    title: "Choosing the right movement",
    excerpt: "Manual vs automatic vs tourbillon—how to pick your heartbeat.",
    date: "Dec 22, 2025",
  },
  {
    title: "The language of straps",
    excerpt: "How leather, mesh, and alligator change the personality of a watch.",
    date: "Nov 04, 2025",
  },
];

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isFr = locale === "fr";

  return (
    <section className="px-6">
      <div className="mx-auto max-w-5xl space-y-10">
        <ScrollReveal>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-foreground/50">{isFr ? "Journal" : "Journal"}</p>
            <h1 className="mt-4 text-4xl">
              {isFr ? "Histoires de l'atelier Civaglia." : "Stories from the Civaglia studio."}
            </h1>
            <p className="mt-4 text-foreground/70">
              {isFr
                ? "Coulisses, philosophie du design et rituels horlogers."
                : "Behind-the-scenes notes, design philosophy, and watchmaking rituals."}
            </p>
          </div>
        </ScrollReveal>
        <div className="grid gap-6">
          {posts.map((post) => (
            <ScrollReveal key={post.title}>
              <article className="rounded-[26px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_70px_rgba(15,20,23,0.1)]">
                <p className="text-xs uppercase tracking-[0.3em] text-foreground/50">{post.date}</p>
                <h2 className="mt-4 text-2xl">{post.title}</h2>
                <p className="mt-3 text-foreground/70">{post.excerpt}</p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
