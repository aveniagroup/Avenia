import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { 
  Link2, 
  ExternalLink, 
  Plus, 
  Trash2, 
  X,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InternalLink {
  id: string;
  related_ticket_id: string;
  relationship_type: string;
  description: string | null;
  created_at: string;
  ticket_number?: string;
  ticket_title?: string;
}

interface ExternalLink {
  id: string;
  external_system: string;
  external_ticket_id: string;
  external_ticket_url: string | null;
  description: string | null;
  created_at: string;
}

interface TicketLinksManagerProps {
  ticketId: string;
}

export default function TicketLinksManager({ ticketId }: TicketLinksManagerProps) {
  const [internalLinks, setInternalLinks] = useState<InternalLink[]>([]);
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInternalDialog, setShowInternalDialog] = useState(false);
  const [showExternalDialog, setShowExternalDialog] = useState(false);
  const [availableTickets, setAvailableTickets] = useState<any[]>([]);
  
  // Internal link form
  const [selectedTicket, setSelectedTicket] = useState('');
  const [relationshipType, setRelationshipType] = useState('related');
  const [internalDescription, setInternalDescription] = useState('');
  
  // External link form
  const [externalSystem, setExternalSystem] = useState('');
  const [externalTicketId, setExternalTicketId] = useState('');
  const [externalTicketUrl, setExternalTicketUrl] = useState('');
  const [externalDescription, setExternalDescription] = useState('');
  
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    loadLinks();
    loadAvailableTickets();
  }, [ticketId]);

  const loadLinks = async () => {
    try {
      // Load internal links
      const { data: internalData, error: internalError } = await supabase
        .from('ticket_relationships')
        .select('*, related_ticket:tickets!ticket_relationships_related_ticket_id_fkey(ticket_number, title)')
        .eq('ticket_id', ticketId);

      if (internalError) throw internalError;

      const formattedInternal = internalData?.map(link => ({
        ...link,
        ticket_number: link.related_ticket?.ticket_number,
        ticket_title: link.related_ticket?.title
      })) || [];

      setInternalLinks(formattedInternal);

      // Load external links
      const { data: externalData, error: externalError } = await supabase
        .from('external_ticket_links')
        .select('*')
        .eq('ticket_id', ticketId);

      if (externalError) throw externalError;
      setExternalLinks(externalData || []);
    } catch (error) {
      console.error('Error loading links:', error);
    }
  };

  const loadAvailableTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('tickets')
        .select('id, ticket_number, title')
        .eq('organization_id', profile.organization_id)
        .neq('id', ticketId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAvailableTickets(data || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  const addInternalLink = async () => {
    if (!selectedTicket) {
      toast({
        title: t('common.error'),
        description: t('tickets.links.selectTicketError'),
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('ticket_relationships')
        .insert({
          ticket_id: ticketId,
          related_ticket_id: selectedTicket,
          relationship_type: relationshipType as any,
          description: internalDescription || null,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('tickets.links.linkSuccess')
      });

      setShowInternalDialog(false);
      setSelectedTicket('');
      setRelationshipType('related');
      setInternalDescription('');
      loadLinks();
    } catch (error) {
      console.error('Error adding internal link:', error);
      toast({
        title: t('common.error'),
        description: t('tickets.links.linkError'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addExternalLink = async () => {
    if (!externalSystem || !externalTicketId) {
      toast({
        title: t('common.error'),
        description: t('tickets.links.requiredFields'),
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('external_ticket_links')
        .insert({
          ticket_id: ticketId,
          external_system: externalSystem,
          external_ticket_id: externalTicketId,
          external_ticket_url: externalTicketUrl || null,
          description: externalDescription || null,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('tickets.links.externalLinkSuccess')
      });

      setShowExternalDialog(false);
      setExternalSystem('');
      setExternalTicketId('');
      setExternalTicketUrl('');
      setExternalDescription('');
      loadLinks();
    } catch (error) {
      console.error('Error adding external link:', error);
      toast({
        title: t('common.error'),
        description: t('tickets.links.externalLinkError'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteInternalLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('ticket_relationships')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('tickets.links.linkRemoved')
      });

      loadLinks();
    } catch (error) {
      console.error('Error deleting link:', error);
      toast({
        title: t('common.error'),
        description: t('tickets.links.linkRemoveError'),
        variant: 'destructive'
      });
    }
  };

  const deleteExternalLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('external_ticket_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('tickets.links.externalLinkRemoved')
      });

      loadLinks();
    } catch (error) {
      console.error('Error deleting external link:', error);
      toast({
        title: t('common.error'),
        description: t('tickets.links.externalLinkRemoveError'),
        variant: 'destructive'
      });
    }
  };

  const getRelationshipBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      related: 'default',
      parent: 'secondary',
      child: 'secondary',
      blocks: 'destructive',
      blocked_by: 'destructive',
      duplicate: 'default'
    };

    const labels: Record<string, string> = {
      related: t('tickets.links.related'),
      parent: t('tickets.links.parent'),
      child: t('tickets.links.child'),
      blocks: t('tickets.links.blocks'),
      blocked_by: t('tickets.links.blockedBy'),
      duplicate: t('tickets.links.duplicate')
    };

    return (
      <Badge variant={variants[type] || 'default'}>
        {labels[type] || type}
      </Badge>
    );
  };

  return (
    <div>
      {/* Combined Ticket Links */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            <h3 className="text-sm font-semibold">{t('tickets.links.title')}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                {t('tickets.links.addLink')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowInternalDialog(true)}>
                <Link2 className="w-4 h-4 mr-2" />
                {t('tickets.links.internal')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowExternalDialog(true)}>
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('tickets.links.external')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Dialog open={showInternalDialog} onOpenChange={setShowInternalDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('tickets.links.linkInternal')}</DialogTitle>
              <DialogDescription>
                {t('tickets.links.linkInternalDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>{t('tickets.links.selectTicket')}</Label>
                <Select value={selectedTicket} onValueChange={setSelectedTicket}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('tickets.links.chooseTicket')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTickets.map(ticket => (
                      <SelectItem key={ticket.id} value={ticket.id}>
                        {ticket.ticket_number} - {ticket.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('tickets.links.relationshipType')}</Label>
                <Select value={relationshipType} onValueChange={setRelationshipType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="related">{t('tickets.links.related')}</SelectItem>
                    <SelectItem value="parent">{t('tickets.links.parent')}</SelectItem>
                    <SelectItem value="child">{t('tickets.links.child')}</SelectItem>
                    <SelectItem value="blocks">{t('tickets.links.blocks')}</SelectItem>
                    <SelectItem value="blocked_by">{t('tickets.links.blockedBy')}</SelectItem>
                    <SelectItem value="duplicate">{t('tickets.links.duplicate')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('tickets.links.descriptionOptional')}</Label>
                <Textarea
                  value={internalDescription}
                  onChange={(e) => setInternalDescription(e.target.value)}
                  placeholder={t('tickets.links.relationshipContext')}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowInternalDialog(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={addInternalLink} disabled={loading}>
                  {loading ? t('tickets.links.adding') : t('tickets.links.addLink')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <Dialog open={showExternalDialog} onOpenChange={setShowExternalDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('tickets.links.linkExternal')}</DialogTitle>
                  <DialogDescription>
                    {t('tickets.links.linkExternalDesc')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>{t('tickets.links.externalSystem')} *</Label>
                    <Input
                      value={externalSystem}
                      onChange={(e) => setExternalSystem(e.target.value)}
                      placeholder={t('tickets.links.externalSystemPlaceholder')}
                    />
                  </div>
                  <div>
                    <Label>{t('tickets.links.externalTicketId')} *</Label>
                    <Input
                      value={externalTicketId}
                      onChange={(e) => setExternalTicketId(e.target.value)}
                      placeholder={t('tickets.links.externalTicketIdPlaceholder')}
                    />
                  </div>
                  <div>
                    <Label>{t('tickets.links.ticketUrl')}</Label>
                    <Input
                      value={externalTicketUrl}
                      onChange={(e) => setExternalTicketUrl(e.target.value)}
                      placeholder="https://..."
                      type="url"
                    />
                  </div>
                  <div>
                    <Label>{t('tickets.links.descriptionOptional')}</Label>
                    <Textarea
                      value={externalDescription}
                      onChange={(e) => setExternalDescription(e.target.value)}
                      placeholder={t('tickets.links.externalContext')}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowExternalDialog(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button onClick={addExternalLink} disabled={loading}>
                      {loading ? t('tickets.links.adding') : t('tickets.links.addLink')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

        {internalLinks.length === 0 && externalLinks.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground text-sm">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                {t('tickets.links.noLinks')}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {/* Internal Links */}
            {internalLinks.map(link => (
              <Card key={link.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => window.open(`/tickets?id=${link.related_ticket_id}`, '_blank')}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {getRelationshipBadge(link.relationship_type)}
                        <span className="font-medium text-sm hover:underline">
                          {link.ticket_number}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{link.ticket_title}</p>
                      {link.description && (
                        <p className="text-xs text-muted-foreground mt-1">{link.description}</p>
                      )}
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteInternalLink(link.id)}
                      className="hover:bg-muted"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* External Links */}
            {externalLinks.map(link => (
              <Card key={link.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary">{link.external_system}</Badge>
                        {link.external_ticket_url ? (
                          <a
                            href={link.external_ticket_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-sm text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {link.external_ticket_id}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="font-medium text-sm">
                            {link.external_ticket_id}
                          </span>
                        )}
                      </div>
                      {link.description && (
                        <p className="text-xs text-muted-foreground mt-1">{link.description}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteExternalLink(link.id)}
                      className="hover:bg-muted"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}