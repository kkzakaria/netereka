import { notFound } from "next/navigation";
import { getAdminOrderById } from "@/lib/db/admin/orders";
import { formatPrice } from "@/lib/utils";
import { InvoicePrintButton } from "./print-button";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function InvoicePage({ params }: Props) {
  const { id } = await params;
  const order = await getAdminOrderById(id);

  if (!order) notFound();

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice, #invoice * {
            visibility: visible;
          }
          #invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm;
            font-size: 12pt;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 0;
            size: A4;
          }
        }
      `}</style>

      {/* Print Button */}
      <div className="no-print mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Facture {order.order_number}</h1>
        <InvoicePrintButton />
      </div>

      {/* Invoice Content */}
      <div
        id="invoice"
        className="mx-auto max-w-2xl rounded-lg border bg-white p-8 text-black shadow-sm print:border-0 print:shadow-none"
      >
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">NETEREKA</h1>
            <p className="text-sm text-gray-600">Electronic</p>
            <p className="mt-2 text-xs text-gray-500">
              Abidjan, Côte d&apos;Ivoire
              <br />
              contact@netereka.ci
              <br />
              +225 XX XX XX XX XX
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold">FACTURE</h2>
            <p className="text-sm text-gray-600">N° {order.order_number}</p>
            <p className="text-sm text-gray-600">
              Date: {formatDate(order.created_at)}
            </p>
          </div>
        </div>

        {/* Client Info */}
        <div className="mb-8 grid grid-cols-2 gap-8">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase text-gray-500">
              Facturé à
            </h3>
            <p className="font-medium">{order.user_name}</p>
            <p className="text-sm text-gray-600">{order.user_email}</p>
            {order.user_phone && (
              <p className="text-sm text-gray-600">{order.user_phone}</p>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase text-gray-500">
              Livraison
            </h3>
            <p className="text-sm text-gray-600">{order.delivery_address}</p>
            <p className="text-sm text-gray-600">{order.delivery_commune}</p>
            <p className="text-sm text-gray-600">{order.delivery_phone}</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="mb-8 w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="pb-2 text-left text-sm font-semibold">Article</th>
              <th className="pb-2 text-right text-sm font-semibold">Qté</th>
              <th className="pb-2 text-right text-sm font-semibold">
                Prix unitaire
              </th>
              <th className="pb-2 text-right text-sm font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-3">
                  <p className="font-medium">{item.product_name}</p>
                  {item.variant_name && (
                    <p className="text-xs text-gray-500">{item.variant_name}</p>
                  )}
                </td>
                <td className="py-3 text-right">{item.quantity}</td>
                <td className="py-3 text-right font-mono text-sm">
                  {formatPrice(item.unit_price)}
                </td>
                <td className="py-3 text-right font-mono text-sm">
                  {formatPrice(item.total_price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mb-8 flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Sous-total</span>
              <span className="font-mono">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Frais de livraison</span>
              <span className="font-mono">{formatPrice(order.delivery_fee)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Réduction</span>
                <span className="font-mono">
                  -{formatPrice(order.discount_amount)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold">
              <span>Total TTC</span>
              <span className="font-mono">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="mb-8 rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-semibold">Mode de paiement</h3>
          <p className="text-sm text-gray-600">
            Paiement à la livraison (COD)
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
          <p>Merci pour votre confiance !</p>
          <p className="mt-1">
            NETEREKA Electronic - www.netereka.ci
          </p>
        </div>
      </div>
    </>
  );
}
