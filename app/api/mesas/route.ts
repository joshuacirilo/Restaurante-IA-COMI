import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPublicId } from "@/lib/id-public";
import { withDbRetry } from "@/lib/db-retry";

type CreateMesaBody = {
  numero_mesa?: number;
  capacidad?: number;
  id_area?: number | null;
  bloqueada_hasta?: string | null;
};

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET() {
  const mesas = await withDbRetry(() =>
    prisma.mESA.findMany({
      orderBy: { id: "desc" },
      include: { AREA: true }
    })
  );

  return NextResponse.json(mesas);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CreateMesaBody;

  if (!isPositiveInt(body.numero_mesa)) {
    return NextResponse.json({ error: "numero_mesa debe ser entero positivo" }, { status: 400 });
  }

  if (!isPositiveInt(body.capacidad)) {
    return NextResponse.json({ error: "capacidad debe ser entero positivo" }, { status: 400 });
  }

  if (body.id_area !== undefined && body.id_area !== null && !isPositiveInt(body.id_area)) {
    return NextResponse.json({ error: "id_area invalido" }, { status: 400 });
  }

  const bloqueadaHasta = parseDate(body.bloqueada_hasta);
  if (body.bloqueada_hasta !== undefined && body.bloqueada_hasta !== null && !bloqueadaHasta) {
    return NextResponse.json({ error: "bloqueada_hasta invalida" }, { status: 400 });
  }

  const mesa = await prisma.mESA.create({
    data: {
      id_public: createPublicId(),
      numero_mesa: body.numero_mesa,
      capacidad: body.capacidad,
      id_area: body.id_area ?? null,
      bloqueada_hasta: bloqueadaHasta
    }
  });

  return NextResponse.json(mesa, { status: 201 });
}
