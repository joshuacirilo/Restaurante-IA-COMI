import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db-retry";

type PublicReservaBody = {
  nombre?: string;
  apellido?: string;
  correo_electronico?: string | null;
  numero_telefono?: string | null;
  fecha_nacimiento?: string | null;
  fecha_hora_inicio?: string;
  fecha_hora_fin?: string;
  num_personas?: number;
  notas?: string | null;
  id_mesa?: number;
};

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function toNullable(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  return v.length ? v : null;
}

function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function getOrCreateCliente(params: {
  nombre: string;
  apellido: string;
  correo: string | null;
  telefono: string | null;
  nacimiento: Date | null;
}) {
  // Prefer stable identity by email, then phone.
  if (params.correo) {
    const existingByEmail = await withDbRetry(() =>
      prisma.cLIENTE.findFirst({
        where: { correo_electronico: params.correo },
        select: { id: true }
      })
    );
    if (existingByEmail) return existingByEmail.id;
  }

  if (params.telefono) {
    const existingByPhone = await withDbRetry(() =>
      prisma.cLIENTE.findFirst({
        where: { numero_telefono: params.telefono },
        select: { id: true }
      })
    );
    if (existingByPhone) return existingByPhone.id;
  }

  const created = await withDbRetry(() =>
    prisma.cLIENTE.create({
      data: {
        nombre: params.nombre,
        apellido: params.apellido,
        correo_electronico: params.correo,
        numero_telefono: params.telefono,
        fecha_nacimiento: params.nacimiento
      },
      select: { id: true }
    })
  );

  return created.id;
}

async function executeCrearReservaSp(params: {
  idCliente: number;
  idMesa: number;
  inicio: Date;
  fin: Date;
  personas: number;
  notas: string | null;
}) {
  // Exact signature from DB:
  // @Id_Cliente, @Id_Mesa, @Fecha_Hora_Inicio, @Fecha_Hora_Fin, @Num_Personas, @Notas
  await withDbRetry(() =>
    prisma.$executeRawUnsafe(
      `
      EXEC dbo.sp_CrearReserva
        @Id_Cliente = ?,
        @Id_Mesa = ?,
        @Fecha_Hora_Inicio = ?,
        @Fecha_Hora_Fin = ?,
        @Num_Personas = ?,
        @Notas = ?;
      `,
      params.idCliente,
      params.idMesa,
      params.inicio,
      params.fin,
      params.personas,
      params.notas
    )
  );
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as PublicReservaBody;

  const nombre = body.nombre?.trim();
  const apellido = body.apellido?.trim();
  const correo = toNullable(body.correo_electronico);
  const telefono = toNullable(body.numero_telefono);
  const notas = toNullable(body.notas);

  if (!nombre || !apellido) {
    return NextResponse.json({ error: "nombre y apellido son requeridos" }, { status: 400 });
  }

  if (!isPositiveInt(body.id_mesa) || !isPositiveInt(body.num_personas)) {
    return NextResponse.json({ error: "id_mesa y num_personas son requeridos" }, { status: 400 });
  }

  const inicio = parseDate(body.fecha_hora_inicio);
  const fin = parseDate(body.fecha_hora_fin);
  const nacimiento = parseDate(body.fecha_nacimiento);
  if (!inicio || !fin) {
    return NextResponse.json({ error: "fecha_hora_inicio y fecha_hora_fin son requeridas" }, { status: 400 });
  }

  try {
    const idCliente = await getOrCreateCliente({
      nombre,
      apellido,
      correo,
      telefono,
      nacimiento
    });

    await executeCrearReservaSp({
      idCliente,
      idMesa: body.id_mesa,
      inicio,
      fin,
      personas: body.num_personas,
      notas
    });

    // Read reservation just created by SP to return id_public.
    const rows = await withDbRetry(() =>
      prisma.$queryRawUnsafe<Array<{ id_public: string; numero_mesa: number }>>(
        `
        SELECT TOP 1 r.id_public, m.numero_mesa
        FROM RESERVA r
        INNER JOIN MESA m ON m.id = r.id_mesa
        WHERE r.id_cliente = ?
          AND r.id_mesa = ?
          AND r.fecha_hora_inicio = ?
          AND r.fecha_hora_fin = ?
          AND r.num_personas = ?
        ORDER BY r.id DESC;
        `,
        idCliente,
        body.id_mesa,
        inicio,
        fin,
        body.num_personas
      )
    );

    const created = rows[0];
    if (!created) {
      return NextResponse.json(
        { error: "El procedimiento no registró la reserva (validaciones de negocio o conflicto)." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: true, id_public: created.id_public, numero_mesa: created.numero_mesa },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo procesar la reserva con sp_CrearReserva." },
      { status: 500 }
    );
  }
}

