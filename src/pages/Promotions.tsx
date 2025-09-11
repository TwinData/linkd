import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthProvider";
import { Seo } from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus } from "lucide-react";

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  value: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  results: string | null;
  created_at: string;
}

interface PromotionStats {
  total: number;
  active: number;
  upcoming: number;
  finished: number;
}

const Promotions = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [stats, setStats] = useState<PromotionStats>({ total: 0, active: 0, upcoming: 0, finished: 0 });
  const [loadingData, setLoadingData] = useState(true);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    discount_type: "percentage" as "percentage" | "fixed",
    value: "",
    starts_at: "",
    ends_at: "",
    results: "",
    active: true
  });

  const getPromotionStatus = (promotion: Promotion) => {
    const now = new Date();
    const starts = promotion.starts_at ? new Date(promotion.starts_at) : null;
    const ends = promotion.ends_at ? new Date(promotion.ends_at) : null;
    
    if (!promotion.active) return "finished";
    if (starts && now < starts) return "upcoming";
    if (ends && now > ends) return "finished";
    return "ongoing";
  };

  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPromotions(data || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const active = data?.filter(p => getPromotionStatus(p) === "ongoing").length || 0;
      const upcoming = data?.filter(p => getPromotionStatus(p) === "upcoming").length || 0;
      const finished = data?.filter(p => getPromotionStatus(p) === "finished").length || 0;
      
      setStats({ total, active, upcoming, finished });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch promotions",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      discount_type: "percentage",
      value: "",
      starts_at: "",
      ends_at: "",
      results: "",
      active: true
    });
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        discount_type: formData.discount_type,
        value: parseFloat(formData.value),
        starts_at: formData.starts_at || null,
        ends_at: formData.ends_at || null,
        results: formData.results || null,
        active: formData.active,
        created_by: user?.id
      };

      if (selectedPromotion) {
        const { error } = await supabase
          .from("promotions")
          .update(payload)
          .eq("id", selectedPromotion.id);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Promotion updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("promotions")
          .insert([payload]);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Promotion created successfully",
        });
      }

      setShowForm(false);
      setEditMode(false);
      setSelectedPromotion(null);
      resetForm();
      fetchPromotions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save promotion",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setFormData({
      name: promotion.name,
      description: promotion.description || "",
      discount_type: promotion.discount_type,
      value: promotion.value.toString(),
      starts_at: promotion.starts_at ? promotion.starts_at.split('T')[0] : "",
      ends_at: promotion.ends_at ? promotion.ends_at.split('T')[0] : "",
      results: promotion.results || "",
      active: promotion.active
    });
    setEditMode(true);
    setShowForm(true);
  };

  const handleDelete = async (promotionId: string) => {
    if (!confirm("Are you sure you want to delete this promotion?")) return;
    
    try {
      const { error } = await supabase
        .from("promotions")
        .delete()
        .eq("id", promotionId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Promotion deleted successfully",
      });
      
      fetchPromotions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete promotion",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!loading && !user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPromotions();
    }
  }, [user]);

  if (loading || loadingData) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const handleNewPromotion = () => {
    resetForm();
    setSelectedPromotion(null);
    setEditMode(false);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditMode(false);
    setSelectedPromotion(null);
    resetForm();
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="LinKD Promotions | Create and manage offers"
        description="Create and manage promotions for LinKD customers."
        canonical={window.location.href}
      />
      <header className="border-b border-border">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-xl font-semibold text-foreground">Promotions</h1>
          <div className="flex gap-2">
            <Button onClick={handleNewPromotion}>
              <Plus className="w-4 h-4 mr-2" />
              Add Promotion
            </Button>
            <Button variant="secondary" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </div>
        </div>
      </header>
      <main className="container py-8 space-y-6">
        {/* Promotion Form */}
        <Collapsible open={showForm} onOpenChange={setShowForm}>
          <CollapsibleContent>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{editMode ? "Edit Promotion" : "Create New Promotion"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input 
                    placeholder="Promotion name" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    placeholder="Promotion description" 
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Discount Type</Label>
                    <Select 
                      value={formData.discount_type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, discount_type: value as "percentage" | "fixed" }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Value</Label>
                    <Input 
                      type="number" 
                      placeholder="10" 
                      value={formData.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input 
                      type="date" 
                      value={formData.starts_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, starts_at: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input 
                      type="date" 
                      value={formData.ends_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, ends_at: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Results</Label>
                  <Textarea 
                    placeholder="Promotion results and performance notes" 
                    value={formData.results}
                    onChange={(e) => setFormData(prev => ({ ...prev, results: e.target.value }))}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="active" 
                    checked={formData.active}
                    onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCancelForm}>Cancel</Button>
                  <Button onClick={handleSubmit}>{editMode ? "Update" : "Save"}</Button>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        <section aria-labelledby="promotions-overview" className="space-y-4">
          <h2 id="promotions-overview" className="sr-only">Overview</h2>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Promotions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Now</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Finished</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{stats.finished}</div>
              </CardContent>
            </Card>
          </div>

          {/* Promotions Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Promotions</CardTitle>
            </CardHeader>
            <CardContent>
              {promotions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No promotions found. Create your first promotion to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promotions.map((promotion) => {
                      const status = getPromotionStatus(promotion);
                      return (
                        <TableRow key={promotion.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{promotion.name}</div>
                              {promotion.description && (
                                <div className="text-sm text-muted-foreground">{promotion.description}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {promotion.discount_type === "percentage" ? "%" : "Fixed"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {promotion.discount_type === "percentage" ? `${promotion.value}%` : `${promotion.value} KD`}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                status === "ongoing" ? "default" :
                                status === "upcoming" ? "secondary" : "outline"
                              }
                            >
                              {status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {promotion.starts_at && (
                                <div>Start: {new Date(promotion.starts_at).toLocaleDateString()}</div>
                              )}
                              {promotion.ends_at && (
                                <div>End: {new Date(promotion.ends_at).toLocaleDateString()}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEdit(promotion)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDelete(promotion.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Promotions;
