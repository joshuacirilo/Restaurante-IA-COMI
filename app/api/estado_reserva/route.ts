import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db-retry";

type CreateEstadoBody = {
  nombre_estado?: string;
};

export async function GET() {
  const estados = await withDbRetry(() =>
    prisma.eSTADO_RESERVA.findMany({
      orderBy: { id: "desc" }
    })
  );

  return NextResponse.json(estados);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CreateEstadoBody;
  const nombre_estado = body.nombre_estado?.trim();

  if (!nombre_estado || nombre_estado.length < 2) {
    return NextResponse.json({ error: "nombre_estado es requerido (min 2)" }, { status: 400 });
  }

  const estado = await prisma.eSTADO_RESERVA.create({
    data: { nombre_estado }
  });

  return NextResponse.json(estado, { status: 201 });
}
