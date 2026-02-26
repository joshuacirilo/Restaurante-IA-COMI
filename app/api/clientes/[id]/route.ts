import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

type UpdateClienteBody = {
  nombre?: string;
  apellido?: string;
  correo_electronico?: string | null;
  numero_telefono?: string | null;
  fecha_nacimiento?: string | null;
  puntos_lealtad?: number;
};

function parseId(id: string): number | null {
  const value = Number(id);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function parseBirthDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function GET(_: NextRequest, { params }: Params) {
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "id invalido" }, { status: 400 });

  const cliente = await prisma.cLIENTE.findUnique({ where: { id } });
  if (!cliente) return NextResponse.json({ error: "cliente no encontrado" }, { status: 404 });

  return NextResponse.json(cliente);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "id invalido" }, { status: 400 });

  const body = (await req.json()) as UpdateClienteBody;

  const data: {
    nombre?: string;
    apellido?: string;
    correo_electronico?: string | null;
    numero_telefono?: string | null;
    fecha_nacimiento?: Date | null;
    puntos_lealtad?: number;
  } = {};

  if (body.nombre !== undefined) {
    const nombre = body.nombre.trim();
    if (nombre.length < 2) return NextResponse.json({ error: "nombre invalido" }, { status: 400 });
    data.nombre = nombre;
  }

  if (body.apellido !== undefined) {
    const apellido = body.apellido.trim();
    if (apellido.length < 2) return NextResponse.json({ error: "apellido invalido" }, { status: 400 });
    data.apellido = apellido;
  }

  if (body.correo_electronico !== undefined) {
    const email = body.correo_electronico?.trim() || null;
    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: "correo_electronico invalido" }, { status: 400 });
    }
    data.correo_electronico = email;
  }

  if (body.numero_telefono !== undefined) {
    data.numero_telefono = body.numero_telefono?.trim() || null;
  }

  if (body.fecha_nacimiento !== undefined) {
    if (body.fecha_nacimiento === null || body.fecha_nacimiento.trim() === "") {
      data.fecha_nacimiento = null;
    } else {
      const birthDate = parseBirthDate(body.fecha_nacimiento);
      if (!birthDate) return NextResponse.json({ error: "fecha_nacimiento invalida" }, { status: 400 });
      data.fecha_nacimiento = birthDate;
    }
  }

  if (body.puntos_lealtad !== undefined) {
    if (!Number.isInteger(body.puntos_lealtad) || body.puntos_lealtad < 0) {
      return NextResponse.json({ error: "puntos_lealtad invalido" }, { status: 400 });
    }
    data.puntos_lealtad = body.puntos_lealtad;
  }

  try {
    const updated = await prisma.cLIENTE.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "cliente no encontrado" }, { status: 404 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "id invalido" }, { status: 400 });

  try {
    await prisma.cLIENTE.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "cliente no encontrado" }, { status: 404 });
  }
}
