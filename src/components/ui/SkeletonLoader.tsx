import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "card" | "text" | "banner" | "circle" | "badge";
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({
  className,
  variant = "text",
  ...props
}) => {
  const baseClasses =
    "relative overflow-hidden bg-white/[0.06] border border-white/[0.04]";

  const shimmer = (
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/[0.09] to-transparent" />
  );

  if (variant === "card") {
    return (
      <div
        className={cn(
          baseClasses,
          "aspect-[2/3] w-full rounded-2xl flex flex-col justify-end p-4",
          className
        )}
        {...props}
      >
        {shimmer}
        <div className="space-y-2 relative z-10">
          <div className="h-4 w-3/4 rounded-md bg-white/10" />
          <div className="h-3 w-1/2 rounded-md bg-white/5" />
        </div>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={cn(
          baseClasses,
          "w-full h-72 md:h-96 rounded-3xl relative p-8 flex flex-col justify-end",
          className
        )}
        {...props}
      >
        {shimmer}
        <div className="space-y-3 relative z-10 max-w-lg">
          <div className="h-8 w-2/3 rounded-lg bg-white/15" />
          <div className="h-4 w-full rounded-md bg-white/10" />
          <div className="h-4 w-4/5 rounded-md bg-white/10" />
          <div className="h-10 w-36 rounded-xl bg-white/15 mt-4" />
        </div>
      </div>
    );
  }

  if (variant === "circle") {
    return (
      <div
        className={cn(baseClasses, "rounded-full aspect-square", className)}
        {...props}
      >
        {shimmer}
      </div>
    );
  }

  if (variant === "badge") {
    return (
      <div
        className={cn(baseClasses, "h-6 w-16 rounded-full", className)}
        {...props}
      >
        {shimmer}
      </div>
    );
  }

  return (
    <div
      className={cn(baseClasses, "h-4 w-full rounded-md", className)}
      {...props}
    >
      {shimmer}
    </div>
  );
};
