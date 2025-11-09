import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X, Send, User, Calendar, Mail, Clock, Sparkles, Loader2, Lock, Info, ArrowRightLeft, AlertTriangle, UserPlus, FileText, CheckCircle, RefreshCw, Phone, Languages, BookOpen, FileTextIcon, ChevronDown, Tag, Download, Shield, Edit2 } from "lucide-react";
import { format, type Locale } from "date-fns";
import { enUS, es, fr, de, fi, sv } from "date-fns/locale";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { SentimentBadge } from "@/components/SentimentBadge";
import { EditSentimentDialog } from "@/components/EditSentimentDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/RichTextEditor";
import { FileAttachment } from "@/components/FileAttachment";
import { AISafetyWarningDialog } from "@/components/AISafetyWarningDialog";
import { anonymizeTicketData, anonymizeMessages } from "@/utils/anonymizeData";
import AIAgentPanel from "@/components/AIAgentPanel";
import TicketLinksManager from "@/components/TicketLinksManager";

// Date locale mapping
const dateLocales: Record<string, Locale> = {
  en: enUS,
  es: es,
  fr: fr,
  de: de,
  fi: fi,
  sv: sv,
};

interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description?: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  sentiment?: string | null;
  urgency_score?: number | null;
  ai_status?: string;
  ai_confidence?: number;
}

interface TicketMessage {
  id: string;
  content: string;
  sender_name: string;
  sender_email: string;
  is_internal: boolean;
  created_at: string;
}

interface TicketActivity {
  id: string;
  activity_type: string;
  content?: string;
  old_value?: string;
  new_value?: string;
  created_by_name?: string;
  created_by_email?: string;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface TicketDetailProps {
  ticket: Ticket;
  onClose: () => void;
  onUpdate: () => void;
}

export default function TicketDetail({ ticket, onClose, onUpdate }: TicketDetailProps) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [assignedTo, setAssignedTo] = useState(ticket.assigned_to || "");
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [sentimentEnabled, setSentimentEnabled] = useState(false);
  const [aiAgentsEnabled, setAiAgentsEnabled] = useState(false);
  const [loadingSentiment, setLoadingSentiment] = useState(false);
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [knowledgeBaseEnabled, setKnowledgeBaseEnabled] = useState(false);
  const [summarizationEnabled, setSummarizationEnabled] = useState(false);
  const [translatedText, setTranslatedText] = useState<string>("");
  const [loadingTranslation, setLoadingTranslation] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
  const [loadingMessageTranslation, setLoadingMessageTranslation] = useState(false);
  const [knowledgeArticles, setKnowledgeArticles] = useState<string[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [conversationSummary, setConversationSummary] = useState<string>("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [editSentimentOpen, setEditSentimentOpen] = useState(false);
  const [activities, setActivities] = useState<TicketActivity[]>([]);
  const [internalNote, setInternalNote] = useState("");
  const [isInternalMessage, setIsInternalMessage] = useState(false);
  const [activeTab, setActiveTab] = useState("activity");
  const [loadingReplyTranslation, setLoadingReplyTranslation] = useState(false);
  const [templateSuggestionsEnabled, setTemplateSuggestionsEnabled] = useState(false);
  const [templateSuggestions, setTemplateSuggestions] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  
  // Get current date locale based on i18n language
  const currentLocale = dateLocales[i18n.language] || enUS;
  
  // PII Detection states
  const [piiClassification, setPiiClassification] = useState<any>(null);
  const [showAISafetyDialog, setShowAISafetyDialog] = useState(false);
  const [pendingAIAction, setPendingAIAction] = useState<((shouldAnonymize: boolean) => void) | null>(null);
  const [requireConsent, setRequireConsent] = useState(true);

  // Simple markdown to HTML converter for basic formatting
  const parseMarkdown = (text: string): string => {
    if (!text) return text;
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  useEffect(() => {
    loadMessages();
    loadTeamMembers();
    checkAISettings();
    loadActivities();
    loadAttachments();
    loadPIIClassification();
  }, [ticket.id]);

  const checkAISettings = async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .single();

    if (!profile?.organization_id) return;

    const { data: settings } = await supabase
      .from("organization_settings")
      .select("ai_enabled, ai_auto_suggest_responses, ai_sentiment_analysis, ai_translation_enabled, ai_knowledge_base_enabled, ai_summarization_enabled, ai_template_suggestions_enabled, ai_require_consent_for_pii, ai_agents_enabled")
      .eq("organization_id", profile.organization_id)
      .single();

    if (settings) {
      setAiEnabled(settings.ai_enabled && settings.ai_auto_suggest_responses);
      setSentimentEnabled(settings.ai_enabled && settings.ai_sentiment_analysis);
      setTranslationEnabled(settings.ai_enabled && settings.ai_translation_enabled);
      setKnowledgeBaseEnabled(settings.ai_enabled && settings.ai_knowledge_base_enabled);
      setSummarizationEnabled(settings.ai_enabled && settings.ai_summarization_enabled);
      setTemplateSuggestionsEnabled(settings.ai_enabled && settings.ai_template_suggestions_enabled);
      setRequireConsent(settings.ai_require_consent_for_pii !== false);
      setAiAgentsEnabled(settings.ai_enabled && settings.ai_agents_enabled);
    }
  };

  const loadPIIClassification = async () => {
    try {
      const { data, error } = await supabase
        .from("ticket_data_classification")
        .select("*")
        .eq("ticket_id", ticket.id)
        .maybeSingle();

      if (!error && data) {
        setPiiClassification(data);
      }
    } catch (error) {
      console.error("Error loading PII classification:", error);
    }
  };

  const checkPIIBeforeAI = (aiAction: (shouldAnonymize: boolean) => void) => {
    // If no PII detected or consent not required, proceed directly without anonymization
    if (!piiClassification?.contains_pii || !requireConsent) {
      aiAction(false);
      return;
    }

    // If consent already given, check if data was previously anonymized
    if (piiClassification.ai_usage_consent) {
      aiAction(piiClassification.data_anonymized || false);
      return;
    }

    // Show safety warning and store pending action
    setPendingAIAction(() => aiAction);
    setShowAISafetyDialog(true);
  };

  const handleAISafetyConsent = async (shouldAnonymize: boolean) => {
    if (piiClassification) {
      // Update classification with consent and anonymization preference
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from("ticket_data_classification")
        .update({
          ai_usage_consent: true,
          consent_given_at: new Date().toISOString(),
          consent_given_by: user?.id,
          data_anonymized: shouldAnonymize,
        })
        .eq("id", piiClassification.id);

      // Reload classification
      await loadPIIClassification();

      // Log activity
      await logActivity("ai_consent", undefined, undefined, shouldAnonymize ? t('tickets.userConsentedWithAnonymization') : t('tickets.userConsentedWithoutAnonymization'));

      // Execute pending AI action with anonymization preference
      if (pendingAIAction) {
        pendingAIAction(shouldAnonymize);
        setPendingAIAction(null);
      }
    }
    setShowAISafetyDialog(false);
  };

  const analyzeSentiment = async () => {
    if (!sentimentEnabled) return;

    checkPIIBeforeAI(async (shouldAnonymize) => {
      setLoadingSentiment(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user?.id)
          .single();

        const ticketData = shouldAnonymize && piiClassification?.pii_types
          ? anonymizeTicketData(ticket, piiClassification.pii_types)
          : ticket;
        const messagesData = shouldAnonymize && piiClassification?.pii_types
          ? anonymizeMessages(messages, piiClassification.pii_types)
          : messages;

        const { data, error } = await supabase.functions.invoke("ai-ticket-assistant", {
          body: {
            action: "analyze_sentiment",
            ticket: ticketData,
            messages: messagesData,
            organization_id: profile?.organization_id,
          },
        });

        if (error) throw error;

        if (data.sentiment) {
          const { error: updateError } = await supabase
            .from("tickets")
            .update({
              sentiment: data.sentiment,
              urgency_score: data.urgency_score,
            })
            .eq("id", ticket.id);

          if (updateError) throw updateError;

          toast({ title: t("ai.sentimentAnalyzed") });
          
          ticket.sentiment = data.sentiment;
          ticket.urgency_score = data.urgency_score;
        }
      } catch (error: any) {
        console.error("Error analyzing sentiment:", error);
        toast({ 
          title: t("ai.errorAnalyzingSentiment"), 
          description: error.message, 
          variant: "destructive" 
        });
      } finally {
        setLoadingSentiment(false);
      }
    });
  };

  const handleSaveSentiment = async (sentiment: string, urgency: number) => {
    try {
      const { error: updateError } = await supabase
        .from("tickets")
        .update({
          sentiment: sentiment,
          urgency_score: urgency,
        })
        .eq("id", ticket.id);

      if (updateError) throw updateError;

      toast({ title: "Sentiment and urgency updated successfully" });
      
      ticket.sentiment = sentiment;
      ticket.urgency_score = urgency;
    } catch (error: any) {
      console.error("Error updating sentiment:", error);
      toast({ 
        title: "Error updating sentiment", 
        description: error.message, 
        variant: "destructive" 
      });
      throw error;
    }
  };

  const refreshTicketData = async () => {
    // Reload ticket data from database
    const { data: ticketData, error: ticketError } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", ticket.id)
      .single();

    if (!ticketError && ticketData) {
      // Update local state with fresh ticket data
      Object.assign(ticket, ticketData);
      setStatus(ticketData.status);
      setPriority(ticketData.priority);
      setAssignedTo(ticketData.assigned_to || "");
    }

    // Reload related data
    loadMessages();
    loadActivities();
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });

    if (error) {
      toast({ title: "Error loading messages", variant: "destructive" });
      return;
    }

    setMessages(data || []);
  };

  const loadActivities = async () => {
    const { data, error } = await supabase
      .from("ticket_activities")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading activities:", error);
      return;
    }

    setActivities(data || []);
  };

  const loadAttachments = async () => {
    const { data, error } = await supabase
      .from("ticket_attachments")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading attachments:", error);
      return;
    }

    setAttachments(data || []);
  };

  const loadTeamMembers = async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .single();

    if (!profile?.organization_id) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("organization_id", profile.organization_id);

    if (!error && data) {
      setTeamMembers(data);
    }
  };

  const logActivity = async (activityType: string, oldValue?: string, newValue?: string, content?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user?.id)
      .single();

    await supabase.from("ticket_activities").insert({
      ticket_id: ticket.id,
      activity_type: activityType,
      content: content,
      old_value: oldValue,
      new_value: newValue,
      created_by: user?.id,
      created_by_name: profile?.full_name || "",
      created_by_email: profile?.email || "",
    });

    loadActivities();
  };

  const handleDownloadAttachment = async (attachment: { file_path: string; file_name: string }) => {
    try {
      const { data, error } = await supabase.storage
        .from("ticket-attachments")
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: "Download failed", description: error.message, variant: "destructive" });
    }
  };

  const handleAddInternalNote = async () => {
    if (!internalNote.trim()) return;

    setLoading(true);
    await logActivity("note", undefined, undefined, internalNote);
    setInternalNote("");
    toast({ title: t("tickets.internalNoteAdded") });
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user?.id)
      .single();

    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_id: user?.id,
      sender_email: profile?.email || "",
      sender_name: profile?.full_name || "",
      content: newMessage,
      is_internal: isInternalMessage,
    });

    if (error) {
      toast({ title: "Error sending message", variant: "destructive" });
    } else {
      setNewMessage("");
      setIsInternalMessage(false);
      loadMessages();
      loadAttachments(); // Reload attachments after sending
      toast({ title: "Message sent" });
    }
    setLoading(false);
  };

  const handleUpdateTicket = async () => {
    setLoading(true);
    
    const statusChanged = status !== ticket.status;
    const priorityChanged = priority !== ticket.priority;
    const assignmentChanged = assignedTo !== ticket.assigned_to && assignedTo !== "unassigned";
    const wasUnassigned = assignedTo === "unassigned" && ticket.assigned_to;
    
    const updates: any = { status, priority };
    if (assignedTo && assignedTo !== "unassigned") {
      updates.assigned_to = assignedTo;
    } else if (assignedTo === "unassigned") {
      updates.assigned_to = null;
    }
    if (status === "resolved" && ticket.status !== "resolved") {
      updates.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("tickets")
      .update(updates)
      .eq("id", ticket.id);

    if (error) {
      toast({ title: "Error updating ticket", variant: "destructive" });
    } else {
      if (statusChanged) {
        await logActivity("status_change", ticket.status, status);
      }
      if (priorityChanged) {
        await logActivity("priority_change", ticket.priority, priority);
      }
      if (assignmentChanged) {
        const assignedMember = teamMembers.find(m => m.id === assignedTo);
        await logActivity("assignment", ticket.assigned_to, assignedTo, assignedMember?.full_name || assignedMember?.email);
      }
      if (wasUnassigned) {
        await logActivity("assignment", ticket.assigned_to, null);
      }
      
      // Update local ticket object
      ticket.status = status;
      ticket.priority = priority;
      ticket.assigned_to = assignedTo === "unassigned" ? undefined : assignedTo;
      
      toast({ title: "Ticket updated" });
    }
    setLoading(false);
  };

  const generateAISuggestions = async () => {
    if (!aiEnabled) {
      toast({
        title: t('ai.disabled'),
        description: t('ai.enableInSettings'),
        variant: "destructive",
      });
      return;
    }

    checkPIIBeforeAI(async (shouldAnonymize) => {
      setLoadingAI(true);
      setAiSuggestions([]);

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .single();

        if (!profile?.organization_id) {
          throw new Error("Organization not found");
        }

        const ticketData = shouldAnonymize && piiClassification?.pii_types
          ? anonymizeTicketData(ticket, piiClassification.pii_types)
          : ticket;
        const messagesData = shouldAnonymize && piiClassification?.pii_types
          ? anonymizeMessages(messages, piiClassification.pii_types)
          : messages;

        const { data, error } = await supabase.functions.invoke('ai-ticket-assistant', {
          body: {
            action: 'suggest_responses',
            ticket: {
              title: ticketData.title,
              description: ticketData.description,
              priority: ticketData.priority,
              status: ticketData.status,
            },
            messages: messagesData,
            organization_id: profile.organization_id,
          }
        });

        if (error) throw error;

        if (data?.suggestions && Array.isArray(data.suggestions)) {
          setAiSuggestions(data.suggestions.slice(0, 3));
          toast({
            title: t('ai.suggestionsGenerated'),
            description: t('ai.clickToUse'),
          });
        } else {
          throw new Error("Invalid response format");
        }
      } catch (error: any) {
        console.error('AI suggestion error:', error);
        toast({
          title: t('ai.error'),
          description: error.message || t('ai.errorGenerating'),
          variant: "destructive",
        });
      } finally {
        setLoadingAI(false);
      }
    });
  };

  const translateTicket = async (targetLanguage: string = 'en') => {
    if (!translationEnabled) {
      toast({
        title: "Translation disabled",
        description: "Enable translation in Settings to use this feature",
        variant: "destructive",
      });
      return;
    }

    checkPIIBeforeAI(async (shouldAnonymize) => {
      setLoadingTranslation(true);
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .single();

        const ticketData = shouldAnonymize && piiClassification?.pii_types
          ? anonymizeTicketData(ticket, piiClassification.pii_types)
          : ticket;

        const { data, error } = await supabase.functions.invoke('ai-ticket-assistant', {
          body: {
            action: 'translate',
            ticket: ticketData,
            targetLanguage,
            organization_id: profile?.organization_id,
          }
        });

        if (error) throw error;
        
        // Filter out conversation-related lines from the translation
        let cleanedTranslation = data.translated_text;
        if (cleanedTranslation) {
          // Remove lines that start with conversation-related keywords
          const lines = cleanedTranslation.split('\n');
          const filteredLines = lines.filter((line: string) => {
            const trimmedLine = line.trim();
            // Filter out lines starting with conversation-related keywords in multiple languages
            return !trimmedLine.match(/^(Conversation|Keskustelu|Conversación|Conversation|Unterhaltung|Konversation|Conversazione|Conversa):/i);
          });
          cleanedTranslation = filteredLines.join('\n').trim();
        }
        
        setTranslatedText(cleanedTranslation);
        toast({ title: "Translation completed" });
      } catch (error: any) {
        toast({ title: "Translation failed", description: error.message, variant: "destructive" });
      } finally {
        setLoadingTranslation(false);
      }
    });
  };

  const translateConversation = async (targetLanguage: string = 'en') => {
    if (!translationEnabled) {
      toast({
        title: "Translation disabled",
        description: "Enable translation in Settings to use this feature",
        variant: "destructive",
      });
      return;
    }

    checkPIIBeforeAI(async (shouldAnonymize) => {
      setLoadingMessageTranslation(true);
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .single();

        const publicMessages = messages.filter(m => !m.is_internal);
        const messagesData = shouldAnonymize && piiClassification?.pii_types
          ? anonymizeMessages(publicMessages, piiClassification.pii_types)
          : publicMessages;
        
        const { data, error } = await supabase.functions.invoke('ai-ticket-assistant', {
          body: {
            action: 'translate',
            ticket: { title: '', description: '' },
            messages: messagesData,
            targetLanguage,
            organization_id: profile?.organization_id,
          }
        });

        if (error) throw error;
        
        // The edge function returns message_translations as a Record<string, string>
        if (data.message_translations) {
          setTranslatedMessages(data.message_translations);
        }
        
        toast({ title: "Conversation translated" });
      } catch (error: any) {
        toast({ title: "Translation failed", description: error.message, variant: "destructive" });
      } finally {
        setLoadingMessageTranslation(false);
      }
    });
  };

  const translateReply = async (targetLanguage: string = 'en') => {
    if (!translationEnabled) {
      toast({
        title: "Translation disabled",
        description: "Enable translation in Settings to use this feature",
        variant: "destructive",
      });
      return;
    }

    if (!newMessage.trim()) {
      toast({
        title: "No message to translate",
        variant: "destructive",
      });
      return;
    }

    checkPIIBeforeAI(async (shouldAnonymize) => {
      setLoadingReplyTranslation(true);
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .single();

        const messagesData = shouldAnonymize && piiClassification?.pii_types
          ? anonymizeMessages([{ id: 'temp', content: newMessage, sender_email: '', sender_name: '', is_internal: false, created_at: '' }], piiClassification.pii_types)
          : [{ id: 'temp', content: newMessage }];

        const { data, error } = await supabase.functions.invoke('ai-ticket-assistant', {
          body: {
            action: 'translate',
            ticket: { title: '', description: '' },
            messages: messagesData,
            targetLanguage,
            organization_id: profile?.organization_id,
          }
        });

        if (error) throw error;
        
        // Update the message with the translation
        if (data.message_translations && data.message_translations['temp']) {
          setNewMessage(data.message_translations['temp']);
          toast({ title: "Message translated" });
        }
      } catch (error: any) {
        toast({ title: "Translation failed", description: error.message, variant: "destructive" });
      } finally {
        setLoadingReplyTranslation(false);
      }
    });
  };

  const getKnowledgeBaseSuggestions = async () => {
    if (!knowledgeBaseEnabled) {
      toast({
        title: "Knowledge base disabled",
        description: "Enable knowledge base in Settings to use this feature",
        variant: "destructive",
      });
      return;
    }

    checkPIIBeforeAI(async (shouldAnonymize) => {
      setLoadingKnowledge(true);
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .single();

        const ticketData = shouldAnonymize && piiClassification?.pii_types
          ? anonymizeTicketData(ticket, piiClassification.pii_types)
          : ticket;
        const messagesData = shouldAnonymize && piiClassification?.pii_types
          ? anonymizeMessages(messages, piiClassification.pii_types)
          : messages;

        const { data, error } = await supabase.functions.invoke('ai-ticket-assistant', {
          body: {
            action: 'suggest_knowledge',
            ticket: ticketData,
            messages: messagesData,
            organization_id: profile?.organization_id,
          }
        });

        if (error) throw error;
        setKnowledgeArticles(data.articles || []);
        toast({ title: "Knowledge articles suggested" });
      } catch (error: any) {
        toast({ title: "Failed to get suggestions", description: error.message, variant: "destructive" });
      } finally {
        setLoadingKnowledge(false);
      }
    });
  };

  const summarizeConversation = async () => {
    if (!summarizationEnabled) {
      toast({
        title: "Summarization disabled",
        description: "Enable summarization in Settings to use this feature",
        variant: "destructive",
      });
      return;
    }

    checkPIIBeforeAI(async (shouldAnonymize) => {
      setLoadingSummary(true);
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .single();

        const ticketData = shouldAnonymize && piiClassification?.pii_types
          ? anonymizeTicketData(ticket, piiClassification.pii_types)
          : ticket;
        const messagesData = shouldAnonymize && piiClassification?.pii_types
          ? anonymizeMessages(messages, piiClassification.pii_types)
          : messages;

        const { data, error } = await supabase.functions.invoke('ai-ticket-assistant', {
          body: {
            action: 'summarize',
            ticket: ticketData,
            messages: messagesData,
            organization_id: profile?.organization_id,
          }
        });

        if (error) throw error;
        setConversationSummary(data.summary);
        toast({ title: "Summary generated" });
      } catch (error: any) {
        toast({ title: "Failed to summarize", description: error.message, variant: "destructive" });
      } finally {
        setLoadingSummary(false);
      }
    });
  };

  const loadSavedTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();

      if (!profile?.organization_id) return;

      const { data, error } = await supabase
        .from("response_templates")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplateSuggestions(data || []);
      setTemplateDialogOpen(true);
    } catch (error: any) {
      toast({ title: "Failed to load templates", description: error.message, variant: "destructive" });
    } finally {
      setLoadingTemplates(false);
    }
  };

  const applyTemplateVariables = (content: string): string => {
    return content
      .replace(/\{\{customer_name\}\}/g, ticket.customer_name || "")
      .replace(/\{\{customer_email\}\}/g, ticket.customer_email || "")
      .replace(/\{\{ticket_number\}\}/g, ticket.ticket_number || "")
      .replace(/\{\{ticket_title\}\}/g, ticket.title || "");
  };

  const handleTemplateSelect = (template: any) => {
    const processedContent = applyTemplateVariables(template.content);
    setNewMessage(processedContent);
    setTemplateDialogOpen(false);
    toast({ title: "Template applied" });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 md:p-4">
      <div className="w-full max-w-6xl h-[98vh] md:h-[95vh] bg-card rounded-lg border border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 lg:py-6 border-b border-border bg-card">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                <span className="text-xs sm:text-sm font-mono font-medium text-muted-foreground bg-muted px-1.5 sm:px-2 py-0.5 sm:py-1 rounded shrink-0">
                  {ticket.ticket_number}
                </span>
                <StatusBadge status={status} onEdit={() => setActiveTab("management")} />
                <PriorityBadge priority={priority} onEdit={() => setActiveTab("management")} />
                <SentimentBadge
                  sentiment={ticket.sentiment} 
                  urgencyScore={ticket.urgency_score}
                  onEdit={() => setEditSentimentOpen(true)}
                />
                
                {/* PII Indicator Badges */}
                {piiClassification?.contains_pii && (
                  <>
                    <Badge variant="destructive" className="h-6 text-xs gap-1">
                      <Lock className="h-3 w-3" />
                      {t('privacy.containsPII')}
                    </Badge>
                    {piiClassification.sensitivity_level === 'high' || piiClassification.sensitivity_level === 'critical' && (
                      <Badge variant="destructive" className="h-6 text-xs gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {t('privacy.sensitiveData')}
                      </Badge>
                    )}
                    {piiClassification.ai_usage_consent && (
                      <Badge variant="secondary" className="h-6 text-xs gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {t('privacy.consentRequired')}
                      </Badge>
                    )}
                  </>
                )}
                
                {sentimentEnabled && !ticket.sentiment && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={analyzeSentiment}
                    disabled={loadingSentiment}
                    className="h-6 sm:h-7 text-xs"
                  >
                    {loadingSentiment ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        <span className="hidden sm:inline">{t("ai.analyzing")}</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">{t("ai.analyzeSentiment")}</span>
                        <span className="sm:hidden">Analyze</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
              <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold break-words pr-2">{ticket.title}</h2>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 shrink-0">
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto lg:overflow-hidden">
          <div className="flex flex-col lg:grid lg:grid-cols-[60%_40%] gap-3 sm:gap-4 md:gap-6 lg:gap-10 p-3 sm:p-4 md:p-6 lg:p-8 lg:h-full">
            {/* Left Column - Description, Conversation & Reply */}
            <div className="space-y-3 sm:space-y-4 md:space-y-6 lg:space-y-8 lg:overflow-y-auto lg:pr-2">
              {/* Description */}
              <Card className="border-border/50">
                <CardHeader className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 lg:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <CardTitle className="text-sm sm:text-base font-semibold">{t('tickets.description')}</CardTitle>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (isEditingDescription) {
                          setIsEditingDescription(false);
                        } else {
                          setEditedDescription(ticket.description || "");
                          setIsEditingDescription(true);
                        }
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {translationEnabled && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={loadingTranslation}
                          >
                            {loadingTranslation ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Languages className="h-4 w-4 mr-1" />
                                <ChevronDown className="h-3 w-3" />
                              </>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => translateTicket('en')}>
                            {t('tickets.languages.english')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => translateTicket('es')}>
                            {t('tickets.languages.spanish')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => translateTicket('fr')}>
                            {t('tickets.languages.french')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => translateTicket('de')}>
                            {t('tickets.languages.german')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => translateTicket('fi')}>
                            {t('tickets.languages.finnish')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => translateTicket('sv')}>
                            {t('tickets.languages.swedish')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => translateTicket('ja')}>
                            {t('tickets.languages.japanese')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => translateTicket('zh')}>
                            {t('tickets.languages.chinese')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => translateTicket('pt')}>
                            {t('tickets.languages.portuguese')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => translateTicket('it')}>
                            {t('tickets.languages.italian')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {summarizationEnabled && messages.length > 3 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={summarizeConversation}
                        disabled={loadingSummary}
                      >
                        {loadingSummary ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileTextIcon className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    {knowledgeBaseEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={getKnowledgeBaseSuggestions}
                        disabled={loadingKnowledge}
                      >
                        {loadingKnowledge ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <BookOpen className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 md:px-6 lg:px-8 pb-4 sm:pb-6 md:pb-8 space-y-3 sm:space-y-4">
                  {isEditingDescription ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        className="min-h-[150px]"
                        placeholder={t('tickets.description')}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('tickets')
                                .update({ description: editedDescription })
                                .eq('id', ticket.id);

                              if (error) throw error;

                              ticket.description = editedDescription;
                              setIsEditingDescription(false);
                              toast({
                                title: t('tickets.updated'),
                                description: t('tickets.descriptionUpdated'),
                              });
                              onUpdate?.();
                            } catch (error) {
                              console.error('Error updating description:', error);
                              toast({
                                title: t('common.error'),
                                description: t('tickets.updateError'),
                                variant: 'destructive',
                              });
                            }
                          }}
                        >
                          {t('common.save')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditingDescription(false)}
                        >
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                      {ticket.description || t('tickets.noDescription')}
                    </p>
                  )}
                  {translatedText && (
                    <div className="border-t pt-4">
                      <p className="text-xs text-muted-foreground mb-2">{t('tickets.translated')}:</p>
                      <div 
                        className="text-sm text-foreground/80 leading-relaxed prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(translatedText) }}
                      />
                    </div>
                  )}
                  {conversationSummary && (
                    <div className="border-t pt-4">
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <FileTextIcon className="h-3 w-3" />
                        {t('tickets.summary')}:
                      </p>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                        {conversationSummary}
                      </p>
                    </div>
                  )}
                  {knowledgeArticles.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {t('tickets.suggestedArticles')}:
                      </p>
                      <ul className="space-y-2">
                        {knowledgeArticles.map((article, idx) => (
                          <li key={idx}>
                            <a 
                              href={`https://www.google.com/search?q=${encodeURIComponent(article)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              {article}
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Agent Panel */}
              {aiAgentsEnabled && (
                <AIAgentPanel 
                  ticketId={ticket.id}
                  aiStatus={ticket.ai_status}
                  aiConfidence={ticket.ai_confidence}
                  onActionApproved={refreshTicketData}
                />
              )}

              {/* Conversation */}
              <Card className="border-border/50">
                <CardHeader className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 lg:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <CardTitle className="text-sm sm:text-base font-semibold">{t('tickets.conversation')}</CardTitle>
                  {translationEnabled && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loadingMessageTranslation}
                        >
                          {loadingMessageTranslation ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Languages className="h-4 w-4 mr-1" />
                              <ChevronDown className="h-3 w-3" />
                            </>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => translateConversation('en')}>
                          {t('tickets.languages.english')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => translateConversation('es')}>
                          {t('tickets.languages.spanish')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => translateConversation('fr')}>
                          {t('tickets.languages.french')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => translateConversation('de')}>
                          {t('tickets.languages.german')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => translateConversation('fi')}>
                          {t('tickets.languages.finnish')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => translateConversation('sv')}>
                          {t('tickets.languages.swedish')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => translateConversation('ja')}>
                          {t('tickets.languages.japanese')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => translateConversation('zh')}>
                          {t('tickets.languages.chinese')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => translateConversation('pt')}>
                          {t('tickets.languages.portuguese')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => translateConversation('it')}>
                          {t('tickets.languages.italian')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardHeader>
                <CardContent className="px-3 sm:px-4 md:px-6 lg:px-8 pb-4 sm:pb-6 md:pb-8">
                  <div className="max-h-[30vh] sm:max-h-[35vh] lg:max-h-[45vh] overflow-y-auto pr-1 sm:pr-2 md:pr-3 lg:pr-6">
                    <div className="space-y-3 sm:space-y-4 md:space-y-6">
                       {messages.filter(m => !m.is_internal).map((message) => (
                        <div key={message.id} className="flex gap-2 sm:gap-3 md:gap-4 group">
                          <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <User className="h-3 w-3 sm:h-4 sm:w-4" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                              <span className="font-semibold text-xs sm:text-sm truncate">{message.sender_name}</span>
                              <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                {format(new Date(message.created_at), "MMM d, h:mm a", { locale: currentLocale })}
                              </span>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-2.5 sm:p-3 md:p-4 text-xs sm:text-sm leading-relaxed break-words prose prose-sm max-w-none">
                              <div dangerouslySetInnerHTML={{ __html: message.content }} />
                            </div>
                            {translatedMessages[message.id] && (
                              <div className="border-t pt-2 mt-2">
                                <p className="text-xs text-muted-foreground mb-1">Translated:</p>
                                <div 
                                  className="rounded-lg bg-muted/30 p-3 text-sm leading-relaxed prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{ __html: parseMarkdown(translatedMessages[message.id]) }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {messages.filter(m => !m.is_internal).length === 0 && (
                        <div className="flex h-[200px] items-center justify-center">
                          <p className="text-sm text-muted-foreground">{t('tickets.noMessages')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Suggestions */}
              {aiSuggestions.length > 0 && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6">
                    <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                      <Sparkles className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm sm:text-base">{t('ai.suggestions')}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">{t('ai.generatedBy')}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 space-y-3">
                    {aiSuggestions.map((suggestion, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        className="w-full text-left justify-start h-auto py-3 px-4 whitespace-normal"
                        onClick={() => {
                          setNewMessage(suggestion);
                          setAiSuggestions([]);
                        }}
                      >
                        <span className="text-sm">{suggestion}</span>
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setAiSuggestions([])}
                    >
                      {t('common.dismiss')}
                    </Button>
                  </CardContent>
                </Card>
              )}


              {/* Reply Box */}
              <Card className="border-border/50">
                <CardContent className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 lg:py-8 space-y-3 sm:space-y-4">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {aiEnabled && messages.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateAISuggestions}
                        disabled={loadingAI}
                        className="text-xs sm:text-sm h-8 sm:h-9"
                      >
                        {loadingAI ? (
                          <>
                            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                            <span className="hidden sm:inline">{t('ai.generating')}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                            <span className="hidden sm:inline">{t('ai.suggestResponse')}</span>
                            <span className="sm:hidden">AI</span>
                          </>
                      )}
                    </Button>
                    )}
                    {templateSuggestionsEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadSavedTemplates}
                        disabled={loadingTemplates}
                        className="text-xs sm:text-sm h-8 sm:h-9"
                      >
                        {loadingTemplates ? (
                          <>
                            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                            <span className="hidden sm:inline">{t('ai.loadingTemplates') || 'Loading...'}</span>
                          </>
                        ) : (
                          <>
                            <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                            <span className="hidden sm:inline">{t('ai.suggestTemplates') || 'Templates'}</span>
                            <span className="sm:hidden">Templates</span>
                          </>
                        )}
                      </Button>
                    )}
                    {translationEnabled && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={loadingReplyTranslation || !newMessage.trim()}
                          >
                            {loadingReplyTranslation ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Languages className="h-4 w-4 mr-2" />
                                {t('tickets.translate')}
                                <ChevronDown className="h-3 w-3 ml-1" />
                              </>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => translateReply('en')}>
                            {t('tickets.languages.english')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => translateReply('es')}>
                            {t('tickets.languages.spanish')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => translateReply('fr')}>
                            {t('tickets.languages.french')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => translateReply('de')}>
                            {t('tickets.languages.german')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => translateReply('fi')}>
                            {t('tickets.languages.finnish')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => translateReply('sv')}>
                            {t('tickets.languages.swedish')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => translateReply('ja')}>
                            {t('tickets.languages.japanese')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => translateReply('zh')}>
                            {t('tickets.languages.chinese')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => translateReply('pt')}>
                            {t('tickets.languages.portuguese')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => translateReply('it')}>
                            {t('tickets.languages.italian')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="space-y-3 p-1">
                    <RichTextEditor
                      content={newMessage}
                      onChange={setNewMessage}
                      placeholder={t('tickets.typeReply')}
                      teamMembers={teamMembers}
                    />
                    <FileAttachment 
                      ticketId={ticket.id} 
                      onAttachmentChange={loadAttachments}
                      lastMessageTime={messages.length > 0 ? messages[messages.length - 1].created_at : undefined}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 order-2 sm:order-1">
                      <Checkbox
                        id="internal"
                        checked={isInternalMessage}
                        onCheckedChange={(checked) => setIsInternalMessage(checked as boolean)}
                      />
                      <Label htmlFor="internal" className="text-xs sm:text-sm cursor-pointer">
                        {t('tickets.markAsInternal')}
                      </Label>
                    </div>
                    <Button onClick={handleSendMessage} disabled={loading || !newMessage.trim()} className="gap-2 order-1 sm:order-2 h-9 text-sm">
                      <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {t('tickets.sendReply')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Tabbed Interface */}
            <div className="flex flex-col overflow-hidden">
              <Card className="border-border/50 flex-1 flex flex-col overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                  <CardHeader className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 lg:py-6 pb-3 sm:pb-4 md:pb-5 lg:pb-6">
                    <TabsList className="grid w-full grid-cols-3 h-9 sm:h-10 md:h-11 gap-0.5 sm:gap-1">
                      <TabsTrigger value="activity" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2">{t('tickets.activity')}</TabsTrigger>
                      <TabsTrigger value="customer" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2">{t('tickets.customer')}</TabsTrigger>
                      <TabsTrigger value="management" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2">{t('tickets.management')}</TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  
                  <CardContent className="flex-1 px-3 sm:px-4 md:px-6 lg:px-8 pb-4 sm:pb-6 md:pb-8 flex flex-col overflow-hidden pt-0">
                    {/* Activity Tab */}
                    <TabsContent value="activity" className="flex-1 flex flex-col space-y-6 mt-0 overflow-hidden pt-0 data-[state=inactive]:hidden">
                      <ScrollArea className="flex-1 pr-3 sm:pr-4 lg:pr-6">
                        <div className="space-y-5">
                          {[...activities, ...messages.map(m => ({
                            id: m.id,
                            activity_type: m.is_internal ? 'internal_message' : 'message',
                            content: m.content,
                            created_by_name: m.sender_name,
                            created_by_email: m.sender_email,
                            created_at: m.created_at
                          }))].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((activity) => (
                            <div key={activity.id} className="pb-5 border-b border-border/50 last:border-0 last:pb-0">
                              <div className="flex items-start gap-4">
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                  activity.activity_type === 'note' || activity.activity_type === 'internal_message' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 
                                  activity.activity_type === 'message' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 
                                  'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                }`}>
                                  {activity.activity_type === 'note' ? <FileText className="h-4 w-4" /> :
                                   activity.activity_type === 'internal_message' ? <Lock className="h-4 w-4" /> :
                                   activity.activity_type === 'message' ? <Send className="h-4 w-4" /> :
                                   activity.activity_type === 'status_change' ? <ArrowRightLeft className="h-4 w-4" /> :
                                   activity.activity_type === 'priority_change' ? <AlertTriangle className="h-4 w-4" /> :
                                   activity.activity_type === 'assignment' ? <UserPlus className="h-4 w-4" /> :
                                   <Info className="h-4 w-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2.5">
                                   <Badge variant={activity.activity_type === 'note' || activity.activity_type === 'internal_message' ? 'default' : 'secondary'} className="text-xs">
                                      {activity.activity_type === 'note' ? t('tickets.internal') :
                                       activity.activity_type === 'internal_message' ? t('tickets.internal') :
                                       activity.activity_type === 'message' ? t('tickets.message') :
                                       t('tickets.systemActivity')}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(activity.created_at), "MMM d, h:mm a", { locale: currentLocale })}
                                    </span>
                                  </div>
                                   <p className="text-xs font-medium text-muted-foreground mb-2.5">
                                     {activity.created_by_name}
                                   </p>
                                   {activity.activity_type === 'note' || activity.activity_type === 'internal_message' || activity.activity_type === 'message' ? (
                                     <div 
                                       className="text-sm leading-relaxed text-foreground/90 prose prose-sm max-w-none"
                                       dangerouslySetInnerHTML={{ __html: activity.content || '' }}
                                     />
                                   ) : (
                                      <p className="text-sm leading-relaxed text-foreground/90">
                                        {activity.activity_type === 'status_change' ? t('tickets.statusChangedFrom', { old: t(`tickets.${(activity as TicketActivity).old_value}`), new: t(`tickets.${(activity as TicketActivity).new_value}`) }) :
                                         activity.activity_type === 'priority_change' ? t('tickets.priorityChangedFrom', { old: t(`tickets.${(activity as TicketActivity).old_value}`), new: t(`tickets.${(activity as TicketActivity).new_value}`) }) :
                                         activity.activity_type === 'assignment' && (activity as TicketActivity).new_value ? t('tickets.assignedTo', { name: activity.content }) :
                                         activity.activity_type === 'assignment' && !(activity as TicketActivity).new_value ? t('tickets.unassignedFrom', { name: activity.content || t('tickets.previousAssignee') }) :
                                         activity.activity_type === 'ai_consent' && activity.content?.includes('with data anonymization') ? t('tickets.userConsentedWithAnonymization') :
                                         activity.activity_type === 'ai_consent' && activity.content?.includes('without anonymization') ? t('tickets.userConsentedWithoutAnonymization') :
                                         activity.content}
                                      </p>
                                   )}
                                   
                                   {/* Show attachments if this is a message */}
                                   {(activity.activity_type === 'message' || activity.activity_type === 'internal_message') && attachments.filter(att => {
                                     const messageTime = new Date(activity.created_at).getTime();
                                     const attachTime = new Date(att.created_at).getTime();
                                     return Math.abs(messageTime - attachTime) < 60000; // Within 1 minute
                                   }).length > 0 && (
                                     <div className="mt-3 space-y-2">
                                       {attachments.filter(att => {
                                         const messageTime = new Date(activity.created_at).getTime();
                                         const attachTime = new Date(att.created_at).getTime();
                                         return Math.abs(messageTime - attachTime) < 60000;
                                       }).map((attachment) => (
                                          <div key={attachment.id} className="flex items-center gap-1.5 p-2 bg-muted/50 rounded text-xs max-w-[220px]">
                                            <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                            <span className="flex-1 truncate min-w-0 text-[11px]">{attachment.file_name}</span>
                                            <span className="text-muted-foreground flex-shrink-0 text-[10px] whitespace-nowrap">
                                              {(attachment.file_size / 1024).toFixed(1)}KB
                                            </span>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleDownloadAttachment(attachment)}
                                              className="h-5 w-5 flex-shrink-0"
                                              title="Download"
                                            >
                                              <Download className="h-3 w-3" />
                                            </Button>
                                          </div>
                                       ))}
                                     </div>
                                   )}
                                </div>
                              </div>
                            </div>
                          ))}
                          {activities.length === 0 && messages.length === 0 && (
                            <div className="flex h-[200px] items-center justify-center">
                              <p className="text-sm text-muted-foreground">{t('tickets.noActivities')}</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                      
                      {/* Add Internal Note */}
                      <div className="space-y-3 pt-6 pb-2 border-t border-border">
                        <Label className="text-sm font-semibold">{t('tickets.addInternalNote')}</Label>
                        <div className="p-1">
                          <Textarea
                            placeholder={t('tickets.typeInternalNote')}
                            value={internalNote}
                            onChange={(e) => setInternalNote(e.target.value)}
                            rows={3}
                            className="resize-none"
                          />
                        </div>
                        <Button
                          onClick={handleAddInternalNote}
                          disabled={loading || !internalNote.trim()}
                          size="sm"
                          className="w-full"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          {t('tickets.addNote')}
                        </Button>
                      </div>
                    </TabsContent>

                    {/* Customer Tab */}
                    <TabsContent value="customer" className="flex-1 mt-0 overflow-hidden pt-0">
                      <ScrollArea className="h-full pr-3 sm:pr-4 lg:pr-6">
                        <div>
                          <div className="space-y-5">
                            <div className="flex items-start gap-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs text-muted-foreground mb-1.5 font-medium">{t('tickets.name')}</p>
                                <p className="font-semibold text-sm">{ticket.customer_name || t('tickets.unknown')}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <Mail className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs text-muted-foreground mb-1.5 font-medium">{t('tickets.email')}</p>
                                <p className="font-semibold text-sm break-all">{ticket.customer_email || t('tickets.unknown')}</p>
                              </div>
                            </div>
                            {ticket.customer_phone && (
                              <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                  <Phone className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs text-muted-foreground mb-1.5 font-medium">{t('tickets.phone')}</p>
                                  <p className="font-semibold text-sm">{ticket.customer_phone}</p>
                                </div>
                              </div>
                            )}
                            <div className="flex items-start gap-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <Calendar className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs text-muted-foreground mb-1.5 font-medium">{t('tickets.created')}</p>
                                <p className="font-semibold text-sm">{format(new Date(ticket.created_at), "PPp", { locale: currentLocale })}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <RefreshCw className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs text-muted-foreground mb-1.5 font-medium">{t('tickets.lastUpdated')}</p>
                                <p className="font-semibold text-sm">{format(new Date(ticket.updated_at), "PPp", { locale: currentLocale })}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    {/* Management Tab */}
                    <TabsContent value="management" className="flex-1 mt-0 overflow-hidden pt-0">
                      <ScrollArea className="h-full pr-3 sm:pr-4 lg:pr-6">
                        <div className="p-1">
                          <div className="space-y-4 mt-6">
                            <Label className="text-sm font-semibold">{t('tickets.status')}</Label>
                            <div className="p-1">
                              <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                                <SelectTrigger className="h-12">
                                  <SelectValue>
                                    {status === 'open' && t('tickets.open')}
                                    {status === 'in_progress' && t('tickets.inProgress')}
                                    {status === 'resolved' && t('tickets.resolved')}
                                    {status === 'closed' && t('tickets.closed')}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">{t('tickets.open')}</SelectItem>
                                  <SelectItem value="in_progress">{t('tickets.inProgress')}</SelectItem>
                                  <SelectItem value="resolved">{t('tickets.resolved')}</SelectItem>
                                  <SelectItem value="closed">{t('tickets.closed')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-4 mt-6">
                            <Label className="text-sm font-semibold">{t('tickets.priority')}</Label>
                            <div className="p-1">
                              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                                <SelectTrigger className="h-12">
                                  <SelectValue>
                                    {priority === 'low' && t('tickets.low')}
                                    {priority === 'medium' && t('tickets.medium')}
                                    {priority === 'high' && t('tickets.high')}
                                    {priority === 'urgent' && t('tickets.urgent')}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">{t('tickets.low')}</SelectItem>
                                  <SelectItem value="medium">{t('tickets.medium')}</SelectItem>
                                  <SelectItem value="high">{t('tickets.high')}</SelectItem>
                                  <SelectItem value="urgent">{t('tickets.urgent')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-4 mt-6">
                            <Label className="text-sm font-semibold">{t('tickets.assignTo')}</Label>
                            <div className="p-1">
                              <Select
                                value={assignedTo || "unassigned"} 
                                onValueChange={(value) => setAssignedTo(value)}
                              >
                                <SelectTrigger className="h-12">
                                  <SelectValue>
                                    {(!assignedTo || assignedTo === "unassigned") && t('tickets.unassigned')}
                                    {assignedTo && assignedTo !== "unassigned" && (
                                      teamMembers.find(m => m.id === assignedTo)?.full_name || 
                                      teamMembers.find(m => m.id === assignedTo)?.email
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">{t('tickets.unassigned')}</SelectItem>
                                  {teamMembers.map((member) => (
                                    <SelectItem key={member.id} value={member.id}>
                                      {member.full_name || member.email}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Ticket Links Section */}
                          <div className="mt-8 mb-8">
                            <TicketLinksManager ticketId={ticket.id} />
                          </div>

                          <Button
                            onClick={handleUpdateTicket} 
                            disabled={loading} 
                            className="w-full h-12 mt-8 mb-2 text-base font-semibold"
                          >
                            {loading ? t('tickets.updating') : t('tickets.updateTicket')}
                          </Button>
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <EditSentimentDialog
        open={editSentimentOpen}
        onOpenChange={setEditSentimentOpen}
        currentSentiment={ticket.sentiment}
        currentUrgency={ticket.urgency_score}
        onSave={handleSaveSentiment}
      />

      <AISafetyWarningDialog
        open={showAISafetyDialog}
        onOpenChange={setShowAISafetyDialog}
        piiTypes={piiClassification?.pii_types || []}
        sensitivityLevel={piiClassification?.sensitivity_level || 'low'}
        gdprRelevant={piiClassification?.gdpr_relevant || false}
        onProceed={handleAISafetyConsent}
        onCancel={() => {
          setShowAISafetyDialog(false);
          setPendingAIAction(null);
        }}
      />

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('ai.selectTemplate') || 'Select Template'}
            </DialogTitle>
            <DialogDescription>
              {t('ai.selectTemplateDescription') || 'Choose a template to use for your response'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-3">
              {templateSuggestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('templates.noTemplates') || 'No templates available'}</p>
                </div>
              ) : (
                templateSuggestions.map((template) => (
                  <Card 
                    key={template.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{template.name}</h3>
                          <Badge variant="outline">{template.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {template.content}
                        </p>
                        {template.tags && template.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {template.tags.map((tag: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
