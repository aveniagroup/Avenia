import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { request_id, action } = await req.json();

    console.log(`Processing DSR: ${request_id}, Action: ${action}`);

    // Get the DSR details
    const { data: dsr, error: dsrError } = await supabase
      .from('data_subject_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (dsrError || !dsr) {
      throw new Error('DSR not found');
    }

    // Update status to processing
    await supabase
      .from('data_subject_requests')
      .update({ status: 'processing' })
      .eq('id', request_id);

    let result = {};

    if (action === 'export') {
      // Export user data
      const exportData = await exportUserData(supabase, dsr.organization_id, dsr.requester_email);
      
      result = {
        success: true,
        data: exportData,
        record_count: Object.values(exportData).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
      };

      // Update DSR with completion
      await supabase
        .from('data_subject_requests')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          export_file_path: JSON.stringify(exportData)
        })
        .eq('id', request_id);

    } else if (action === 'delete') {
      // Delete user data
      const deletionResult = await deleteUserData(supabase, dsr.organization_id, dsr.requester_email);
      
      result = deletionResult;

      // Update DSR with completion
      await supabase
        .from('data_subject_requests')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          notes: `Deleted ${deletionResult.deleted_count} records`
        })
        .eq('id', request_id);
    }

    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        organization_id: dsr.organization_id,
        action: `dsr_${action}_completed`,
        resource_type: 'data_subject_request',
        resource_id: request_id,
        details: { requester_email: dsr.requester_email, result },
        severity: 'info'
      });

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing DSR:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function exportUserData(supabase: any, organizationId: string, email: string) {
  const exportData: any = {
    request_timestamp: new Date().toISOString(),
    email: email
  };

  // Export tickets where user is customer
  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('customer_email', email);
  exportData.tickets = tickets || [];

  // Export ticket messages
  const { data: messages } = await supabase
    .from('ticket_messages')
    .select('*')
    .eq('sender_email', email);
  exportData.messages = messages || [];

  // Export consent records
  const { data: consents } = await supabase
    .from('consent_records')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('customer_email', email);
  exportData.consents = consents || [];

  // Export audit logs related to this user
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('user_email', email);
  exportData.audit_logs = auditLogs || [];

  return exportData;
}

async function deleteUserData(supabase: any, organizationId: string, email: string) {
  let deletedCount = 0;

  // Delete ticket messages
  const { error: messagesError } = await supabase
    .from('ticket_messages')
    .delete()
    .eq('sender_email', email);
  if (!messagesError) deletedCount++;

  // Anonymize tickets (don't delete to preserve audit trail)
  const { error: ticketsError } = await supabase
    .from('tickets')
    .update({
      customer_email: '[REDACTED]',
      customer_name: '[REDACTED]',
      customer_phone: '[REDACTED]',
      description: '[DATA DELETED PER DSR]'
    })
    .eq('organization_id', organizationId)
    .eq('customer_email', email);
  if (!ticketsError) deletedCount++;

  // Delete consent records
  const { error: consentsError } = await supabase
    .from('consent_records')
    .delete()
    .eq('organization_id', organizationId)
    .eq('customer_email', email);
  if (!consentsError) deletedCount++;

  return {
    success: true,
    deleted_count: deletedCount,
    anonymized: ['tickets']
  };
}
