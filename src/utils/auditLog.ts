import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "PASSWORD_CHANGE"
  | "EXPORT"
  | "IMPORT";

export type EntityType =
  | "transaction"
  | "client"
  | "user"
  | "float_deposit"
  | "promotion"
  | "report"
  | "settings";

interface AuditLogParams {
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

/**
 * Logs an audit trail entry
 */
export async function logAudit({
  action,
  entityType,
  entityId,
  oldValues,
  newValues,
}: AuditLogParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn("No user found for audit log");
      return;
    }

    const { error } = await supabase.rpc("log_audit" as any, {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId || null,
      p_old_values: oldValues || null,
      p_new_values: newValues || null,
    });

    if (error) {
      console.error("Failed to log audit:", error);
    }
  } catch (error) {
    console.error("Error logging audit:", error);
  }
}

/**
 * Helper function to log transaction creation
 */
export async function logTransactionCreate(transactionId: string, data: Record<string, any>) {
  await logAudit({
    action: "CREATE",
    entityType: "transaction",
    entityId: transactionId,
    newValues: data,
  });
}

/**
 * Helper function to log transaction update
 */
export async function logTransactionUpdate(
  transactionId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>
) {
  await logAudit({
    action: "UPDATE",
    entityType: "transaction",
    entityId: transactionId,
    oldValues: oldData,
    newValues: newData,
  });
}

/**
 * Helper function to log transaction deletion
 */
export async function logTransactionDelete(transactionId: string, data: Record<string, any>) {
  await logAudit({
    action: "DELETE",
    entityType: "transaction",
    entityId: transactionId,
    oldValues: data,
  });
}

/**
 * Helper function to log client creation
 */
export async function logClientCreate(clientId: string, data: Record<string, any>) {
  await logAudit({
    action: "CREATE",
    entityType: "client",
    entityId: clientId,
    newValues: data,
  });
}

/**
 * Helper function to log client update
 */
export async function logClientUpdate(
  clientId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>
) {
  await logAudit({
    action: "UPDATE",
    entityType: "client",
    entityId: clientId,
    oldValues: oldData,
    newValues: newData,
  });
}

/**
 * Helper function to log client deletion
 */
export async function logClientDelete(clientId: string, data: Record<string, any>) {
  await logAudit({
    action: "DELETE",
    entityType: "client",
    entityId: clientId,
    oldValues: data,
  });
}

/**
 * Helper function to log user actions
 */
export async function logUserAction(action: AuditAction, userId?: string, data?: Record<string, any>) {
  await logAudit({
    action,
    entityType: "user",
    entityId: userId,
    newValues: data,
  });
}

/**
 * Helper function to log report exports
 */
export async function logReportExport(reportType: string, format: string) {
  await logAudit({
    action: "EXPORT",
    entityType: "report",
    newValues: { reportType, format },
  });
}
