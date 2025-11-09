import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { 
  Brain, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Send,
  X as XIcon
} from 'lucide-react';

interface AIAction {
  id: string;
  agent_type: 'triage' | 'resolution' | 'quality';
  action_type: string;
  action_data: any;
  confidence_score: number;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  reasoning: string;
  created_at: string;
  messageSent?: boolean;
}

interface AIAgentPanelProps {
  ticketId: string;
  aiStatus?: string;
  aiConfidence?: number;
  onActionApproved?: () => void;
}

export default function AIAgentPanel({ ticketId, aiStatus, aiConfidence, onActionApproved }: AIAgentPanelProps) {
  const [actions, setActions] = useState<AIAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    loadActions();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('ai_actions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_ticket_actions',
          filter: `ticket_id=eq.${ticketId}`
        },
        () => loadActions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  const loadActions = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_ticket_actions')
        .select('*')
        .eq('ticket_id', ticketId)
        .neq('status', 'rejected')
        // Only show customer-facing actions (responses and updates)
        .in('action_type', ['auto_response', 'customer_update'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // For each executed action, check if a message was actually sent
      const actionsWithMessageStatus = await Promise.all(
        (data || []).map(async (action) => {
          if (action.status === 'executed' && action.executed_at) {
            // Check if a message exists near the execution time
            const { data: messages } = await supabase
              .from('ticket_messages')
              .select('id')
              .eq('ticket_id', ticketId)
              .eq('sender_email', 'ai-agent@system.com')
              .gte('created_at', new Date(new Date(action.executed_at).getTime() - 5000).toISOString())
              .lte('created_at', new Date(new Date(action.executed_at).getTime() + 5000).toISOString())
              .limit(1);
            
            return { ...action, messageSent: messages && messages.length > 0 };
          }
          return { ...action, messageSent: false };
        })
      );
      
      setActions(actionsWithMessageStatus as any);
    } catch (error) {
      console.error('Error loading AI actions:', error);
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('autonomous-ticket-agent', {
        body: { ticket_id: ticketId }
      });

      if (error) throw error;

      toast({
        title: t('ai.agent.analysisComplete'),
        description: `${t('ai.agent.confidence')}: ${data.final_confidence}% - ${data.ai_status}`,
      });

      loadActions();
    } catch (error) {
      console.error('Error running analysis:', error);
      toast({
        title: t('ai.agent.analysisFailed'),
        description: error instanceof Error ? error.message : 'Failed to analyze ticket',
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const approveAction = async (actionId: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const action = actions.find(a => a.id === actionId);
      if (!action) throw new Error('Action not found');

      // Execute the action based on type
      if (action.action_type === 'auto_response' && action.action_data.response) {
        // Send the AI-suggested response as a message
        await supabase
          .from('ticket_messages')
          .insert({
            ticket_id: ticketId,
            content: action.action_data.response,
            sender_email: 'ai-agent@system.com',
            sender_name: 'AI Agent',
            is_internal: false
          });

        toast({
          title: t('ai.agent.responseSent'),
          description: t('ai.agent.responseDescription'),
        });
      } else if (action.action_type === 'status_change' && action.action_data.new_status) {
        // Update ticket status
        await supabase
          .from('tickets')
          .update({ status: action.action_data.new_status })
          .eq('id', ticketId);

        // Log activity
        await supabase
          .from('ticket_activities')
          .insert({
            ticket_id: ticketId,
            activity_type: 'status_change',
            old_value: action.action_data.current_status || 'unknown',
            new_value: action.action_data.new_status,
            content: `AI Agent changed status: ${action.action_data.reason || ''}`,
            created_by: user.id
          });

        toast({
          title: t('ai.agent.statusUpdated'),
          description: `Ticket status changed to ${action.action_data.new_status}`,
        });
      } else if (action.action_type === 'priority_change' && action.action_data.new_priority) {
        // Update ticket priority
        await supabase
          .from('tickets')
          .update({ priority: action.action_data.new_priority })
          .eq('id', ticketId);

        // Log activity
        await supabase
          .from('ticket_activities')
          .insert({
            ticket_id: ticketId,
            activity_type: 'priority_change',
            old_value: action.action_data.current_priority || 'unknown',
            new_value: action.action_data.new_priority,
            content: `AI Agent changed priority: ${action.action_data.reason || ''}`,
            created_by: user.id
          });

        toast({
          title: t('ai.agent.priorityUpdated'),
          description: `Ticket priority changed to ${action.action_data.new_priority}`,
        });
      } else if (action.action_type === 'customer_update' && action.action_data.update_message) {
        // Send customer update message
        await supabase
          .from('ticket_messages')
          .insert({
            ticket_id: ticketId,
            content: action.action_data.update_message,
            sender_email: 'ai-agent@system.com',
            sender_name: 'AI Agent',
            is_internal: false
          });

        toast({
          title: t('ai.agent.customerUpdated'),
          description: t('ai.agent.updateDescription'),
        });
      } else if (action.action_type === 'escalation' && action.action_data.escalate_to) {
        // Log escalation activity
        await supabase
          .from('ticket_activities')
          .insert({
            ticket_id: ticketId,
            activity_type: 'escalation',
            content: `AI Agent escalated to ${action.action_data.escalate_to}: ${action.action_data.reason || ''}`,
            created_by: user.id
          });

        toast({
          title: t('ai.agent.ticketEscalated'),
          description: `Escalated to ${action.action_data.escalate_to}`,
        });
      } else if (action.action_type === 'follow_up') {
        // Log follow-up activity
        await supabase
          .from('ticket_activities')
          .insert({
            ticket_id: ticketId,
            activity_type: 'follow_up',
            content: `AI Agent scheduled follow-up: ${action.action_data.follow_up_action || ''} (${action.action_data.timeline || ''})`,
            created_by: user.id
          });

        toast({
          title: t('ai.agent.followUpScheduled'),
          description: action.action_data.timeline || 'Follow-up scheduled',
        });
      }

      // Update action status
      const { error: updateError } = await supabase
        .from('ai_ticket_actions')
        .update({ status: 'approved', executed_at: new Date().toISOString() })
        .eq('id', actionId);

      if (updateError) throw updateError;

      // Record feedback
      await supabase
        .from('ai_learning_feedback')
        .insert({
          action_id: actionId,
          user_id: user.id,
          feedback_type: 'approval',
          original_action: action.action_data,
          feedback_notes: feedbackNotes || null
        });

      toast({
        title: t('ai.agent.actionApproved'),
        description: t('ai.agent.learnFromApproval'),
      });

      setFeedbackNotes('');
      setSelectedAction(null);
      loadActions();
      
      // Notify parent component to refresh ticket data
      if (onActionApproved) {
        onActionApproved();
      }
    } catch (error) {
      console.error('Error approving action:', error);
      toast({
        title: t('ai.agent.approvalFailed'),
        description: error instanceof Error ? error.message : 'Failed to approve action',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const dismissAction = async (actionId: string) => {
    try {
      const { error } = await supabase
        .from('ai_ticket_actions')
        .update({ status: 'rejected' })
        .eq('id', actionId);

      if (error) throw error;
      loadActions();
      toast({ title: t('ai.agent.actionDismissed') });
    } catch (error) {
      console.error('Error dismissing action:', error);
    }
  };

  const rejectAction = async (actionId: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update action status
      const { error: updateError } = await supabase
        .from('ai_ticket_actions')
        .update({ status: 'rejected' })
        .eq('id', actionId);

      if (updateError) throw updateError;

      // Record feedback
      const action = actions.find(a => a.id === actionId);
      if (action) {
        await supabase
          .from('ai_learning_feedback')
          .insert({
            action_id: actionId,
            user_id: user.id,
            feedback_type: 'rejection',
            original_action: action.action_data,
            feedback_notes: feedbackNotes || null
          });
      }

      toast({
        title: t('ai.agent.actionRejected'),
        description: feedbackNotes 
          ? t('ai.agent.learnFromFeedback')
          : 'Action has been rejected',
      });

      setFeedbackNotes('');
      setSelectedAction(null);
      loadActions();
    } catch (error) {
      console.error('Error rejecting action:', error);
      toast({
        title: t('ai.agent.rejectionFailed'),
        description: error instanceof Error ? error.message : 'Failed to reject action',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500 hover:bg-green-600 transition-colors">{t('ai.agent.confidence.high')}: {score}%</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-500 hover:bg-yellow-600 transition-colors">{t('ai.agent.confidence.medium')}: {score}%</Badge>;
    return <Badge className="bg-red-500 hover:bg-red-600 transition-colors">{t('ai.agent.confidence.low')}: {score}%</Badge>;
  };

  const getStatusBadge = (status: string, messageSent?: boolean) => {
    // For executed actions, only show badge if message was sent
    if (status === 'executed') {
      if (messageSent) {
        return <Badge className="bg-blue-500 hover:bg-blue-600 transition-colors"><Sparkles className="w-3 h-3 mr-1" />{t('ai.agent.status.autoExecuted')}</Badge>;
      }
      // Don't show badge for executed actions that didn't send messages
      return null;
    }
    
    const badges = {
      pending: <Badge variant="outline" className="hover:bg-muted/50 transition-colors"><AlertTriangle className="w-3 h-3 mr-1" />{t('ai.agent.status.pending')}</Badge>,
      approved: <Badge className="bg-green-500 hover:bg-green-600 transition-colors"><CheckCircle2 className="w-3 h-3 mr-1" />{t('ai.agent.status.approved')}</Badge>,
      rejected: <Badge variant="destructive" className="hover:bg-destructive/80 transition-colors"><XCircle className="w-3 h-3 mr-1" />{t('ai.agent.status.rejected')}</Badge>,
      human_required: <Badge variant="secondary" className="hover:bg-secondary/80 transition-colors"><AlertTriangle className="w-3 h-3 mr-1" />{t('ai.agent.status.human_required')}</Badge>,
    };
    return badges[status as keyof typeof badges] || <Badge variant="secondary" className="hover:bg-secondary/80 transition-colors">{status}</Badge>;
  };

  const getAgentIcon = (type: string) => {
    return <Brain className="w-4 h-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {t('ai.agent.title')}
            </CardTitle>
            <CardDescription>
              {t('ai.agent.description')}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="shrink-0"
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
            <span className="sr-only">
              {isCollapsed ? 'Expand' : 'Collapse'} AI Agent Panel
            </span>
          </Button>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="space-y-4">
        <Button
          onClick={runAnalysis} 
          disabled={analyzing}
          className="w-full"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('ai.agent.analyzing')}
            </>
          ) : (
            t('ai.agent.runAnalysis')
          )}
        </Button>

        <div className="space-y-2">
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('ai.agent.noActions')}
            </p>
          ) : (
            actions.map((action) => {
              const isExpanded = expandedActions.has(action.id);
              return (
                <Card key={action.id} className="border">
                  <CardContent className="pt-3 pb-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium capitalize">{t(`ai.agent.${action.agent_type}Agent`)}</p>
                            {action.messageSent && (
                              <Badge variant="secondary" className="text-xs">
                                <Send className="w-3 h-3 mr-1" />
                                {t('ai.agent.messageSent')}
                              </Badge>
                            )}
                            {getConfidenceBadge(action.confidence_score)}
                            {getStatusBadge(action.status, action.messageSent)}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{action.reasoning}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {action.status !== 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => dismissAction(action.id)}
                              className="h-6 w-6 p-0"
                            >
                              <XIcon className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newExpanded = new Set(expandedActions);
                              if (isExpanded) {
                                newExpanded.delete(action.id);
                              } else {
                                newExpanded.add(action.id);
                              }
                              setExpandedActions(newExpanded);
                            }}
                            className="h-6 w-6 p-0"
                          >
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <>
                          <div className="text-sm pt-2">
                            <p className="font-medium mb-1 text-xs">{t('ai.agent.suggestedAction')}</p>
                            {Object.keys(action.action_data).length > 0 ? (
                              <div className="bg-muted p-2 rounded space-y-1.5 text-xs">
                                {action.action_data.response && (
                                  <div>
                                    <span className="font-medium">{t('ai.agent.response')} </span>
                                    <p className="text-muted-foreground mt-0.5">{action.action_data.response}</p>
                                  </div>
                                )}
                                {action.action_data.new_priority && (
                                  <div>
                                    <span className="font-medium">{t('ai.agent.newPriority')} </span>
                                    <span className="text-muted-foreground capitalize">{t(`tickets.${action.action_data.new_priority}` as any)}</span>
                                  </div>
                                )}
                                {action.action_data.new_status && (
                                  <div>
                                    <span className="font-medium">{t('ai.agent.newStatus')} </span>
                                    <span className="text-muted-foreground capitalize">{t(`tickets.${action.action_data.new_status}` as any)}</span>
                                  </div>
                                )}
                                {action.action_data.reason && (
                                  <div>
                                    <span className="font-medium">{t('ai.agent.reason')} </span>
                                    <span className="text-muted-foreground">{action.action_data.reason}</span>
                                  </div>
                                )}
                                {action.action_data.update_message && (
                                  <div>
                                    <span className="font-medium">{t('ai.agent.message')} </span>
                                    <p className="text-muted-foreground mt-0.5">{action.action_data.update_message}</p>
                                  </div>
                                )}
                                {action.action_data.follow_up_action && (
                                  <div>
                                    <span className="font-medium">{t('ai.agent.followUp')} </span>
                                    <span className="text-muted-foreground">{action.action_data.follow_up_action}</span>
                                  </div>
                                )}
                                {action.action_data.timeline && (
                                  <div>
                                    <span className="font-medium">{t('ai.agent.timeline')} </span>
                                    <span className="text-muted-foreground">{action.action_data.timeline}</span>
                                  </div>
                                )}
                                {action.action_data.escalate_to && (
                                  <div>
                                    <span className="font-medium">{t('ai.agent.escalateTo')} </span>
                                    <span className="text-muted-foreground">{action.action_data.escalate_to}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground bg-muted p-1.5 rounded">
                                {t('ai.agent.noActionData')}
                              </p>
                            )}
                          </div>

                          {(action.status === 'pending' || (action.status === 'executed' && !action.messageSent)) && (
                            <div className="space-y-2 pt-1">
                              {selectedAction === action.id && (
                                <Textarea
                                  placeholder={t('ai.agent.feedbackPlaceholder')}
                                  value={feedbackNotes}
                                  onChange={(e) => setFeedbackNotes(e.target.value)}
                                  rows={2}
                                  className="text-xs"
                                />
                              )}
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAction(action.id);
                                    approveAction(action.id);
                                  }}
                                  disabled={loading}
                                  className="flex-1 h-8 text-xs"
                                >
                                  <ThumbsUp className="w-3 h-3 mr-1" />
                                  {t('ai.agent.approve')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (selectedAction === action.id) {
                                      rejectAction(action.id);
                                    } else {
                                      setSelectedAction(action.id);
                                    }
                                  }}
                                  disabled={loading}
                                  className="flex-1 h-8 text-xs"
                                >
                                  <ThumbsDown className="w-3 h-3 mr-1" />
                                  {selectedAction === action.id ? t('ai.agent.confirmReject') : t('ai.agent.reject')}
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </CardContent>
      )}
    </Card>
  );
}