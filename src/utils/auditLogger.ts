import { supabase } from "@/integrations/supabase/client";

export interface AuditLogParams {
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  severity?: "info" | "warning" | "critical";
}

export async function logAuditEvent(params: AuditLogParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) return;

    await supabase.rpc("log_audit_event", {
      _organization_id: profile.organization_id,
      _user_id: user.id,
      _action: params.action,
      _resource_type: params.resourceType,
      _resource_id: params.resourceId || null,
      _details: params.details || {},
      _severity: params.severity || "info",
    });
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
}

// Specific audit logging functions
export const auditLog = {
  ticketCreated: (ticketId: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: "ticket_created",
      resourceType: "ticket",
      resourceId: ticketId,
      details,
      severity: "info",
    }),

  ticketUpdated: (ticketId: string, changes: Record<string, any>) =>
    logAuditEvent({
      action: "ticket_updated",
      resourceType: "ticket",
      resourceId: ticketId,
      details: { changes },
      severity: "info",
    }),

  ticketDeleted: (ticketId: string) =>
    logAuditEvent({
      action: "ticket_deleted",
      resourceType: "ticket",
      resourceId: ticketId,
      severity: "warning",
    }),

  userInvited: (email: string, role: string) =>
    logAuditEvent({
      action: "user_invited",
      resourceType: "team",
      details: { email, role },
      severity: "info",
    }),

  userRemoved: (userId: string, email: string) =>
    logAuditEvent({
      action: "user_removed",
      resourceType: "team",
      resourceId: userId,
      details: { email },
      severity: "warning",
    }),

  roleChanged: (userId: string, oldRole: string, newRole: string) =>
    logAuditEvent({
      action: "role_changed",
      resourceType: "team",
      resourceId: userId,
      details: { oldRole, newRole },
      severity: "warning",
    }),

  settingsUpdated: (settingType: string, changes: Record<string, any>) =>
    logAuditEvent({
      action: "settings_updated",
      resourceType: "settings",
      details: { settingType, changes },
      severity: "info",
    }),

  securityEvent: (event: string, details?: Record<string, any>) =>
    logAuditEvent({
      action: event,
      resourceType: "security",
      details,
      severity: "critical",
    }),

  loginAttempt: (success: boolean, details?: Record<string, any>) =>
    logAuditEvent({
      action: success ? "login_success" : "login_failed",
      resourceType: "authentication",
      details,
      severity: success ? "info" : "warning",
    }),
};
