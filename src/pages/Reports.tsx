import { useState, useEffect } from "react";
import { Calendar, FileText, Download, BarChart3, TrendingUp, Users, DollarSign, Link as LinkIcon, Receipt } from "lucide-react";
import ReportScheduler from "@/components/ReportScheduler";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV, exportToPDF } from "@/utils/csvUtils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type ReportType = "client" | "transactions" | "fees" | "sarah" | "links";

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Transaction {
  id: string;
  amount_kd: number;
  amount_kes: number;
  rate_kes_per_kd: number;
  transaction_fee_kes: number;
  payout_kes: number;
  type?: string;
  created_at: string;
  client_id: string;
}

export default function Reports() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportType>("client");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedLinkAmount, setSelectedLinkAmount] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load clients on mount
  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const { data, error } = await supabase.from("clients").select("id, name, email, phone").order("name");
    if (!error && data) {
      setClients(data);
    }
  };

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Missing Dates",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (selectedReport === "client" && !selectedClient) {
      toast({
        title: "Missing Client",
        description: "Please select a client",
        variant: "destructive",
      });
      return;
    }

    if (selectedReport === "links" && !selectedLinkAmount) {
      toast({
        title: "Missing Link Amount",
        description: "Please select a link amount",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      let data: any = null;

      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      switch (selectedReport) {
        case "client":
          data = await generateClientReport(selectedClient, start, end);
          break;
        case "transactions":
          data = await generateTransactionsReport(start, end);
          break;
        case "fees":
          data = await generateFeesReport(start, end);
          break;
        case "sarah":
          data = await generateSarahReport(start, end);
          break;
        case "links":
          data = await generateLinksReport(selectedLinkAmount, start, end);
          break;
      }

      setReportData(data);
      toast({
        title: "Report Generated",
        description: "Your report is ready",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateClientReport = async (clientId: string, start: Date, end: Date) => {
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("client_id", clientId)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    const clientInfo = clients.find(c => c.id === clientId);
    const totalKWD = transactions?.reduce((sum, t) => sum + (t.amount_kd || 0), 0) || 0;
    const totalKES = transactions?.reduce((sum, t) => sum + (t.payout_kes || 0), 0) || 0;
    const totalFees = transactions?.reduce((sum, t) => sum + (t.transaction_fee_kes || 0), 0) || 0;

    return {
      client: clientInfo,
      summary: {
        totalTransactions: transactions?.length || 0,
        totalKWD,
        totalKES,
        totalFees,
        avgTransactionKWD: transactions?.length ? totalKWD / transactions.length : 0,
      },
      transactions: transactions || [],
    };
  };

  const generateTransactionsReport = async (start: Date, end: Date) => {
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*, clients(name, email, phone)")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    const totalKWD = transactions?.reduce((sum, t) => sum + (t.amount_kd || 0), 0) || 0;
    const totalKES = transactions?.reduce((sum, t) => sum + (t.payout_kes || 0), 0) || 0;
    const totalFees = transactions?.reduce((sum, t) => sum + (t.transaction_fee_kes || 0), 0) || 0;

    // Flatten the data and add client_name field
    const flattenedTransactions = transactions?.map(t => ({
      ...t,
      client_name: t.clients?.name || 'Unknown',
      clients: undefined, // Remove nested object
    })) || [];

    return {
      summary: {
        totalTransactions: transactions?.length || 0,
        totalKWD,
        totalKES,
        totalFees,
      },
      transactions: flattenedTransactions,
    };
  };

  const generateFeesReport = async (start: Date, end: Date) => {
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*, clients(name)")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("transaction_fee_kes", { ascending: false });

    if (error) throw error;

    const totalFees = transactions?.reduce((sum, t) => sum + (t.transaction_fee_kes || 0), 0) || 0;
    const feesByType = transactions?.reduce((acc: any, t) => {
      const type = t.type || "Unknown";
      if (!acc[type]) acc[type] = { count: 0, totalFees: 0 };
      acc[type].count++;
      acc[type].totalFees += t.transaction_fee_kes || 0;
      return acc;
    }, {});

    // Flatten the data and add client_name field
    const flattenedTransactions = transactions?.map(t => ({
      ...t,
      client_name: t.clients?.name || 'Unknown',
      clients: undefined, // Remove nested object
    })) || [];

    return {
      summary: {
        totalTransactions: transactions?.length || 0,
        totalFees,
        avgFee: transactions?.length ? totalFees / transactions.length : 0,
        feesByType,
      },
      transactions: flattenedTransactions,
    };
  };

  const generateSarahReport = async (start: Date, end: Date) => {
    const { data: floatDeposits, error } = await supabase
      .from("float_deposits")
      .select("*")
      .gte("date", start.toISOString().split('T')[0])
      .lte("date", end.toISOString().split('T')[0])
      .order("date", { ascending: false });

    if (error) throw error;

    const totalProfit = floatDeposits?.reduce((sum, f) => sum + (f.profit || 0), 0) || 0;
    const totalSarahShare = floatDeposits?.reduce((sum, f) => sum + (f.sarah_total || 0), 0) || 0;
    const totalKD = floatDeposits?.reduce((sum, f) => sum + (f.total_kd || 0), 0) || 0;
    const totalKES = floatDeposits?.reduce((sum, f) => sum + (f.total_kes || 0), 0) || 0;

    return {
      summary: {
        totalDeposits: floatDeposits?.length || 0,
        totalKD,
        totalKES,
        totalProfit,
        totalSarahShare,
        avgSharePercentage: floatDeposits?.length 
          ? floatDeposits.reduce((sum, f) => sum + (f.sarah_share_percentage || 0), 0) / floatDeposits.length 
          : 0,
      },
      deposits: floatDeposits || [],
    };
  };

  const generateLinksReport = async (linkAmount: string, start: Date, end: Date) => {
    const amount = parseFloat(linkAmount);
    const minAmount = amount - 0.5;
    const maxAmount = amount + 0.5;

    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*, clients(name)")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .gte("amount_kd", minAmount)
      .lte("amount_kd", maxAmount)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const totalKWD = transactions?.reduce((sum, t) => sum + (t.amount_kd || 0), 0) || 0;
    const totalKES = transactions?.reduce((sum, t) => sum + (t.payout_kes || 0), 0) || 0;

    // Flatten the data and add client_name field
    const flattenedTransactions = transactions?.map(t => ({
      ...t,
      client_name: t.clients?.name || 'Unknown',
      clients: undefined, // Remove nested object
    })) || [];

    return {
      summary: {
        linkAmount: amount,
        totalTransactions: transactions?.length || 0,
        totalKWD,
        totalKES,
      },
      transactions: flattenedTransactions,
    };
  };

  const exportReport = (format: 'csv' | 'pdf') => {
    if (!reportData) {
      toast({
        title: "No Data",
        description: "Please generate a report first before exporting.",
        variant: "destructive",
      });
      return;
    }

    const filename = `${selectedReport}-report-${new Date().toISOString().split('T')[0]}`;
    const exportData = reportData.transactions || reportData.deposits || [];
    
    // Fields to exclude from export for cleaner reports
    const excludeFields = [
      'id', 
      'owner_id', 
      'client_id', 
      'clients', 
      'screenshot_url', 
      'status', 
      'reference', 
      'paid_at', 
      'notes',
      'updated_at'
    ];
    
    // Prepare PDF metadata
    const clientName = reportData.client?.name || undefined;
    const reportPeriod = startDate && endDate 
      ? `${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : undefined;
    
    const reportTitle = `${currentConfig.title}`;
    
    if (format === 'csv') {
      exportToCSV(exportData, filename, excludeFields);
    } else {
      exportToPDF(exportData, {
        title: reportTitle,
        clientName,
        reportPeriod,
        excludeFields,
      });
    }
    
    toast({
      title: "Export Successful",
      description: `Report exported as ${format.toUpperCase()}.`,
    });
  };

  const reportConfigs = {
    client: {
      title: "Client Report",
      description: "Detailed transaction report for a specific client",
      icon: Users,
    },
    transactions: {
      title: "Transactions Report",
      description: "Complete transaction report for a specified period",
      icon: BarChart3,
    },
    fees: {
      title: "Fees Report",
      description: "Analysis of transaction fees collected",
      icon: Receipt,
    },
    sarah: {
      title: "Sarah's Share Report",
      description: "Sarah's commission and share analysis",
      icon: DollarSign,
    },
    links: {
      title: "Links Report",
      description: "Transactions filtered by link amount",
      icon: LinkIcon,
    },
  };

  const linkAmounts = ["4", "10", "25", "50", "100", "200"];

  const currentConfig = reportConfigs[selectedReport];
  const IconComponent = currentConfig.icon;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate comprehensive system reports and analytics
          </p>
        </div>
      </div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generate">Generate Reports</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Report Generator
              </CardTitle>
              <CardDescription>
                Select report type and date range to generate comprehensive analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="report-type">Report Type</Label>
                  <Select value={selectedReport} onValueChange={(value: ReportType) => {
                    setSelectedReport(value);
                    setReportData(null);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(reportConfigs).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedReport === "client" && (
                  <div className="space-y-2">
                    <Label htmlFor="client">Select Client</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedReport === "links" && (
                  <div className="space-y-2">
                    <Label htmlFor="link-amount">Link Amount (KWD)</Label>
                    <Select value={selectedLinkAmount} onValueChange={setSelectedLinkAmount}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose amount" />
                      </SelectTrigger>
                      <SelectContent>
                        {linkAmounts.map((amount) => (
                          <SelectItem key={amount} value={amount}>
                            {amount} KWD
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Actions</Label>
                  <Button onClick={generateReport} disabled={isLoading} className="w-full">
                    {isLoading ? "Generating..." : "Generate Report"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {reportData && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-5 w-5" />
                    <div>
                      <CardTitle>{currentConfig.title}</CardTitle>
                      <CardDescription>{currentConfig.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportReport('csv')}>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportReport('pdf')}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary Cards */}
                {reportData.summary && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {reportData.client && (
                      <Card className="md:col-span-4">
                        <CardContent className="pt-6">
                          <h3 className="font-semibold mb-2">Client: {reportData.client.name}</h3>
                          {reportData.client.email && <p className="text-sm text-muted-foreground">Email: {reportData.client.email}</p>}
                          {reportData.client.phone && <p className="text-sm text-muted-foreground">Phone: {reportData.client.phone}</p>}
                        </CardContent>
                      </Card>
                    )}
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">Total Transactions</p>
                        <p className="text-2xl font-bold">{reportData.summary.totalTransactions || reportData.summary.totalDeposits || 0}</p>
                      </CardContent>
                    </Card>
                    {reportData.summary.totalKWD !== undefined && (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-muted-foreground">Total KWD</p>
                          <p className="text-2xl font-bold">{reportData.summary.totalKWD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </CardContent>
                      </Card>
                    )}
                    {reportData.summary.totalKES !== undefined && (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-muted-foreground">Total KES</p>
                          <p className="text-2xl font-bold">{reportData.summary.totalKES.toLocaleString()}</p>
                        </CardContent>
                      </Card>
                    )}
                    {reportData.summary.totalFees !== undefined && (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-muted-foreground">Total Fees</p>
                          <p className="text-2xl font-bold">{reportData.summary.totalFees.toLocaleString()} KES</p>
                        </CardContent>
                      </Card>
                    )}
                    {reportData.summary.totalSarahShare !== undefined && (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-muted-foreground">Sarah's Share</p>
                          <p className="text-2xl font-bold">{reportData.summary.totalSarahShare.toLocaleString()} KES</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Transactions Table */}
                {reportData.transactions && reportData.transactions.length > 0 && (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          {(selectedReport === 'transactions' || selectedReport === 'fees' || selectedReport === 'links') && (
                            <TableHead>Client</TableHead>
                          )}
                          <TableHead>Amount (KWD)</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Amount (KES)</TableHead>
                          <TableHead>Fee (KES)</TableHead>
                          <TableHead>Payout (KES)</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.transactions.map((transaction: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{format(new Date(transaction.created_at), 'MMM dd, yyyy')}</TableCell>
                            {(selectedReport === 'transactions' || selectedReport === 'fees' || selectedReport === 'links') && (
                              <TableCell>{transaction.client_name || 'Unknown'}</TableCell>
                            )}
                            <TableCell>{transaction.amount_kd.toFixed(2)}</TableCell>
                            <TableCell>{transaction.rate_kes_per_kd.toFixed(2)}</TableCell>
                            <TableCell>{transaction.amount_kes.toLocaleString()}</TableCell>
                            <TableCell>{transaction.transaction_fee_kes.toFixed(2)}</TableCell>
                            <TableCell>{transaction.payout_kes.toLocaleString()}</TableCell>
                            <TableCell>{transaction.type || 'N/A'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Float Deposits Table (Sarah Report) */}
                {reportData.deposits && reportData.deposits.length > 0 && (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Total KD</TableHead>
                          <TableHead>Total KES</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Profit</TableHead>
                          <TableHead>Share %</TableHead>
                          <TableHead>Sarah's Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.deposits.map((deposit: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{format(new Date(deposit.date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>{deposit.total_kd.toFixed(2)}</TableCell>
                            <TableCell>{deposit.total_kes.toLocaleString()}</TableCell>
                            <TableCell>{deposit.rate.toFixed(2)}</TableCell>
                            <TableCell>{deposit.profit.toLocaleString()}</TableCell>
                            <TableCell>{deposit.sarah_share_percentage}%</TableCell>
                            <TableCell>{deposit.sarah_total.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                <div className="mt-4 text-sm text-muted-foreground">
                  Generated on {format(new Date(), 'MMM dd, yyyy HH:mm')}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6">
          <ReportScheduler />
        </TabsContent>
      </Tabs>
    </div>
  );
}