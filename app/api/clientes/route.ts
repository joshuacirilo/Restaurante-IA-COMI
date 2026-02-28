import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPublicId } from "@/lib/id-public";
import { withDbRetry } from "@/lib/db-retry";

type CreateClienteBody = {
  nombre?: string;
  apellido?: string;
  correo_electronico?: string | null;
  numero_telefono?: string | null;
  fecha_nacimiento?: string | null;
  puntos_lealtad?: number;
};

function parseBirthDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function GET() {
  const clientes = await withDbRetry(() =>
    prisma.cLIENTE.findMany({
      orderBy: { id: "desc" }
    })
  );

  return NextResponse.json(clientes);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CreateClienteBody;

  const nombre = body.nombre?.trim();
  const apellido = body.apellido?.trim();

  if (!nombre || nombre.length < 2) {
    return NextResponse.json({ error: "nombre es requerido (min 2)" }, { status: 400 });
  }

  if (!apellido || apellido.length < 2) {
    return NextResponse.json({ error: "apellido es requerido (min 2)" }, { status: 400 });
  }

  const email = body.correo_electronico?.trim() || null;
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: "correo_electronico invalido" }, { status: 400 });
  }

  const birthDate = parseBirthDate(body.fecha_nacimiento);
  if (body.fecha_nacimiento && !birthDate) {
    return NextResponse.json({ error: "fecha_nacimiento invalida" }, { status: 400 });
  }

  const cliente = await prisma.cLIENTE.create({
    data: {
      id_public: createPublicId(),
      nombre,
      apellido,
      correo_electronico: email,
      numero_telefono: body.numero_telefono?.trim() || null,
      fecha_nacimiento: birthDate,
      puntos_lealtad: body.puntos_lealtad ?? 0
    }
  });

  return NextResponse.json(cliente, { status: 201 });
}
