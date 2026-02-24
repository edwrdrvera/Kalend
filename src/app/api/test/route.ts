import { NextResponse } from "next/server";

const mockEvents = [
  { id: "1", title: "Kalend API Test", start: new Date().toISOString() },
  { id: "2", title: "Frontend Success", start: new Date().toISOString() },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    data: mockEvents,
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  return NextResponse.json({
    success: true,
    message: "Data received successfully",
    echo: body,
  });
}
