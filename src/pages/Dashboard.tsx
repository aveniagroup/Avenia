import React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TicketIcon, Clock, CheckCircle2, TrendingUp, Users, Timer, ArrowRight, ArrowLeft, Calendar } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { format, subDays, differenceInDays, type Locale } from "date-fns";
import { enUS, es, fr, de, fi, sv } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

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

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0, total: 0 });
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [activityChartData, setActivityChartData] = useState<any[]>([]);
  const [distributionChartData, setDistributionChartData] = useState<any[]>([]);
  const [activityTimeframe, setActivityTimeframe] = useState<string>("7");
  const [distributionTimeframe, setDistributionTimeframe] = useState<string>("7");
  const [activityCustomStart, setActivityCustomStart] = useState<Date | undefined>();
  const [activityCustomEnd, setActivityCustomEnd] = useState<Date | undefined>();
  const [distributionCustomStart, setDistributionCustomStart] = useState<Date | undefined>();
  const [distributionCustomEnd, setDistributionCustomEnd] = useState<Date | undefined>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { open, toggleSidebar } = useSidebar();

  const getDateFnsLocale = () => {
    const localeMap: Record<string, Locale> = {
      en: enUS,
      es: es,
      fr: fr,
      de: de,
      fi: fi,
      sv: sv,
    };
    return localeMap[i18n.language] || enUS;
  };

  const getStatusTranslation = (status: string) => {
    const statusMap: Record<string, string> = {
      open: t("tickets.open"),
      in_progress: t("tickets.inProgress"),
      resolved: t("tickets.resolved"),
      closed: t("tickets.closed"),
    };
    return statusMap[status] || status;
  };

  useEffect(() => {
    checkUser();
    loadTickets();
  }, [activityTimeframe, distributionTimeframe, activityCustomStart, activityCustomEnd, distributionCustomStart, distributionCustomEnd]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
    setLoading(false);
  };

  const loadTickets = async () => {
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTickets(data);
      
      // Calculate stats
      const open = data.filter((t) => t.status === "open").length;
      const inProgress = data.filter((t) => t.status === "in_progress").length;
      const resolved = data.filter((t) => t.status === "resolved").length;
      setStats({ open, inProgress, resolved, total: data.length });
      
      // Get recent 5 tickets
      setRecentTickets(data.slice(0, 5));
      
      // Generate activity chart data based on selected timeframe
      const locale = getDateFnsLocale();
      
      let activityDays = parseInt(activityTimeframe);
      let activityStartDate = subDays(new Date(), activityDays - 1);
      let activityEndDate = new Date();
      
      if (activityTimeframe === "custom" && activityCustomStart && activityCustomEnd) {
        activityStartDate = activityCustomStart;
        activityEndDate = activityCustomEnd;
        activityDays = differenceInDays(activityEndDate, activityStartDate) + 1;
      }
      
      const activityData = Array.from({ length: activityDays }, (_, i) => {
        const date = new Date(activityStartDate);
        date.setDate(date.getDate() + i);
        const dateStr = format(date, "yyyy-MM-dd");
        const dayTickets = data.filter((t) => 
          format(new Date(t.created_at), "yyyy-MM-dd") === dateStr
        );
        
        return {
          date: format(date, "MMM dd", { locale }),
          tickets: dayTickets.length,
        };
      });
      
      setActivityChartData(activityData);
      
      // Generate distribution chart data based on selected timeframe
      let distributionDays = parseInt(distributionTimeframe);
      let distributionStartDate = subDays(new Date(), distributionDays - 1);
      let distributionEndDate = new Date();
      
      if (distributionTimeframe === "custom" && distributionCustomStart && distributionCustomEnd) {
        distributionStartDate = distributionCustomStart;
        distributionEndDate = distributionCustomEnd;
        distributionDays = differenceInDays(distributionEndDate, distributionStartDate) + 1;
      }
      
      const distributionData = Array.from({ length: distributionDays }, (_, i) => {
        const date = new Date(distributionStartDate);
        date.setDate(date.getDate() + i);
        const dateStr = format(date, "yyyy-MM-dd");
        const dayTickets = data.filter((t) => 
          format(new Date(t.created_at), "yyyy-MM-dd") === dateStr
        );
        
        return {
          date: format(date, "MMM dd", { locale }),
          open: dayTickets.filter((t) => t.status === "open").length,
          resolved: dayTickets.filter((t) => t.status === "resolved").length,
        };
      });
      
      setDistributionChartData(distributionData);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">{t('dashboard.loadingDashboard')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
        <div className="flex h-14 md:h-16 items-center gap-2 md:gap-4 px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-7 w-7 -ml-2"
          >
            {open ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
            
            <div className="flex-1" />
            
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
              {/* Page Header */}
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
                <p className="text-sm md:text-base text-muted-foreground">{t('dashboard.subtitle')}</p>
              </div>

              {/* Stats Cards */}
              <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
                <Card 
                  className="cursor-pointer hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-primary/5 to-transparent"
                  onClick={() => navigate("/tickets")}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.totalTickets')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold tracking-tight text-primary">{stats.total}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer hover:shadow-lg hover:border-info/50 hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-[hsl(var(--status-open))]/5 to-transparent"
                  onClick={() => navigate("/tickets", { state: { statusFilter: "open" } })}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.openTickets')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold tracking-tight text-[hsl(var(--status-open))]">{stats.open}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer hover:shadow-lg hover:border-warning/50 hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-[hsl(var(--status-in-progress))]/5 to-transparent"
                  onClick={() => navigate("/tickets", { state: { statusFilter: "in_progress" } })}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.inProgress')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold tracking-tight text-[hsl(var(--status-in-progress))]">{stats.inProgress}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer hover:shadow-lg hover:border-success/50 hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-[hsl(var(--status-resolved))]/5 to-transparent"
                  onClick={() => navigate("/tickets", { state: { statusFilter: "resolved" } })}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.resolved')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold tracking-tight text-[hsl(var(--status-resolved))]">{stats.resolved}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
                {/* Ticket Trend Chart */}
                <Card className="hover:shadow-lg transition-smooth">
                  <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2">
                    <CardTitle className="text-base md:text-lg font-semibold">{t('dashboard.ticketActivity')}</CardTitle>
                    <div className="flex flex-col lg:flex-row gap-2 w-full lg:w-auto">
                      <Select value={activityTimeframe} onValueChange={(value) => setActivityTimeframe(value)}>
                        <SelectTrigger className="w-full lg:w-[140px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">{t('dashboard.last7Days')}</SelectItem>
                          <SelectItem value="30">{t('dashboard.last30Days')}</SelectItem>
                          <SelectItem value="90">{t('dashboard.last90Days')}</SelectItem>
                          <SelectItem value="custom">{t('dashboard.custom')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {activityTimeframe === "custom" && (
                        <div className="flex gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-9">
                                <Calendar className="mr-2 h-4 w-4" />
                                {activityCustomStart ? format(activityCustomStart, "MMM d") : t('dashboard.start')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={activityCustomStart}
                                onSelect={setActivityCustomStart}
                                initialFocus
                                locale={getDateFnsLocale()}
                              />
                            </PopoverContent>
                          </Popover>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-9">
                                <Calendar className="mr-2 h-4 w-4" />
                                {activityCustomEnd ? format(activityCustomEnd, "MMM d") : t('dashboard.end')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={activityCustomEnd}
                                onSelect={setActivityCustomEnd}
                                initialFocus
                                locale={getDateFnsLocale()}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        tickets: {
                          label: t('dashboard.tickets'),
                          color: "hsl(var(--primary))",
                        },
                      }}
                      className="h-[250px] w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={activityChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" className="text-xs" />
                          <YAxis className="text-xs" />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line 
                            type="monotone" 
                            dataKey="tickets" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={{ fill: "hsl(var(--primary))" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Status Distribution */}
                <Card className="hover:shadow-lg transition-smooth">
                  <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2">
                    <CardTitle className="text-base md:text-lg font-semibold">{t('dashboard.statusDistribution')}</CardTitle>
                    <div className="flex flex-col lg:flex-row gap-2 w-full lg:w-auto">
                      <Select value={distributionTimeframe} onValueChange={(value) => setDistributionTimeframe(value)}>
                        <SelectTrigger className="w-full lg:w-[140px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">{t('dashboard.last7Days')}</SelectItem>
                          <SelectItem value="30">{t('dashboard.last30Days')}</SelectItem>
                          <SelectItem value="90">{t('dashboard.last90Days')}</SelectItem>
                          <SelectItem value="custom">{t('dashboard.custom')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {distributionTimeframe === "custom" && (
                        <div className="flex gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-9">
                                <Calendar className="mr-2 h-4 w-4" />
                                {distributionCustomStart ? format(distributionCustomStart, "MMM d") : t('dashboard.start')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={distributionCustomStart}
                                onSelect={setDistributionCustomStart}
                                initialFocus
                                locale={getDateFnsLocale()}
                              />
                            </PopoverContent>
                          </Popover>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-9">
                                <Calendar className="mr-2 h-4 w-4" />
                                {distributionCustomEnd ? format(distributionCustomEnd, "MMM d") : t('dashboard.end')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={distributionCustomEnd}
                                onSelect={setDistributionCustomEnd}
                                initialFocus
                                locale={getDateFnsLocale()}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        open: {
                          label: t('tickets.open'),
                          color: "hsl(199, 89%, 48%)",
                        },
                        resolved: {
                          label: t('tickets.resolved'),
                          color: "hsl(142, 71%, 45%)",
                        },
                      }}
                      className="h-[250px] w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={distributionChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" className="text-xs" />
                          <YAxis className="text-xs" />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="open" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="resolved" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card className="hover:shadow-lg transition-smooth">
                <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base md:text-lg font-semibold">{t('dashboard.recentActivity')}</CardTitle>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">{t('dashboard.latestTickets')}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/tickets")} className="gap-2 self-end lg:self-auto">
                    {t('dashboard.viewAll')}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentTickets.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>{t('dashboard.noRecentTickets')}</p>
                      </div>
                    ) : (
                      recentTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 hover:shadow-sm transition-smooth cursor-pointer"
                          onClick={() => navigate("/tickets", { state: { ticketId: ticket.id } })}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                ticket.status === "open" ? "bg-info/10 text-info" :
                                ticket.status === "in_progress" ? "bg-warning/10 text-warning" :
                                "bg-success/10 text-success"
                              }`}>
                                {getStatusTranslation(ticket.status)}
                              </span>
                            </div>
                            <p className="font-medium text-sm truncate">{ticket.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {ticket.customer_name} • {format(new Date(ticket.created_at), "MMM d, h:mm a", { locale: getDateFnsLocale() })}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground ml-4" />
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
          </div>
        </main>
      </div>
  );
}

export default Dashboard;
