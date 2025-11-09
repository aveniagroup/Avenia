import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { auditLog } from "@/utils/auditLogger";

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "manager", "support", "agent"]),
});

type InviteFormData = z.infer<typeof inviteSchema>;

export function InviteTeamMemberDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "agent",
    },
  });

  const onSubmit = async (data: InviteFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) throw new Error("No organization found");

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const { error } = await supabase.from("team_invitations").insert({
        email: data.email,
        role: data.role as any,
        organization_id: profile.organization_id,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      } as any);

      if (error) throw error;

      // Log audit event
      auditLog.userInvited(data.email, data.role);

      toast({
        title: t("team.invitationSent"),
        description: `${t("team.invitationSentTo")} ${data.email}`,
      });

      setOpen(false);
      form.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 w-full sm:w-auto">
          <UserPlus className="h-4 w-4" />
          <span className="whitespace-nowrap">{t("team.inviteTeamMember")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("team.inviteTeamMember")}</DialogTitle>
          <DialogDescription>
            {t("team.inviteDescription")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("team.emailAddress")}</FormLabel>
                  <FormControl>
                    <Input placeholder="colleague@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("team.role")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("team.selectRole")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="agent">{t("team.agent")}</SelectItem>
                      <SelectItem value="support">{t("team.support")}</SelectItem>
                      <SelectItem value="manager">{t("team.manager")}</SelectItem>
                      <SelectItem value="admin">{t("team.admin")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit">{t("team.sendInvitation")}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
