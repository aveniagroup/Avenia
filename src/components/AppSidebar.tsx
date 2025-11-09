import React, { useEffect, useState } from "react";
import { LayoutDashboard, TicketIcon, Users, Settings, LogOut, Shield } from "lucide-react";
import logo from "@/assets/Logo.png";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";

export function AppSidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [platformName, setPlatformName] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    fetchPlatformName();
    fetchUserName();

    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Set up realtime subscription for organization settings changes
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profile?.organization_id) {
        channel = supabase
          .channel('organization_settings_changes')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'organization_settings',
              filter: `organization_id=eq.${profile.organization_id}`
            },
            (payload: any) => {
              console.log('Realtime update received:', payload);
              // Update platform name from the new payload
              if (payload.new && 'platform_name' in payload.new) {
                console.log('Updating platform name to:', payload.new.platform_name);
                setPlatformName(payload.new.platform_name || '');
              }
            }
          )
          .subscribe((status) => {
            console.log('Realtime subscription status:', status);
          });
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        console.log('Cleaning up realtime subscription');
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const fetchPlatformName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profile?.organization_id) {
        const { data: orgData } = await supabase
          .from("organization_settings")
          .select("platform_name")
          .eq("organization_id", profile.organization_id)
          .single();

        if (orgData?.platform_name) {
          setPlatformName(orgData.platform_name);
        }
      }
    } catch (error) {
      console.error("Error fetching platform name:", error);
    }
  };

  const fetchUserName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profile?.full_name) {
        setUserName(profile.full_name);
      }
    } catch (error) {
      console.error("Error fetching user name:", error);
    }
  };

  const navigationItems = [
    { title: t("nav.dashboard"), url: "/dashboard", icon: LayoutDashboard },
    { title: t("nav.tickets"), url: "/tickets", icon: TicketIcon },
  ];

  const settingsItems = [
    { title: t("nav.team"), url: "/team", icon: Users },
    { title: t("nav.compliance"), url: "/compliance", icon: Shield },
    { title: t("nav.settings"), url: "/settings", icon: Settings },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <Sidebar className="border-r border-border/60">
      <SidebarHeader className="px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 bg-primary/5">
            <img src={logo} alt="Logo" className="h-8 w-8 object-contain" />
          </div>
          {open && (
            <div className="flex flex-col min-w-0">
              <h2 className="text-lg font-bold truncate">{platformName || t("app.name")}</h2>
              <p className="text-xs text-muted-foreground truncate">{userName || t("app.subtitle")}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          {open && (
            <SidebarGroupLabel className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t("nav.main")}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-foreground shadow-sm"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        }`
                      }
                    >
                      {open && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="my-4 mx-3 border-t border-sidebar-border" />

        <SidebarGroup>
          {open && (
            <SidebarGroupLabel className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t("nav.management")}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-foreground shadow-sm"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        }`
                      }
                    >
                      {open && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-3 py-4">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start gap-3 px-4 py-3 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground rounded-xl"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {open && <span className="truncate">{t("common.signOut")}</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
