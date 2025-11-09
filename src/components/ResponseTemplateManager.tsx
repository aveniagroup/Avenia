import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Sparkles, Loader2, FileText, Tag, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/ui/scroll-area";
import { anonymizeText } from "@/utils/anonymizeData";

interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  organization_id: string;
}

export function ResponseTemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [generatingWithAI, setGeneratingWithAI] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Partial<Template>>({
    name: "",
    content: "",
    category: "general",
    tags: [],
    is_active: true,
  });
  const [currentCategory, setCurrentCategory] = useState<Partial<Category>>({ name: "" });
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [aiPrompt, setAiPrompt] = useState("");
  const { toast } = useToast();
  const { t } = useTranslation();

  // Helper function to get translated category name
  const getCategoryTranslation = (categoryName: string) => {
    const categoryMap: Record<string, string> = {
      'general': t("templates.categoryGeneral"),
      'welcome': t("templates.categoryWelcome"),
      'follow-up': t("templates.categoryFollowUp"),
      'resolution': t("templates.categoryResolution"),
      'apology': t("templates.categoryApology"),
      'technical': t("templates.categoryTechnical"),
    };
    
    return categoryMap[categoryName.toLowerCase()] || categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
  };

  useEffect(() => {
    loadTemplates();
    loadCategories();
  }, []);

  const loadTemplates = async () => {
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
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({
        title: t("templates.errorLoading"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();

      if (!profile?.organization_id) return;

      const { data, error } = await supabase
        .from("template_categories")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: t("templates.errorLoadingCategories"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateTemplateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: t("templates.aiPromptRequired"),
        variant: "destructive",
      });
      return;
    }

    setGeneratingWithAI(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();

      // Check if auto-anonymize is enabled
      const { data: settings } = await supabase
        .from('organization_settings')
        .select('ai_auto_anonymize, ai_pii_detection_enabled')
        .eq('organization_id', profile?.organization_id)
        .single();

      let promptData = aiPrompt;

      // If auto-anonymize is enabled, detect and anonymize PII in the prompt
      if (settings?.ai_auto_anonymize && settings?.ai_pii_detection_enabled) {
        const { data: detectionData } = await supabase.functions.invoke("detect-sensitive-data", {
          body: {
            ticket_id: 'temp', // Temporary ID for detection
            text: aiPrompt,
            organization_id: profile?.organization_id,
          },
        });

        if (detectionData?.piiTypes?.length > 0) {
          promptData = anonymizeText(aiPrompt, detectionData.piiTypes);
        }
      }

      const { data, error } = await supabase.functions.invoke("ai-ticket-assistant", {
        body: {
          action: "generate_template",
          prompt: promptData,
          organization_id: profile?.organization_id,
        },
      });

      if (error) throw error;

      if (data.template) {
        setCurrentTemplate({
          ...currentTemplate,
          name: data.template.name || currentTemplate.name,
          content: data.template.content,
          category: data.template.category || currentTemplate.category,
          tags: data.template.tags || currentTemplate.tags,
        });
        setAiPrompt("");
        toast({ title: t("templates.aiGenerated") });
      }
    } catch (error: any) {
      toast({
        title: t("templates.errorGenerating"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingWithAI(false);
    }
  };

  const saveTemplate = async () => {
    if (!currentTemplate.name || !currentTemplate.content || !currentTemplate.category) {
      toast({
        title: t("templates.requiredFields"),
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();

      if (!profile?.organization_id) return;

      const templateData = {
        name: currentTemplate.name,
        content: currentTemplate.content,
        category: currentTemplate.category,
        tags: currentTemplate.tags || [],
        is_active: currentTemplate.is_active ?? true,
        organization_id: profile.organization_id,
        created_by: user?.id,
      };

      if (currentTemplate.id) {
        const { error } = await supabase
          .from("response_templates")
          .update(templateData)
          .eq("id", currentTemplate.id);

        if (error) throw error;
        toast({ title: t("templates.updated") });
      } else {
        const { error } = await supabase
          .from("response_templates")
          .insert([templateData]);

        if (error) throw error;
        toast({ title: t("templates.created") });
      }

      setEditDialogOpen(false);
      setCurrentTemplate({
        name: "",
        content: "",
        category: "general",
        tags: [],
        is_active: true,
      });
      loadTemplates();
    } catch (error: any) {
      toast({
        title: t("templates.errorSaving"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      const { error } = await supabase
        .from("response_templates")
        .delete()
        .eq("id", templateToDelete);

      if (error) throw error;

      toast({ title: t("templates.deleted") });
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
      loadTemplates();
    } catch (error: any) {
      toast({
        title: t("templates.errorDeleting"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const saveCategory = async () => {
    if (!currentCategory.name?.trim()) {
      toast({
        title: t("templates.categoryNameRequired"),
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();

      if (!profile?.organization_id) return;

      if (currentCategory.id) {
        const { error } = await supabase
          .from("template_categories")
          .update({ name: currentCategory.name })
          .eq("id", currentCategory.id);

        if (error) throw error;
        toast({ title: t("templates.categoryUpdated") });
      } else {
        const { error } = await supabase
          .from("template_categories")
          .insert([{
            name: currentCategory.name,
            organization_id: profile.organization_id,
          }]);

        if (error) throw error;
        toast({ title: t("templates.categoryCreated") });
      }

      setCategoryDialogOpen(false);
      setCurrentCategory({ name: "" });
      loadCategories();
    } catch (error: any) {
      toast({
        title: t("templates.errorSavingCategory"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      // Check if any templates use this category
      const { data: templatesWithCategory } = await supabase
        .from("response_templates")
        .select("id")
        .eq("category", categories.find(c => c.id === categoryToDelete)?.name);

      if (templatesWithCategory && templatesWithCategory.length > 0) {
        toast({
          title: t("templates.categoryInUse"),
          description: t("templates.categoryInUseDescription"),
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("template_categories")
        .delete()
        .eq("id", categoryToDelete);

      if (error) throw error;

      toast({ title: t("templates.categoryDeleted") });
      setDeleteCategoryDialogOpen(false);
      setCategoryToDelete(null);
      loadCategories();
    } catch (error: any) {
      toast({
        title: t("templates.errorDeletingCategory"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t("templates.title")}
              </CardTitle>
              <CardDescription>{t("templates.description")}</CardDescription>
            </div>
            <Button
              onClick={() => {
                setCurrentTemplate({
                  name: "",
                  content: "",
                  category: "general",
                  tags: [],
                  is_active: true,
                });
                setEditDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("templates.create")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("templates.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder={t("templates.filterByCategory")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("templates.allCategories")}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {getCategoryTranslation(category.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setCurrentCategory({ name: "" });
                  setCategoryDialogOpen(true);
                }}
                title={t("templates.manageCategories")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("templates.noTemplates")}</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{template.name}</h3>
                            <Badge variant="outline">{getCategoryTranslation(template.category)}</Badge>
                            {!template.is_active && (
                              <Badge variant="secondary">{t("templates.inactive")}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {template.content}
                          </p>
                          {template.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {template.tags.map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setCurrentTemplate(template);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setTemplateToDelete(template.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentTemplate.id ? t("templates.edit") : t("templates.create")}
            </DialogTitle>
            <DialogDescription>{t("templates.formDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Card className="bg-muted/50">
              <CardContent className="pt-4 space-y-3">
                <Label>{t("templates.aiGenerate")}</Label>
                <Textarea
                  placeholder={t("templates.aiPromptPlaceholder")}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={generateTemplateWithAI}
                  disabled={generatingWithAI}
                  variant="secondary"
                  className="w-full"
                >
                  {generatingWithAI ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {t("templates.generateWithAI")}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="template-name">{t("templates.name")}</Label>
              <Input
                id="template-name"
                value={currentTemplate.name || ""}
                onChange={(e) =>
                  setCurrentTemplate({ ...currentTemplate, name: e.target.value })
                }
                placeholder={t("templates.namePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="template-category">{t("templates.category")}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCurrentCategory({ name: "" });
                    setCategoryDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("templates.manageCategories")}
                </Button>
              </div>
              <Select
                value={currentTemplate.category || (categories[0]?.name || "general")}
                onValueChange={(value) =>
                  setCurrentTemplate({ ...currentTemplate, category: value })
                }
              >
                <SelectTrigger id="template-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {getCategoryTranslation(category.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-content">{t("templates.content")}</Label>
              <Textarea
                id="template-content"
                value={currentTemplate.content || ""}
                onChange={(e) =>
                  setCurrentTemplate({ ...currentTemplate, content: e.target.value })
                }
                placeholder={t("templates.contentPlaceholder")}
                rows={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-tags">{t("templates.tags")}</Label>
              <Input
                id="template-tags"
                value={currentTemplate.tags?.join(", ") || ""}
                onChange={(e) =>
                  setCurrentTemplate({
                    ...currentTemplate,
                    tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                  })
                }
                placeholder={t("templates.tagsPlaceholder")}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="template-active"
                checked={currentTemplate.is_active || false}
                onChange={(e) =>
                  setCurrentTemplate({ ...currentTemplate, is_active: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="template-active">{t("templates.active")}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={saveTemplate}>
              {currentTemplate.id ? t("common.update") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentCategory.id ? t("templates.editCategory") : t("templates.createCategory")}
            </DialogTitle>
            <DialogDescription>{t("templates.categoryFormDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">{t("templates.categoryName")}</Label>
              <Input
                id="category-name"
                value={currentCategory.name || ""}
                onChange={(e) =>
                  setCurrentCategory({ ...currentCategory, name: e.target.value })
                }
                placeholder={t("templates.categoryNamePlaceholder")}
              />
            </div>

            {categories.length > 0 && (
              <div className="space-y-2">
                <Label>{t("templates.existingCategories")}</Label>
                <ScrollArea className="h-[200px] rounded-md border p-4">
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                        <span>{getCategoryTranslation(category.name)}</span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setCurrentCategory(category);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setCategoryToDelete(category.id);
                              setDeleteCategoryDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCategoryDialogOpen(false);
              setCurrentCategory({ name: "" });
            }}>
              {t("common.cancel")}
            </Button>
            <Button onClick={saveCategory}>
              {currentCategory.id ? t("common.update") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("templates.deleteConfirm")}</DialogTitle>
            <DialogDescription>{t("templates.deleteDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={deleteTemplate}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteCategoryDialogOpen} onOpenChange={setDeleteCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("templates.deleteCategoryConfirm")}</DialogTitle>
            <DialogDescription>{t("templates.deleteCategoryDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCategoryDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={deleteCategory}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
