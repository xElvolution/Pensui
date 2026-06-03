import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("skeleton", className)} />;
}

export function ArticleCardSkeleton() {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-5 w-3/4 mb-3" />
      <Skeleton className="h-5 w-2/3 mb-5" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-6" />
      <div className="flex items-center justify-between pt-4 border-t border-[color:var(--border)]">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card">
      <Skeleton className="h-10 w-10 rounded-lg mb-4" />
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[color:var(--border)]">
      <div className="flex-1 mr-6">
        <Skeleton className="h-5 w-2/3 mb-2" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex items-center gap-6">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}
