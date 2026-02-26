import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPublicId } from "@/lib/id-public";

type CreateAreaBody = {
  nombre?: string;
};

export async function GET() {
  const areas = await prisma.aREA.findMany({
    orderBy: { id: "desc" }
  });

  return NextResponse.json(areas);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CreateAreaBody;
  const nombre = body.nombre?.trim();

  if (!nombre || nombre.length < 2) {
    return NextResponse.json({ error: "nombre es requerido (min 2)" }, { status: 400 });
  }

  const area = await prisma.aREA.create({
    data: {
      id_public: createPublicId(),
      nombre
    }
  });

  return NextResponse.json(area, { status: 201 });
}