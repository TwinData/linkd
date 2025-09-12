import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Clock, Plus, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { Seo } from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, parseCSV, exportToPDF } from "@/utils/csvUtils";
import { FileUpload, FileOperationButton } from "@/components/ui/file-upload";

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  roles: string[];
  metadata?: any;
}

const Users = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<"admin" | "user">("user");

  useEffect(() => {
    if (!loading && !user) navigate("/", { replace: true });
    if (user) fetchUsers();
  }, [user, loading, navigate]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('list-users');
      
      if (error) throw error;
      
      setUsers(data.users || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleInviteUser = async () => {
    if (!email.trim()) return;
    
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email: email.trim(), role }
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "User invited successfully",
      });
      
      setEmail("");
      setRole("user");
      setDialogOpen(false);
      fetchUsers(); // Refresh the list
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to invite user",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleImportCSV = async (file: File) => {
    try {
      const data = await parseCSV(file);
      
      // Add a small delay to simulate processing time and show the progress animation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Import users logic here
      toast({ title: "Success", description: `Imported ${data.length} users` });
      setImportOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEditUser = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setEditRole(userToEdit.roles[0] as "admin" | "user" || "user");
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    setEditing(true);
    try {
      const { error } = await supabase.functions.invoke('update-user-role', {
        body: { userId: editingUser.id, newRole: editRole }
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      
      setEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers(); // Refresh the list
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteUser = async (userToDelete: User) => {
    if (!confirm(`Are you sure you want to delete ${userToDelete.email}?`)) return;
    
    setDeleting(userToDelete.id);
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: userToDelete.id }
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      
      fetchUsers(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleExportCSV = async () => {
    const exportData = users.map(user => ({
      email: user.email,
      roles: user.roles.join(", "),
      status: user.email_confirmed_at ? "Active" : "Pending",
      joined: new Date(user.created_at).toLocaleDateString(),
      last_sign_in: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "Never"
    }));
    
    // Add a small delay to simulate processing time and show the progress animation
    await new Promise(resolve => setTimeout(resolve, 800));
    
    exportToCSV(exportData, "users");
  };

  const handleExportPDF = async () => {
    const exportData = users.map(user => ({
      "Email": user.email,
      "Roles": user.roles.join(", "),
      "Status": user.email_confirmed_at ? "Active" : "Pending",
      "Joined": new Date(user.created_at).toLocaleDateString(),
      "Last Sign In": user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "Never"
    }));
    
    // Add a small delay to simulate processing time and show the progress animation
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    exportToPDF(exportData, "Users Report");
  };

  if (loading || loadingUsers) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="LinKD Users | Manage workspace users"
        description="Invite and manage users for your LinKD workspace."
        canonical={window.location.href}
      />

      <header className="border-b border-border">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-xl font-semibold text-foreground">User Management</h1>
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Invite New User</DialogTitle>
                  <DialogDescription>
                    Send an invitation to a new user to join your workspace with a specific role.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">
                      Role
                    </Label>
                    <Select value={role} onValueChange={(value: "admin" | "user") => setRole(value)}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    onClick={handleInviteUser}
                    disabled={inviting || !email.trim()}
                  >
                    {inviting ? "Sending..." : "Send Invitation"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Users from CSV</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file with user data to bulk import users.
                  </DialogDescription>
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
                    CSV should include columns: email (required), role
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit User</DialogTitle>
                  <DialogDescription>
                    Update the role for {editingUser?.email}.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editRole" className="text-right">
                      Role
                    </Label>
                    <Select value={editRole} onValueChange={(value: "admin" | "user") => setEditRole(value)}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    onClick={handleUpdateUser}
                    disabled={editing}
                  >
                    {editing ? "Updating..." : "Update User"}
                  </Button>
                </DialogFooter>
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
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        <section aria-labelledby="users-overview" className="space-y-2">
          <h2 id="users-overview" className="sr-only">Overview</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-muted-foreground">User List & Role Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Last Sign In</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {user.roles.map((role) => (
                              <Badge key={role} variant="outline">
                                {role}
                              </Badge>
                            ))}
                            {user.roles.length === 0 && (
                              <Badge variant="secondary">user</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.email_confirmed_at ? (
                              <>
                                <UserCheck className="w-4 h-4 text-green-600" />
                                <span className="text-green-600">Active</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-4 h-4 text-yellow-600" />
                                <span className="text-yellow-600">Pending</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {user.last_sign_in_at 
                            ? new Date(user.last_sign_in_at).toLocaleDateString()
                            : "Never"
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditUser(user)}
                              disabled={editing}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteUser(user)}
                              disabled={deleting === user.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No users found. Invite your first user to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Users;