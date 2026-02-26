import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPublicId } from "@/lib/id-public";

type CreateReservaBody = {
  id_cliente?: number;
  id_mesa?: number;
  id_estado?: number;
  fecha_hora_inicio?: string;
  fecha_hora_fin?: string;
  num_personas?: number;
  notas?: string;
};

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET() {
  const reservas = await prisma.rESERVA.findMany({
    orderBy: { fecha_hora_inicio: "desc" },
    include: {
      CLIENTE: true,
      MESA: true,
      ESTADO_RESERVA: true
    }
  });

  return NextResponse.json(reservas);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CreateReservaBody;

  if (!isPositiveInt(body.id_cliente) || !isPositiveInt(body.id_mesa) || !isPositiveInt(body.id_estado)) {
    return NextResponse.json(
      { error: "id_cliente, id_mesa e id_estado deben ser enteros positivos" },
      { status: 400 }
    );
  }

  if (!isPositiveInt(body.num_personas)) {
    return NextResponse.json({ error: "num_personas debe ser entero positivo" }, { status: 400 });
  }

  const inicio = parseDate(body.fecha_hora_inicio);
  const fin = parseDate(body.fecha_hora_fin);

  if (!inicio || !fin) {
    return NextResponse.json({ error: "fecha_hora_inicio y fecha_hora_fin son requeridas" }, { status: 400 });
  }

  const reserva = await prisma.rESERVA.create({
    data: {
      id_public: createPublicId(),
      id_cliente: body.id_cliente,
      id_mesa: body.id_mesa,
      id_estado: body.id_estado,
      fecha_hora_inicio: inicio,
      fecha_hora_fin: fin,
      num_personas: body.num_personas,
      notas: body.notas?.trim() || null
    }
  });

  return NextResponse.json(reserva, { status: 201 });
}