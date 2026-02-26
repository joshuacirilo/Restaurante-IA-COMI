import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

type UpdateAreaBody = {
  nombre?: string;
};

function parseId(id: string): number | null {
  const value = Number(id);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export async function GET(_: NextRequest, { params }: Params) {
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "id invalido" }, { status: 400 });

  const area = await prisma.aREA.findUnique({ where: { id } });
  if (!area) return NextResponse.json({ error: "area no encontrada" }, { status: 404 });

  return NextResponse.json(area);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "id invalido" }, { status: 400 });

  const body = (await req.json()) as UpdateAreaBody;
  const data: { nombre?: string } = {};

  if (body.nombre !== undefined) {
    const nombre = body.nombre.trim();
    if (nombre.length < 2) {
      return NextResponse.json({ error: "nombre invalido" }, { status: 400 });
    }
    data.nombre = nombre;
  }

  try {
    const updated = await prisma.aREA.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "area no encontrada" }, { status: 404 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "id invalido" }, { status: 400 });

  try {
    await prisma.aREA.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json(
        { error: "no se puede eliminar el area porque tiene registros relacionados" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "area no encontrada" }, { status: 404 });
  }
}