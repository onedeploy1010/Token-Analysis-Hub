import { cn } from "@dashboard/lib/utils";

/**
 * Skeleton placeholder. Was a flat `animate-pulse` block; upgraded to a
 * left→right amber-tinted shimmer sweep so loading states feel premium
 * rather than dead. The keyframes are inlined in `<style>` so consumers
 * don't need to wire anything into tailwind.config.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <>
      <style>{`
        @keyframes skeletonShimmer {
          0%   { background-position: -150% 0; }
          100% { background-position: 250% 0; }
        }
        .skeleton-shimmer {
          background-color: hsl(228 22% 22%);
          background-image: linear-gradient(
            90deg,
            transparent 0%,
            rgba(251,191,36,0.06) 35%,
            rgba(251,191,36,0.16) 50%,
            rgba(251,191,36,0.06) 65%,
            transparent 100%
          );
          background-size: 200% 100%;
          background-repeat: no-repeat;
          animation: skeletonShimmer 1.6s ease-in-out infinite;
        }
      `}</style>
      <div
        className={cn("skeleton-shimmer rounded-md", className)}
        {...props}
      />
    </>
  );
}

export { Skeleton };
