"use client";

import { useEffect, useMemo, useState } from "react";

type Cliente = {
  id: number;
  nombre: string;
  apellido: string;
};

type Mesa = {
  id: number;
  numero_mesa: number;
};

type EstadoReserva = {
  id: number;
  nombre_estado: string;
};

type Reserva = {
  id: number;
  id_public: string;
  id_cliente: number;
  id_mesa: number;
  id_estado: number;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  num_personas: number;
  notas: string | null;
};

function toDateTimeInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

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

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export default function AdminReservasPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [estados, setEstados] = useState<EstadoReserva[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);

  const [loading, setLoading] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filterDate, setFilterDate] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterMesa, setFilterMesa] = useState("");
  const [filterCliente, setFilterCliente] = useState("");

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      const [clientesData, mesasData, estadosData, reservasData] = await Promise.all([
        requestJson<Cliente[]>("/api/clientes", { cache: "no-store" }),
        requestJson<Mesa[]>("/api/mesas", { cache: "no-store" }),
        requestJson<EstadoReserva[]>("/api/estado_reserva", { cache: "no-store" }),
        requestJson<Reserva[]>("/api/reservas", { cache: "no-store" })
      ]);

      setClientes(clientesData);
      setMesas(mesasData);
      setEstados(estadosData);
      setReservas(reservasData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando reservas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  function clienteLabel(id: number): string {
    const c = clientes.find((x) => x.id === id);
    return c ? `${c.nombre} ${c.apellido}` : String(id);
  }

  function mesaLabel(id: number): string {
    const m = mesas.find((x) => x.id === id);
    return m ? `Mesa ${m.numero_mesa}` : String(id);
  }

  const filteredReservas = useMemo(() => {
    return reservas.filter((r) => {
      const matchesDate = filterDate
        ? toDateTimeInput(r.fecha_hora_inicio).slice(0, 10) === filterDate
        : true;
      const matchesEstado = filterEstado ? String(r.id_estado) === filterEstado : true;
      const matchesMesa = filterMesa ? String(r.id_mesa) === filterMesa : true;
      const matchesCliente = filterCliente ? String(r.id_cliente) === filterCliente : true;
      return matchesDate && matchesEstado && matchesMesa && matchesCliente;
    });
  }, [reservas, filterDate, filterEstado, filterMesa, filterCliente]);

  async function changeReservaEstado(id: number, idEstado: number) {
    setUpdatingStatusId(id);
    setError(null);
    try {
      await requestJson(`/api/reservas/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ id_estado: idEstado })
      });
      setReservas((prev) => prev.map((r) => (r.id === id ? { ...r, id_estado: idEstado } : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el estado");
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function removeReserva(id: number) {
    const ok = window.confirm("Deseas eliminar esta reserva?");
    if (!ok) return;

    try {
      await requestJson(`/api/reservas/${id}`, { method: "DELETE" });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error eliminando reserva");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold text-slate-900">Panel Administrativo</h1>
          <p className="mt-1 text-sm text-slate-600">Gestion de Reservas</p>
        </header>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading && (
          <p className="rounded-lg bg-white p-3 text-sm text-slate-600 ring-1 ring-slate-200">
            Cargando datos...
          </p>
        )}

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Reservas</h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input
              type="date"
              className="rounded-xl border border-slate-300 px-3 py-2"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
            <select
              className="rounded-xl border border-slate-300 px-3 py-2"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              {estados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre_estado}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-slate-300 px-3 py-2"
              value={filterMesa}
              onChange={(e) => setFilterMesa(e.target.value)}
            >
              <option value="">Todas las mesas</option>
              {mesas.map((m) => (
                <option key={m.id} value={m.id}>
                  Mesa {m.numero_mesa}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-slate-300 px-3 py-2"
              value={filterCliente}
              onChange={(e) => setFilterCliente(e.target.value)}
            >
              <option value="">Todos los clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.apellido}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-2 py-2">ID</th>
                  <th className="px-2 py-2">Codigo</th>
                  <th className="px-2 py-2">Cliente</th>
                  <th className="px-2 py-2">Mesa</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="px-2 py-2">Inicio</th>
                  <th className="px-2 py-2">Fin</th>
                  <th className="px-2 py-2">Personas</th>
                  <th className="px-2 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservas.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="px-2 py-2">{r.id}</td>
                    <td className="px-2 py-2">{r.id_public}</td>
                    <td className="px-2 py-2">{clienteLabel(r.id_cliente)}</td>
                    <td className="px-2 py-2">{mesaLabel(r.id_mesa)}</td>
                    <td className="px-2 py-2">
                      <select
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        value={r.id_estado}
                        onChange={(e) => void changeReservaEstado(r.id, Number(e.target.value))}
                        disabled={updatingStatusId === r.id}
                      >
                        {estados.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.nombre_estado}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">{toDateTimeInput(r.fecha_hora_inicio)}</td>
                    <td className="px-2 py-2">{toDateTimeInput(r.fecha_hora_fin)}</td>
                    <td className="px-2 py-2">{r.num_personas}</td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        className="rounded-lg bg-rose-600 px-3 py-1 text-xs text-white"
                        onClick={() => void removeReserva(r.id)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredReservas.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-500">No hay reservas con esos filtros.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

