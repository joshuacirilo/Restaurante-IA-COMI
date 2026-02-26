import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    error: "Endpoint obsoleto. Usa /api/reservas/:id",
    replacement: "/api/reservas/:id"
  }, { status: 410 });
}

export async function PATCH() {
  return NextResponse.json({
    error: "Endpoint obsoleto. Usa /api/reservas/:id",
    replacement: "/api/reservas/:id"
  }, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json({
    error: "Endpoint obsoleto. Usa /api/reservas/:id",
    replacement: "/api/reservas/:id"
  }, { status: 410 });
}
