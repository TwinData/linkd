import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus } from "lucide-react";
import { format } from "date-fns";

interface FloatDeposit {
  id: string;
  date: string;
  total_kd: number;
  transaction_fee: number;
  sarah_share_percentage: number;
  sarah_total: number;
  total_kes: number;
  rate: number;
  profit: number;
  owner_id: string;
}

export default function FloatDeposits() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<FloatDeposit | null>(null);
  const [formData, setFormData] = useState({
    total_kd: "",
    transaction_fee: "",
    sarah_share_percentage: "",
    rate: "",
    profit: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deposits, isLoading } = useQuery({
    queryKey: ["float-deposits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("float_deposits")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;
      return data as FloatDeposit[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("float_deposits")
        .insert({
          ...data,
          owner_id: user.user.id,
          total_kd: parseFloat(data.total_kd),
          transaction_fee: parseFloat(data.transaction_fee || "0"),
          sarah_share_percentage: parseFloat(data.sarah_share_percentage),
          rate: parseFloat(data.rate),
          profit: parseFloat(data.profit || "0"),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["float-deposits"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Float deposit created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating float deposit", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from("float_deposits")
        .update({
          total_kd: parseFloat(data.total_kd),
          transaction_fee: parseFloat(data.transaction_fee || "0"),
          sarah_share_percentage: parseFloat(data.sarah_share_percentage),
          rate: parseFloat(data.rate),
          profit: parseFloat(data.profit || "0"),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["float-deposits"] });
      setIsDialogOpen(false);
      setEditingDeposit(null);
      resetForm();
      toast({ title: "Float deposit updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating float deposit", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("float_deposits")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["float-deposits"] });
      toast({ title: "Float deposit deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting float deposit", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      total_kd: "",
      transaction_fee: "",
      sarah_share_percentage: "",
      rate: "",
      profit: "",
    });
  };

  const handleEdit = (deposit: FloatDeposit) => {
    setEditingDeposit(deposit);
    setFormData({
      total_kd: deposit.total_kd.toString(),
      transaction_fee: deposit.transaction_fee.toString(),
      sarah_share_percentage: deposit.sarah_share_percentage.toString(),
      rate: deposit.rate.toString(),
      profit: deposit.profit.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingDeposit) {
      updateMutation.mutate({ id: editingDeposit.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <>
      <Seo 
        title="Float Deposits - Manage Your Float Operations"
        description="Track and manage float deposits with automatic calculations for Sarah's share and conversion rates."
      />
      
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Float Deposits</h1>
            <p className="text-muted-foreground">Manage your float deposit operations</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingDeposit(null); resetForm(); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Float Deposit
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingDeposit ? "Edit Float Deposit" : "Add Float Deposit"}
                </DialogTitle>
                <DialogDescription>
                  {editingDeposit ? "Update the deposit details below." : "Enter the details for the new float deposit."}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="total_kd">Total KD</Label>
                  <Input
                    id="total_kd"
                    type="number"
                    step="0.01"
                    value={formData.total_kd}
                    onChange={(e) => setFormData({ ...formData, total_kd: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="transaction_fee">Transaction Fee</Label>
                  <Input
                    id="transaction_fee"
                    type="number"
                    step="0.01"
                    value={formData.transaction_fee}
                    onChange={(e) => setFormData({ ...formData, transaction_fee: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="sarah_share_percentage">Sarah's Share (%)</Label>
                  <Input
                    id="sarah_share_percentage"
                    type="number"
                    step="0.01"
                    value={formData.sarah_share_percentage}
                    onChange={(e) => setFormData({ ...formData, sarah_share_percentage: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="rate">Rate (KES per KD)</Label>
                  <Input
                    id="rate"
                    type="number"
                    step="0.01"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="profit">Profit</Label>
                  <Input
                    id="profit"
                    type="number"
                    step="0.01"
                    value={formData.profit}
                    onChange={(e) => setFormData({ ...formData, profit: e.target.value })}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingDeposit ? "Update" : "Create"} Float Deposit
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Float Deposits List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : deposits?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No float deposits found. Create your first deposit to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Total KD</TableHead>
                      <TableHead>Transaction Fee</TableHead>
                      <TableHead>Sarah's Share (%)</TableHead>
                      <TableHead>Sarah's Total</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Total KES</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deposits?.map((deposit) => (
                      <TableRow key={deposit.id}>
                        <TableCell>{format(new Date(deposit.date), "MMM dd, yyyy")}</TableCell>
                        <TableCell>{deposit.total_kd.toLocaleString()}</TableCell>
                        <TableCell>{deposit.transaction_fee.toLocaleString()}</TableCell>
                        <TableCell>{deposit.sarah_share_percentage}%</TableCell>
                        <TableCell>{deposit.sarah_total.toLocaleString()}</TableCell>
                        <TableCell>{deposit.rate.toLocaleString()}</TableCell>
                        <TableCell>{deposit.total_kes.toLocaleString()}</TableCell>
                        <TableCell>{deposit.profit.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(deposit)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteMutation.mutate(deposit.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}