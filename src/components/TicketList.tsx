import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { getDateFnsLocale } from "@/i18n/config";
import { FilterPresets } from "@/components/FilterPresets";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  sentiment?: string | null;
  urgency_score?: number | null;
}

interface TicketListProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  initialStatusFilter?: string;
  onTicketsUpdate?: () => void;
}

const ITEMS_PER_PAGE = 20;

export default function TicketList({ tickets, onTicketClick, initialStatusFilter = "all", onTicketsUpdate }: TicketListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="h-3.5 w-3.5 ml-1" />
      : <ArrowDown className="h-3.5 w-3.5 ml-1" />;
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const sortedTickets = sortColumn ? [...filteredTickets].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case "ticket_number":
        aValue = a.ticket_number;
        bValue = b.ticket_number;
        break;
      case "title":
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case "status":
        // Open (1) -> In Progress (2) -> Resolved (3) -> Closed (4)
        const statusOrder = { open: 1, in_progress: 2, resolved: 3, closed: 4 };
        aValue = statusOrder[a.status];
        bValue = statusOrder[b.status];
        break;
      case "priority":
        const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4 };
        aValue = priorityOrder[a.priority];
        bValue = priorityOrder[b.priority];
        break;
      case "sentiment":
        // Negative (1) -> Neutral (2) -> Positive (3) -> No sentiment (4)
        const sentimentOrder = { negative: 1, neutral: 2, positive: 3 };
        aValue = a.sentiment ? sentimentOrder[a.sentiment as keyof typeof sentimentOrder] || 4 : 4;
        bValue = b.sentiment ? sentimentOrder[b.sentiment as keyof typeof sentimentOrder] || 4 : 4;
        break;
      case "customer_name":
        aValue = a.customer_name?.toLowerCase() || "";
        bValue = b.customer_name?.toLowerCase() || "";
        break;
      case "created_at":
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  }) : filteredTickets;

  const totalPages = Math.ceil(sortedTickets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTickets = sortedTickets.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter, sortColumn, sortDirection]);

  const toggleTicketSelection = (ticketId: string) => {
    const newSelected = new Set(selectedTickets);
    if (newSelected.has(ticketId)) {
      newSelected.delete(ticketId);
    } else {
      newSelected.add(ticketId);
    }
    setSelectedTickets(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedTickets.size === paginatedTickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(paginatedTickets.map(t => t.id)));
    }
  };

  const handleBulkAction = async (action: "status" | "priority" | "delete", value?: string) => {
    if (selectedTickets.size === 0) {
      toast({ title: "No tickets selected", variant: "destructive" });
      return;
    }

    try {
      const selectedIds = Array.from(selectedTickets);
      
      if (action === "delete") {
        const { error } = await supabase
          .from("tickets")
          .delete()
          .in("id", selectedIds);
        
        if (error) throw error;
        
        // Clear selection immediately and trigger update
        setSelectedTickets(new Set());
        toast({ title: `${selectedIds.length} tickets deleted` });
        
        // Wait a moment for the database to process the deletion
        await new Promise(resolve => setTimeout(resolve, 100));
        onTicketsUpdate?.();
      } else if (action === "status" && value) {
        const { error } = await supabase
          .from("tickets")
          .update({ status: value as "open" | "in_progress" | "resolved" | "closed" })
          .in("id", selectedIds);
        
        if (error) throw error;
        setSelectedTickets(new Set());
        toast({ title: `${selectedIds.length} tickets updated` });
        onTicketsUpdate?.();
      } else if (action === "priority" && value) {
        const { error } = await supabase
          .from("tickets")
          .update({ priority: value as "low" | "medium" | "high" | "urgent" })
          .in("id", selectedIds);
        
        if (error) throw error;
        setSelectedTickets(new Set());
        toast({ title: `${selectedIds.length} tickets updated` });
        onTicketsUpdate?.();
      }
    } catch (error: any) {
      toast({ title: "Bulk action failed", description: error.message, variant: "destructive" });
    }
  };

  const handleApplyPreset = (filters: { status: string; priority: string; search: string }) => {
    setStatusFilter(filters.status || "all");
    setPriorityFilter(filters.priority || "all");
    setSearchTerm(filters.search || "");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('tickets.allTickets')}</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {tickets.length} {t('tickets.totalTickets')}
            {selectedTickets.size > 0 && <span className="text-foreground font-medium"> • {selectedTickets.size} selected</span>}
          </p>
        </div>
        <FilterPresets
          currentFilters={{ status: statusFilter, priority: priorityFilter, search: searchTerm }}
          onApplyPreset={handleApplyPreset}
        />
      </div>

      {/* Search and Filters */}
      <Card className="shadow-card border-border/60">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder={t('tickets.searchPlaceholder') + " (/)"}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-11 border-border/60 bg-background"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] h-11 border-border/60">
                  <SelectValue placeholder={t('tickets.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('tickets.allStatus')}</SelectItem>
                  <SelectItem value="open">{t('tickets.open')}</SelectItem>
                  <SelectItem value="in_progress">{t('tickets.inProgress')}</SelectItem>
                  <SelectItem value="resolved">{t('tickets.resolved')}</SelectItem>
                  <SelectItem value="closed">{t('tickets.closed')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px] h-11 border-border/60">
                  <SelectValue placeholder={t('tickets.priority')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('tickets.allPriority')}</SelectItem>
                  <SelectItem value="low">{t('tickets.low')}</SelectItem>
                  <SelectItem value="medium">{t('tickets.medium')}</SelectItem>
                  <SelectItem value="high">{t('tickets.high')}</SelectItem>
                  <SelectItem value="urgent">{t('tickets.urgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedTickets.size > 0 && (
        <Card className="shadow-card border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-sm font-medium text-foreground">{selectedTickets.size} {t('tickets.bulkActions.selected')}</span>
              <div className="flex gap-2 flex-wrap">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-background">{t('tickets.bulkActions.changeStatus')}</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => handleBulkAction("status", "open")}>
                      {t('tickets.open')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleBulkAction("status", "in_progress")}>
                      {t('tickets.inProgress')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleBulkAction("status", "resolved")}>
                      {t('tickets.resolved')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleBulkAction("status", "closed")}>
                      {t('tickets.closed')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-background">{t('tickets.bulkActions.changePriority')}</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => handleBulkAction("priority", "low")}>
                      {t('tickets.low')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleBulkAction("priority", "medium")}>
                      {t('tickets.medium')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleBulkAction("priority", "high")}>
                      {t('tickets.high')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleBulkAction("priority", "urgent")}>
                      {t('tickets.urgent')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm(t('tickets.bulkActions.deleteConfirm', { count: selectedTickets.size }))) {
                      handleBulkAction("delete");
                    }
                  }}
                >
                  {t('tickets.bulkActions.deleteSelected')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTickets(new Set())}>
                  {t('tickets.bulkActions.clearSelection')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tickets Table */}
      <Card className="shadow-card border-border/60 overflow-hidden">
        {paginatedTickets.length === 0 ? (
          <CardContent className="p-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 mb-5">
              <Search className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('tickets.noTicketsFound')}</h3>
            <p className="text-sm text-muted-foreground">{t('tickets.adjustFilters')}</p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40px] sticky left-0 z-10">
                    <Checkbox
                      checked={selectedTickets.size === paginatedTickets.length && paginatedTickets.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead 
                    className="hidden md:table-cell w-[100px] cursor-pointer select-none hover:bg-muted/50 transition-colors" 
                    onClick={() => handleSort("ticket_number")}
                  >
                    <div className="flex items-center">
                      {t('tickets.ticketNumber')}
                      {getSortIcon("ticket_number")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="min-w-[200px] cursor-pointer select-none hover:bg-muted/50 transition-colors" 
                    onClick={() => handleSort("title")}
                  >
                    <div className="flex items-center">
                      {t('tickets.title')}
                      {getSortIcon("title")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="w-[110px] cursor-pointer select-none hover:bg-muted/50 transition-colors" 
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center">
                      {t('tickets.status')}
                      {getSortIcon("status")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="w-[110px] cursor-pointer select-none hover:bg-muted/50 transition-colors" 
                    onClick={() => handleSort("priority")}
                  >
                    <div className="flex items-center">
                      {t('tickets.priority')}
                      {getSortIcon("priority")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="w-[140px] cursor-pointer select-none hover:bg-muted/50 transition-colors" 
                    onClick={() => handleSort("sentiment")}
                  >
                    <div className="flex items-center">
                      {t('tickets.sentiment')}
                      {getSortIcon("sentiment")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="hidden lg:table-cell w-[150px] cursor-pointer select-none hover:bg-muted/50 transition-colors" 
                    onClick={() => handleSort("customer_name")}
                  >
                    <div className="flex items-center">
                      {t('tickets.customer')}
                      {getSortIcon("customer_name")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="hidden md:table-cell w-[120px] cursor-pointer select-none hover:bg-muted/50 transition-colors" 
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center">
                      {t('tickets.created')}
                      {getSortIcon("created_at")}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className="cursor-pointer group hover:bg-muted/50 transition-colors"
                    onClick={() => onTicketClick(ticket)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()} className="sticky left-0 z-10 transition-colors">
                      <Checkbox
                        checked={selectedTickets.has(ticket.id)}
                        onCheckedChange={() => toggleTicketSelection(ticket.id)}
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs font-mono font-medium text-muted-foreground whitespace-nowrap">
                        {ticket.ticket_number}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium line-clamp-2 hover:text-primary transition-colors text-sm">
                          {ticket.title}
                        </div>
                        <div className="md:hidden text-xs text-muted-foreground font-mono">
                          {ticket.ticket_number}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={ticket.priority} />
                    </TableCell>
                    <TableCell>
                      {ticket.sentiment ? (
                        <div className="flex flex-col gap-1">
                          <Badge 
                            variant="secondary"
                            className={`font-medium text-xs px-2 py-0.5 rounded w-fit transition-colors ${
                              ticket.sentiment === "positive" 
                                ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                                : ticket.sentiment === "negative"
                                ? "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                                : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:hover:bg-gray-900/50"
                            }`}
                          >
                            {ticket.sentiment === "positive" 
                              ? t("ai.sentimentPositive")
                              : ticket.sentiment === "negative"
                              ? t("ai.sentimentNegative")
                              : t("ai.sentimentNeutral")}
                          </Badge>
                          {ticket.urgency_score && (
                            <span className="text-xs text-muted-foreground">
                              {t("ai.urgency")}: <span className="font-medium">{ticket.urgency_score}/10</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-sm truncate max-w-[150px]">
                        {ticket.customer_name || ticket.customer_email}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(ticket.created_at), "MMM d, yyyy", { locale: getDateFnsLocale() })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }
              return (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    onClick={() => setCurrentPage(pageNumber)}
                    isActive={currentPage === pageNumber}
                    className="cursor-pointer"
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}