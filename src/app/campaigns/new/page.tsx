'use client';

import { BriefForm } from '@/components/brief-form/BriefForm';
import { JsonTextarea } from '@/components/json-editor/JsonTextarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function NewCampaignPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Create New Campaign</h1>

      <Tabs defaultValue="form">
        <TabsList>
          <TabsTrigger value="form">Form Builder</TabsTrigger>
          <TabsTrigger value="json">Raw JSON</TabsTrigger>
        </TabsList>
        <TabsContent value="form">
          <Card>
            <CardContent className="pt-6">
              <BriefForm />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="json">
          <Card>
            <CardContent className="pt-6">
              <JsonTextarea />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
