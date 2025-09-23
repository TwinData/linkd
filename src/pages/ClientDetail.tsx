import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Phone, Mail, Calendar, CreditCard, StickyNote, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { Seo } from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/transactionCharges";

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
}

interface Transaction {
  id: string;
  amount_kd: number;
  amount_kes: number;
  rate_kes_per_kd: number;
  transaction_fee_kes: number;
  payout_kes: number;
  status: string;
  type?: string;
  reference?: string;
  notes?: string;
  created_at: string;
  paid_at?: string;
  owner_id: string;
}

const ClientDetail = () => {
  const { clientId } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingClient, setLoadingClient] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalAmountKDAll, setTotalAmountKDAll] = useState(0);
  const [totalPayoutKESAll, setTotalPayoutKESAll] = useState(0);
  const [totalFeesKESAll, setTotalFeesKESAll] = useState(0);
  const transactionsPerPage = 10;

  useEffect(() => {
    if (!loading && !user) navigate("/", { replace: true });
    if (user && clientId) {
      fetchClient();
      fetchTransactionSummaries();
    }
  }, [user, loading, navigate, clientId]);
  
  useEffect(() => {
    if (user && clientId) {
      fetchClientTransactions();
    }
  }, [user, clientId, currentPage]);
  
  const fetchTransactionSummaries = async () => {
    if (!clientId) return;
    
    setLoadingSummary(true);
    try {
      // Fetch aggregated data for all transactions
      const { data, error } = await supabase
        .from('transactions')
        .select('amount_kd, payout_kes, transaction_fee_kes')
        .eq('client_id', clientId);
      
      if (error) throw error;
      
      if (data) {
        // Calculate totals from all transactions
        const amountKDTotal = data.reduce((sum, t) => sum + (t.amount_kd || 0), 0);
        const payoutKESTotal = data.reduce((sum, t) => sum + (t.payout_kes || 0), 0);
        const feesKESTotal = data.reduce((sum, t) => sum + (t.transaction_fee_kes || 0), 0);
        
        setTotalAmountKDAll(amountKDTotal);
        setTotalPayoutKESAll(payoutKESTotal);
        setTotalFeesKESAll(feesKESTotal);
      }
    } catch (error: any) {
      console.error('Error fetching transaction summaries:', error);
      toast({
        title: "Error",
        description: "Failed to fetch transaction summaries",
        variant: "destructive",
      });
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchClient = async () => {
    if (!clientId) return;
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      
      if (error) throw error;
      
      setClient(data);
    } catch (error: any) {
      console.error('Error fetching client:', error);
      toast({
        title: "Error",
        description: "Failed to fetch client details",
        variant: "destructive",
      });
      navigate("/clients");
    } finally {
      setLoadingClient(false);
    }
  };

  const fetchClientTransactions = async () => {
    if (!clientId) return;
    
    setLoadingTransactions(true);
    try {
      // Get total count
      const { count, error: countError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);
        
      if (countError) throw countError;
      setTotalTransactions(count || 0);

      // Get paginated data
      const from = (currentPage - 1) * transactionsPerPage;
      const to = from + transactionsPerPage - 1;
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      
      setTransactions(data || []);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch client transactions",
        variant: "destructive",
      });
    } finally {
      setLoadingTransactions(false);
    }
  };


  if (loading || loadingClient) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <p className="text-muted-foreground">Client not found</p>
      </div>
    );
  }

  const displayedTransactions = transactions.length;
  const totalPages = Math.ceil(totalTransactions / transactionsPerPage);
  const startIndex = (currentPage - 1) * transactionsPerPage + 1;
  const endIndex = Math.min(currentPage * transactionsPerPage, totalTransactions);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${client.name} | Client Details`}
        description={`View details and transaction history for ${client.name}`}
        canonical={window.location.href}
      />

      <header className="border-b border-border">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate("/clients")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Clients
            </Button>
            <h1 className="text-xl font-semibold text-foreground">Client Details</h1>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{client.name}</p>
                </div>
              </div>
              
              {client.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{client.email}</p>
                  </div>
                </div>
              )}

              {client.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Client Since</p>
                  <p className="font-medium">
                    {new Date(client.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {client.notes && (
                <div className="flex items-start gap-3 md:col-span-2">
                  <StickyNote className="w-4 h-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="font-medium">{client.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transaction Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Total Transactions</p>
              </div>
              <p className="text-2xl font-bold">{totalTransactions}</p>
              {loadingSummary && <p className="text-xs text-muted-foreground mt-1">Loading...</p>}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Total Amount (KD)</p>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(loadingSummary ? 0 : totalAmountKDAll, 'KD')}</p>
              {loadingSummary && <p className="text-xs text-muted-foreground mt-1">Loading...</p>}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Total Payout (KES)</p>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(loadingSummary ? 0 : totalPayoutKESAll, 'KES')}</p>
              {loadingSummary && <p className="text-xs text-muted-foreground mt-1">Loading...</p>}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Total Fees (KES)</p>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(loadingSummary ? 0 : totalFeesKESAll, 'KES')}</p>
              {loadingSummary && <p className="text-xs text-muted-foreground mt-1">Loading...</p>}
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Transaction History</CardTitle>
              {totalTransactions > 0 && (
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex}-{endIndex} of {totalTransactions} transactions
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingTransactions ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading transactions...</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Amount (KD)</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount (KES)</TableHead>
                      <TableHead>Fee (KES)</TableHead>
                      <TableHead>Payout (KES)</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Paid Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {transaction.reference || `TX${transaction.id.substring(0, 8)}`}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(transaction.amount_kd, 'KD')}
                        </TableCell>
                        <TableCell>{transaction.rate_kes_per_kd}</TableCell>
                        <TableCell>{formatCurrency(transaction.amount_kes, 'KES')}</TableCell>
                        <TableCell>{formatCurrency(transaction.transaction_fee_kes, 'KES')}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(transaction.payout_kes, 'KES')}
                        </TableCell>
                        <TableCell>
                          {transaction.type ? (
                            <Badge variant="outline">{transaction.type}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">
                              {new Date(transaction.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {transaction.paid_at ? (
                            <div>
                              <p className="text-sm">
                                {new Date(transaction.paid_at).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(transaction.paid_at).toLocaleTimeString()}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {transactions.length === 0 && !loadingTransactions && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          No transactions found for this client.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* Pagination Controls */}
            {totalTransactions > transactionsPerPage && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ClientDetail;