import { Sidebar } from "@/components/dashboard/sidebar";
import { AutoSync } from "@/components/dashboard/auto-sync";
import { MessagingDetector } from "@/components/dashboard/messaging-detector";
import { MessagingToastNotifications } from "@/components/messaging/toast-notifications";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <Sidebar />
      <AutoSync />
      <main className="md:pl-60">
        <MessagingDetector>{children}</MessagingDetector>
      </main>
      <MessagingToastNotifications />
    </div>
  );
}
