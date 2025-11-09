import React, { useEffect, useState } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Users, Shield, Mail, MoreVertical, ArrowLeft, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InviteTeamMemberDialog } from "@/components/InviteTeamMemberDialog";
import { EditRoleDialog } from "@/components/EditRoleDialog";
import { ViewProfileDialog } from "@/components/ViewProfileDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}
interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
}
function Team() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [viewProfileOpen, setViewProfileOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { open, toggleSidebar } = useSidebar();
  useEffect(() => {
    fetchTeamData();
  }, []);
  const fetchTeamData = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data: profile
      } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
      if (!profile?.organization_id) return;

      // Fetch team members
      const {
        data: profiles
      } = await supabase.from("profiles").select("id, full_name, email, avatar_url, created_at").eq("organization_id", profile.organization_id);

      // Fetch roles
      const {
        data: roles
      } = await supabase.from("user_roles").select("user_id, role").eq("organization_id", profile.organization_id);
      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      const members = profiles?.map(p => ({
        ...p,
        role: rolesMap.get(p.id) || "agent"
      })) || [];
      setTeamMembers(members);

      // Fetch invitations
      const {
        data: invites
      } = await supabase.from("team_invitations").select("*").eq("organization_id", profile.organization_id).order("created_at", {
        ascending: false
      });
      setInvitations(invites || []);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors",
      manager: "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 transition-colors",
      support: "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors",
      agent: "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
    };
    return colors[role] || colors.agent;
  };
  const getInitials = (name: string | null, email: string | null) => {
    if (name) return name.split(" ").map(n => n[0]).join("").toUpperCase();
    if (email) return email.substring(0, 2).toUpperCase();
    return "??";
  };
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(t('common.locale') || 'en-US', {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const translateRole = (role: string) => {
    return t(`team.${role}`);
  };
  const handleRemoveMember = async () => {
    if (!selectedMember) return;
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const {
        data: profile
      } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
      if (!profile?.organization_id) throw new Error("Organization not found");

      // Delete user role
      const {
        error
      } = await supabase.from("user_roles").delete().eq("user_id", selectedMember.id).eq("organization_id", profile.organization_id);
      if (error) throw error;
      toast({
        title: t('team.memberRemoved'),
        description: `${selectedMember.full_name || selectedMember.email} ${t('team.memberRemovedDesc')}`
      });
      fetchTeamData();
      setRemoveDialogOpen(false);
      setSelectedMember(null);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleResendInvitation = async (invitationId: string, email: string) => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const {
        data: profile
      } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
      if (!profile?.organization_id) throw new Error("Organization not found");

      // Update expiry date
      const newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + 7);
      const {
        error
      } = await supabase.from("team_invitations").update({
        expires_at: newExpiryDate.toISOString(),
        status: "pending"
      }).eq("id", invitationId);
      if (error) throw error;
      toast({
        title: t('team.invitationResent'),
        description: `${t('team.newInvitationSent')} ${email}`
      });
      fetchTeamData();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive"
      });
    }
  };
  return (
    <>
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
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
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('team.teamManagement')}</h1>
                  <p className="text-sm md:text-base text-muted-foreground">{t('team.managePermissions')}</p>
                </div>
              </div>

              <Tabs defaultValue="members" className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <TabsList className="inline-flex w-auto">
                    <TabsTrigger value="members" className="whitespace-nowrap text-xs sm:text-sm">{t('team.teamMembers')}</TabsTrigger>
                    <TabsTrigger value="invitations" className="whitespace-nowrap text-xs sm:text-sm">{t('team.invitations')}</TabsTrigger>
                    <TabsTrigger value="roles" className="whitespace-nowrap text-xs sm:text-sm">{t('team.rolesPermissions')}</TabsTrigger>
                  </TabsList>
                  <div className="w-full sm:w-auto">
                    <InviteTeamMemberDialog />
                  </div>
                </div>

                <TabsContent value="members" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('team.activeTeamMembers')}</CardTitle>
                      <CardDescription>
                        {t('team.manageTeamMembers')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loading ? <div className="text-center py-8">{t('common.loading')}</div> : teamMembers.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                          {t('team.noTeamMembers')}
                        </div> : <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[180px] sm:min-w-[200px]">{t('team.member')}</TableHead>
                              <TableHead className="min-w-[80px] sm:min-w-[100px]">{t('team.role')}</TableHead>
                              <TableHead className="hidden sm:table-cell min-w-[120px]">{t('team.joined')}</TableHead>
                              <TableHead className="text-right min-w-[60px] sm:min-w-[80px]">{t('team.actions')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {teamMembers.map(member => <TableRow key={member.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar>
                                      <AvatarImage src={member.avatar_url || ""} />
                                      <AvatarFallback>
                                        {getInitials(member.full_name, member.email)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium">{member.full_name || "Unknown"}</div>
                                      <div className="text-sm text-muted-foreground">{member.email}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`${getRoleBadgeColor(member.role)} text-xs`}>
                                    {translateRole(member.role)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">{formatDate(member.created_at)}</TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => {
                                  setSelectedMember(member);
                                  setEditRoleOpen(true);
                                }}>
                                        {t('team.editRole')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => {
                                  setSelectedMember(member);
                                  setViewProfileOpen(true);
                                }}>
                                        {t('team.viewProfile')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="text-destructive" onClick={() => {
                                  setSelectedMember(member);
                                  setRemoveDialogOpen(true);
                                }}>
                                        {t('team.removeMember')}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>)}
                           </TableBody>
                        </Table>
                        </div>}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="invitations" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('team.pendingInvitations')}</CardTitle>
                      <CardDescription>
                        {t('team.managePendingInvitations')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {invitations.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                          {t('team.noPendingInvitations')}
                        </div> : <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[180px] sm:min-w-[200px]">{t('team.email')}</TableHead>
                              <TableHead className="min-w-[80px] sm:min-w-[100px]">{t('team.role')}</TableHead>
                              <TableHead className="hidden md:table-cell min-w-[100px]">{t('team.status')}</TableHead>
                              <TableHead className="hidden sm:table-cell min-w-[120px]">{t('team.expires')}</TableHead>
                              <TableHead className="text-right min-w-[60px] sm:min-w-[80px]">{t('team.actions')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {invitations.map(invite => <TableRow key={invite.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    {invite.email}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`${getRoleBadgeColor(invite.role)} text-xs`}>
                                    {translateRole(invite.role)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <Badge variant={invite.status === "pending" ? "outline" : "secondary"} className="text-xs">
                                    {invite.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">{formatDate(invite.expires_at)}</TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" onClick={() => handleResendInvitation(invite.id, invite.email)} className="text-xs">
                                    {t('team.resend')}
                                  </Button>
                                </TableCell>
                              </TableRow>)}
                           </TableBody>
                        </Table>
                        </div>}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="roles" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('team.rolesPermissions')}</CardTitle>
                      <CardDescription>
                        {t('team.configureRoleAccess')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 md:space-y-6">
                      {["admin", "manager", "support", "agent"].map(role => <div key={role} className="flex flex-col sm:flex-row items-start gap-3 md:gap-4 p-3 md:p-4 border rounded-lg">
                          <div className="flex-1 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                              <h3 className="font-semibold capitalize text-sm md:text-base">{t(`team.${role}`)}</h3>
                              <Badge className={getRoleBadgeColor(role)}>{translateRole(role)}</Badge>
                            </div>
                            <p className="text-xs md:text-sm text-muted-foreground mb-3">
                              {t(`team.${role}Desc`)}
                            </p>
                            <div className="flex flex-wrap gap-1.5 md:gap-2">
                              <Badge variant="outline">{t('team.viewTickets')}</Badge>
                              <Badge variant="outline">{t('team.createTickets')}</Badge>
                              {(role === "admin" || role === "manager") && <>
                                  <Badge variant="outline">{t('team.manageTeam')}</Badge>
                                  <Badge variant="outline">{t('team.viewAnalytics')}</Badge>
                                </>}
                              {role === "admin" && <Badge variant="outline">{t('team.fullAccess')}</Badge>}
                            </div>
                          </div>
                        </div>)}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>

      <EditRoleDialog open={editRoleOpen} onOpenChange={setEditRoleOpen} member={selectedMember} onSuccess={fetchTeamData} />

      <ViewProfileDialog open={viewProfileOpen} onOpenChange={setViewProfileOpen} member={selectedMember} />

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('team.removeTeamMember')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('team.confirmRemoveMember')} {selectedMember?.full_name || selectedMember?.email} {t('team.fromTeam')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('team.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default Team;