"use client";

import { useState } from "react";

type ContactLabels = {
  name: string;
  email: string;
  message: string;
  send: string;
  success: string;
};

export default function ContactForm({ labels }: { labels: ContactLabels }) {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="rounded-[26px] border border-white/70 bg-white/80 p-8 text-center shadow-[0_20px_70px_rgba(15,20,23,0.1)]">
        <p className="text-lg text-foreground/90">{labels.success}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[26px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_70px_rgba(15,20,23,0.1)] sm:p-8"
    >
      <div className="space-y-6">
        <div>
          <label htmlFor="contact-name" className="block text-xs uppercase tracking-[0.2em] text-foreground/60">
            {labels.name}
          </label>
          <input
            id="contact-name"
            type="text"
            name="name"
            required
            className="mt-2 w-full rounded-lg border border-foreground/20 bg-white/50 px-4 py-3 text-foreground placeholder:text-foreground/40 focus:border-foreground/50 focus:outline-none"
            placeholder={labels.name}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-xs uppercase tracking-[0.2em] text-foreground/60">
            {labels.email}
          </label>
          <input
            id="contact-email"
            type="email"
            name="email"
            required
            className="mt-2 w-full rounded-lg border border-foreground/20 bg-white/50 px-4 py-3 text-foreground placeholder:text-foreground/40 focus:border-foreground/50 focus:outline-none"
            placeholder={labels.email}
          />
        </div>
        <div>
          <label htmlFor="contact-message" className="block text-xs uppercase tracking-[0.2em] text-foreground/60">
            {labels.message}
          </label>
          <textarea
            id="contact-message"
            name="message"
            required
            rows={5}
            className="mt-2 w-full resize-y rounded-lg border border-foreground/20 bg-white/50 px-4 py-3 text-foreground placeholder:text-foreground/40 focus:border-foreground/50 focus:outline-none"
            placeholder={labels.message}
          />
        </div>
        <button
          type="submit"
          className="btn-hover w-full rounded-full border border-foreground bg-foreground px-6 py-3 text-sm uppercase tracking-[0.2em] text-background transition hover:bg-foreground/90"
        >
          {labels.send}
        </button>
      </div>
    </form>
  );
}
