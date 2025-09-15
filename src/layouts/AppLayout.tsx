import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/context/AuthProvider";
import { ThemeProvider } from "@/context/ThemeProvider";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <ThemeProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <header className="h-12 flex items-center border-b border-border px-3 gap-2">
              <SidebarTrigger aria-label="Toggle sidebar" />
              <div className="flex-1" />
              <ThemeToggle />
              {user && (
                <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate("/", { replace: true }); }}>
                  Sign out
                </Button>
              )}
            </header>
            <main className="flex-1">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
