export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="ce-hero ce-hero-mobile-bleed h-[220px] lg:h-[280px]" />
      <div className="grid grid-cols-2 gap-2.5 -mt-12 lg:mt-4">
        <div className="h-32 rounded-[14px] bg-muted/60" />
        <div className="h-32 rounded-[14px] bg-muted/60" />
      </div>
    </div>
  );
}
