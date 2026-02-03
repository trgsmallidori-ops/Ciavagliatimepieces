"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import ScrollReveal from "@/components/ScrollReveal";
import { getAdminOrders } from "../actions";
import type { OrderRow } from "../actions";

function formatAddress(order: OrderRow): string {
  const parts: string[] = [];
  if (order.shipping_name) parts.push(order.shipping_name);
  if (order.shipping_line1) parts.push(order.shipping_line1);
  if (order.shipping_line2) parts.push(order.shipping_line2);
  const cityLine = [order.shipping_city, order.shipping_state, order.shipping_postal_code].filter(Boolean).join(", ");
  if (cityLine) parts.push(cityLine);
  if (order.shipping_country) parts.push(order.shipping_country);
  return parts.join("\n") || (order.customer_email ?? "—");
}

export default function AdminOrdersPage() {
  const params = useParams<{ locale?: string | string[] }>();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale ?? "en";
  const isFr = locale === "fr";
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAdminOrders();
        setOrders(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unauthorized");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handlePrintLabels = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${isFr ? "Étiquettes d'expédition" : "Shipping labels"}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 16px; }
            .label { border: 1px solid #ccc; padding: 16px; margin-bottom: 24px; max-width: 4in; white-space: pre-line; font-size: 14px; line-height: 1.4; }
            .label strong { display: block; margin-bottom: 4px; }
            .meta { color: #666; font-size: 12px; margin-top: 8px; }
            @media print { body { padding: 0; } .label { break-inside: avoid; page-break-inside: avoid; } }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 250);
  };

  if (loading) {
    return (
      <div className="py-12">
        <p className="text-foreground/70">{isFr ? "Chargement..." : "Loading..."}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const ordersWithShipping = orders.filter(
    (o) => o.shipping_line1 || o.shipping_name || o.customer_email
  );

  return (
    <div className="space-y-8">
      <ScrollReveal>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">{isFr ? "Commandes" : "Orders"}</h1>
            <p className="mt-1 text-foreground/70">
              {isFr
                ? "Adresses de livraison pour imprimer les étiquettes d'expédition."
                : "Shipping addresses to print shipping labels."}
            </p>
          </div>
          {ordersWithShipping.length > 0 && (
            <button
              type="button"
              onClick={handlePrintLabels}
              className="btn-hover rounded-full bg-foreground px-5 py-2.5 text-sm font-medium uppercase tracking-[0.2em] text-white transition hover:opacity-90"
            >
              {isFr ? "Imprimer les étiquettes" : "Print shipping labels"}
            </button>
          )}
        </div>
      </ScrollReveal>

      {error && <p className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {/* Hidden content for print */}
      <div ref={printRef} className="hidden">
        {ordersWithShipping.map((order) => (
          <div key={order.id} className="label">
            <strong>{order.shipping_name || order.customer_email || "—"}</strong>
            {order.shipping_line1 && <span>{order.shipping_line1}</span>}
            {order.shipping_line2 && `\n${order.shipping_line2}`}
            {(order.shipping_city || order.shipping_state || order.shipping_postal_code) &&
              `\n${[order.shipping_city, order.shipping_state, order.shipping_postal_code].filter(Boolean).join(", ")}`}
            {order.shipping_country && `\n${order.shipping_country}`}
            <div className="meta">
              {order.summary} · ${Number(order.total).toLocaleString()} · {new Date(order.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      <ScrollReveal>
        <div className="overflow-x-auto rounded-[28px] border border-white/70 bg-white/80 shadow-[0_24px_90px_rgba(15,20,23,0.1)]">
          {orders.length === 0 ? (
            <div className="p-10 text-center text-foreground/60">
              {isFr ? "Aucune commande pour le moment." : "No orders yet."}
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-foreground/10">
                  <th className="p-4 font-semibold">{isFr ? "Date" : "Date"}</th>
                  <th className="p-4 font-semibold">{isFr ? "Résumé" : "Summary"}</th>
                  <th className="p-4 font-semibold">{isFr ? "Total" : "Total"}</th>
                  <th className="p-4 font-semibold">{isFr ? "E-mail" : "Email"}</th>
                  <th className="p-4 font-semibold">{isFr ? "Adresse de livraison" : "Shipping address"}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-foreground/5">
                    <td className="p-4 text-foreground/80">
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                    <td className="p-4">{order.summary ?? "—"}</td>
                    <td className="p-4 font-medium">${Number(order.total).toLocaleString()}</td>
                    <td className="p-4">{order.customer_email ?? "—"}</td>
                    <td className="max-w-xs whitespace-pre-line p-4 text-foreground/80">
                      {formatAddress(order)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </ScrollReveal>
    </div>
  );
}
