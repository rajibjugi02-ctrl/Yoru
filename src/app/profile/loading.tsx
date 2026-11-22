import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export default function ProfileLoading() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <SkeletonLoader variant="text" className="h-8 w-36" />
        <SkeletonLoader variant="badge" className="w-28 h-9" />
      </div>

      <div className="p-8 rounded-3xl bg-white/[0.04] border border-white/10 space-y-6">
        <div className="flex items-center gap-6">
          <SkeletonLoader variant="circle" className="w-24 h-24" />
          <div className="space-y-2 flex-1">
            <SkeletonLoader variant="text" className="h-6 w-48" />
            <SkeletonLoader variant="badge" className="w-28" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 pt-4 border-t border-white/[0.06]">
          <SkeletonLoader variant="text" className="h-16 rounded-2xl" />
          <SkeletonLoader variant="text" className="h-16 rounded-2xl" />
          <SkeletonLoader variant="text" className="h-16 rounded-2xl" />
          <SkeletonLoader variant="text" className="h-16 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
