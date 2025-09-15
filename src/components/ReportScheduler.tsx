import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Edit, Plus, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";

interface ReportSchedule {
  id: string;
  report_type: "transactions" | "clients" | "float_deposits";
  frequency: "daily" | "weekly" | "monthly";
  day_of_week?: number;
  day_of_month?: number;
  time_of_day: string;
  email_recipients: string[];
  report_name: string;
  report_description?: string;
  is_active: boolean;
  last_sent_at?: string;
  created_at: string;
}

export default function ReportScheduler() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ReportSchedule | null>(null);
  const [formData, setFormData] = useState({
    report_type: "transactions",
    frequency: "daily",
    day_of_week: 1, // Monday
    day_of_month: 1,
    time_of_day: "08:00",
    email_recipients: "",
    report_name: "",
    report_description: "",
    is_active: true
  });

  // Fetch report schedules
  const { data: schedules, isLoading } = useQuery({
    queryKey: ["report-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_schedules")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ReportSchedule[];
    },
  });

  // Create report schedule
  const createScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("report_schedules").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-schedules"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Report schedule created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update report schedule
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from("report_schedules")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-schedules"] });
      setIsDialogOpen(false);
      setEditingSchedule(null);
      resetForm();
      toast({
        title: "Success",
        description: "Report schedule updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete report schedule
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("report_schedules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-schedules"] });
      toast({
        title: "Success",
        description: "Report schedule deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      report_type: "transactions",
      frequency: "daily",
      day_of_week: 1,
      day_of_month: 1,
      time_of_day: "08:00",
      email_recipients: "",
      report_name: "",
      report_description: "",
      is_active: true
    });
  };

  const handleEditSchedule = (schedule: ReportSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      report_type: schedule.report_type,
      frequency: schedule.frequency,
      day_of_week: schedule.day_of_week || 1,
      day_of_month: schedule.day_of_month || 1,
      time_of_day: schedule.time_of_day,
      email_recipients: schedule.email_recipients.join(", "),
      report_name: schedule.report_name,
      report_description: schedule.report_description || "",
      is_active: schedule.is_active
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create a report schedule",
        variant: "destructive",
      });
      return;
    }

    const emailRecipients = formData.email_recipients
      .split(",")
      .map(email => email.trim())
      .filter(email => email);

    if (emailRecipients.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one email recipient",
        variant: "destructive",
      });
      return;
    }

    const scheduleData = {
      user_id: user.id,
      report_type: formData.report_type,
      frequency: formData.frequency,
      day_of_week: formData.frequency === "weekly" ? formData.day_of_week : null,
      day_of_month: formData.frequency === "monthly" ? formData.day_of_month : null,
      time_of_day: formData.time_of_day,
      email_recipients: emailRecipients,
      report_name: formData.report_name,
      report_description: formData.report_description,
      is_active: formData.is_active
    };

    if (editingSchedule) {
      updateScheduleMutation.mutate({ id: editingSchedule.id, data: scheduleData });
    } else {
      createScheduleMutation.mutate(scheduleData);
    }
  };

  const getFrequencyText = (schedule: ReportSchedule) => {
    switch (schedule.frequency) {
      case "daily":
        return "Daily";
      case "weekly":
        return `Weekly (${getDayName(schedule.day_of_week || 0)})`;
      case "monthly":
        return `Monthly (Day ${schedule.day_of_month})`;
      default:
        return schedule.frequency;
    }
  };

  const getDayName = (day: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[day];
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Report Scheduler</h1>
        <Button onClick={() => {
          resetForm();
          setEditingSchedule(null);
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" /> Schedule New Report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : !schedules || schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No report schedules found. Create your first schedule to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Sent</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{schedule.report_name}</TableCell>
                      <TableCell>
                        {schedule.report_type === "transactions" && "Transactions"}
                        {schedule.report_type === "clients" && "Clients"}
                        {schedule.report_type === "float_deposits" && "Float Deposits"}
                      </TableCell>
                      <TableCell>{getFrequencyText(schedule)}</TableCell>
                      <TableCell>{schedule.time_of_day}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate">
                          {schedule.email_recipients.join(", ")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          schedule.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}>
                          {schedule.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {schedule.last_sent_at 
                          ? format(new Date(schedule.last_sent_at), "MMM d, yyyy HH:mm") 
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditSchedule(schedule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this report schedule?")) {
                                deleteScheduleMutation.mutate(schedule.id);
                              }
                            }}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? "Edit Report Schedule" : "Create Report Schedule"}
            </DialogTitle>
            <DialogDescription>
              Set up automated reports to be delivered to your email.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="report_name">Report Name</Label>
              <Input
                id="report_name"
                value={formData.report_name}
                onChange={(e) => setFormData({ ...formData, report_name: e.target.value })}
                placeholder="Monthly Transaction Summary"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="report_type">Report Type</Label>
              <Select
                value={formData.report_type}
                onValueChange={(value) => setFormData({ ...formData, report_type: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transactions">Transactions</SelectItem>
                  <SelectItem value="clients">Clients</SelectItem>
                  <SelectItem value="float_deposits">Float Deposits</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="frequency">Frequency</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formData.frequency === "weekly" && (
              <div>
                <Label htmlFor="day_of_week">Day of Week</Label>
                <Select
                  value={formData.day_of_week.toString()}
                  onValueChange={(value) => setFormData({ ...formData, day_of_week: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day of week" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {formData.frequency === "monthly" && (
              <div>
                <Label htmlFor="day_of_month">Day of Month</Label>
                <Select
                  value={formData.day_of_month.toString()}
                  onValueChange={(value) => setFormData({ ...formData, day_of_month: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day of month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label htmlFor="time_of_day">Time of Day</Label>
              <Input
                id="time_of_day"
                type="time"
                value={formData.time_of_day}
                onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="email_recipients">Email Recipients (comma separated)</Label>
              <Input
                id="email_recipients"
                value={formData.email_recipients}
                onChange={(e) => setFormData({ ...formData, email_recipients: e.target.value })}
                placeholder="email@example.com, another@example.com"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="report_description">Description (optional)</Label>
              <Input
                id="report_description"
                value={formData.report_description}
                onChange={(e) => setFormData({ ...formData, report_description: e.target.value })}
                placeholder="Brief description of this report"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingSchedule(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingSchedule ? "Update Schedule" : "Create Schedule"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
