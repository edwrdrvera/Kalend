import Calendar from "@/components/Calendar";

export default function Home() {
  return (
    <main className="h-full w-full flex flex-col items-stretch overflow-hidden">
      <a
        href="#calendar-grid"
        className="focus-ring sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-md"
      >
        Skip to calendar
      </a>
      <Calendar />
    </main>
  );
}
