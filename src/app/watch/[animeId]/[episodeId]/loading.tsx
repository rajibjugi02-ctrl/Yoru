import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export default function WatchLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <SkeletonLoader variant="badge" className="w-32 h-8" />
        <SkeletonLoader variant="badge" className="w-24 h-8" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-video w-full rounded-3xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
            <SkeletonLoader variant="circle" className="w-16 h-16" />
          </div>
          <SkeletonLoader variant="text" className="h-20 rounded-2xl" />
        </div>
        <div className="lg:col-span-1">
          <SkeletonLoader variant="card" className="h-[520px] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
