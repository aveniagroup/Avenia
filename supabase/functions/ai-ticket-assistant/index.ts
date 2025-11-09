import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ticket, messages, organization_id, targetLanguage, prompt: userPrompt } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check if AI is enabled for this organization
    const { data: settings, error: settingsError } = await supabase
      .from('organization_settings')
      .select('ai_enabled, ai_auto_suggest_responses, ai_sentiment_analysis, ai_priority_suggestions, ai_translation_enabled, ai_knowledge_base_enabled, ai_summarization_enabled, ai_template_suggestions_enabled, ai_auto_anonymize, ai_pii_detection_enabled, ai_provider, ai_custom_endpoint, ai_custom_model')
      .eq('organization_id', organization_id)
      .single();
    
    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch AI settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!settings?.ai_enabled) {
      return new Response(
        JSON.stringify({ error: 'AI features are disabled for this organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Determine AI provider configuration
    const aiProvider = settings.ai_provider || 'integrated';
    let apiKey = '';
    let endpoint = 'https://ai.gateway.lovable.dev/v1/chat/completions';
    let model = 'google/gemini-2.5-flash';
    let useAnthropicFormat = false;
    
    if (aiProvider === 'integrated') {
      // Using integrated AI gateway
      apiKey = Deno.env.get('LOVABLE_API_KEY') || '';
      if (!apiKey) {
        console.error('AI gateway API key not found');
        return new Response(
          JSON.stringify({ error: 'AI service not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Fetch custom API credentials
      const { data: credentials, error: credError } = await supabase
        .from('organization_ai_credentials')
        .select('api_key_encrypted')
        .eq('organization_id', organization_id)
        .eq('provider', aiProvider)
        .single();
      
      if (credError || !credentials?.api_key_encrypted) {
        console.error('API credentials not found for provider:', aiProvider);
        return new Response(
          JSON.stringify({ error: 'AI credentials not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      apiKey = credentials.api_key_encrypted;
      
      // Set endpoint and model based on provider
      switch (aiProvider) {
        case 'openai':
          endpoint = 'https://api.openai.com/v1/chat/completions';
          model = settings.ai_custom_model || 'gpt-4o-mini';
          break;
        case 'anthropic':
          endpoint = 'https://api.anthropic.com/v1/messages';
          model = settings.ai_custom_model || 'claude-3-5-sonnet-20241022';
          useAnthropicFormat = true;
          break;
        case 'custom':
          endpoint = settings.ai_custom_endpoint || endpoint;
          model = settings.ai_custom_model || model;
          break;
      }
    }
    
    // Helper function to call AI with appropriate format
    const callAI = async (messages: any[], temperature = 0.7) => {
      if (useAnthropicFormat) {
        // Anthropic format
        const systemMessage = messages.find((m: any) => m.role === 'system');
        const userMessages = messages.filter((m: any) => m.role !== 'system');
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            max_tokens: 4096,
            system: systemMessage?.content || '',
            messages: userMessages,
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('AI API error:', response.status, errorText);
          throw new Error(`AI service error: ${response.status}`);
        }
        
        const data = await response.json();
        return {
          choices: [{
            message: {
              content: data.content?.[0]?.text || ''
            }
          }]
        };
      } else {
        // OpenAI-compatible format
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('AI API error:', response.status, errorText);
          
          if (response.status === 429) {
            throw new Error('RATE_LIMIT');
          }
          if (response.status === 402) {
            throw new Error('PAYMENT_REQUIRED');
          }
          
          throw new Error(`AI service error: ${response.status}`);
        }
        
        return await response.json();
      }
    }
    
    // Helper function to anonymize data
    const PII_REPLACEMENTS: Record<string, string> = {
      'email': '[EMAIL REDACTED]',
      'phone': '[PHONE REDACTED]',
      'ssn': '[SSN REDACTED]',
      'credit_card': '[CREDIT CARD REDACTED]',
      'name': '[NAME REDACTED]',
      'address': '[ADDRESS REDACTED]',
      'ip_address': '[IP ADDRESS REDACTED]',
      'date_of_birth': '[DOB REDACTED]',
      'passport': '[PASSPORT REDACTED]',
      'driver_license': '[LICENSE REDACTED]',
      'bank_account': '[ACCOUNT REDACTED]',
      'medical': '[MEDICAL INFO REDACTED]',
      'financial': '[FINANCIAL INFO REDACTED]',
      'personal': '[PERSONAL INFO REDACTED]',
      'auth': '[CREDENTIALS REDACTED]',
      'postal_code': '[ZIP CODE REDACTED]',
    };
    
    // Comprehensive regex patterns for PII detection
    const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi;
    const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
    // Match credit cards with separators (spaces, dashes, HTML entities) or without
    const CREDIT_CARD_WITH_SEP = /\b\d{4}[\s\-]+\d{4}[\s\-]+\d{4}[\s\-]+\d{4}\b/g;
    const CREDIT_CARD_NO_SEP = /\b\d{16}\b/g;
    const IP_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    const POSTAL_CODE_REGEX = /\b\d{5}(?:-\d{4})?\b/g;
    const BANK_ACCOUNT_REGEX = /\b\d{8,17}\b/g; // Bank account numbers typically 8-17 digits
    const ROUTING_NUMBER_REGEX = /\b\d{9}\b/g;
    
    // Keyword-based patterns for sensitive categories
    const MEDICAL_KEYWORDS = ['diagnosis', 'prescription', 'medication', 'symptom', 'treatment', 'patient', 'doctor', 'hospital', 'medical history'];
    const FINANCIAL_KEYWORDS = ['bank account', 'routing number', 'credit card', 'debit card', 'payment', 'invoice', 'balance', 'transaction'];
    const PERSONAL_KEYWORDS = ['date of birth', 'dob', 'birthdate', 'passport', 'driver license', 'driver\'s license', 'social security'];
    const AUTH_KEYWORDS = ['password', 'pin', 'passcode', 'secret', 'api key', 'token', 'credentials'];
    
    function anonymizeText(text: string, piiTypes: string[]): string {
      let anonymized = text;
      
      // Apply regex-based replacements for specific PII patterns FIRST
      // This ensures credit card numbers are caught before keyword-based replacement
      if (piiTypes.includes('email')) anonymized = anonymized.replace(EMAIL_REGEX, PII_REPLACEMENTS.email);
      if (piiTypes.includes('phone')) anonymized = anonymized.replace(PHONE_REGEX, PII_REPLACEMENTS.phone);
      if (piiTypes.includes('ssn')) anonymized = anonymized.replace(SSN_REGEX, PII_REPLACEMENTS.ssn);
      // Anonymize credit cards if either 'credit_card' OR 'financial' is detected
      if (piiTypes.includes('credit_card') || piiTypes.includes('financial')) {
        console.log('Before credit card anonymization:', anonymized);
        anonymized = anonymized.replace(CREDIT_CARD_WITH_SEP, PII_REPLACEMENTS.credit_card);
        anonymized = anonymized.replace(CREDIT_CARD_NO_SEP, PII_REPLACEMENTS.credit_card);
        console.log('After credit card anonymization:', anonymized);
      }
      if (piiTypes.includes('ip_address')) anonymized = anonymized.replace(IP_REGEX, PII_REPLACEMENTS.ip_address);
      if (piiTypes.includes('postal_code')) anonymized = anonymized.replace(POSTAL_CODE_REGEX, PII_REPLACEMENTS.postal_code);
      
      // Keyword-based anonymization (applied after regex patterns)
      if (piiTypes.includes('medical')) {
        for (const keyword of MEDICAL_KEYWORDS) {
          const regex = new RegExp(`\\b${keyword}\\b[^.!?]*[.!?]`, 'gi');
          anonymized = anonymized.replace(regex, PII_REPLACEMENTS.medical);
        }
      }
      if (piiTypes.includes('financial')) {
        for (const keyword of FINANCIAL_KEYWORDS) {
          const regex = new RegExp(`\\b${keyword}\\b[^.!?]*[.!?]`, 'gi');
          anonymized = anonymized.replace(regex, PII_REPLACEMENTS.financial);
        }
      }
      if (piiTypes.includes('personal')) {
        for (const keyword of PERSONAL_KEYWORDS) {
          const regex = new RegExp(`\\b${keyword}\\b[^.!?]*[.!?]`, 'gi');
          anonymized = anonymized.replace(regex, PII_REPLACEMENTS.personal);
        }
      }
      if (piiTypes.includes('auth')) {
        for (const keyword of AUTH_KEYWORDS) {
          const regex = new RegExp(`\\b${keyword}\\b[^.!?]*[.!?]`, 'gi');
          anonymized = anonymized.replace(regex, PII_REPLACEMENTS.auth);
        }
      }
      
      return anonymized;
    }
    
    // Check if auto-anonymize is enabled and get PII types if needed
    let anonymizedTicket = ticket;
    let anonymizedMessages = messages || [];
    
    if (settings.ai_auto_anonymize && ticket?.id) {
      console.log('Auto-anonymize enabled - anonymizing data before AI processing');
      
      // Fetch PII types detected for this ticket
      const { data: classification } = await supabase
        .from('ticket_data_classification')
        .select('pii_types')
        .eq('ticket_id', ticket.id)
        .single();
      
      const piiTypes = classification?.pii_types || [];
      
      if (piiTypes.length > 0) {
        console.log('Anonymizing ticket data with PII types:', piiTypes);
        
        // Anonymize ticket data
        anonymizedTicket = { ...ticket };
        if (anonymizedTicket.title) {
          anonymizedTicket.title = anonymizeText(anonymizedTicket.title, piiTypes);
        }
        if (anonymizedTicket.description) {
          anonymizedTicket.description = anonymizeText(anonymizedTicket.description, piiTypes);
        }
        if (piiTypes.includes('email') && anonymizedTicket.customer_email) {
          anonymizedTicket.customer_email = PII_REPLACEMENTS.email;
        }
        if (piiTypes.includes('phone') && anonymizedTicket.customer_phone) {
          anonymizedTicket.customer_phone = PII_REPLACEMENTS.phone;
        }
        if (piiTypes.includes('name') && anonymizedTicket.customer_name) {
          anonymizedTicket.customer_name = PII_REPLACEMENTS.name;
        }
        
        // Anonymize messages
        if (messages && messages.length > 0) {
          anonymizedMessages = messages.map((msg: any) => ({
            ...msg,
            content: anonymizeText(msg.content, piiTypes),
            sender_email: piiTypes.includes('email') ? PII_REPLACEMENTS.email : msg.sender_email,
            sender_name: piiTypes.includes('name') ? PII_REPLACEMENTS.name : msg.sender_name,
          }));
        }
      }
    }
    
    let result;
    
    switch (action) {
      case 'suggest_responses':
        if (!settings.ai_auto_suggest_responses) {
          return new Response(
            JSON.stringify({ error: 'Response suggestions are disabled' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const conversationHistory = anonymizedMessages.map((m: any) => 
          `${m.sender_name}: ${m.content}`
        ).join('\n\n');
        
        const prompt = `You are a customer support assistant. Based on this ticket and conversation history, suggest 3 professional, helpful, and concise responses that an agent could use. Each response should be different in tone and approach.

Ticket: ${anonymizedTicket.title}
Description: ${anonymizedTicket.description || 'No description provided'}
Priority: ${anonymizedTicket.priority}
Status: ${anonymizedTicket.status}

Conversation history:
${conversationHistory}

Provide 3 distinct response suggestions. Keep each response under 100 words. Format your response as a JSON array of strings.`;
        
        console.log('Calling AI with prompt for response suggestions');
        
        let data;
        try {
          data = await callAI([
            { role: 'system', content: 'You are a helpful customer support assistant. Always respond with valid JSON arrays.' },
            { role: 'user', content: prompt }
          ], 0.7);
        } catch (error: any) {
          if (error.message === 'RATE_LIMIT') {
            return new Response(
              JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          if (error.message === 'PAYMENT_REQUIRED') {
            return new Response(
              JSON.stringify({ error: 'AI credits exhausted. Please add funds to your workspace.' }),
              { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          return new Response(
            JSON.stringify({ error: 'AI service error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) {
          console.error('No content in AI response:', data);
          return new Response(
            JSON.stringify({ error: 'Invalid AI response' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        try {
          // Remove markdown code fences if present
          let cleanContent = content.trim();
          if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
          } else if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
          }
          
          // Try to parse as JSON array
          const suggestions = JSON.parse(cleanContent.trim());
          result = { suggestions: Array.isArray(suggestions) ? suggestions : [suggestions] };
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError, 'Content:', content);
          // If parsing fails, return a fallback message
          result = { 
            suggestions: ['I understand your concern. Let me look into this and get back to you with more information.'],
            error: 'Failed to parse AI suggestions' 
          };
        }
        
        console.log('Successfully generated response suggestions');
        break;
        
      case 'analyze_sentiment':
        if (!settings.ai_sentiment_analysis) {
          return new Response(
            JSON.stringify({ error: 'Sentiment analysis is disabled' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const sentimentPrompt = `Analyze the sentiment and urgency of this customer support ticket. Respond with a JSON object containing: sentiment (positive/neutral/negative/urgent) and urgency_score (1-10).

Ticket: ${anonymizedTicket.title}
Description: ${anonymizedTicket.description || 'No description provided'}`;
        
        const sentimentData = await callAI([
          { role: 'system', content: 'You are a sentiment analysis assistant. Always respond with valid JSON.' },
          { role: 'user', content: sentimentPrompt }
        ]);
        let sentimentContent = sentimentData.choices?.[0]?.message?.content;
        
        // Remove markdown code fences if present
        if (sentimentContent) {
          sentimentContent = sentimentContent.trim();
          if (sentimentContent.startsWith('```json')) {
            sentimentContent = sentimentContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
          } else if (sentimentContent.startsWith('```')) {
            sentimentContent = sentimentContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
          }
        }
        
        result = JSON.parse(sentimentContent.trim());
        break;
        
      case 'suggest_priority':
        if (!settings.ai_priority_suggestions) {
          return new Response(
            JSON.stringify({ error: 'Priority suggestions are disabled' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const priorityPrompt = `Based on this ticket, suggest an appropriate priority level (low/medium/high/urgent). Respond with just the priority level.

Ticket: ${anonymizedTicket.title}
Description: ${anonymizedTicket.description || 'No description provided'}`;
        
        const priorityData = await callAI([
          { role: 'user', content: priorityPrompt }
        ]);
        const suggestedPriority = priorityData.choices?.[0]?.message?.content?.toLowerCase().trim();
        result = { suggested_priority: suggestedPriority };
        break;

      case 'translate':
        if (!settings.ai_translation_enabled) {
          return new Response(
            JSON.stringify({ error: 'Translation is disabled' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Check if we're translating individual messages or the whole ticket
        if (anonymizedMessages && anonymizedMessages.length > 0 && (!anonymizedTicket.title || anonymizedTicket.title === '')) {
          // Translate individual messages
          const messageTranslations: Record<string, string> = {};
          
          for (const msg of anonymizedMessages) {
            const msgPrompt = `Translate the following message to ${targetLanguage || 'en'}. Maintain the original meaning and tone. Only provide the translation, no additional text.

Message: ${msg.content}`;
            
            try {
              const msgData = await callAI([{ role: 'user', content: msgPrompt }]);
              messageTranslations[msg.id] = msgData.choices?.[0]?.message?.content || msg.content;
            } catch (error) {
              messageTranslations[msg.id] = msg.content; // Fallback to original
            }
          }
          
          result = { message_translations: messageTranslations };
        } else {
          // Translate ticket description only (no messages provided)
          const translatePrompt = `Translate the following ticket to ${targetLanguage || 'en'}. Maintain the original meaning and tone. Only provide the translation, no additional text or explanations.
          
Ticket: ${anonymizedTicket.title}
Description: ${anonymizedTicket.description || 'No description'}`;
          
          const translateData = await callAI([
            { role: 'user', content: translatePrompt }
          ]);
          result = { translated_text: translateData.choices?.[0]?.message?.content };
        }
        break;

      case 'suggest_knowledge':
        if (!settings.ai_knowledge_base_enabled) {
          return new Response(
            JSON.stringify({ error: 'Knowledge base suggestions are disabled' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const knowledgePrompt = `Based on this support ticket, suggest 3-5 relevant help article titles that would be useful for resolving this issue.
        
Ticket: ${anonymizedTicket.title}
Description: ${anonymizedTicket.description || 'No description'}

Provide article titles as a JSON array of strings.`;
        
        const knowledgeData = await callAI([
          { role: 'system', content: 'You are a knowledge base assistant. Always respond with valid JSON arrays.' },
          { role: 'user', content: knowledgePrompt }
        ]);
        let knowledgeContent = knowledgeData.choices?.[0]?.message?.content;
        
        if (knowledgeContent) {
          knowledgeContent = knowledgeContent.trim();
          if (knowledgeContent.startsWith('```json')) {
            knowledgeContent = knowledgeContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
          } else if (knowledgeContent.startsWith('```')) {
            knowledgeContent = knowledgeContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
          }
        }
        
        const articles = JSON.parse(knowledgeContent.trim());
        result = { articles: Array.isArray(articles) ? articles : [articles] };
        break;

      case 'summarize':
        if (!settings.ai_summarization_enabled) {
          return new Response(
            JSON.stringify({ error: 'Summarization is disabled' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const summaryPrompt = `Provide a concise summary of this support ticket conversation. Include key issues, actions taken, and current status.
        
Ticket: ${anonymizedTicket.title}
Description: ${anonymizedTicket.description || 'No description'}
Status: ${anonymizedTicket.status}
Priority: ${anonymizedTicket.priority}

Conversation:
${anonymizedMessages.map((m: any) => `${m.sender_name}: ${m.content}`).join('\n\n')}

Provide a clear, professional summary in 2-3 sentences.`;
        
        const summaryData = await callAI([
          { role: 'user', content: summaryPrompt }
        ]);
        result = { summary: summaryData.choices?.[0]?.message?.content };
        break;

      case 'suggest_templates':
        if (!settings.ai_template_suggestions_enabled) {
          return new Response(
            JSON.stringify({ error: 'Template suggestions are disabled' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Fetch existing templates
        const { data: templates } = await supabase
          .from('response_templates')
          .select('id, name, content, category, tags')
          .eq('organization_id', organization_id)
          .eq('is_active', true);

        const templateContext = templates && templates.length > 0
          ? `Available templates:\n${templates.map((t: any) => `- ${t.name} (${t.category})`).join('\n')}`
          : 'No templates available yet.';

        const templatePrompt = `Analyze this ticket and suggest which response templates would be most appropriate, or suggest new template ideas if none match well.

Ticket: ${anonymizedTicket.title}
Description: ${anonymizedTicket.description || 'No description'}
Priority: ${anonymizedTicket.priority}
Status: ${anonymizedTicket.status}

Recent conversation:
${anonymizedMessages.slice(-3).map((m: any) => `${m.sender_name}: ${m.content}`).join('\n')}

${templateContext}

Return as JSON array of objects with: template_id (uuid or null), name, reason, personalization_tips.`;
        
        const templateData = await callAI([
          { role: 'system', content: 'You are a template suggestion assistant. Always respond with valid JSON arrays.' },
          { role: 'user', content: templatePrompt }
        ]);
        let templateContent = templateData.choices?.[0]?.message?.content;
        
        if (templateContent) {
          templateContent = templateContent.trim();
          if (templateContent.startsWith('```json')) {
            templateContent = templateContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
          } else if (templateContent.startsWith('```')) {
            templateContent = templateContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
          }
        }
        
        const suggestions = JSON.parse(templateContent.trim());
        result = { suggestions: Array.isArray(suggestions) ? suggestions : [suggestions] };
        break;

      case 'generate_template':
        if (!settings.ai_template_suggestions_enabled) {
          return new Response(
            JSON.stringify({ error: 'Template generation is disabled' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const generatePrompt = `Create a professional customer support response template based on this request: "${userPrompt}"

Generate a complete template with:
- A clear, descriptive name
- The template content (professional, concise, helpful)
- An appropriate category (general, welcome, follow-up, resolution, apology, technical)
- 2-3 relevant tags

Return as JSON object with: name, content, category, tags (array).`;
        
        let generateData;
        try {
          generateData = await callAI([
            { role: 'system', content: 'You are a template generation assistant. Always respond with valid JSON objects.' },
            { role: 'user', content: generatePrompt }
          ]);
        } catch (error: any) {
          if (error.message === 'RATE_LIMIT') {
            return new Response(
              JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          if (error.message === 'PAYMENT_REQUIRED') {
            return new Response(
              JSON.stringify({ error: 'AI credits exhausted. Please add funds to your workspace.' }),
              { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          throw new Error('Template generation failed');
        }
        
        let generatedContent = generateData.choices?.[0]?.message?.content;
        
        if (generatedContent) {
          generatedContent = generatedContent.trim();
          if (generatedContent.startsWith('```json')) {
            generatedContent = generatedContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
          } else if (generatedContent.startsWith('```')) {
            generatedContent = generatedContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
          }
        }
        
        const template = JSON.parse(generatedContent.trim());
        result = { template };
        break;
        
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-ticket-assistant:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
