"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ElasticPullToRefresh } from "@/components/ui/ElasticPullToRefresh";

export const AppWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();

  const handleRefresh = async () => {
    // Re-sync server and client data
    router.refresh();
    // Dispatch storage update so client components re-sync
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("yoru-storage-update"));
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
  };

  return (
    <ElasticPullToRefresh onRefresh={handleRefresh}>
      {children}
    </ElasticPullToRefresh>
  );
};
