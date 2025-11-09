import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PII Detection patterns
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  phone: /(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
  credit_card: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  ip_address: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  postal_code: /\b\d{5}(?:-\d{4})?\b/g,
};

const SENSITIVE_KEYWORDS = {
  medical: ['diagnosis', 'prescription', 'medication', 'symptom', 'treatment', 'patient', 'doctor', 'hospital', 'medical history'],
  financial: ['bank account', 'routing number', 'credit card', 'debit card', 'payment', 'invoice', 'balance', 'transaction'],
  personal: ['date of birth', 'dob', 'birthdate', 'passport', 'driver license', 'social security', 'address'],
  auth: ['password', 'pin', 'passcode', 'secret', 'api key', 'token', 'credentials'],
};

function detectPII(text: string): { piiTypes: string[], detectedPatterns: any, gdprRelevant: boolean } {
  const piiTypes: Set<string> = new Set();
  const detectedPatterns: any = {};

  // Check regex patterns
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      piiTypes.add(type);
      detectedPatterns[type] = {
        count: matches.length,
        examples: matches.slice(0, 2).map(m => m.substring(0, 20) + '...')
      };
    }
  }

  // Check sensitive keywords
  const lowerText = text.toLowerCase();
  for (const [category, keywords] of Object.entries(SENSITIVE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        piiTypes.add(category);
        if (!detectedPatterns[category]) {
          detectedPatterns[category] = { count: 0, keywords: [] };
        }
        detectedPatterns[category].keywords = detectedPatterns[category].keywords || [];
        detectedPatterns[category].keywords.push(keyword);
      }
    }
  }

  // GDPR Article 9 special categories
  const gdprSensitiveCategories = ['medical', 'financial'];
  const gdprRelevant = Array.from(piiTypes).some(type => gdprSensitiveCategories.includes(type));

  return {
    piiTypes: Array.from(piiTypes),
    detectedPatterns,
    gdprRelevant
  };
}

function calculateSensitivityLevel(piiTypes: string[], gdprRelevant: boolean): string {
  if (piiTypes.length === 0) return 'low';
  
  const highRiskTypes = ['credit_card', 'ssn', 'medical', 'auth'];
  const hasHighRisk = piiTypes.some(type => highRiskTypes.includes(type));
  
  if (hasHighRisk || gdprRelevant) return 'critical';
  if (piiTypes.length >= 3) return 'high';
  if (piiTypes.length >= 2) return 'medium';
  return 'low';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticket_id, text, organization_id } = await req.json();

    if (!ticket_id || !text) {
      return new Response(
        JSON.stringify({ error: 'ticket_id and text are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if PII detection is enabled
    if (organization_id) {
      const { data: settings } = await supabase
        .from('organization_settings')
        .select('ai_pii_detection_enabled')
        .eq('organization_id', organization_id)
        .single();

      if (settings && !settings.ai_pii_detection_enabled) {
        return new Response(
          JSON.stringify({ 
            containsPII: false, 
            piiTypes: [], 
            sensitivityLevel: 'low',
            gdprRelevant: false,
            message: 'PII detection is disabled'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Detect PII
    const { piiTypes, detectedPatterns, gdprRelevant } = detectPII(text);
    const containsPII = piiTypes.length > 0;
    const sensitivityLevel = calculateSensitivityLevel(piiTypes, gdprRelevant);

    // Store classification
    const { data: existing } = await supabase
      .from('ticket_data_classification')
      .select('id')
      .eq('ticket_id', ticket_id)
      .single();

    const classificationData = {
      ticket_id,
      contains_pii: containsPII,
      pii_types: piiTypes,
      sensitivity_level: sensitivityLevel,
      gdpr_relevant: gdprRelevant,
      last_analyzed_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase
        .from('ticket_data_classification')
        .update(classificationData)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('ticket_data_classification')
        .insert(classificationData);
    }

    console.log(`PII Detection - Ticket ${ticket_id}: ${containsPII ? 'PII detected' : 'No PII'}, Level: ${sensitivityLevel}`);

    return new Response(
      JSON.stringify({
        containsPII,
        piiTypes,
        sensitivityLevel,
        gdprRelevant,
        detectedPatterns,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in detect-sensitive-data:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});