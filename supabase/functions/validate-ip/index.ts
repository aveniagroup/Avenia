import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !userData.user) {
      throw new Error("Unauthorized");
    }

    // Get client IP from various headers
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Get user's organization
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("organization_id")
      .eq("id", userData.user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(
        JSON.stringify({ allowed: true, message: "No organization found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check IP whitelist
    const { data: isAllowed } = await supabaseClient.rpc("is_ip_allowed", {
      _organization_id: profile.organization_id,
      _ip_address: clientIp,
    });

    if (!isAllowed) {
      // Log the blocked attempt
      await supabaseClient.rpc("log_audit_event", {
        _organization_id: profile.organization_id,
        _user_id: userData.user.id,
        _action: "ip_blocked",
        _resource_type: "authentication",
        _details: { ip_address: clientIp },
        _severity: "warning",
      });

      return new Response(
        JSON.stringify({ 
          allowed: false, 
          message: "Access denied: IP address not whitelisted",
          ip: clientIp 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    return new Response(
      JSON.stringify({ allowed: true, ip: clientIp }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
