import { supabase } from "@/integrations/supabase/client";

export async function triggerPIIDetectionForTicket(ticketId: string, ticketData: any) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .single();

    if (!profile?.organization_id) {
      console.error("No organization found");
      return;
    }

    const fullText = `${ticketData.title}\n${ticketData.description || ''}\n${ticketData.customer_email}\n${ticketData.customer_phone || ''}`;

    const { data, error } = await supabase.functions.invoke("detect-sensitive-data", {
      body: {
        ticket_id: ticketId,
        text: fullText,
        organization_id: profile.organization_id,
      },
    });

    if (error) {
      console.error("Error detecting PII:", error);
      return null;
    }

    console.log("PII Detection completed for ticket", ticketId, data);
    return data;
  } catch (error) {
    console.error("Error in PII detection:", error);
    return null;
  }
}

export async function scanAllTicketsForPII() {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .single();

    if (!profile?.organization_id) {
      console.error("No organization found");
      return;
    }

    const { data: tickets, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("organization_id", profile.organization_id);

    if (error) {
      console.error("Error fetching tickets:", error);
      return;
    }

    console.log(`Scanning ${tickets?.length || 0} tickets for PII...`);

    for (const ticket of tickets || []) {
      await triggerPIIDetectionForTicket(ticket.id, ticket);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log("PII scan completed for all tickets");
  } catch (error) {
    console.error("Error scanning tickets:", error);
  }
}