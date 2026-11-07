import { useWorkshop } from "@/hooks/useWorkshop";
import { AppLoader } from "@/design-system/feedback/AppLoader";
import Dashboard from "./Dashboard";
import SuperAdminDashboard from "./SuperAdminDashboard";

const Index = () => {
  const { isSuperAdmin, isLoading, currentWorkshop } = useWorkshop();

  // Show loading while determining user role to prevent flickering
  if (isLoading) {
    return <AppLoader fullscreen />;
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
