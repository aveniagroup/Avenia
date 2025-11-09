import React from "react";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStorageProvider } from "@/lib/storage/StorageContext";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, ArrowRight, Keyboard, RefreshCw, AlertCircle } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import TicketList from "@/components/TicketList";
import TicketDetail from "@/components/TicketDetail";
import CreateTicketDialog from "@/components/CreateTicketDialog";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useTranslation } from "react-i18next";
import { scanAllTicketsForPII } from "@/utils/triggerPIIDetection";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description?: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  customer_name: string;
  customer_email: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
}

function Tickets() {
  const storage = useStorageProvider();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { open, toggleSidebar } = useSidebar();
  
  const initialStatusFilter = (location.state as any)?.statusFilter || "all";
  const initialTicketId = (location.state as any)?.ticketId;

  const handleScanForPII = async () => {
    setScanning(true);
    toast({ title: t('privacy.scanAllTickets'), description: t('privacy.scanInProgress') });
    await scanAllTicketsForPII();
    toast({ title: t('privacy.scanComplete'), description: t('privacy.scanDescription') });
    setScanning(false);
    // Reload tickets to show updated badges
    loadTickets();
  };

  useKeyboardShortcuts([
    {
      key: "n",
      ctrl: true,
      callback: () => setCreateDialogOpen(true),
      description: "Create new ticket",
    },
    {
      key: "k",
      ctrl: true,
      callback: () => setShortcutsDialogOpen(!shortcutsDialogOpen),
      description: "Toggle keyboard shortcuts",
    },
    {
      key: "Escape",
      callback: () => {
        if (selectedTicket) setSelectedTicket(null);
        if (createDialogOpen) setCreateDialogOpen(false);
        if (shortcutsDialogOpen) setShortcutsDialogOpen(false);
      },
      description: "Close dialogs",
    },
  ]);

  useEffect(() => {
    checkUser();
    loadTickets();
  }, []);

  useEffect(() => {
    if (initialTicketId && tickets.length > 0) {
      const ticket = tickets.find(t => t.id === initialTicketId);
      if (ticket) {
        setSelectedTicket(ticket);
      }
    }
  }, [initialTicketId, tickets]);

  const checkUser = async () => {
    const { data: session } = await storage.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
    setLoading(false);
  };

  const loadTickets = async () => {
    const { data, error } = await storage
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .execute();

    if (!error && data) {
      setTickets(data);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">{t('tickets.loadingTickets')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="flex h-16 md:h-18 items-center gap-4 md:gap-6 px-6 md:px-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-9 w-9 -ml-2 hover:bg-muted"
            >
              {open ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
              
              <div className="flex-1" />
              
              <div className="flex items-center gap-2 md:gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleScanForPII}
                  disabled={scanning}
                  className="hidden md:flex gap-2 border-border/60"
                >
                  {scanning ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>{t('privacy.scanning')}</span>
                    </>
                  ) : (
                    <span>{t('privacy.scanForPII')}</span>
                  )}
                </Button>
                <ThemeToggle />
                <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="gap-2 shadow-sm">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('tickets.newTicket')}</span>
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-background">
            <div className="container mx-auto p-6 md:p-8 space-y-6 md:space-y-8 max-w-7xl">
              {/* Demo Alert */}
              <Alert className="border-info/30 bg-info/5">
                <AlertDescription className="text-sm text-foreground/80">
                  <strong className="font-semibold text-foreground">{t('privacy.demoTitle')}:</strong> {t('privacy.demoDescription')}
                </AlertDescription>
              </Alert>
              
              {/* Tickets List */}
              <TicketList tickets={tickets} onTicketClick={setSelectedTicket} initialStatusFilter={initialStatusFilter} onTicketsUpdate={loadTickets} />
            </div>
          </main>
        </div>

      {selectedTicket && (
        <TicketDetail
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdate={() => {
            loadTickets();
            setSelectedTicket(null);
          }}
        />
      )}

      <CreateTicketDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadTickets}
      />

      <KeyboardShortcutsDialog
        open={shortcutsDialogOpen}
        onOpenChange={setShortcutsDialogOpen}
      />
    </>
  );
}

export default Tickets;
