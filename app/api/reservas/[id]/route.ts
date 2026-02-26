import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

type UpdateReservaBody = {
  id_cliente?: number;
  id_mesa?: number;
  id_estado?: number;
  fecha_hora_inicio?: string;
  fecha_hora_fin?: string;
  num_personas?: number;
  notas?: string | null;
};

function parseId(id: string): number | null {
  const value = Number(id);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(_: NextRequest, { params }: Params) {
  const parsedId = parseId((await params).id);
  if (!parsedId) return NextResponse.json({ error: "id invalido" }, { status: 400 });

  const reserva = await prisma.rESERVA.findUnique({
    where: { id: parsedId },
    include: {
      CLIENTE: true,
      MESA: true,
      ESTADO_RESERVA: true
    }
  });

  if (!reserva) return NextResponse.json({ error: "reserva no encontrada" }, { status: 404 });
  return NextResponse.json(reserva);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const parsedId = parseId((await params).id);
  if (!parsedId) return NextResponse.json({ error: "id invalido" }, { status: 400 });

  const body = (await req.json()) as UpdateReservaBody;
  const data: {
    id_cliente?: number;
    id_mesa?: number;
    id_estado?: number;
    fecha_hora_inicio?: Date;
    fecha_hora_fin?: Date;
    num_personas?: number;
    notas?: string | null;
  } = {};

  if (body.id_cliente !== undefined) data.id_cliente = body.id_cliente;
  if (body.id_mesa !== undefined) data.id_mesa = body.id_mesa;
  if (body.id_estado !== undefined) data.id_estado = body.id_estado;
  if (body.num_personas !== undefined) data.num_personas = body.num_personas;
  if (body.notas !== undefined) data.notas = body.notas ? body.notas.trim() : null;

  if (body.fecha_hora_inicio !== undefined) {
    const inicio = parseDate(body.fecha_hora_inicio);
    if (!inicio) return NextResponse.json({ error: "fecha_hora_inicio invalida" }, { status: 400 });
    data.fecha_hora_inicio = inicio;
  }

  if (body.fecha_hora_fin !== undefined) {
    const fin = parseDate(body.fecha_hora_fin);
    if (!fin) return NextResponse.json({ error: "fecha_hora_fin invalida" }, { status: 400 });
    data.fecha_hora_fin = fin;
  }

  try {
    const updated = await prisma.rESERVA.update({ where: { id: parsedId }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "reserva no encontrada" }, { status: 404 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const parsedId = parseId((await params).id);
  if (!parsedId) return NextResponse.json({ error: "id invalido" }, { status: 400 });

  try {
    await prisma.rESERVA.delete({ where: { id: parsedId } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "reserva no encontrada" }, { status: 404 });
  }
}
