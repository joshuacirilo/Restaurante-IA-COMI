"use client";

import { FormEvent, useMemo, useState } from "react";
import { Epilogue } from "next/font/google";

const epilogue = Epilogue({ subsets: ["latin"], weight: ["400", "700"] });

type Mesa = {
  id: number;
  numero_mesa: number;
  capacidad: number;
  bloqueada_hasta: string | null;
  AREA?: {
    nombre: string;
  } | null;
};

type Reserva = {
  id: number;
  id_mesa: number;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
};

type EstadoReserva = {
  id: number;
  nombre_estado: string;
};

type Cliente = {
  id: number;
};

type AvailabilityResult = {
  available: boolean;
  mesa: Mesa | null;
  mesasDisponibles: Mesa[];
  message: string;
};

type FormState = {
  nombre: string;
  apellido: string;
  correo_electronico: string;
  numero_telefono: string;
  fecha_nacimiento: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  num_personas: string;
  notas: string;
};

const initialForm: FormState = {
  nombre: "",
  apellido: "",
  correo_electronico: "",
  numero_telefono: "",
  fecha_nacimiento: "",
  fecha_hora_inicio: "",
  fecha_hora_fin: "",
  num_personas: "",
  notas: ""
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

function hasOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB;
}

export default function LandingPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [showAvailabilityMenu, setShowAvailabilityMenu] = useState(false);
  const [selectedMesaId, setSelectedMesaId] = useState<number | null>(null);
  const [reservationCode, setReservationCode] = useState<string | null>(null);

  const numPersonas = useMemo(() => Number(form.num_personas || 0), [form.num_personas]);
  const canCheckAvailability =
    form.num_personas.trim().length > 0 &&
    form.fecha_hora_inicio.trim().length > 0 &&
    form.fecha_hora_fin.trim().length > 0;
  const selectedMesa = useMemo(
    () => availability?.mesasDisponibles.find((mesa) => mesa.id === selectedMesaId) ?? null,
    [availability, selectedMesaId]
  );

  async function checkAvailability(): Promise<AvailabilityResult> {
    const start = new Date(form.fecha_hora_inicio);
    const end = new Date(form.fecha_hora_fin);

    const [mesas, reservas] = await Promise.all([
      requestJson<Mesa[]>("/api/mesas", { cache: "no-store" }),
      requestJson<Reserva[]>("/api/reservas", { cache: "no-store" })
    ]);

    const candidateMesas = mesas
      .filter((m) => m.capacidad >= numPersonas)
      .filter((m) => {
        if (!m.bloqueada_hasta) return true;
        const blockedUntil = new Date(m.bloqueada_hasta);
        return start >= blockedUntil;
      })
      .filter((m) => {
        const sameMesaReservas = reservas.filter((r) => r.id_mesa === m.id);
        return sameMesaReservas.every((r) => {
          const rStart = new Date(r.fecha_hora_inicio);
          const rEnd = new Date(r.fecha_hora_fin);
          return !hasOverlap(start, end, rStart, rEnd);
        });
      })
      .sort((a, b) => a.capacidad - b.capacidad || a.numero_mesa - b.numero_mesa);

    if (!candidateMesas.length) {
      return {
        available: false,
        mesa: null,
        mesasDisponibles: [],
        message: "No hay disponibilidad para ese horario y cantidad de personas."
      };
    }

    return {
      available: true,
      mesa: candidateMesas[0],
      mesasDisponibles: candidateMesas,
      message: `Hay disponibilidad. Mesa sugerida: ${candidateMesas[0].numero_mesa}`
    };
  }

  async function handleCheckAvailability() {
    setChecking(true);
    setError(null);
    setReservationCode(null);
    setShowAvailabilityMenu(true);

    try {
      const result = await checkAvailability();
      setAvailability(result);
      if (result.available && result.mesasDisponibles.length) {
        const stillExists = result.mesasDisponibles.find((mesa) => mesa.id === selectedMesaId);
        setSelectedMesaId(stillExists ? stillExists.id : result.mesasDisponibles[0].id);
      } else {
        setSelectedMesaId(null);
      }
    } catch (e) {
      setAvailability(null);
      setSelectedMesaId(null);
      setError(e instanceof Error ? e.message : "No se pudo verificar disponibilidad");
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReservationCode(null);

    try {
      let currentAvailability = availability;
      if (!currentAvailability || !currentAvailability.available || !currentAvailability.mesa) {
        currentAvailability = await checkAvailability();
        setAvailability(currentAvailability);
      }

      if (!currentAvailability.available || !currentAvailability.mesa) {
        throw new Error("No hay disponibilidad para completar la reserva");
      }
      const mesaSeleccionada =
        currentAvailability.mesasDisponibles.find((mesa) => mesa.id === selectedMesaId) ??
        currentAvailability.mesa;

      const cliente = await requestJson<Cliente>("/api/clientes", {
        method: "POST",
        body: JSON.stringify({
          nombre: form.nombre,
          apellido: form.apellido,
          correo_electronico: form.correo_electronico || null,
          numero_telefono: form.numero_telefono || null,
          fecha_nacimiento: form.fecha_nacimiento || null
        })
      });

      const estados = await requestJson<EstadoReserva[]>("/api/estado_reserva", { cache: "no-store" });
      const estadoDefault =
        estados.find((eState) => eState.nombre_estado.toLowerCase().includes("pend")) ?? estados[0];

      if (!estadoDefault) {
        throw new Error("No hay estados de reserva configurados");
      }

      const reserva = await requestJson<{ id_public: string }>("/api/reservas", {
        method: "POST",
        body: JSON.stringify({
          id_cliente: cliente.id,
          id_mesa: mesaSeleccionada.id,
          id_estado: estadoDefault.id,
          fecha_hora_inicio: new Date(form.fecha_hora_inicio).toISOString(),
          fecha_hora_fin: new Date(form.fecha_hora_fin).toISOString(),
          num_personas: Number(form.num_personas),
          notas: form.notas || null
        })
      });

      setReservationCode(reserva.id_public);
      setAvailability({
        available: true,
        mesa: mesaSeleccionada,
        mesasDisponibles: currentAvailability.mesasDisponibles,
        message: `Reserva confirmada en mesa ${mesaSeleccionada.numero_mesa}`
      });
      setForm(initialForm);
      setSelectedMesaId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la reserva");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`${epilogue.className} min-h-screen bg-white text-[#14213D]`}>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-5">
          <a href="/admin" className="text-sm font-semibold text-[#14213D]">Administracion</a>
          <h1 className="mx-auto pr-10 text-base font-bold">Reserva tu Mesa</h1>
        </div>
      </header>

      <section
        className="relative h-[34vh] min-h-[220px] bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(20,33,61,0.35), rgba(20,33,61,0.6)), url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=80')"
        }}
      >
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <p className="text-2xl font-bold text-white md:text-3xl">Una experiencia culinaria unica</p>
          <p className="mt-2 text-sm font-bold tracking-[0.2em] text-[#f4c025]">EXCLUSIVIDAD & SABOR</p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-5 px-5 py-7">
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-center text-xl font-bold">Detalles de la Reserva</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-bold">Nombre</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f4c025]/50" placeholder="Ingresa tu nombre" value={form.nombre} onChange={(e) => setForm((v) => ({ ...v, nombre: e.target.value }))} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold">Apellido</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f4c025]/50" placeholder="Ingresa tu apellido" value={form.apellido} onChange={(e) => setForm((v) => ({ ...v, apellido: e.target.value }))} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold">Correo Electronico</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f4c025]/50" placeholder="nombre@correo.com" value={form.correo_electronico} onChange={(e) => setForm((v) => ({ ...v, correo_electronico: e.target.value }))} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold">Telefono</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f4c025]/50" placeholder="Numero de telefono" value={form.numero_telefono} onChange={(e) => setForm((v) => ({ ...v, numero_telefono: e.target.value }))} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold">Fecha de Nacimiento (Opcional)</label>
              <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#f4c025]/50" value={form.fecha_nacimiento} onChange={(e) => setForm((v) => ({ ...v, fecha_nacimiento: e.target.value }))} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold">Personas</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f4c025]/50" placeholder="Cantidad de personas" value={form.num_personas} onChange={(e) => setForm((v) => ({ ...v, num_personas: e.target.value }))} />
            </div>

            <div className="rounded-lg border border-[#f4c025]/30 bg-[#fff8e8] p-4">
              <p className="mb-3 text-sm font-bold text-[#14213D]">Horario</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold">Entrada</label>
                  <input type="datetime-local" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#f4c025]/50" value={form.fecha_hora_inicio} onChange={(e) => setForm((v) => ({ ...v, fecha_hora_inicio: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold">Salida Estimada</label>
                  <input type="datetime-local" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#f4c025]/50" value={form.fecha_hora_fin} onChange={(e) => setForm((v) => ({ ...v, fecha_hora_fin: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleCheckAvailability()}
                disabled={checking || !canCheckAvailability}
                className={`w-full rounded-lg border px-4 py-2 text-sm font-semibold md:w-auto ${
                  canCheckAvailability
                    ? "border-[#f4c025] bg-[#f4c025] font-bold text-[#14213D]"
                    : "border-[#f4c025] bg-white font-bold text-[#14213D]"
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {checking ? "Verificando..." : "Ver disponibilidad"}
              </button>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold">Mesa Seleccionada</label>
              <input
                readOnly
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-base text-slate-700 placeholder:text-slate-400"
                value={
                  selectedMesa
                    ? `Mesa ${selectedMesa.numero_mesa} - Zona ${selectedMesa.AREA?.nombre ?? "Sin zona"}`
                    : ""
                }
                placeholder="Selecciona una mesa en disponibilidad"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold">Notas Especiales</label>
              <textarea className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f4c025]/50" placeholder="Alergias, preferencias u observaciones" value={form.notas} onChange={(e) => setForm((v) => ({ ...v, notas: e.target.value }))} />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#f4c025] px-5 py-2 text-sm font-bold text-[#14213D] disabled:opacity-60"
              >
                {loading ? "Reservando..." : "Confirmar Reserva ->"}
              </button>
            </div>
          </form>
        </section>

        {reservationCode && availability?.mesa && (
          <section className="rounded-lg border border-[#f4c025]/50 bg-[#fff8e8] p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#14213D]">Reserva Confirmada</h2>
            <p className="mt-2 text-sm text-[#14213D]">Mesa asignada: <strong>{availability.mesa.numero_mesa}</strong></p>
            <p className="mt-1 text-sm text-[#14213D]">Numero de reserva (`id_public`): <strong>{reservationCode}</strong></p>
          </section>
        )}

        <footer className="pb-4 text-center text-xs text-slate-500">
          Al confirmar aceptas nuestras politicas de reserva y cancelacion.
        </footer>
      </div>

      {showAvailabilityMenu && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => setShowAvailabilityMenu(false)}
        >
          <section
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">Disponibilidad</h2>
              <button
                type="button"
                onClick={() => setShowAvailabilityMenu(false)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
              >
                Cerrar
              </button>
            </div>

            {!availability && (
              <p className="mt-3 text-sm text-slate-700">{checking ? "Verificando disponibilidad..." : "Sin datos."}</p>
            )}

            {availability && (
              <>
                <p className="mt-2 text-sm text-slate-700">{availability.message}</p>
                {availability.available && availability.mesa && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-slate-700">
                      Numero de mesa disponible: <strong>{availability.mesa.numero_mesa}</strong>
                    </p>
                    <p className="text-sm font-semibold text-slate-800">Mesas disponibles y zona:</p>
                    <ul className="space-y-1 text-sm text-slate-700">
                      {availability.mesasDisponibles.map((mesa) => (
                        <li
                          key={mesa.id}
                          className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                            selectedMesaId === mesa.id ? "border-[#f4c025] bg-[#fff8e8]" : "border-slate-200"
                          }`}
                        >
                          <span>
                            Mesa {mesa.numero_mesa} | Zona: {mesa.AREA?.nombre ?? "Sin zona"} | Capacidad:{" "}
                            {mesa.capacidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMesaId(mesa.id);
                              setShowAvailabilityMenu(false);
                            }}
                            className="rounded-md border border-[#f4c025] px-3 py-1 text-xs font-bold text-[#14213D]"
                          >
                            {selectedMesaId === mesa.id ? "Seleccionada" : "Seleccionar"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
