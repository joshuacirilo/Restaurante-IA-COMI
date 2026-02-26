import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

type UpdateEstadoBody = {
  nombre_estado?: string;
};

function parseId(id: string): number | null {
  const value = Number(id);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export async function GET(_: NextRequest, { params }: Params) {
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "id invalido" }, { status: 400 });

  const estado = await prisma.eSTADO_RESERVA.findUnique({ where: { id } });
  if (!estado) return NextResponse.json({ error: "estado_reserva no encontrado" }, { status: 404 });

  return NextResponse.json(estado);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "id invalido" }, { status: 400 });

  const body = (await req.json()) as UpdateEstadoBody;
  const data: { nombre_estado?: string } = {};

  if (body.nombre_estado !== undefined) {
    const nombre_estado = body.nombre_estado.trim();
    if (nombre_estado.length < 2) {
      return NextResponse.json({ error: "nombre_estado invalido" }, { status: 400 });
    }
    data.nombre_estado = nombre_estado;
  }

  try {
    const updated = await prisma.eSTADO_RESERVA.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "estado_reserva no encontrado" }, { status: 404 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "id invalido" }, { status: 400 });

  try {
    await prisma.eSTADO_RESERVA.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json(
        { error: "no se puede eliminar el estado porque tiene reservas relacionadas" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "estado_reserva no encontrado" }, { status: 404 });
  }
}