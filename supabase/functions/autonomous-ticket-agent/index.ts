import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TicketData {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  customer_email: string;
  customer_name: string;
}

interface AgentResponse {
  agent_type: 'triage' | 'resolution' | 'quality';
  action_type: string;
  action_data: any;
  confidence_score: number;
  reasoning: string;
}

async function callAI(prompt: string, systemPrompt: string): Promise<any> {
  // Using integrated AI gateway
  const AI_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!AI_API_KEY) {
    throw new Error('AI gateway API key is not configured');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'suggest_action',
          description: 'Suggest an action for the ticket',
          parameters: {
            type: 'object',
            properties: {
              action_type: { 
                type: 'string',
                enum: ['auto_response', 'priority_change', 'status_change', 'escalation', 'customer_update', 'refund_request', 'follow_up'],
                description: 'The type of action to take'
              },
              action_data: { 
                type: 'object',
                description: 'Specific action details. MUST include relevant fields based on action_type',
                properties: {
                  response: { type: 'string', description: 'For auto_response: the full customer response text' },
                  new_priority: { type: 'string', description: 'For priority_change: low, medium, high, or urgent' },
                  new_status: { type: 'string', description: 'For status_change: open, in_progress, resolved, or closed' },
                  reason: { type: 'string', description: 'Explanation for the action' },
                  escalate_to: { type: 'string', description: 'For escalation: who to escalate to' },
                  follow_up_action: { type: 'string', description: 'For follow_up: what action to take' },
                  timeline: { type: 'string', description: 'For follow_up: when to follow up' },
                  update_message: { type: 'string', description: 'For customer_update: message to send' }
                }
              },
              confidence_score: { 
                type: 'number', 
                minimum: 0, 
                maximum: 100,
                description: 'Confidence percentage (0-100, e.g., 85 means 85% confident)'
              },
              reasoning: { 
                type: 'string',
                description: 'Detailed explanation of why this action is recommended'
              }
            },
            required: ['action_type', 'action_data', 'confidence_score', 'reasoning'],
            additionalProperties: false
          }
        }
      }],
      tool_choice: { type: 'function', function: { name: 'suggest_action' } }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('AI gateway error:', response.status, error);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices[0]?.message?.tool_calls?.[0];
  
  if (!toolCall) {
    throw new Error('No tool call returned from AI');
  }

  return JSON.parse(toolCall.function.arguments);
}

async function triageAgent(ticket: TicketData, learningData: any[]): Promise<AgentResponse> {
  const learningContext = learningData.length > 0 
    ? `\n\nLearning from previous feedback:\n${JSON.stringify(learningData.slice(0, 5))}`
    : '';

const systemPrompt = `You are a Triage Agent responsible for initial ticket analysis.
Your job is to:
1. Assess ticket urgency and priority
2. Categorize the issue type
3. Determine if immediate escalation is needed
4. Suggest initial priority level

IMPORTANT: 
- confidence_score must be 0-100 (e.g., 85 for 85% confidence)
- action_data must contain specific details about what should change
- For priority_change, include: {"new_priority": "high", "reason": "explanation"}
- For status_change, include: {"new_status": "open", "reason": "explanation"}
- For escalation, include: {"escalate_to": "team", "reason": "explanation"}

Be decisive but cautious. Only suggest high-priority or escalation if truly critical.${learningContext}`;

  const prompt = `Analyze this ticket:
Title: ${ticket.title}
Description: ${ticket.description}
Current Priority: ${ticket.priority}
Status: ${ticket.status}

Example response for priority_change:
{
  "action_type": "priority_change",
  "action_data": {
    "new_priority": "urgent",
    "reason": "Customer locked out, needs immediate access"
  },
  "confidence_score": 85,
  "reasoning": "Clear urgent issue requiring immediate attention"
}

Example response for customer_update:
{
  "action_type": "customer_update",
  "action_data": {
    "update_message": "We've received your request and are processing the refund",
    "reason": "Keep customer informed"
  },
  "confidence_score": 90,
  "reasoning": "Standard acknowledgment appropriate for this case"
}

Provide your triage assessment with confidence score (0-100) and detailed action_data.`;

  const result = await callAI(prompt, systemPrompt);
  
  // Ensure confidence is 0-100, convert if needed
  const confidence = result.confidence_score > 1 ? result.confidence_score : result.confidence_score * 100;
  
  return {
    agent_type: 'triage',
    action_type: result.action_type,
    action_data: result.action_data,
    confidence_score: confidence,
    reasoning: result.reasoning
  };
}

async function resolutionAgent(ticket: TicketData, triageResult: AgentResponse, messages: any[], learningData: any[]): Promise<AgentResponse> {
  const learningContext = learningData.length > 0 
    ? `\n\nLearning from previous feedback:\n${JSON.stringify(learningData.slice(0, 5))}`
    : '';

  const systemPrompt = `You are a Resolution Agent responsible for solving tickets autonomously.
Your job is to:
1. Craft appropriate responses to customer issues
2. Suggest status updates
3. Determine if the issue can be auto-resolved
4. Recommend follow-up actions

IMPORTANT:
- confidence_score must be 0-100 (e.g., 85 for 85% confidence)
- action_data must contain specific resolution details
- For auto_response, include: {"response": "full response text to customer"}
- For status_change, include: {"new_status": "resolved", "resolution_notes": "explanation"}
- For follow_up, include: {"follow_up_action": "what to do", "timeline": "when"}

Only suggest auto-resolution if you're highly confident (>80%).${learningContext}`;

  const conversationHistory = messages.map(m => `${m.sender_name}: ${m.content}`).join('\n');

  const prompt = `Ticket Information:
Title: ${ticket.title}
Description: ${ticket.description}
Priority: ${ticket.priority}
Triage Assessment: ${triageResult.reasoning}

Conversation History:
${conversationHistory || 'No messages yet'}

Example response for auto_response:
{
  "action_type": "auto_response",
  "action_data": {
    "response": "Thank you for contacting us about the duplicate payment. We've confirmed the issue and are processing your refund. You'll receive confirmation within 3-5 business days.",
    "reason": "Standard refund response with timeline"
  },
  "confidence_score": 85,
  "reasoning": "Clear billing issue with standard resolution path"
}

Example response for status_change:
{
  "action_type": "status_change",
  "action_data": {
    "new_status": "in_progress",
    "reason": "Investigation underway"
  },
  "confidence_score": 90,
  "reasoning": "Active resolution in progress"
}

Suggest the best resolution action with confidence score (0-100) and detailed action_data.`;

  const result = await callAI(prompt, systemPrompt);
  
  // Ensure confidence is 0-100, convert if needed
  const confidence = result.confidence_score > 1 ? result.confidence_score : result.confidence_score * 100;
  
  return {
    agent_type: 'resolution',
    action_type: result.action_type,
    action_data: result.action_data,
    confidence_score: confidence,
    reasoning: result.reasoning
  };
}

async function qualityAgent(ticket: TicketData, resolutionResult: AgentResponse, learningData: any[]): Promise<AgentResponse> {
  const learningContext = learningData.length > 0 
    ? `\n\nLearning from previous feedback:\n${JSON.stringify(learningData.slice(0, 5))}`
    : '';

  const systemPrompt = `You are a Quality Agent responsible for validating resolution suggestions.
Your job is to:
1. Review the suggested resolution for accuracy
2. Check for potential issues or risks
3. Validate the confidence score
4. Approve or escalate based on quality assessment

IMPORTANT:
- confidence_score must be 0-100 (e.g., 85 for 85% confidence)
- action_data should confirm or modify the resolution suggestion
- If approving, use same action_data as resolution
- If escalating, include: {"escalation_reason": "why", "requires_human": true}

You're the final check before auto-resolution. Be thorough.${learningContext}`;

  const prompt = `Review this resolution suggestion:
Ticket: ${ticket.title}
Suggested Action: ${resolutionResult.action_type}
Action Data: ${JSON.stringify(resolutionResult.action_data)}
Resolution Confidence: ${resolutionResult.confidence_score}%
Reasoning: ${resolutionResult.reasoning}

Provide your quality assessment and final confidence score (0-100).`;

  const result = await callAI(prompt, systemPrompt);
  
  // Ensure confidence is 0-100, convert if needed
  const confidence = result.confidence_score > 1 ? result.confidence_score : result.confidence_score * 100;
  
  return {
    agent_type: 'quality',
    action_type: result.action_type,
    action_data: result.action_data,
    confidence_score: confidence,
    reasoning: result.reasoning
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticket_id } = await req.json();

    if (!ticket_id) {
      throw new Error('ticket_id is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch ticket data
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets')
      .select('*')
      .eq('id', ticket_id)
      .single();

    if (ticketError || !ticket) {
      throw new Error('Ticket not found');
    }

    // Fetch organization settings for auto-execution configuration
    const { data: orgSettings } = await supabaseClient
      .from('organization_settings')
      .select('ai_auto_execution_enabled, ai_auto_execution_threshold')
      .eq('organization_id', ticket.organization_id)
      .single();

    const autoExecutionEnabled = orgSettings?.ai_auto_execution_enabled || false;
    const autoExecutionThreshold = orgSettings?.ai_auto_execution_threshold || 85;

    // Fetch conversation history
    const { data: messages } = await supabaseClient
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticket_id)
      .order('created_at', { ascending: true });

    // Fetch learning data from previous feedback
    // Only learn from approvals or rejections with feedback (not empty or null)
    const { data: learningData } = await supabaseClient
      .from('ai_learning_feedback')
      .select('*')
      .or('feedback_type.eq.approval,and(feedback_type.eq.rejection,feedback_notes.not.is.null)')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log('Starting multi-agent analysis for ticket:', ticket_id);

    // Agent 1: Triage
    const triageResult = await triageAgent(ticket, learningData || []);
    console.log('Triage result:', triageResult);

    // Store triage action
    const { data: triageAction } = await supabaseClient
      .from('ai_ticket_actions')
      .insert({
        ticket_id,
        agent_type: 'triage',
        action_type: triageResult.action_type,
        action_data: triageResult.action_data,
        confidence_score: triageResult.confidence_score,
        reasoning: triageResult.reasoning,
        status: 'pending'
      })
      .select()
      .single();

    // Agent 2: Resolution (only if triage confidence > 50%)
    let resolutionResult: AgentResponse | null = null;
    let resolutionAction = null;

    if (triageResult.confidence_score > 50) {
      resolutionResult = await resolutionAgent(ticket, triageResult, messages || [], learningData || []);
      console.log('Resolution result:', resolutionResult);

      const { data: action } = await supabaseClient
        .from('ai_ticket_actions')
        .insert({
          ticket_id,
          agent_type: 'resolution',
          action_type: resolutionResult.action_type,
          action_data: resolutionResult.action_data,
          confidence_score: resolutionResult.confidence_score,
          reasoning: resolutionResult.reasoning,
          status: 'pending'
        })
        .select()
        .single();

      resolutionAction = action;
    }

    // Agent 3: Quality (only if resolution confidence > 60%)
    let qualityResult: AgentResponse | null = null;
    let finalConfidence = triageResult.confidence_score;

    if (resolutionResult && resolutionResult.confidence_score > 60) {
      qualityResult = await qualityAgent(ticket, resolutionResult, learningData || []);
      console.log('Quality result:', qualityResult);

      await supabaseClient
        .from('ai_ticket_actions')
        .insert({
          ticket_id,
          agent_type: 'quality',
          action_type: qualityResult.action_type,
          action_data: qualityResult.action_data,
          confidence_score: qualityResult.confidence_score,
          reasoning: qualityResult.reasoning,
          status: 'pending'
        });

      finalConfidence = qualityResult.confidence_score;
    }

    // Determine AI status based on final confidence
    let aiStatus = 'pending_analysis';
    if (finalConfidence >= autoExecutionThreshold) {
      aiStatus = 'resolved'; // High confidence - can auto-resolve
    } else if (finalConfidence >= 60) {
      aiStatus = 'in_progress'; // Medium confidence - needs review
    } else {
      aiStatus = 'human_required'; // Low confidence - escalate
    }

    // Update ticket with AI analysis
    await supabaseClient
      .from('tickets')
      .update({
        ai_status: aiStatus,
        ai_confidence: finalConfidence,
        ai_last_action_at: new Date().toISOString(),
        auto_resolution_attempted: true
      })
      .eq('id', ticket_id);

    // Check rate limiting for auto-execution (max 5 per ticket per hour)
    const { count: recentExecutions } = await supabaseClient
      .from('ai_ticket_actions')
      .select('*', { count: 'exact', head: true })
      .eq('ticket_id', ticket_id)
      .eq('status', 'executed')
      .gte('executed_at', new Date(Date.now() - 3600000).toISOString());

    const rateLimitExceeded = (recentExecutions || 0) >= 5;

    // Auto-execute actions if enabled and confidence meets threshold
    const shouldAutoExecute = 
      autoExecutionEnabled && 
      finalConfidence >= autoExecutionThreshold && 
      resolutionAction && 
      resolutionResult &&
      !rateLimitExceeded;

    if (shouldAutoExecute && resolutionResult) {
      console.log('Auto-executing action:', resolutionResult.action_type, 'with confidence:', finalConfidence);
      
      // Execute the action based on type
      try {
        if (resolutionResult.action_type === 'auto_response') {
          await supabaseClient
            .from('ticket_messages')
            .insert({
              ticket_id,
              content: resolutionResult.action_data.response,
              sender_email: 'ai-agent@system.com',
              sender_name: 'AI Agent',
              is_internal: false
            });

          // Log activity
          await supabaseClient
            .from('ticket_activities')
            .insert({
              ticket_id,
              activity_type: 'ai_auto_execution',
              content: `AI automatically sent response: ${resolutionResult.reasoning}`,
              created_by_name: 'AI Agent',
              created_by_email: 'ai-agent@system.com'
            });

        } else if (resolutionResult.action_type === 'status_change') {
          const oldStatus = ticket.status;
          await supabaseClient
            .from('tickets')
            .update({ status: resolutionResult.action_data.new_status })
            .eq('id', ticket_id);

          await supabaseClient
            .from('ticket_activities')
            .insert({
              ticket_id,
              activity_type: 'ai_auto_execution',
              content: `AI automatically changed status: ${resolutionResult.reasoning}`,
              old_value: oldStatus,
              new_value: resolutionResult.action_data.new_status,
              created_by_name: 'AI Agent',
              created_by_email: 'ai-agent@system.com'
            });

        } else if (resolutionResult.action_type === 'priority_change') {
          const oldPriority = ticket.priority;
          await supabaseClient
            .from('tickets')
            .update({ priority: resolutionResult.action_data.new_priority })
            .eq('id', ticket_id);

          await supabaseClient
            .from('ticket_activities')
            .insert({
              ticket_id,
              activity_type: 'ai_auto_execution',
              content: `AI automatically changed priority: ${resolutionResult.reasoning}`,
              old_value: oldPriority,
              new_value: resolutionResult.action_data.new_priority,
              created_by_name: 'AI Agent',
              created_by_email: 'ai-agent@system.com'
            });

        } else if (resolutionResult.action_type === 'customer_update') {
          await supabaseClient
            .from('ticket_messages')
            .insert({
              ticket_id,
              content: resolutionResult.action_data.update_message,
              sender_email: 'ai-agent@system.com',
              sender_name: 'AI Agent',
              is_internal: false
            });

          await supabaseClient
            .from('ticket_activities')
            .insert({
              ticket_id,
              activity_type: 'ai_auto_execution',
              content: `AI automatically sent customer update: ${resolutionResult.reasoning}`,
              created_by_name: 'AI Agent',
              created_by_email: 'ai-agent@system.com'
            });

        } else if (resolutionResult.action_type === 'escalation' || resolutionResult.action_type === 'follow_up') {
          await supabaseClient
            .from('ticket_activities')
            .insert({
              ticket_id,
              activity_type: 'ai_auto_execution',
              content: `AI automatically logged ${resolutionResult.action_type}: ${resolutionResult.reasoning}`,
              created_by_name: 'AI Agent',
              created_by_email: 'ai-agent@system.com'
            });
        }

        // Mark action as executed
        await supabaseClient
          .from('ai_ticket_actions')
          .update({ 
            status: 'executed',
            executed_at: new Date().toISOString()
          })
          .eq('id', resolutionAction.id);

        // Log audit event
        await supabaseClient.rpc('log_audit_event', {
          _organization_id: ticket.organization_id,
          _user_id: null,
          _action: 'ai_auto_execution',
          _resource_type: 'ticket',
          _resource_id: ticket_id,
          _details: {
            action_type: resolutionResult.action_type,
            confidence_score: finalConfidence,
            threshold_used: autoExecutionThreshold,
            reasoning: resolutionResult.reasoning
          },
          _severity: 'info'
        });

        console.log('Auto-execution completed successfully');
      } catch (execError) {
        console.error('Error during auto-execution:', execError);
        // Don't fail the entire request if auto-execution fails
      }
    } else if (rateLimitExceeded) {
      console.log('Rate limit exceeded for auto-execution on this ticket');
    } else if (!autoExecutionEnabled) {
      console.log('Auto-execution is disabled in organization settings');
    } else if (finalConfidence < autoExecutionThreshold) {
      console.log(`Confidence ${finalConfidence}% below threshold ${autoExecutionThreshold}%`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        ticket_id,
        ai_status: aiStatus,
        final_confidence: finalConfidence,
        triage_result: triageResult,
        resolution_result: resolutionResult,
        quality_result: qualityResult
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in autonomous-ticket-agent:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});