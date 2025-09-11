import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, FileText, Download, BarChart3, TrendingUp, Users, DollarSign } from "lucide-react";
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

type ReportType = "user-stats" | "client-patterns" | "rate-analysis" | "sarahs-share" | "transaction-types";

export default function Reports() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportType>("user-stats");
  const [period, setPeriod] = useState("monthly");
  const { toast } = useToast();

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ["reports", selectedReport, startDate, endDate],
    queryFn: async () => {
      let rpcFunction = "";
      
      switch (selectedReport) {
        case "user-stats":
          rpcFunction = "get_user_transaction_stats";
          break;
        case "client-patterns":
          rpcFunction = "get_client_transaction_patterns";
          break;
        case "rate-analysis":
          rpcFunction = "get_rate_analysis";
          break;
        case "sarahs-share":
          rpcFunction = "get_sarahs_share_analysis";
          break;
        case "transaction-types":
          rpcFunction = "get_transaction_type_analysis";
          break;
        default:
          throw new Error("Invalid report type");
      }

      const params: any = {};
      if (startDate) params.start_date = new Date(startDate).toISOString();
      if (endDate) params.end_date = new Date(endDate).toISOString();

      const { data, error } = await supabase.rpc(rpcFunction as any, params);
      
      if (error) throw error;
      return data;
    },
    enabled: false, // Only run when manually triggered
  });

  const generateReport = () => {
    refetch();
  };

  const exportReport = (format: 'csv' | 'pdf') => {
    if (!reportData || !Array.isArray(reportData) || reportData.length === 0) {
      toast({
        title: "No Data",
        description: "Please generate a report first before exporting.",
        variant: "destructive",
      });
      return;
    }

    const filename = `${selectedReport}-report-${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      exportToCSV(Array.isArray(reportData) ? reportData : [], filename);
    } else {
      exportToPDF(Array.isArray(reportData) ? reportData : [], `${selectedReport.replace('-', ' ').toUpperCase()} Report`);
    }
    
    toast({
      title: "Export Successful",
      description: `Report exported as ${format.toUpperCase()}.`,
    });
  };

  const reportConfigs = {
    "user-stats": {
      title: "User Transaction Statistics",
      description: "Analyze transaction performance by user",
      icon: Users,
      columns: [
        { key: "transaction_count", label: "Transactions" },
        { key: "total_amount_kd", label: "Total KD" },
        { key: "total_amount_kes", label: "Total KES" },
        { key: "total_payout_kes", label: "Total Payout KES" },
        { key: "avg_amount_kd", label: "Avg Amount KD" },
        { key: "avg_rate", label: "Avg Rate" },
      ]
    },
    "client-patterns": {
      title: "Client Transaction Patterns",
      description: "Understand client behavior and transaction frequency",
      icon: BarChart3,
      columns: [
        { key: "client_name", label: "Client Name" },
        { key: "client_email", label: "Email" },
        { key: "transaction_count", label: "Transactions" },
        { key: "total_amount_kd", label: "Total KD" },
        { key: "avg_amount_kd", label: "Avg KD" },
        { key: "days_between_transactions", label: "Days Between Txns" },
      ]
    },
    "rate-analysis": {
      title: "Exchange Rate Analysis",
      description: "Track and analyze exchange rate performance",
      icon: TrendingUp,
      columns: [
        { key: "rate_kes_per_kd", label: "Rate (KES/KD)" },
        { key: "transaction_count", label: "Transactions" },
        { key: "total_volume_kd", label: "Volume KD" },
        { key: "avg_transaction_amount_kd", label: "Avg Amount KD" },
        { key: "rate_rank", label: "Rate Rank" },
      ]
    },
    "sarahs-share": {
      title: "Sarah's Share Analysis",
      description: "Monitor Sarah's commission and share percentages",
      icon: DollarSign,
      columns: [
        { key: "period", label: "Period" },
        { key: "total_transactions", label: "Transactions" },
        { key: "total_volume_kd", label: "Volume KD" },
        { key: "sarahs_share_percentage", label: "Share %" },
        { key: "sarahs_share_amount_kes", label: "Share Amount KES" },
      ]
    },
    "transaction-types": {
      title: "Transaction Type Analysis",
      description: "Breakdown transactions by type and performance",
      icon: FileText,
      columns: [
        { key: "transaction_type", label: "Type" },
        { key: "transaction_count", label: "Count" },
        { key: "total_volume_kd", label: "Volume KD" },
        { key: "avg_amount_kd", label: "Avg Amount KD" },
        { key: "percentage_of_total", label: "% of Total" },
      ]
    }
  };

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
                  <Select value={selectedReport} onValueChange={(value: ReportType) => setSelectedReport(value)}>
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
              <CardContent>
                {!Array.isArray(reportData) || reportData.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Data Found</h3>
                    <p className="text-muted-foreground">
                      No data available for the selected date range and report type.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {currentConfig.columns.map((column) => (
                            <TableHead key={column.key}>{column.label}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(reportData) && reportData.map((row: any, index: number) => (
                          <TableRow key={index}>
                            {currentConfig.columns.map((column) => (
                              <TableCell key={column.key}>
                                {column.key.includes('percentage') || column.key.includes('rate') 
                                  ? parseFloat(row[column.key] || 0).toFixed(2)
                                  : column.key.includes('date') || column.key.includes('transaction')
                                  ? row[column.key] && column.key.includes('date') 
                                    ? format(new Date(row[column.key]), 'MMM dd, yyyy')
                                    : row[column.key]
                                  : row[column.key]}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {Array.isArray(reportData) && reportData.length > 0 && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Generated on {format(new Date(), 'MMM dd, yyyy HH:mm')} • {reportData.length} records
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Scheduled Reports
              </CardTitle>
              <CardDescription>
                Set up automated report generation and delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
                <p className="text-muted-foreground">
                  Automated report scheduling will be available in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}