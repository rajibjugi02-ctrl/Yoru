import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export default function AnimeDetailLoading() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Back button skeleton */}
      <SkeletonLoader variant="badge" className="w-36 h-9" />

      {/* Backdrop Banner skeleton */}
      <SkeletonLoader variant="banner" className="h-80 md:h-[440px]" />

      {/* Header Info skeleton */}
      <div className="flex flex-col md:flex-row gap-6 -mt-28 md:-mt-40 px-2 md:px-4">
        <SkeletonLoader variant="card" className="w-40 sm:w-52 md:w-60 aspect-[2/3]" />
        <div className="flex-1 space-y-3 pt-6 md:pt-14">
          <SkeletonLoader variant="badge" className="w-24" />
          <SkeletonLoader variant="text" className="h-8 w-3/4" />
          <SkeletonLoader variant="text" className="w-full" />
          <SkeletonLoader variant="text" className="w-5/6" />
          <div className="flex gap-3 pt-4">
            <SkeletonLoader variant="badge" className="w-36 h-11 rounded-2xl" />
            <SkeletonLoader variant="badge" className="w-36 h-11 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
