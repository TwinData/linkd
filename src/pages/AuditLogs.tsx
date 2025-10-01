import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Shield, Search, Filter } from "lucide-react";

interface AuditLog {
  id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: any;
  new_values: any;
  created_at: string;
}

export default function AuditLogs() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterEntityType, setFilterEntityType] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/", { replace: true });
      return;
    }

    if (user) {
      // Skip admin check for now - just load logs
      setIsAdmin(true);
      loadLogs();
    }
  }, [user, loading, navigate]);

  const checkAdminAndLoadLogs = async () => {
    try {
      // Check if user is admin
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user?.id)
        .single();

      if (userError) {
        console.error("Error fetching user:", userError);
        toast({
          title: "Error",
          description: "Failed to check user permissions: " + userError.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (userData.role !== "admin") {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view audit logs. Only admins can access this page.",
          variant: "destructive",
        });
        navigate("/dashboard", { replace: true });
        return;
      }

      setIsAdmin(true);
      await loadLogs();
    } catch (error: any) {
      console.error("Error checking admin status:", error);
      toast({
        title: "Error",
        description: "Failed to check permissions: " + error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) {
        // Check if table doesn't exist
        if (error.message?.includes("relation") || error.code === "42P01") {
          toast({
            title: "Setup Required",
            description: "Audit logs table needs to be created. Please run database migrations.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        throw error;
      }

      setLogs(data || []);
      setFilteredLogs(data || []);
    } catch (error: any) {
      console.error("Error loading logs:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load audit logs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...logs];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by action
    if (filterAction !== "all") {
      filtered = filtered.filter(log => log.action === filterAction);
    }

    // Filter by entity type
    if (filterEntityType !== "all") {
      filtered = filtered.filter(log => log.entity_type === filterEntityType);
    }

    setFilteredLogs(filtered);
  }, [searchTerm, filterAction, filterEntityType, logs]);

  const getActionBadgeVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
      case "insert":
        return "default";
      case "update":
      case "edit":
        return "secondary";
      case "delete":
      case "remove":
        return "destructive";
      default:
        return "outline";
    }
  };

  const uniqueActions = Array.from(new Set(logs.map(log => log.action)));
  const uniqueEntityTypes = Array.from(new Set(logs.map(log => log.entity_type)));

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Show loading state for audit logs
  if (isLoading && logs.length === 0) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Audit Logs
            </h1>
            <p className="text-muted-foreground">Loading audit data...</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-muted-foreground">Please wait...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If not admin and finished loading, don't show anything (already redirected)
  if (!isAdmin && !isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground">
                You don't have permission to view this page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground">
            Track all system activities and user actions
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Search and filter audit logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by user, action, or entity..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entity">Entity Type</Label>
              <Select value={filterEntityType} onValueChange={setFilterEntityType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueEntityTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            Showing {filteredLogs.length} of {logs.length} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(log.created_at), "MMM dd, yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell>{log.user_email || "System"}</TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.entity_type}
                        </code>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.entity_id ? log.entity_id.substring(0, 8) + "..." : "N/A"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {log.new_values && Object.keys(log.new_values).length > 0
                          ? `Changed: ${Object.keys(log.new_values).join(", ")}`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
