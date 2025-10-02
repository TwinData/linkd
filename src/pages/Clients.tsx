import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthProvider";
import { Seo } from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash, Eye, MoreHorizontal, Search, Filter, ChevronUp, ChevronDown } from "lucide-react";
import { exportToCSV, parseCSV, exportToPDF } from "@/utils/csvUtils";
import { FileUpload, FileOperationButton } from "@/components/ui/file-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { logClientCreate, logClientUpdate, logClientDelete } from "@/utils/auditLog";

const formatCurrency = (value: number | null | undefined, currency: string) => {
  const num = typeof value === "number" ? value : 0;
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(num);
};

type Client = Tables<"clients">;
type Tx = Tables<"transactions"> & {
  payout_kes?: number | null;
};

const Clients = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fetching, setFetching] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsWithTransactions, setClientsWithTransactions] = useState<any[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "" });
  
  // Pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "created_at" | "transactions">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterBy, setFilterBy] = useState<"all" | "with_transactions" | "without_transactions">("all");
  const recordsPerPage = 10;

  useEffect(() => {
    if (!loading && !user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    fetchClients();
    fetchClientsWithTransactions();
  }, []);

  const fetchClients = async () => {
    if (!user || loading) return;
    setFetching(true);
    const [clRes, txRes] = await Promise.all([
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*")
    ]);
    setClients(clRes.data || []);
    setTxs((txRes.data as Tx[]) || []);
    setFetching(false);
  };

  const fetchClientsWithTransactions = async () => {
    const { data } = await supabase.from("client_transaction_summary").select("*").order("latest_transaction_date", { ascending: false, nullsLast: true });
    setClientsWithTransactions(data || []);
  };

  const stats = useMemo(() => {
    const map: Record<string, { count: number; totalKes: number; latest: string | null }> = {};
    for (const t of txs) {
      const cid = (t.client_id as string) || "";
      if (!cid) continue;
      const entry = map[cid] || { count: 0, totalKes: 0, latest: null };
      entry.count += 1;
      entry.totalKes += Number((t as Tx).payout_kes ?? (t as any).amount_kes ?? 0);
      const d = new Date(t.created_at as string).toISOString();
      entry.latest = entry.latest && entry.latest > d ? entry.latest : d;
      map[cid] = entry;
    }
    return map;
  }, [txs]);

  // Filtered and paginated clients
  const filteredAndSortedClients = useMemo(() => {
    let filtered = clients.filter(client => {
      const matchesSearch = searchTerm === "" || 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.phone || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const clientStats = stats[client.id as string];
      const hasTransactions = clientStats && clientStats.count > 0;
      
      const matchesFilter = filterBy === "all" || 
        (filterBy === "with_transactions" && hasTransactions) ||
        (filterBy === "without_transactions" && !hasTransactions);
      
      return matchesSearch && matchesFilter;
    });

    // Sort clients
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "created_at") {
        comparison = new Date(a.created_at as string).getTime() - new Date(b.created_at as string).getTime();
      } else if (sortBy === "transactions") {
        const aCount = stats[a.id as string]?.count || 0;
        const bCount = stats[b.id as string]?.count || 0;
        comparison = aCount - bCount;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [clients, searchTerm, filterBy, sortBy, sortOrder, stats]);

  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    return filteredAndSortedClients.slice(startIndex, startIndex + recordsPerPage);
  }, [filteredAndSortedClients, currentPage, recordsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedClients.length / recordsPerPage);

  const handleSort = (column: "name" | "created_at" | "transactions") => {
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
  };

  const handleSaveClient = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Please enter a client name", variant: "destructive" });
      return;
    }

    try {
      // Create basic client data
      // Using 'as any' to bypass TypeScript's type checking since we know the database schema is different
      const clientData = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null
      } as any;
      
      console.log('Creating client:', clientData);
      
      // Try direct insert
      const { data: newClient, error } = await supabase.from("clients").insert(clientData).select().single();

      if (error) {
        console.error('Error creating client:', error);
        throw error;
      }

      // Log audit trail
      if (newClient) {
        await logClientCreate(newClient.id, {
          name: newClient.name,
          phone: newClient.phone,
        });
      }

      toast({ title: "Success", description: "Client created successfully" });
      setOpenAdd(false);
      setFormData({ name: "", phone: "" });
      
      // Refresh clients
      const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      setClients(data || []);
    } catch (error: any) {
      console.error('Client creation error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone || ""
    });
    setOpenEdit(true);
  };

  const handleUpdateClient = async () => {
    if (!formData.name.trim() || !editingClient) {
      toast({ title: "Error", description: "Please enter a client name", variant: "destructive" });
      return;
    }

    try {
      // Store old values for audit
      const oldValues = {
        name: editingClient.name,
        phone: editingClient.phone,
      };

      const newValues = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
      };

      const { error } = await supabase.from("clients").update(newValues).eq('id', editingClient.id);

      if (error) throw error;

      // Log audit trail
      await logClientUpdate(editingClient.id, oldValues, newValues);

      toast({ title: "Success", description: "Client updated successfully" });
      setOpenEdit(false);
      setEditingClient(null);
      setFormData({ name: "", phone: "" });
      
      // Refresh clients
      const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      setClients(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm("Are you sure you want to delete this client? This will also delete all their transactions.")) return;
    
    try {
      // Get client data before deleting for audit
      const clientToDelete = clients.find(c => c.id === id);
      
      // Delete transactions first
      await supabase.from("transactions").delete().eq('client_id', id);
      // Then delete client
      const { error } = await supabase.from("clients").delete().eq('id', id);
      if (error) throw error;

      // Log audit trail
      if (clientToDelete) {
        await logClientDelete(id, {
          name: clientToDelete.name,
          phone: clientToDelete.phone,
        });
      }

      toast({ title: "Success", description: "Client deleted successfully" });
      
      // Refresh clients
      const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      setClients(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleImportCSV = async (file: File) => {
    try {
      // Parse the CSV file
      const data = await parseCSV(file);
      console.log('Parsed CSV data:', data);
      
      // Validate and import clients
      const validClients = data.filter(item => {
        // Check if name exists in any case variation
        return item.name || item.Name || item.NAME;
      });
      
      console.log('Valid clients to import:', validClients);
      
      if (validClients.length === 0) {
        toast({ 
          title: "Error", 
          description: "No valid clients found in CSV. Ensure your CSV has a 'name' column.", 
          variant: "destructive" 
        });
        return;
      }
      
      // Process each client with a small delay to show progress
      let successCount = 0;
      for (const client of validClients) {
        // Get name from any case variation
        const name = client.name || client.Name || client.NAME;
        // Get phone from any case variation
        const phone = client.phone || client.Phone || client.PHONE;
        // Get email from any case variation
        const email = client.email || client.Email || client.EMAIL;
        
        console.log('Importing client:', { name, phone, email });
        
        // Using 'as any' to bypass TypeScript's type checking since we know the database schema is different
        const clientData = {
          name: name,
          phone: phone || null,
          email: email || null
        } as any;
        
        const { error } = await supabase.from("clients").insert(clientData);
        
        if (!error) {
          successCount++;
        } else {
          console.error('Error importing client:', error);
        }
        
        // Small delay to make the progress visible
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      toast({ title: "Success", description: `Imported ${successCount} clients` });
      setOpenImport(false);
      
      // Refresh clients
      const { data: refreshedData } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      setClients(refreshedData || []);
    } catch (error: any) {
      console.error('CSV import error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleExportCSV = async () => {
    // Create export data
    const exportData = clients.map(client => ({
      name: client.name,
      phone: client.phone || "",
      email: client.email || "",
      created_at: new Date(client.created_at as string).toLocaleDateString(),
      transactions_count: stats[client.id as string]?.count || 0,
      total_amount: stats[client.id as string]?.totalKes || 0
    }));
    
    // Add a small delay to simulate processing time and show the progress animation
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Export the CSV
    exportToCSV(exportData, "clients");
  };

  const handleExportPDF = async () => {
    // Create export data
    const exportData = clients.map(client => ({
      "Name": client.name,
      "Phone": client.phone || "",
      "Email": client.email || "",
      "Date Added": new Date(client.created_at as string).toLocaleDateString(),
      "Transactions": stats[client.id as string]?.count || 0,
      "Total Amount (KES)": stats[client.id as string]?.totalKes || 0
    }));
    
    // Add a small delay to simulate processing time and show the progress animation
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Export the PDF
    exportToPDF(exportData, "Clients Report");
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
        title="LinKD Clients | Manage customer records"
        description="View and manage your LinKD client records and details."
        canonical={window.location.href}
      />
      <header className="border-b border-border">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-xl font-semibold text-foreground">Clients</h1>
          <div className="flex gap-2">
            <Dialog open={openAdd} onOpenChange={setOpenAdd}>
              <DialogTrigger asChild>
                <Button>Add Client</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add a new client</DialogTitle>
                  <DialogDescription>Fill in the details to add a new client to your system.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input 
                      id="name" 
                      placeholder="Client name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input 
                      id="phone" 
                      placeholder="0700 000 000"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpenAdd(false)}>Cancel</Button>
                    <Button onClick={handleSaveClient}>Save</Button>
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
                  <DialogTitle>Import Clients from CSV</DialogTitle>
                  <DialogDescription>Upload a CSV file to import multiple clients at once.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
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
                    CSV should include columns: name (required), phone, email
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit client</DialogTitle>
                  <DialogDescription>Update the client information below.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Name *</Label>
                    <Input 
                      id="edit-name" 
                      placeholder="Client name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input 
                      id="edit-phone" 
                      placeholder="0700 000 000"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpenEdit(false)}>Cancel</Button>
                    <Button onClick={handleUpdateClient}>Update</Button>
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
        <section aria-labelledby="clients-overview" className="space-y-2">
          <h2 id="clients-overview" className="sr-only">Overview</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-muted-foreground">Client Records</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search clients by name or phone..."
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
                      <SelectItem value="all">All Clients</SelectItem>
                      <SelectItem value="with_transactions">With Transactions</SelectItem>
                      <SelectItem value="without_transactions">Without Transactions</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={resetFilters}>
                    Reset
                  </Button>
                </div>
              </div>
              
              {/* Results Summary */}
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">
                  Showing {paginatedClients.length} of {filteredAndSortedClients.length} clients
                </p>
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center gap-1">
                          Name
                          {sortBy === "name" && (
                            sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("transactions")}
                      >
                        <div className="flex items-center gap-1">
                          No. of Transactions
                          {sortBy === "transactions" && (
                            sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("created_at")}
                      >
                        <div className="flex items-center gap-1">
                          Date Added
                          {sortBy === "created_at" && (
                            sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Latest Transaction</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                     {fetching && (
                       <TableRow>
                         <TableCell colSpan={7} className="text-center text-muted-foreground">Loading…</TableCell>
                       </TableRow>
                     )}
                     {!fetching && filteredAndSortedClients.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={7} className="text-center text-muted-foreground">No clients found.</TableCell>
                       </TableRow>
                     )}
                    {!fetching && paginatedClients.map(c => {
                      const s = stats[c.id as string] || { count: 0, totalKes: 0, latest: null };
                      return (
                        <TableRow key={c.id as string}>
                          <TableCell>{c.name}</TableCell>
                          <TableCell>{c.phone ?? "—"}</TableCell>
                          <TableCell>{s.count}</TableCell>
                          <TableCell>{new Date(c.created_at as string).toLocaleDateString()}</TableCell>
                          <TableCell>{formatCurrency(s.totalKes, "KES")}</TableCell>
                          <TableCell>{s.latest ? new Date(s.latest).toLocaleDateString() : "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/clients/${c.id}`)}
                                className="flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditClient(c)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteClient(c.id as string)}
                                    className="text-destructive"
                                  >
                                    <Trash className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
      </main>
    </div>
  );
};

export default Clients;
