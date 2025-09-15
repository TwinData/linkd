import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthProvider";
import { Seo } from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Pencil, Trash, Search, Filter, ChevronUp, ChevronDown, Trash2, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, parseCSV, exportToPDF } from "@/utils/csvUtils";
import { FileUpload, FileOperationButton } from "@/components/ui/file-upload";
import { calculateTransactionFee } from "@/utils/transactionCharges";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Simple currency formatter
const formatCurrency = (value: number | null | undefined, currency: string) => {
  const num = typeof value === "number" ? value : 0;
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(num);
};

type Tx = Tables<"transactions">;
type Client = Tables<"clients">;

type TxExtra = Tx & {
  client_name?: string;
};

const Transactions = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fetching, setFetching] = useState(true);
  const [txs, setTxs] = useState<TxExtra[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TxExtra | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [formData, setFormData] = useState({
    amount_kd: "",
    rate_kes_per_kd: "",
    type: "",
    transaction_fee_kes: "",
    date: new Date()
  });
  
  // Pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"amount_kd" | "client_name" | "created_at" | "payout_kes" | "amount_kes">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterBy, setFilterBy] = useState<"all" | "M-PESA Send Money" | "M-PESA Paybill" | "Bank Transfer" | "Other">("all");
  const recordsPerPage = 50;

  // Multi-selection state
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [importErrors, setImportErrors] = useState<Array<{row: number, data: any, error: string}>>([]);
  const [importProgress, setImportProgress] = useState<{isImporting: boolean, current: number, total: number}>({
    isImporting: false,
    current: 0,
    total: 0
  });

  // Auto-calculate transaction fee when amount, rate, or type change
  useEffect(() => {
    const calculateFee = async () => {
      const amountKd = parseFloat(formData.amount_kd);
      const rate = parseFloat(formData.rate_kes_per_kd);
      
      if (amountKd && rate) {
        const payoutAmount = amountKd * rate;
        // Map UI transaction type to the expected format for the fee calculation
        const transactionType = formData.type === "M-PESA Paybill" ? "paybill" : "mpesa_send";
        console.log(`Calculating fee for type: ${transactionType}`);
        
        const fee = await calculateTransactionFee(payoutAmount, transactionType);
        setFormData(prev => ({
          ...prev,
          transaction_fee_kes: fee.toString()
        }));
      }
    };

    calculateFee();
  }, [formData.amount_kd, formData.rate_kes_per_kd, formData.type]);

  useEffect(() => {
    if (!loading && !user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!user || loading) return;
      setFetching(true);
      const [txRes, clRes] = await Promise.all([
        supabase.from("transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("clients").select("*")
      ]);
      setTxs((txRes.data as TxExtra[]) || []);
      setClients(clRes.data || []);
      setFetching(false);
    };
    load();
  }, [user, loading]);

  const clientsById = useMemo(() => {
    const map: Record<string, Client> = {};
    for (const c of clients) map[c.id as string] = c;
    return map;
  }, [clients]);

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    return clients.filter(c => 
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (c.phone && c.phone.includes(clientSearch))
    );
  }, [clients, clientSearch]);

  // Enhanced transactions with client names for filtering and sorting
  const txsWithClientNames = useMemo(() => {
    return txs.map(tx => ({
      ...tx,
      client_name: clientsById[tx.client_id as string]?.name || ""
    }));
  }, [txs, clientsById]);

  // Filtered and paginated transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = txsWithClientNames.filter(tx => {
      const matchesSearch = searchTerm === "" || 
        tx.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.type || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterBy === "all" || tx.type === filterBy;
      
      return matchesSearch && matchesFilter;
    });

    // Sort transactions
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === "client_name") {
        comparison = a.client_name.localeCompare(b.client_name);
      } else if (sortBy === "created_at") {
        comparison = new Date(a.created_at as string).getTime() - new Date(b.created_at as string).getTime();
      } else if (sortBy === "amount_kd") {
        comparison = Number(a.amount_kd || 0) - Number(b.amount_kd || 0);
      } else if (sortBy === "payout_kes") {
        comparison = Number(a.payout_kes || a.amount_kes || 0) - Number(b.payout_kes || b.amount_kes || 0);
      } else if (sortBy === "amount_kes") {
        comparison = Number(a.amount_kes || 0) - Number(b.amount_kes || 0);
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [txsWithClientNames, searchTerm, filterBy, sortBy, sortOrder]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    return filteredAndSortedTransactions.slice(startIndex, startIndex + recordsPerPage);
  }, [filteredAndSortedTransactions, currentPage, recordsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedTransactions.length / recordsPerPage);

  const handleSort = (column: "client_name" | "created_at" | "amount_kd" | "payout_kes" | "amount_kes") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilterBy("all");
    setSortBy("created_at");
    setSortOrder("desc");
    setCurrentPage(1);
    setSelectedTransactions([]);
    setIsAllSelected(false);
  };

  const calculatePayout = () => {
    const amount = parseFloat(formData.amount_kd) || 0;
    const rate = parseFloat(formData.rate_kes_per_kd) || 0;
    const fee = parseFloat(formData.transaction_fee_kes) || 0;
    
    // Calculate total amount
    const totalAmount = amount * rate;
    
    // Add fee to get final payout
    const finalPayout = totalAmount + fee;
    
    return { finalPayout, totalAmount };
  };

  const handleSaveTransaction = async () => {
    if (!selectedClient || !formData.amount_kd || !formData.rate_kes_per_kd) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const { finalPayout } = calculatePayout();
    
    try {
      if (!user?.id) {
        throw new Error("User ID is required for creating transactions");
      }
      
      // Calculate values
      const amount_kd = parseFloat(formData.amount_kd);
      const rate_kes_per_kd = parseFloat(formData.rate_kes_per_kd);
      const transaction_fee_kes = parseFloat(formData.transaction_fee_kes) || 0;
      const amount_kes = amount_kd * rate_kes_per_kd;
      
      // Create transaction data with all required fields
      const transactionData = {
        client_id: selectedClient,
        owner_id: user.id,
        amount_kd: amount_kd,
        rate_kes_per_kd: rate_kes_per_kd,
        amount_kes: amount_kes,
        type: formData.type || "M-PESA Send Money",
        transaction_fee_kes: transaction_fee_kes,
        notes: null,
        reference: null,
        status: "pending" as const
      };
      
      console.log('Creating transaction:', transactionData);
      const { error } = await supabase.from("transactions").insert(transactionData);

      if (error) throw error;

      toast({ title: "Success", description: "Transaction created successfully" });
      setOpenAdd(false);
      setFormData({ amount_kd: "", rate_kes_per_kd: "", type: "", transaction_fee_kes: "", date: new Date() });
      setSelectedClient("");
      setClientSearch("");
      
      // Refresh transactions
      const { data } = await supabase.from("transactions").select("*").order("created_at", { ascending: false });
      setTxs((data as TxExtra[]) || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEditTransaction = (transaction: TxExtra) => {
    setEditingTransaction(transaction);
    setSelectedClient(transaction.client_id as string);
    setFormData({
      amount_kd: transaction.amount_kd?.toString() || "",
      rate_kes_per_kd: transaction.rate_kes_per_kd?.toString() || "",
      type: transaction.type || "",
      transaction_fee_kes: transaction.transaction_fee_kes?.toString() || "",
      date: new Date(transaction.created_at as string)
    });
    setOpenEdit(true);
  };

  const handleUpdateTransaction = async () => {
    if (!selectedClient || !formData.amount_kd || !formData.rate_kes_per_kd || !editingTransaction) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const { finalPayout } = calculatePayout();
    
    try {
      const { error } = await supabase.from("transactions").update({
        client_id: selectedClient,
        amount_kd: parseFloat(formData.amount_kd),
        rate_kes_per_kd: parseFloat(formData.rate_kes_per_kd),
        amount_kes: parseFloat(formData.amount_kd) * parseFloat(formData.rate_kes_per_kd),
        type: formData.type,
        transaction_fee_kes: parseFloat(formData.transaction_fee_kes) || 0,
        payout_kes: finalPayout,
        created_at: formData.date.toISOString()
      }).eq('id', editingTransaction.id);

      if (error) throw error;

      toast({ title: "Success", description: "Transaction updated successfully" });
      setOpenEdit(false);
      setEditingTransaction(null);
      setFormData({ amount_kd: "", rate_kes_per_kd: "", type: "", transaction_fee_kes: "", date: new Date() });
      setSelectedClient("");
      setClientSearch("");
      
      // Refresh transactions
      const { data } = await supabase.from("transactions").select("*").order("created_at", { ascending: false });
      setTxs((data as TxExtra[]) || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    
    try {
      const { error } = await supabase.from("transactions").delete().eq('id', id);
      if (error) throw error;

      toast({ title: "Success", description: "Transaction deleted successfully" });
      
      // Refresh transactions
      const { data } = await supabase.from("transactions").select("*").order("created_at", { ascending: false });
      setTxs((data as TxExtra[]) || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Multi-selection functions
  const handleSelectTransaction = (transactionId: string) => {
    setSelectedTransactions(prev => {
      const newSelected = prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId];
      
      // Update select all state
      setIsAllSelected(newSelected.length === paginatedTransactions.length && paginatedTransactions.length > 0);
      
      return newSelected;
    });
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTransactions([]);
      setIsAllSelected(false);
    } else {
      const allPageIds = paginatedTransactions.map(tx => tx.id as string);
      setSelectedTransactions(allPageIds);
      setIsAllSelected(true);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTransactions.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedTransactions.length} transaction(s)?`)) return;
    
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .in('id', selectedTransactions);
        
      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `Deleted ${selectedTransactions.length} transaction(s) successfully` 
      });
      
      setSelectedTransactions([]);
      setIsAllSelected(false);
      
      // Refresh transactions
      const { data } = await supabase.from("transactions").select("*").order("created_at", { ascending: false });
      setTxs((data as TxExtra[]) || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Reset selection when page changes
  useEffect(() => {
    setSelectedTransactions([]);
    setIsAllSelected(false);
  }, [currentPage]);

  const handleImportCSV = async (file: File) => {
    try {
      setImportProgress({ isImporting: true, current: 0, total: 0 });
      
      const data = await parseCSV(file);
      console.log("Parsed CSV data:", data);
      
      setImportProgress(prev => ({ ...prev, total: data.length }));
      
      if (data.length === 0) {
        toast({ title: "Error", description: "CSV file is empty or has no valid data", variant: "destructive" });
        return;
      }
      
      // Validate required columns exist
      const firstRow = data[0];
      const requiredFields = ['client_name', 'amount_kd', 'rate_kes_per_kd'];
      const missingFields = requiredFields.filter(field => !(field in firstRow));
      
      if (missingFields.length > 0) {
        toast({ 
          title: "Error", 
          description: `CSV is missing required columns: ${missingFields.join(', ')}. Expected columns: client_name, amount_kd, rate_kes_per_kd, type (optional), transaction_fee_kes (optional), notes (optional), reference (optional)`, 
          variant: "destructive" 
        });
        return;
      }
      
      const results = {
        successful: 0,
        failed: 0,
        errors: [] as string[],
        failedRows: [] as Array<{row: number, data: any, error: string}>
      };
      
      for (let i = 0; i < data.length; i++) {
        const txData = data[i];
        const rowNumber = i + 2; // +2 because of header row and 0-based index
        
        // Update progress
        setImportProgress(prev => ({ ...prev, current: i + 1 }));
        
        try {
          // Validate required fields
          if (!txData.client_name?.trim()) {
            results.failed++;
            results.errors.push(`Row ${rowNumber}: Missing client name`);
            continue;
          }
          
          const amount = parseFloat(txData.amount_kd);
          const rate = parseFloat(txData.rate_kes_per_kd);
          
          if (isNaN(amount) || amount <= 0) {
            results.failed++;
            results.errors.push(`Row ${rowNumber}: Invalid amount_kd value`);
            continue;
          }
          
          if (isNaN(rate) || rate <= 0) {
            results.failed++;
            results.errors.push(`Row ${rowNumber}: Invalid rate_kes_per_kd value`);
            continue;
          }
          
          // Find client by name (case-insensitive)
          const client = clients.find(c => c.name.toLowerCase().trim() === txData.client_name.toLowerCase().trim());
          if (!client) {
            results.failed++;
            const errorMsg = `Client "${txData.client_name}" not found`;
            results.errors.push(`Row ${rowNumber}: ${errorMsg}`);
            results.failedRows.push({row: rowNumber, data: txData, error: errorMsg});
            continue;
          }
          
          if (!user?.id) {
            throw new Error("User ID is required for creating transactions");
          }
          
          // Calculate amount_kes
          const amount_kes = amount * rate;
          
          // Calculate fee based on transaction type
          let fee = 0;
          if (txData.transaction_fee_kes && !isNaN(parseFloat(txData.transaction_fee_kes))) {
            fee = parseFloat(txData.transaction_fee_kes);
          } else {
            // Map transaction type to the expected format for fee calculation
            const transactionType = txData.type?.trim() === "M-PESA Paybill" ? "paybill" : "mpesa_send";
            console.log(`Import: Calculating fee for type: ${transactionType} and amount: ${amount_kes}`);
            fee = await calculateTransactionFee(amount_kes, transactionType);
          }
          
          // Create transaction data with required fields
          const transactionData = {
            client_id: client.id,
            owner_id: user.id,
            amount_kd: amount,
            rate_kes_per_kd: rate,
            amount_kes: amount_kes,
            type: txData.type?.trim() || "M-PESA Send Money",
            transaction_fee_kes: fee,
            notes: txData.notes?.trim() || null,
            reference: txData.reference?.trim() || null,
            status: "pending" as const
          };
          
          console.log('Importing transaction:', transactionData);
          const { error } = await supabase.from("transactions").insert(transactionData);
          
          if (error) {
            results.failed++;
            results.errors.push(`Row ${rowNumber}: Database error - ${error.message}`);
          } else {
            results.successful++;
          }
          
        } catch (rowError: any) {
          results.failed++;
          const errorMsg = rowError.message;
          results.errors.push(`Row ${rowNumber}: ${errorMsg}`);
          results.failedRows.push({row: rowNumber, data: txData, error: errorMsg});
        }
        
        // Small delay to show progress animation
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      // Show results
      if (results.successful > 0) {
        toast({ 
          title: "Import Complete", 
          description: `Successfully imported ${results.successful} transaction(s)${results.failed > 0 ? `, ${results.failed} failed` : ''}` 
        });
      }
      
      if (results.failed > 0 && results.errors.length > 0) {
        console.error("Import errors:", results.errors);
        setImportErrors(results.failedRows);
        toast({ 
          title: "Import Errors", 
          description: `${results.failed} row(s) failed. View details below.`, 
          variant: "destructive" 
        });
      }
      
      setOpenImport(false);
      setImportProgress({ isImporting: false, current: 0, total: 0 });
      
      // Refresh transactions if any were imported
      if (results.successful > 0) {
        const { data: refreshedData } = await supabase.from("transactions").select("*").order("created_at", { ascending: false });
        setTxs((refreshedData as TxExtra[]) || []);
      }
      
    } catch (error: any) {
      console.error("CSV Import Error:", error);
      toast({ title: "Error", description: `Failed to import CSV: ${error.message}`, variant: "destructive" });
    }
  };

  const handleExportCSV = async () => {
    const exportData = txs.map(tx => ({
      client_name: clientsById[tx.client_id as string]?.name || "",
      date: new Date(tx.created_at as string).toLocaleDateString(),
      amount_kd: tx.amount_kd,
      rate_kes_per_kd: tx.rate_kes_per_kd,
      amount_kes: tx.amount_kes,
      type: tx.type || "",
      transaction_fee_kes: tx.transaction_fee_kes,
      payout_kes: tx.payout_kes
    }));
    
    // Add a small delay to simulate processing time and show the progress animation
    await new Promise(resolve => setTimeout(resolve, 800));
    
    exportToCSV(exportData, "transactions");
  };

  const handleExportPDF = async () => {
    const exportData = txs.map(tx => ({
      "Client Name": clientsById[tx.client_id as string]?.name || "",
      "Date": new Date(tx.created_at as string).toLocaleDateString(),
      "Amount (KWD)": tx.amount_kd,
      "Rate": tx.rate_kes_per_kd,
      "Amount (KES)": tx.amount_kes,
      "Type": tx.type || "",
      "Fee (KES)": tx.transaction_fee_kes,
      "Payout (KES)": tx.payout_kes
    }));
    
    // Add a small delay to simulate processing time and show the progress animation
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    exportToPDF(exportData, "Transactions Report");
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="LinKD Transactions | Track and manage"
        description="Review, create, and manage KD↔KES transactions on LinKD."
        canonical={window.location.href}
      />
      <header className="border-b border-border">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-xl font-semibold text-foreground">Transactions</h1>
          <div className="flex gap-2">
            <Dialog open={openAdd} onOpenChange={setOpenAdd}>
              <DialogTrigger asChild>
                <Button>Add Transaction</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add a new transaction</DialogTitle>
                  <DialogDescription>Fill in the transaction details below to add it to the system.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Search and select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="sticky top-0 bg-background p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search clients..."
                              value={clientSearch}
                              onChange={(e) => setClientSearch(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        {filteredClients.map(c => (
                          <SelectItem key={c.id as string} value={c.id as string}>
                            {c.name} {c.phone && `- ${c.phone}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Link Amount (KWD) *</Label>
                      <Input 
                        type="number" 
                        placeholder="0.00"
                        value={formData.amount_kd}
                        onChange={(e) => setFormData(prev => ({ ...prev, amount_kd: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rate (KES per KWD) *</Label>
                      <Input 
                        type="number" 
                        placeholder="0.00"
                        value={formData.rate_kes_per_kd}
                        onChange={(e) => setFormData(prev => ({ ...prev, rate_kes_per_kd: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M-PESA Send Money">M-PESA Send Money</SelectItem>
                          <SelectItem value="M-PESA Paybill">M-PESA Paybill</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Transaction Fee (KES)</Label>
                      <Input 
                        type="number" 
                        placeholder="0"
                        value={formData.transaction_fee_kes}
                        onChange={(e) => setFormData(prev => ({ ...prev, transaction_fee_kes: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Transaction Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.date}
                            onSelect={(date) => setFormData(prev => ({ ...prev, date: date || new Date() }))}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Calculated Payout (Including Fee) (KES)</Label>
                      <Input 
                        type="number" 
                        placeholder="0.00"
                        value={calculatePayout().finalPayout.toFixed(2)}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpenAdd(false)}>Cancel</Button>
                    <Button onClick={handleSaveTransaction}>Save</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={openImport} onOpenChange={setOpenImport}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Transactions from CSV</DialogTitle>
                  <DialogDescription>Upload a CSV file to import multiple transactions at once.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {importProgress.isImporting ? (
                    <div className="space-y-4">
                      <div className="text-center">
                        <h3 className="text-lg font-medium">Importing CSV...</h3>
                        <p className="text-muted-foreground">
                          Processing row {importProgress.current} of {importProgress.total}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Progress 
                          value={(importProgress.current / importProgress.total) * 100} 
                          className="w-full animate-pulse"
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{importProgress.current} completed</span>
                          <span>{Math.round((importProgress.current / importProgress.total) * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>CSV File</Label>
                        <FileUpload
                          onFileSelect={handleImportCSV}
                          accept=".csv"
                          buttonText="Select CSV File"
                          icon="upload"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        CSV should include columns: client_name, amount_kd, rate_kes_per_kd, type, transaction_fee_kes
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit transaction</DialogTitle>
                  <DialogDescription>Update the transaction details below.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Search and select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="sticky top-0 bg-background p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search clients..."
                              value={clientSearch}
                              onChange={(e) => setClientSearch(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        {filteredClients.map(c => (
                          <SelectItem key={c.id as string} value={c.id as string}>
                            {c.name} {c.phone && `- ${c.phone}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Link Amount (KWD) *</Label>
                      <Input 
                        type="number" 
                        placeholder="0.00"
                        value={formData.amount_kd}
                        onChange={(e) => setFormData(prev => ({ ...prev, amount_kd: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rate (KES per KWD) *</Label>
                      <Input 
                        type="number" 
                        placeholder="0.00"
                        value={formData.rate_kes_per_kd}
                        onChange={(e) => setFormData(prev => ({ ...prev, rate_kes_per_kd: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M-PESA Send Money">M-PESA Send Money</SelectItem>
                          <SelectItem value="M-PESA Paybill">M-PESA Paybill</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Transaction Fee (KES)</Label>
                      <Input 
                        type="number" 
                        placeholder="0"
                        value={formData.transaction_fee_kes}
                        onChange={(e) => setFormData(prev => ({ ...prev, transaction_fee_kes: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Transaction Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.date}
                            onSelect={(date) => setFormData(prev => ({ ...prev, date: date || new Date() }))}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Calculated Payout (Including Fee) (KES)</Label>
                      <Input 
                        type="number" 
                        placeholder="0.00"
                        value={calculatePayout().finalPayout.toFixed(2)}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpenEdit(false)}>Cancel</Button>
                    <Button onClick={handleUpdateTransaction}>Update</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <FileOperationButton
              onClick={handleExportCSV}
              buttonText="Export CSV"
              icon="download"
              variant="outline"
            />
            <FileOperationButton
              onClick={handleExportPDF}
              buttonText="Export PDF"
              icon="download"
              variant="outline"
            />
            <Button variant="secondary" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </div>
        </div>
      </header>
      <main className="container py-8 space-y-6">
        <section aria-labelledby="transactions-overview" className="space-y-2">
          <h2 id="transactions-overview" className="sr-only">Overview</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-muted-foreground">Transaction Records</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by client name or transaction type..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={filterBy} onValueChange={(value: typeof filterBy) => {
                    setFilterBy(value);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="M-PESA Send Money">M-PESA Send Money</SelectItem>
                      <SelectItem value="M-PESA Paybill">M-PESA Paybill</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedTransactions.length > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={handleBulkDelete}
                      className="whitespace-nowrap"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete ({selectedTransactions.length})
                    </Button>
                  )}
                  <Button variant="outline" onClick={resetFilters}>
                    Reset
                  </Button>
                </div>
              </div>
              
              {/* Results Summary */}
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">
                  Showing {paginatedTransactions.length} of {filteredAndSortedTransactions.length} transactions
                </p>
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead className="w-12">
                         <input
                           type="checkbox"
                           checked={isAllSelected}
                           onChange={handleSelectAll}
                           disabled={paginatedTransactions.length === 0}
                           className="rounded border-input"
                         />
                       </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("client_name")}
                      >
                        <div className="flex items-center gap-1">
                          Client Name
                          {sortBy === "client_name" && (
                            sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("created_at")}
                      >
                        <div className="flex items-center gap-1">
                          Date
                          {sortBy === "created_at" && (
                            sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("amount_kd")}
                      >
                        <div className="flex items-center gap-1">
                          Link Amount
                          {sortBy === "amount_kd" && (
                            sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Transaction Fee</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("payout_kes")}
                      >
                        <div className="flex items-center gap-1">
                          Payout (Including Fee)
                          {sortBy === "payout_kes" && (
                            sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("amount_kes")}
                      >
                        <div className="flex items-center gap-1">
                          Total Amount (KES)
                          {sortBy === "amount_kes" && (
                            sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                     {fetching && (
                       <TableRow>
                         <TableCell colSpan={11} className="text-center text-muted-foreground">Loading…</TableCell>
                       </TableRow>
                     )}
                     {!fetching && filteredAndSortedTransactions.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={11} className="text-center text-muted-foreground">No transactions found.</TableCell>
                       </TableRow>
                     )}
                     {!fetching && paginatedTransactions.map(t => {
                       const client = t.client_id ? clientsById[t.client_id as string] : undefined;
                       const isSelected = selectedTransactions.includes(t.id as string);
                       return (
                         <TableRow key={t.id as string} className={isSelected ? "bg-muted/50" : ""}>
                           <TableCell>
                             <input
                               type="checkbox"
                               checked={isSelected}
                               onChange={() => handleSelectTransaction(t.id as string)}
                               className="rounded border-input"
                             />
                           </TableCell>
                          <TableCell className="font-medium">{client?.name ?? "—"}</TableCell>
                          <TableCell>{new Date(t.created_at as string).toLocaleDateString()}</TableCell>
                          <TableCell>{formatCurrency(Number(t.amount_kd), "KWD")}</TableCell>
                          <TableCell>{Number(t.rate_kes_per_kd).toFixed(2)}</TableCell>
                          <TableCell>{t.type ?? "—"}</TableCell>
                          <TableCell>{formatCurrency(Number(t.transaction_fee_kes), "KES")}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(Number(t.payout_kes), "KES")}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(Number(t.amount_kes), "KES")}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="outline" size="sm" onClick={() => handleEditTransaction(t)} aria-label="Edit">
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDeleteTransaction(t.id as string)} aria-label="Delete">
                                <Trash className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) setCurrentPage(currentPage - 1);
                          }}
                          className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(page);
                                }}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        } else if (
                          (page === currentPage - 2 && currentPage > 3) ||
                          (page === currentPage + 2 && currentPage < totalPages - 2)
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <span className="px-4 py-2">...</span>
                            </PaginationItem>
                          );
                        }
                        return null;
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                          }}
                          className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
        
        {/* Import Errors Section */}
        {importErrors.length > 0 && (
          <section aria-labelledby="import-errors" className="space-y-2">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <Trash className="h-5 w-5" />
                  CSV Import Failed Rows ({importErrors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setImportErrors([])}
                    className="mb-4"
                  >
                    Clear Error List
                  </Button>
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row #</TableHead>
                          <TableHead>Client Name</TableHead>
                          <TableHead>Amount (KWD)</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importErrors.map((errorRow, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{errorRow.row}</TableCell>
                            <TableCell>{errorRow.data.client_name || "—"}</TableCell>
                            <TableCell>{errorRow.data.amount_kd || "—"}</TableCell>
                            <TableCell>{errorRow.data.rate_kes_per_kd || "—"}</TableCell>
                            <TableCell>{errorRow.data.type || "—"}</TableCell>
                            <TableCell className="text-destructive text-sm">{errorRow.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
};

export default Transactions;
