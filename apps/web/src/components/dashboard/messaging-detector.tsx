"use client";

import { usePathname } from "next/navigation";

export function MessagingDetector({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMessaging = pathname.startsWith("/messaging");

  if (isMessaging) {
    return <div className="h-screen">{children}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-8">
      {children}
    </div>
  );
}
