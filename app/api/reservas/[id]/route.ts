import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db-retry";

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

  const reserva = await withDbRetry(() =>
    prisma.rESERVA.findUnique({
      where: { id: parsedId },
      include: {
        CLIENTE: true,
        MESA: true,
        ESTADO_RESERVA: true
      }
    })
  );

  if (!reserva) return NextResponse.json({ error: "reserva no encontrada" }, { status: 404 });
  return NextResponse.json(reserva);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const parsedId = parseId((await params).id);
  if (!parsedId) return NextResponse.json({ error: "id invalido" }, { status: 400 });

  const existing = await withDbRetry(() =>
    prisma.rESERVA.findUnique({
      where: { id: parsedId },
      select: { id: true }
    })
  );
  if (!existing) return NextResponse.json({ error: "reserva no encontrada" }, { status: 404 });

  const body = (await req.json()) as UpdateReservaBody;

  if (body.id_estado !== undefined) {
    const nuevoEstado = Number(body.id_estado);
    if (!Number.isInteger(nuevoEstado) || nuevoEstado <= 0) {
      return NextResponse.json({ error: "id_estado invalido" }, { status: 400 });
    }
  }

  const data: {
    id_cliente?: number;
    id_mesa?: number;
    fecha_hora_inicio?: Date;
    fecha_hora_fin?: Date;
    num_personas?: number;
    notas?: string | null;
  } = {};

  if (body.id_cliente !== undefined) data.id_cliente = body.id_cliente;
  if (body.id_mesa !== undefined) data.id_mesa = body.id_mesa;
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
    if (body.id_estado !== undefined) {
      await withDbRetry(() =>
        prisma.$executeRawUnsafe(
          `
          EXEC dbo.sp_CambioEstadoReserva
            @Id_Reserva = ?,
            @Nuevo_Estado = ?;
          `,
          parsedId,
          body.id_estado
        )
      );
    }

    const hasOtherFields = Object.keys(data).length > 0;
    if (hasOtherFields) {
      await withDbRetry(() => prisma.rESERVA.update({ where: { id: parsedId }, data }));
    }

    const updated = await withDbRetry(() =>
      prisma.rESERVA.findUnique({
        where: { id: parsedId },
        include: {
          CLIENTE: true,
          MESA: true,
          ESTADO_RESERVA: true
        }
      })
    );

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "no se pudo actualizar la reserva" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const parsedId = parseId((await params).id);
  if (!parsedId) return NextResponse.json({ error: "id invalido" }, { status: 400 });

  try {
    await withDbRetry(() => prisma.rESERVA.delete({ where: { id: parsedId } }));
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "reserva no encontrada" }, { status: 404 });
  }
}