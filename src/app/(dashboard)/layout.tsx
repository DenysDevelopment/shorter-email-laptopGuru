import { Sidebar } from "@/components/dashboard/sidebar";
import { AutoSync } from "@/components/dashboard/auto-sync";

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
