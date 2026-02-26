import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

type UpdateMesaBody = {
  numero_mesa?: number;
  capacidad?: number;
  id_area?: number | null;
  bloqueada_hasta?: string | null;
};

function parseId(id: string): number | null {
  const value = Number(id);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(_: NextRequest, { params }: Params) {
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "id invalido" }, { status: 400 });

  const mesa = await prisma.mESA.findUnique({
    where: { id },
    include: { AREA: true }
  });

  if (!mesa) return NextResponse.json({ error: "mesa no encontrada" }, { status: 404 });
  return NextResponse.json(mesa);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "id invalido" }, { status: 400 });

  const body = (await req.json()) as UpdateMesaBody;

  const data: {
    numero_mesa?: number;
    capacidad?: number;
    id_area?: number | null;
    bloqueada_hasta?: Date | null;
  } = {};

  if (body.numero_mesa !== undefined) {
    if (!isPositiveInt(body.numero_mesa)) {
      return NextResponse.json({ error: "numero_mesa invalido" }, { status: 400 });
    }
    data.numero_mesa = body.numero_mesa;
  }

  if (body.capacidad !== undefined) {
    if (!isPositiveInt(body.capacidad)) {
      return NextResponse.json({ error: "capacidad invalida" }, { status: 400 });
    }
    data.capacidad = body.capacidad;
  }

  if (body.id_area !== undefined) {
    if (body.id_area !== null && !isPositiveInt(body.id_area)) {
      return NextResponse.json({ error: "id_area invalido" }, { status: 400 });
    }
    data.id_area = body.id_area;
  }

  if (body.bloqueada_hasta !== undefined) {
    if (body.bloqueada_hasta === null || body.bloqueada_hasta.trim() === "") {
      data.bloqueada_hasta = null;
    } else {
      const fecha = parseDate(body.bloqueada_hasta);
      if (!fecha) return NextResponse.json({ error: "bloqueada_hasta invalida" }, { status: 400 });
      data.bloqueada_hasta = fecha;
    }
  }

  try {
    const updated = await prisma.mESA.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "mesa no encontrada" }, { status: 404 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "id invalido" }, { status: 400 });

  try {
    await prisma.mESA.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json(
        { error: "no se puede eliminar la mesa porque tiene reservas relacionadas" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "mesa no encontrada" }, { status: 404 });
  }
}