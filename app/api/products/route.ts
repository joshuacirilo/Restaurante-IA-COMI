import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    error: "Endpoint obsoleto. Usa /api/reservas",
    replacement: "/api/reservas"
  }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({
    error: "Endpoint obsoleto. Usa /api/reservas",
    replacement: "/api/reservas"
  }, { status: 410 });
}
