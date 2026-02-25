import Calendar from "@/components/Calendar";

export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">
          Kalend
        </h1> */}
        {/* Render the Client Component here */}
        <Calendar />
      </div>
    </main>
  );
}
