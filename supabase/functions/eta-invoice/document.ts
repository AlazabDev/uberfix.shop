// Builds an ETA (Egyptian Tax Authority) invoice document (version 1.0, type "I")

export interface EtaSettings {
  environment: string;
  taxpayer_tin: string | null;
  taxpayer_name: string | null;
  activity_code: string | null;
  branch_id: string;
  branch_country: string;
  branch_governate: string | null;
  branch_city: string | null;
  branch_street: string | null;
  branch_building_number: string | null;
  branch_postal_code: string | null;
  default_item_code: string | null;
  default_item_code_type: string;
  default_item_name: string | null;
  default_unit_type: string;
  default_tax_subtype: string;
  signing_enabled: boolean;
  signing_service_url: string | null;
}

export interface InvoiceRow {
  id: string;
  invoice_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  currency: string | null;
  issue_date: string | null;
  subtotal: number | null;
  amount: number | null;
  discount_amount: number | null;
  tax_amount: number | null;
  vat_rate: number | null;
  total_amount: number | null;
  notes: string | null;
}

export interface InvoiceItemRow {
  service_name: string | null;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
}

const r5 = (n: number) => Math.round(n * 100000) / 100000;

/** ETA requires ISO-8601 UTC with "Z" and no milliseconds */
export function etaDateTime(date: string | null): string {
  const d = date ? new Date(date) : new Date();
  const safe = isNaN(d.getTime()) ? new Date() : d;
  return safe.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function buildInvoiceDocument(
  invoice: InvoiceRow,
  items: InvoiceItemRow[],
  settings: EtaSettings,
): { document: Record<string, unknown>; internalId: string } {
  const currency = (invoice.currency || "EGP").toUpperCase();
  const vatRate = Number(invoice.vat_rate ?? 14);

  const lines = (items.length > 0
    ? items
    : [{
      service_name: settings.default_item_name || "Service",
      description: invoice.notes,
      quantity: 1,
      unit_price: Number(invoice.subtotal ?? invoice.amount ?? 0),
      total_price: Number(invoice.subtotal ?? invoice.amount ?? 0),
    }]).map((it) => {
      const qty = Number(it.quantity ?? 1) || 1;
      const unit = r5(Number(it.unit_price ?? 0));
      const salesTotal = r5(qty * unit);
      const net = r5(salesTotal);
      const vat = r5(net * (vatRate / 100));
      return {
        internalCode: settings.default_item_code || "EG-000000000-0000",
        description: (it.service_name || it.description || settings.default_item_name || "Service").slice(0, 255),
        itemType: settings.default_item_code_type || "EGS",
        itemCode: settings.default_item_code || "EG-000000000-0000",
        unitType: settings.default_unit_type || "EA",
        quantity: qty,
        unitValue: {
          currencySold: currency,
          amountEGP: unit,
        },
        salesTotal,
        total: r5(net + vat),
        valueDifference: 0,
        totalTaxableFees: 0,
        netTotal: net,
        itemsDiscount: 0,
        discount: { rate: 0, amount: 0 },
        taxableItems: [
          {
            taxType: "T1",
            amount: vat,
            subType: settings.default_tax_subtype || "V009",
            rate: vatRate,
          },
        ],
      };
    });

  const totalSalesAmount = r5(lines.reduce((s, l) => s + l.salesTotal, 0));
  const totalDiscount = r5(Number(invoice.discount_amount ?? 0));
  const netAmount = r5(totalSalesAmount - totalDiscount);
  const totalVat = r5(lines.reduce((s, l) => s + l.taxableItems[0].amount, 0));
  const totalAmount = r5(netAmount + totalVat);

  const internalId = (invoice.invoice_number || invoice.id.slice(0, 8)).replace(/[^A-Za-z0-9-]/g, "");

  const document = {
    issuer: {
      address: {
        branchId: settings.branch_id || "0",
        country: settings.branch_country || "EG",
        governate: settings.branch_governate || "Cairo",
        regionCity: settings.branch_city || "Cairo",
        street: settings.branch_street || "N/A",
        buildingNumber: settings.branch_building_number || "1",
        postalCode: settings.branch_postal_code || "",
      },
      type: "B",
      id: settings.taxpayer_tin || "",
      name: settings.taxpayer_name || "",
    },
    receiver: {
      address: {
        country: "EG",
        governate: settings.branch_governate || "Cairo",
        regionCity: settings.branch_city || "Cairo",
        street: settings.branch_street || "N/A",
        buildingNumber: settings.branch_building_number || "1",
      },
      type: "P",
      id: "",
      name: invoice.customer_name || "Customer",
    },
    documentType: "I",
    documentTypeVersion: "1.0",
    dateTimeIssued: etaDateTime(invoice.issue_date),
    taxpayerActivityCode: settings.activity_code || "",
    internalID: internalId,
    purchaseOrderReference: "",
    salesOrderReference: "",
    payment: {},
    delivery: {},
    invoiceLines: lines,
    totalDiscountAmount: totalDiscount,
    totalSalesAmount,
    netAmount,
    taxTotals: [{ taxType: "T1", amount: totalVat }],
    totalAmount,
    extraDiscountAmount: 0,
    totalItemsDiscountAmount: 0,
    signatures: [] as unknown[],
  };

  return { document, internalId };
}