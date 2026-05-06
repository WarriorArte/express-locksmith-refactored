import { useWorkshop } from "@/hooks/useWorkshop";
import { Loader2 } from "lucide-react";
import Dashboard from "./Dashboard";
import SuperAdminDashboard from "./SuperAdminDashboard";

const Index = () => {
  const { isSuperAdmin, isLoading, currentWorkshop } = useWorkshop();

  // Show loading while determining user role to prevent flickering
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // SuperAdmin without a workshop context gets the admin dashboard
  // SuperAdmin WITH a workshop context can still access workshop features if they navigate there
  if (isSuperAdmin && !currentWorkshop) {
    return <SuperAdminDashboard />;
  }

  // If SuperAdmin is in a workshop context OR regular user, show workshop dashboard
  return <Dashboard />;
};

export default Index;
