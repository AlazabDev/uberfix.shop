import * as React from "https://esm.sh/react@18.3.1";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Row,
  Column,
  Link,
} from "https://esm.sh/@react-email/components@0.0.22";

interface MaintenanceStatusEmailProps {
  customerName: string
  orderId: string
  trackUrl: string
  currentStatus: string
  statusLabel: string
  statusMessage: string
  buttonText: string
  scheduledDate?: string
  scheduledTime?: string
  stages: Array<{
    key: string
    label: string
    isCompleted: boolean
    isCurrent: boolean
    timestamp?: string
  }>
}

const STAGE_ICONS = {
  received: '📥',
  reviewed: '🔍',
  scheduled: '📅',
  on_the_way: '🚚',
  in_progress: '🔧',
  completed: '✅',
  closed: '🏁',
}

export const MaintenanceStatusEmail = ({
  customerName,
  orderId,
  trackUrl,
  currentStatus,
  statusLabel,
  statusMessage,
  buttonText,
  scheduledDate,
  scheduledTime,
  stages,
}: MaintenanceStatusEmailProps) => (
  <Html dir="rtl" lang="ar">
    <Head>
      <meta charSet="UTF-8" />
    </Head>
    <Preview>{statusLabel} - طلب صيانة #{orderId}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Heading style={logo}>🔧 UberFix</Heading>
        </Section>

        {/* Main Content */}
        <Section style={content}>
          <Heading style={h1}>{statusLabel}</Heading>
          
          <Text style={greeting}>
            مرحباً {customerName}،
          </Text>
          
          <Text style={message}>
            {statusMessage}
          </Text>

          {/* Order Info Card */}
          <Section style={orderCard}>
            <Text style={orderLabel}>رقم الطلب</Text>
            <Text style={orderNumber}>#{orderId}</Text>
          </Section>

          {/* Schedule Info if available */}
          {scheduledDate && scheduledTime && (
            <Section style={scheduleCard}>
              <Row>
                <Column style={scheduleItem}>
                  <Text style={scheduleLabel}>📅 التاريخ</Text>
                  <Text style={scheduleValue}>{scheduledDate}</Text>
                </Column>
                <Column style={scheduleItem}>
                  <Text style={scheduleLabel}>⏰ الوقت</Text>
                  <Text style={scheduleValue}>{scheduledTime}</Text>
                </Column>
              </Row>
            </Section>
          )}

          {/* Timeline Progress */}
          <Section style={timelineSection}>
            <Text style={timelineTitle}>تتبع حالة الطلب</Text>
            
            {stages.map((stage, index) => (
              <Section key={stage.key} style={timelineItem}>
                <Row>
                  <Column style={timelineIconCol}>
                    <Text style={stage.isCompleted ? iconCompleted : stage.isCurrent ? iconCurrent : iconPending}>
                      {STAGE_ICONS[stage.key as keyof typeof STAGE_ICONS] || '⚪'}
                    </Text>
                    {index < stages.length - 1 && (
                      <Text style={stage.isCompleted ? lineCompleted : linePending}>│</Text>
                    )}
                  </Column>
                  <Column style={timelineContent}>
                    <Text style={stage.isCompleted ? stageLabelCompleted : stage.isCurrent ? stageLabelCurrent : stageLabelPending}>
                      {stage.label}
                    </Text>
                    {stage.timestamp && (
                      <Text style={stageTimestamp}>{stage.timestamp}</Text>
                    )}
                  </Column>
                </Row>
              </Section>
            ))}
          </Section>

          {/* CTA Button (Link styled as button to avoid Slot child render error) */}
          <Section style={buttonSection}>
            <Link href={trackUrl} style={button}>
              {buttonText}
            </Link>
          </Section>
        </Section>

        <Hr style={hr} />

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            شكراً لثقتك في UberFix
          </Text>
          <Text style={footerSubtext}>
            للاستفسارات: support@uberfix.shop
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MaintenanceStatusEmail

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif",
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
}

const header = {
  backgroundColor: '#1a1a2e',
  padding: '24px',
  textAlign: 'center' as const,
}

const logo = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
}

const content = {
  padding: '32px 24px',
}

const h1 = {
  color: '#1a1a2e',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '0 0 24px 0',
}

const greeting = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 8px 0',
  textAlign: 'right' as const,
}

const message = {
  color: '#555',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 24px 0',
  textAlign: 'right' as const,
}

const orderCard = {
  backgroundColor: '#f0f4f8',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
  marginBottom: '16px',
}

const orderLabel = {
  color: '#666',
  fontSize: '12px',
  margin: '0 0 4px 0',
  textTransform: 'uppercase' as const,
}

const orderNumber = {
  color: '#1a1a2e',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
}

const scheduleCard = {
  backgroundColor: '#e8f5e9',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '24px',
}

const scheduleItem = {
  textAlign: 'center' as const,
  width: '50%',
}

const scheduleLabel = {
  color: '#666',
  fontSize: '12px',
  margin: '0 0 4px 0',
}

const scheduleValue = {
  color: '#2e7d32',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0',
}

const timelineSection = {
  backgroundColor: '#fafafa',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '24px',
}

const timelineTitle = {
  color: '#1a1a2e',
  fontSize: '16px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '0 0 20px 0',
}

const timelineItem = {
  marginBottom: '0',
}

const timelineIconCol = {
  width: '40px',
  verticalAlign: 'top' as const,
  textAlign: 'center' as const,
}

const iconCompleted = {
  fontSize: '20px',
  margin: '0',
  opacity: 1,
}

const iconCurrent = {
  fontSize: '24px',
  margin: '0',
  opacity: 1,
}

const iconPending = {
  fontSize: '20px',
  margin: '0',
  opacity: 0.4,
}

const lineCompleted = {
  color: '#4caf50',
  fontSize: '16px',
  lineHeight: '12px',
  margin: '0',
}

const linePending = {
  color: '#ddd',
  fontSize: '16px',
  lineHeight: '12px',
  margin: '0',
}

const timelineContent = {
  paddingRight: '12px',
  paddingBottom: '16px',
}

const stageLabelCompleted = {
  color: '#4caf50',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
  textDecoration: 'line-through' as const,
}

const stageLabelCurrent = {
  color: '#1a1a2e',
  fontSize: '15px',
  fontWeight: 'bold',
  margin: '0',
}

const stageLabelPending = {
  color: '#999',
  fontSize: '14px',
  margin: '0',
}

const stageTimestamp = {
  color: '#888',
  fontSize: '11px',
  margin: '2px 0 0 0',
}

const buttonSection = {
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: '#1a1a2e',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
}

const hr = {
  borderColor: '#eee',
  margin: '0',
}

const footer = {
  backgroundColor: '#f9f9f9',
  padding: '24px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#666',
  fontSize: '14px',
  margin: '0 0 4px 0',
}

const footerSubtext = {
  color: '#999',
  fontSize: '12px',
  margin: '0',
}
