import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export default function SettingsLoading() {
  return (
    <div className="space-y-8 animate-fade-in">
      <SkeletonLoader variant="badge" className="w-36 h-8" />
      <SkeletonLoader variant="text" className="h-8 w-48" />
      <div className="space-y-6">
        <SkeletonLoader variant="card" className="h-64 rounded-3xl" />
        <SkeletonLoader variant="card" className="h-56 rounded-3xl" />
        <SkeletonLoader variant="card" className="h-56 rounded-3xl" />
      </div>
    </div>
  );
}
