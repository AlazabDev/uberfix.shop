import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConsumersPanel } from '@/components/api-gateway/ConsumersPanel';
import { WebhooksPanel } from '@/components/api-gateway/WebhooksPanel';
import { GatewayLogsPanel } from '@/components/api-gateway/GatewayLogsPanel';
import { IntegrationDocsPanel } from '@/components/api-gateway/IntegrationDocsPanel';
import { Network, KeyRound, Webhook, ScrollText, BookOpen } from 'lucide-react';

export default function ApiGatewayPortal() {
  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <header className="flex items-center gap-3 border-b pb-4">
        <div className="bg-primary/10 p-3 rounded-lg">
          <Network className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">بوابة المطورين — UberFix API Gateway</h1>
          <p className="text-sm text-muted-foreground">
            إدارة الشركاء، مفاتيح API، OAuth2، Webhooks، والتوجيه السحابي للتخزين.
          </p>
        </div>
      </header>

      <Tabs defaultValue="consumers" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="consumers" className="gap-2">
            <KeyRound className="h-4 w-4" />المستهلكون
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="h-4 w-4" />Webhooks
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <ScrollText className="h-4 w-4" />السجل
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-2">
            <BookOpen className="h-4 w-4" />الدليل
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consumers" className="mt-4">
          <ConsumersPanel />
        </TabsContent>
        <TabsContent value="webhooks" className="mt-4">
          <WebhooksPanel />
        </TabsContent>
        <TabsContent value="logs" className="mt-4">
          <GatewayLogsPanel />
        </TabsContent>
        <TabsContent value="docs" className="mt-4">
          <IntegrationDocsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}