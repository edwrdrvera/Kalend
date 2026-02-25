import Calendar from "@/components/Calendar";

export default function Home() {
  return (
    <main className="min-h-screen py-8 bg-[#1E1F20]">
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-100">
          Kalend
        </h1>
        <Calendar />
      </div>
    </main>
  );
}
