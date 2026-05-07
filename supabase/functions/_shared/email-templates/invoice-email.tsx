import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from 'https://esm.sh/@react-email/components@0.0.22';
import * as React from 'https://esm.sh/react@18.3.1';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceEmailProps {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax?: number;
  total: number;
  notes?: string;
}

export const InvoiceEmail = ({
  invoiceNumber,
  invoiceDate,
  customerName,
  customerAddress,
  items,
  subtotal,
  tax,
  total,
  notes,
}: InvoiceEmailProps) => {
  return (
    <Html lang="ar" dir="rtl">
      <Head />
      <Preview>فاتورة #{invoiceNumber} - UberFix</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src="https://uberfix.shop/branding/uberfix-banner.jpg"
              width="600"
              height="220"
              alt="UberFix"
              style={logo}
            />
          </Section>
          <Section style={content}>
            <Heading style={h1}>فاتورة ضريبية</Heading>
            <Section style={invoiceHeader}>
              <Text style={invoiceInfo}>
                <strong>رقم الفاتورة:</strong> #{invoiceNumber}
              </Text>
              <Text style={invoiceInfo}>
                <strong>التاريخ:</strong> {invoiceDate}
              </Text>
            </Section>
            <Section style={customerBox}>
              <Heading style={h2}>بيانات العميل</Heading>
              <Text style={customerText}>
                <strong>{customerName}</strong>
              </Text>
              {customerAddress && (
                <Text style={customerText}>{customerAddress}</Text>
              )}
            </Section>
            <Section style={tableSection}>
              <table style={table}>
                <thead>
                  <tr style={tableHeaderRow}>
                    <th style={tableHeader}>الإجمالي</th>
                    <th style={tableHeader}>سعر الوحدة</th>
                    <th style={tableHeader}>الكمية</th>
                    <th style={tableHeader}>الوصف</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} style={tableRow}>
                      <td style={tableCell}>{item.total.toFixed(2)} ج.م</td>
                      <td style={tableCell}>{item.unit_price.toFixed(2)} ج.م</td>
                      <td style={tableCell}>{item.quantity}</td>
                      <td style={tableCell}>{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
            <Section style={totalsSection}>
              <table style={totalsTable}>
                <tbody>
                  <tr>
                    <td style={totalLabel}>المجموع الفرعي:</td>
                    <td style={totalValue}>{subtotal.toFixed(2)} ج.م</td>
                  </tr>
                  {tax && tax > 0 && (
                    <tr>
                      <td style={totalLabel}>ضريبة القيمة المضافة (14%):</td>
                      <td style={totalValue}>{tax.toFixed(2)} ج.م</td>
                    </tr>
                  )}
                  <tr>
                    <td style={grandTotalLabel}>الإجمالي:</td>
                    <td style={grandTotalValue}>{total.toFixed(2)} ج.م</td>
                  </tr>
                </tbody>
              </table>
            </Section>
            {notes && (
              <Section style={notesSection}>
                <Heading style={h3}>ملاحظات</Heading>
                <Text style={notesText}>{notes}</Text>
              </Section>
            )}
          </Section>
          <Section style={footer}>
            <Text style={footerText}>شكراً لتعاملكم معنا</Text>
            <Hr style={hr} />
            <Text style={footerText}>
              © 2025 UberFix — خدمة الصيانة الاحترافية
            </Text>
            <Text style={footerText}>
              <Link href="https://uberfix.app" style={footerLink}>
                الموقع الإلكتروني
              </Link>
              {' | '}
              <Link href="https://uberfix.app/policy.html" style={footerLink}>
                سياسة الخصوصية
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default InvoiceEmail;

const main = {
  backgroundColor: '#f2f4f6',
  fontFamily: 'Tahoma, Arial, "Segoe UI", sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '24px 0',
  maxWidth: '600px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 6px 24px rgba(0,0,0,0.06)',
};

const header = {
  backgroundColor: '#030957',
  padding: '0',
  textAlign: 'center' as const,
  borderBottom: '4px solid #FFB900',
};

const logo = {
  display: 'block',
  width: '100%',
  height: 'auto',
  maxWidth: '600px',
};

const content = {
  padding: '32px',
};

const h1 = {
  color: '#111',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 24px',
  textAlign: 'right' as const,
};

const h2 = {
  color: '#111',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0 0 12px',
  textAlign: 'right' as const,
};

const h3 = {
  color: '#111',
  fontSize: '16px',
  fontWeight: '700',
  margin: '0 0 8px',
  textAlign: 'right' as const,
};

const invoiceHeader = {
  marginBottom: '24px',
};

const invoiceInfo = {
  color: '#111',
  fontSize: '15px',
  margin: '4px 0',
  textAlign: 'right' as const,
};

const customerBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '10px',
  padding: '16px',
  marginBottom: '24px',
  border: '1px solid #e5e7eb',
};

const customerText = {
  color: '#111',
  fontSize: '15px',
  margin: '4px 0',
  textAlign: 'right' as const,
};

const tableSection = {
  marginBottom: '24px',
};

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const tableHeaderRow = {
  backgroundColor: '#FFB900',
};

const tableHeader = {
  color: '#030957',
  fontSize: '14px',
  fontWeight: '800',
  padding: '12px 8px',
  textAlign: 'right' as const,
  borderBottom: '2px solid #030957',
};

const tableRow = {
  borderBottom: '1px solid #e5e7eb',
};

const tableCell = {
  color: '#111',
  fontSize: '14px',
  padding: '12px 8px',
  textAlign: 'right' as const,
};

const totalsSection = {
  marginTop: '24px',
  borderTop: '2px solid #e5e7eb',
  paddingTop: '16px',
};

const totalsTable = {
  width: '100%',
  marginLeft: 'auto',
};

const totalLabel = {
  color: '#111',
  fontSize: '15px',
  padding: '8px 16px',
  textAlign: 'right' as const,
  fontWeight: '600',
};

const totalValue = {
  color: '#111',
  fontSize: '15px',
  padding: '8px 16px',
  textAlign: 'left' as const,
  fontWeight: '600',
  direction: 'ltr' as const,
};

const grandTotalLabel = {
  color: '#111',
  fontSize: '18px',
  padding: '12px 16px',
  textAlign: 'right' as const,
  fontWeight: '700',
  backgroundColor: '#FFF6D6',
};

const grandTotalValue = {
  color: '#030957',
  fontSize: '18px',
  padding: '12px 16px',
  textAlign: 'left' as const,
  fontWeight: '800',
  backgroundColor: '#FFF6D6',
  direction: 'ltr' as const,
};

const notesSection = {
  marginTop: '24px',
  padding: '16px',
  backgroundColor: '#f9fafb',
  borderRadius: '10px',
  borderRight: '4px solid #FFB900',
};

const notesText = {
  color: '#111',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
  textAlign: 'right' as const,
};

const footer = {
  padding: '20px 24px',
  textAlign: 'center' as const,
  borderTop: '1px solid #e5e7eb',
};

const footerText = {
  color: '#666',
  fontSize: '12px',
  margin: '8px 0',
};

const footerLink = {
  color: '#030957',
  textDecoration: 'none',
  fontWeight: 700,
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '12px 0',
};
