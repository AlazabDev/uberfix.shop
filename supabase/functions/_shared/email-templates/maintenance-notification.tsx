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
} from 'https://esm.sh/@react-email/components@0.0.22';
import * as React from 'https://esm.sh/react@18.3.1';

interface MaintenanceNotificationProps {
  requestNumber: string;
  notificationType: string;
  customerName?: string;
  technicianName?: string;
  location?: string;
  description?: string;
  dueDate?: string;
  message?: string;
}

export const MaintenanceNotification = ({
  requestNumber,
  notificationType,
  customerName,
  technicianName,
  location,
  description,
  dueDate,
  message,
}: MaintenanceNotificationProps) => {
  const titles: Record<string, string> = {
    new_request: 'طلب صيانة جديد',
    accepted: 'تم قبول الطلب',
    technician_assigned: 'تم تعيين فني',
    on_the_way: 'الفني في الطريق',
    arrived: 'وصل الفني',
    completed: 'تم إكمال الصيانة',
    sla_warning: 'تحذير: اقتراب موعد الإنجاز',
  };

  return (
    <Html lang="ar" dir="rtl">
      <Head />
      <Preview>{titles[notificationType] || 'إشعار صيانة'}</Preview>
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
            <Heading style={h1}>{titles[notificationType] || 'إشعار صيانة'}</Heading>
            <Text style={text}>
              رقم الطلب: <strong style={highlight}>#{requestNumber}</strong>
            </Text>
            {customerName && (
              <Text style={text}>العميل: {customerName}</Text>
            )}
            {technicianName && (
              <Text style={text}>الفني: {technicianName}</Text>
            )}
            {location && (
              <Text style={text}>الموقع: {location}</Text>
            )}
            {description && (
              <Section style={descriptionBox}>
                <Text style={descriptionText}>{description}</Text>
              </Section>
            )}
            {dueDate && (
              <Text style={text}>
                الموعد المتوقع: <span style={dateText}>{dueDate}</span>
              </Text>
            )}
            {message && (
              <Text style={messageText}>{message}</Text>
            )}
          </Section>
          <Section style={footer}>
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

export default MaintenanceNotification;

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
  fontSize: '22px',
  fontWeight: '700',
  margin: '0 0 20px',
  textAlign: 'right' as const,
};

const text = {
  color: '#111',
  fontSize: '16px',
  lineHeight: '1.8',
  margin: '0 0 14px',
  textAlign: 'right' as const,
};

const highlight = {
  color: '#030957',
  fontWeight: '800',
  background: '#FFF6D6',
  padding: '2px 6px',
  borderRadius: '4px',
};

const descriptionBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '10px',
  padding: '16px',
  margin: '16px 0',
  border: '1px solid #e5e7eb',
};

const descriptionText = {
  color: '#111',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0',
  textAlign: 'right' as const,
};

const dateText = {
  color: '#030957',
  fontWeight: '600',
  direction: 'ltr' as const,
  display: 'inline-block',
};

const messageText = {
  color: '#111',
  fontSize: '16px',
  lineHeight: '1.8',
  margin: '20px 0 0',
  padding: '16px',
  backgroundColor: '#FFF6D6',
  borderRight: '4px solid #FFB900',
  borderRadius: '8px',
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
  margin: '4px 0',
};

const footerLink = {
  color: '#030957',
  textDecoration: 'none',
  fontWeight: 700,
};
