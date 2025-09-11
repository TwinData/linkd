import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus, Edit2, Check, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type TransactionCharge = Tables<"transaction_charges">;

export const TransactionCharges = () => {
  const [charges, setCharges] = useState<TransactionCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('mpesa_send');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    min_amount: "",
    max_amount: "",
    charge_amount: ""
  });
  const [newCharge, setNewCharge] = useState({
    min_amount: "",
    max_amount: "",
    charge_amount: "",
    transaction_type: "mpesa_send"
  });
  const { toast } = useToast();

  const fetchCharges = async () => {
    try {
      const { data, error } = await supabase
        .from("transaction_charges")
        .select("*")
        .eq("transaction_type", selectedType)
        .order("min_amount");
      
      if (error) throw error;
      setCharges(data || []);
    } catch (error) {
      console.error("Error fetching charges:", error);
      toast({
        title: "Error",
        description: "Failed to load transaction charges",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addCharge = async () => {
    if (!newCharge.min_amount || !newCharge.max_amount || !newCharge.charge_amount) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("transaction_charges")
        .insert({
          min_amount: Number(newCharge.min_amount),
          max_amount: Number(newCharge.max_amount),
          charge_amount: Number(newCharge.charge_amount),
          transaction_type: selectedType
        });

      if (error) throw error;

      setNewCharge({ min_amount: "", max_amount: "", charge_amount: "", transaction_type: selectedType });
      fetchCharges();
      toast({
        title: "Success",
        description: "Transaction charge added successfully"
      });
    } catch (error) {
      console.error("Error adding charge:", error);
      toast({
        title: "Error",
        description: "Failed to add transaction charge",
        variant: "destructive"
      });
    }
  };

  const deleteCharge = async (id: string) => {
    try {
      const { error } = await supabase
        .from("transaction_charges")
        .delete()
        .eq("id", id);

      if (error) throw error;

      fetchCharges();
      toast({
        title: "Success",
        description: "Transaction charge deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting charge:", error);
      toast({
        title: "Error",
        description: "Failed to delete transaction charge",
        variant: "destructive"
      });
    }
  };

  const startEdit = (charge: TransactionCharge) => {
    setEditingId(charge.id);
    setEditData({
      min_amount: charge.min_amount.toString(),
      max_amount: charge.max_amount.toString(),
      charge_amount: charge.charge_amount.toString()
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ min_amount: "", max_amount: "", charge_amount: "" });
  };

  const saveEdit = async () => {
    if (!editingId || !editData.min_amount || !editData.max_amount || !editData.charge_amount) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("transaction_charges")
        .update({
          min_amount: Number(editData.min_amount),
          max_amount: Number(editData.max_amount),
          charge_amount: Number(editData.charge_amount)
        })
        .eq("id", editingId);

      if (error) throw error;

      setEditingId(null);
      setEditData({ min_amount: "", max_amount: "", charge_amount: "" });
      fetchCharges();
      toast({
        title: "Success",
        description: "Transaction charge updated successfully"
      });
    } catch (error) {
      console.error("Error updating charge:", error);
      toast({
        title: "Error",
        description: "Failed to update transaction charge",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchCharges();
  }, [selectedType]);

  if (loading) return <div>Loading transaction charges...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-muted-foreground">Transaction Charges (M-Pesa Rates)</CardTitle>
        <div className="flex gap-2 mt-2">
          <Button
            variant={selectedType === 'mpesa_send' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('mpesa_send')}
          >
            MPESA Send Money
          </Button>
          <Button
            variant={selectedType === 'paybill' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('paybill')}
          >
            Paybill
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-5 gap-2 text-sm font-medium text-muted-foreground">
          <div>Min Amount (KES)</div>
          <div>Max Amount (KES)</div>
          <div>Charge (KES)</div>
          <div>Actions</div>
          <div></div>
        </div>
        
        {charges.map((charge) => (
          <div key={charge.id} className="grid grid-cols-5 gap-2 items-center">
            {editingId === charge.id ? (
              <>
                <Input
                  type="number"
                  value={editData.min_amount}
                  onChange={(e) => setEditData(prev => ({ ...prev, min_amount: e.target.value }))}
                  className="text-sm"
                />
                <Input
                  type="number"
                  value={editData.max_amount}
                  onChange={(e) => setEditData(prev => ({ ...prev, max_amount: e.target.value }))}
                  className="text-sm"
                />
                <Input
                  type="number"
                  value={editData.charge_amount}
                  onChange={(e) => setEditData(prev => ({ ...prev, charge_amount: e.target.value }))}
                  className="text-sm"
                />
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={saveEdit}
                    className="w-fit p-1"
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelEdit}
                    className="w-fit p-1"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
                <div></div>
              </>
            ) : (
              <>
                <div className="text-sm">{charge.min_amount}</div>
                <div className="text-sm">{charge.max_amount}</div>
                <div className="text-sm">{charge.charge_amount}</div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(charge)}
                    className="w-fit p-1"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCharge(charge.id)}
                    className="w-fit p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div></div>
              </>
            )}
          </div>
        ))}

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Add New Charge</h4>
          <div className="grid grid-cols-5 gap-2">
            <div>
              <Label htmlFor="min-amount" className="sr-only">Min Amount</Label>
              <Input
                id="min-amount"
                type="number"
                placeholder="Min"
                value={newCharge.min_amount}
                onChange={(e) => setNewCharge(prev => ({ ...prev, min_amount: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="max-amount" className="sr-only">Max Amount</Label>
              <Input
                id="max-amount"
                type="number"
                placeholder="Max"
                value={newCharge.max_amount}
                onChange={(e) => setNewCharge(prev => ({ ...prev, max_amount: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="charge-amount" className="sr-only">Charge Amount</Label>
              <Input
                id="charge-amount"
                type="number"
                placeholder="Charge"
                value={newCharge.charge_amount}
                onChange={(e) => setNewCharge(prev => ({ ...prev, charge_amount: e.target.value }))}
              />
            </div>
            <Button onClick={addCharge} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
            <div></div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Adding charges for: {selectedType === 'mpesa_send' ? 'MPESA Send Money' : 'Paybill'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};