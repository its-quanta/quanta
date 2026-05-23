"use client";

import { CreateOrganisationForm } from "@/components/onboarding/create-organisation-form";
import { JoinOrganisationForm } from "@/components/onboarding/join-organisation-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type OnboardingPanelProps = {
  defaultFullName?: string | null;
  defaultEmail?: string | null;
};

export function OnboardingPanel({
  defaultFullName,
  defaultEmail,
}: OnboardingPanelProps) {
  return (
    <Tabs defaultValue="create" className="w-full gap-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="create">Create organisation</TabsTrigger>
        <TabsTrigger value="join">Join organisation</TabsTrigger>
      </TabsList>

      <TabsContent value="create">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create new organisation</CardTitle>
            <CardDescription>
              Set up a workspace for your company. You will be assigned the owner
              role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateOrganisationForm defaultFullName={defaultFullName} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="join">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Join existing organisation</CardTitle>
            <CardDescription>
              Enter an invite token to join a team
              {defaultEmail ? ` as ${defaultEmail}` : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <JoinOrganisationForm defaultFullName={defaultFullName} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
