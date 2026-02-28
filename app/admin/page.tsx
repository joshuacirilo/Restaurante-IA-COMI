"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Cliente = {
  id: number;
  nombre: string;
  apellido: string;
  correo_electronico: string | null;
  numero_telefono: string | null;
  fecha_nacimiento: string | null;
  puntos_lealtad: number | null;
};

type Area = {
  id: number;
  id_public: string;
  nombre: string;
};

type EstadoReserva = {
  id: number;
  nombre_estado: string;
};

type Mesa = {
  id: number;
  id_public: string;
  numero_mesa: number;
  capacidad: number;
  id_area: number | null;
  bloqueada_hasta: string | null;
  AREA?: Area | null;
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

type ClienteForm = {
  nombre: string;
  apellido: string;
  correo_electronico: string;
  numero_telefono: string;
  fecha_nacimiento: string;
};

type AreaForm = {
  nombre: string;
};

type EstadoForm = {
  nombre_estado: string;
};

type MesaForm = {
  numero_mesa: string;
  capacidad: string;
  id_area: string;
  bloqueada_hasta: string;
};

type ReservaForm = {
  id_cliente: string;
  id_mesa: string;
  id_estado: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  num_personas: string;
  notas: string;
};

const initialClienteForm: ClienteForm = {
  nombre: "",
  apellido: "",
  correo_electronico: "",
  numero_telefono: "",
  fecha_nacimiento: ""
};

const initialAreaForm: AreaForm = {
  nombre: ""
};

const initialEstadoForm: EstadoForm = {
  nombre_estado: ""
};

const initialMesaForm: MesaForm = {
  numero_mesa: "",
  capacidad: "",
  id_area: "",
  bloqueada_hasta: ""
};

const initialReservaForm: ReservaForm = {
  id_cliente: "",
  id_mesa: "",
  id_estado: "",
  fecha_hora_inicio: "",
  fecha_hora_fin: "",
  num_personas: "",
  notas: ""
};

function dateOnly(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toISOString().slice(0, 10);
}

function toDateInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

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

function toNullableString(value: string): string | null {
  const v = value.trim();
  return v.length ? v : null;
}

function toNullableNumber(value: string): number | null {
  const v = value.trim();
  if (!v.length) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function HomePage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [estados, setEstados] = useState<EstadoReserva[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);

  const [clienteForm, setClienteForm] = useState<ClienteForm>(initialClienteForm);
  const [areaForm, setAreaForm] = useState<AreaForm>(initialAreaForm);
  const [estadoForm, setEstadoForm] = useState<EstadoForm>(initialEstadoForm);
  const [mesaForm, setMesaForm] = useState<MesaForm>(initialMesaForm);
  const [reservaForm, setReservaForm] = useState<ReservaForm>(initialReservaForm);

  const [editingClienteId, setEditingClienteId] = useState<number | null>(null);
  const [editingAreaId, setEditingAreaId] = useState<number | null>(null);
  const [editingEstadoId, setEditingEstadoId] = useState<number | null>(null);
  const [editingMesaId, setEditingMesaId] = useState<number | null>(null);
  const [editingReservaId, setEditingReservaId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      const [clientesData, areasData, estadosData, mesasData, reservasData] = await Promise.all([
        requestJson<Cliente[]>("/api/clientes", { cache: "no-store" }),
        requestJson<Area[]>("/api/areas", { cache: "no-store" }),
        requestJson<EstadoReserva[]>("/api/estado_reserva", { cache: "no-store" }),
        requestJson<Mesa[]>("/api/mesas", { cache: "no-store" }),
        requestJson<Reserva[]>("/api/reservas", { cache: "no-store" })
      ]);

      setClientes(clientesData);
      setAreas(areasData);
      setEstados(estadosData);
      setMesas(mesasData);
      setReservas(reservasData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const filteredClientes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.apellido.toLowerCase().includes(q) ||
        (c.correo_electronico ?? "").toLowerCase().includes(q) ||
        (c.numero_telefono ?? "").toLowerCase().includes(q)
    );
  }, [clientes, search]);

  function areaNameById(id: number | null): string {
    if (!id) return "-";
    const area = areas.find((a) => a.id === id);
    return area ? area.nombre : String(id);
  }

  function clienteLabel(id: number): string {
    const c = clientes.find((x) => x.id === id);
    return c ? `${c.nombre} ${c.apellido}` : String(id);
  }

  function estadoLabel(id: number): string {
    const e = estados.find((x) => x.id === id);
    return e ? e.nombre_estado : String(id);
  }

  function mesaLabel(id: number): string {
    const m = mesas.find((x) => x.id === id);
    return m ? `Mesa ${m.numero_mesa}` : String(id);
  }

  function resetClienteForm() {
    setClienteForm(initialClienteForm);
    setEditingClienteId(null);
  }

  function resetAreaForm() {
    setAreaForm(initialAreaForm);
    setEditingAreaId(null);
  }

  function resetEstadoForm() {
    setEstadoForm(initialEstadoForm);
    setEditingEstadoId(null);
  }

  function resetMesaForm() {
    setMesaForm(initialMesaForm);
    setEditingMesaId(null);
  }

  function resetReservaForm() {
    setReservaForm(initialReservaForm);
    setEditingReservaId(null);
  }

  async function submitCliente(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        nombre: clienteForm.nombre,
        apellido: clienteForm.apellido,
        correo_electronico: toNullableString(clienteForm.correo_electronico),
        numero_telefono: toNullableString(clienteForm.numero_telefono),
        fecha_nacimiento: toNullableString(clienteForm.fecha_nacimiento)
      };

      await requestJson(
        editingClienteId ? `/api/clientes/${editingClienteId}` : "/api/clientes",
        {
          method: editingClienteId ? "PATCH" : "POST",
          body: JSON.stringify(payload)
        }
      );

      resetClienteForm();
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando cliente");
    } finally {
      setSaving(false);
    }
  }

  async function submitArea(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await requestJson(editingAreaId ? `/api/areas/${editingAreaId}` : "/api/areas", {
        method: editingAreaId ? "PATCH" : "POST",
        body: JSON.stringify({ nombre: areaForm.nombre })
      });
      resetAreaForm();
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando area");
    } finally {
      setSaving(false);
    }
  }

  async function submitEstado(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await requestJson(editingEstadoId ? `/api/estado_reserva/${editingEstadoId}` : "/api/estado_reserva", {
        method: editingEstadoId ? "PATCH" : "POST",
        body: JSON.stringify({ nombre_estado: estadoForm.nombre_estado })
      });
      resetEstadoForm();
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando estado");
    } finally {
      setSaving(false);
    }
  }

  async function submitMesa(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        numero_mesa: toNullableNumber(mesaForm.numero_mesa),
        capacidad: toNullableNumber(mesaForm.capacidad),
        id_area: toNullableNumber(mesaForm.id_area),
        bloqueada_hasta: toNullableString(mesaForm.bloqueada_hasta)
      };

      await requestJson(editingMesaId ? `/api/mesas/${editingMesaId}` : "/api/mesas", {
        method: editingMesaId ? "PATCH" : "POST",
        body: JSON.stringify(payload)
      });
      resetMesaForm();
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando mesa");
    } finally {
      setSaving(false);
    }
  }

  async function submitReserva(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        id_cliente: toNullableNumber(reservaForm.id_cliente),
        id_mesa: toNullableNumber(reservaForm.id_mesa),
        id_estado: toNullableNumber(reservaForm.id_estado),
        fecha_hora_inicio: toNullableString(reservaForm.fecha_hora_inicio),
        fecha_hora_fin: toNullableString(reservaForm.fecha_hora_fin),
        num_personas: toNullableNumber(reservaForm.num_personas),
        notas: toNullableString(reservaForm.notas)
      };

      await requestJson(editingReservaId ? `/api/reservas/${editingReservaId}` : "/api/reservas", {
        method: editingReservaId ? "PATCH" : "POST",
        body: JSON.stringify(payload)
      });
      resetReservaForm();
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando reserva");
    } finally {
      setSaving(false);
    }
  }

  async function removeById(endpoint: string, id: number) {
    const ok = window.confirm("Deseas eliminar este registro?");
    if (!ok) return;

    try {
      await requestJson(`${endpoint}/${id}`, { method: "DELETE" });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error eliminando registro");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold text-slate-900">Panel Administrativo</h1>
          <p className="mt-1 text-sm text-slate-600">CRUD conectado al backend para clientes, areas, estados, mesas y reservas</p>
        </header>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading && <p className="rounded-lg bg-white p-3 text-sm text-slate-600 ring-1 ring-slate-200">Cargando datos...</p>}

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-800">Clientes</h2>
            <input
              className="w-full max-w-sm rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="Buscar cliente"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <form onSubmit={submitCliente} className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Nombre" value={clienteForm.nombre} onChange={(e) => setClienteForm((v) => ({ ...v, nombre: e.target.value }))} />
            <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Apellido" value={clienteForm.apellido} onChange={(e) => setClienteForm((v) => ({ ...v, apellido: e.target.value }))} />
            <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Correo" value={clienteForm.correo_electronico} onChange={(e) => setClienteForm((v) => ({ ...v, correo_electronico: e.target.value }))} />
            <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Telefono" value={clienteForm.numero_telefono} onChange={(e) => setClienteForm((v) => ({ ...v, numero_telefono: e.target.value }))} />
            <input type="date" className="rounded-xl border border-slate-300 px-3 py-2" value={clienteForm.fecha_nacimiento} onChange={(e) => setClienteForm((v) => ({ ...v, fecha_nacimiento: e.target.value }))} />
            <div className="md:col-span-5 flex gap-2">
              <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-60">{editingClienteId ? "Actualizar" : "Guardar"}</button>
              <button type="button" onClick={resetClienteForm} className="rounded-xl border border-slate-300 px-4 py-2">Limpiar</button>
            </div>
          </form>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-2 py-2">ID</th><th className="px-2 py-2">Nombre</th><th className="px-2 py-2">Apellido</th><th className="px-2 py-2">Correo</th><th className="px-2 py-2">Telefono</th><th className="px-2 py-2">Nacimiento</th><th className="px-2 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100">
                    <td className="px-2 py-2">{c.id}</td>
                    <td className="px-2 py-2">{c.nombre}</td>
                    <td className="px-2 py-2">{c.apellido}</td>
                    <td className="px-2 py-2">{c.correo_electronico ?? "-"}</td>
                    <td className="px-2 py-2">{c.numero_telefono ?? "-"}</td>
                    <td className="px-2 py-2">{dateOnly(c.fecha_nacimiento)}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button type="button" className="rounded-lg bg-amber-500 px-3 py-1 text-xs text-white" onClick={() => {
                          setEditingClienteId(c.id);
                          setClienteForm({
                            nombre: c.nombre,
                            apellido: c.apellido,
                            correo_electronico: c.correo_electronico ?? "",
                            numero_telefono: c.numero_telefono ?? "",
                            fecha_nacimiento: toDateInput(c.fecha_nacimiento)
                          });
                        }}>Editar</button>
                        <button type="button" className="rounded-lg bg-rose-600 px-3 py-1 text-xs text-white" onClick={() => void removeById("/api/clientes", c.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Areas</h2>
            <form onSubmit={submitArea} className="space-y-3">
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Nombre area" value={areaForm.nombre} onChange={(e) => setAreaForm({ nombre: e.target.value })} />
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-60">{editingAreaId ? "Actualizar" : "Guardar"}</button>
                <button type="button" onClick={resetAreaForm} className="rounded-xl border border-slate-300 px-4 py-2">Limpiar</button>
              </div>
            </form>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b border-slate-200 text-left text-slate-600"><th className="px-2 py-2">ID</th><th className="px-2 py-2">Nombre</th><th className="px-2 py-2">Acciones</th></tr></thead>
                <tbody>
                  {areas.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100">
                      <td className="px-2 py-2">{a.id}</td><td className="px-2 py-2">{a.nombre}</td>
                      <td className="px-2 py-2"><div className="flex gap-2"><button type="button" className="rounded-lg bg-amber-500 px-3 py-1 text-xs text-white" onClick={() => { setEditingAreaId(a.id); setAreaForm({ nombre: a.nombre }); }}>Editar</button><button type="button" className="rounded-lg bg-rose-600 px-3 py-1 text-xs text-white" onClick={() => void removeById("/api/areas", a.id)}>Eliminar</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Estado Reserva</h2>
            <form onSubmit={submitEstado} className="space-y-3">
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Nombre estado" value={estadoForm.nombre_estado} onChange={(e) => setEstadoForm({ nombre_estado: e.target.value })} />
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-60">{editingEstadoId ? "Actualizar" : "Guardar"}</button>
                <button type="button" onClick={resetEstadoForm} className="rounded-xl border border-slate-300 px-4 py-2">Limpiar</button>
              </div>
            </form>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b border-slate-200 text-left text-slate-600"><th className="px-2 py-2">ID</th><th className="px-2 py-2">Estado</th><th className="px-2 py-2">Acciones</th></tr></thead>
                <tbody>
                  {estados.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100">
                      <td className="px-2 py-2">{e.id}</td><td className="px-2 py-2">{e.nombre_estado}</td>
                      <td className="px-2 py-2"><div className="flex gap-2"><button type="button" className="rounded-lg bg-amber-500 px-3 py-1 text-xs text-white" onClick={() => { setEditingEstadoId(e.id); setEstadoForm({ nombre_estado: e.nombre_estado }); }}>Editar</button><button type="button" className="rounded-lg bg-rose-600 px-3 py-1 text-xs text-white" onClick={() => void removeById("/api/estado_reserva", e.id)}>Eliminar</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Mesas</h2>
          <form onSubmit={submitMesa} className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Numero mesa" value={mesaForm.numero_mesa} onChange={(e) => setMesaForm((v) => ({ ...v, numero_mesa: e.target.value }))} />
            <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Capacidad" value={mesaForm.capacidad} onChange={(e) => setMesaForm((v) => ({ ...v, capacidad: e.target.value }))} />
            <select className="rounded-xl border border-slate-300 px-3 py-2" value={mesaForm.id_area} onChange={(e) => setMesaForm((v) => ({ ...v, id_area: e.target.value }))}>
              <option value="">Sin area</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
            <input type="datetime-local" className="rounded-xl border border-slate-300 px-3 py-2" value={mesaForm.bloqueada_hasta} onChange={(e) => setMesaForm((v) => ({ ...v, bloqueada_hasta: e.target.value }))} />
            <div className="md:col-span-4 flex gap-2">
              <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-60">{editingMesaId ? "Actualizar" : "Guardar"}</button>
              <button type="button" onClick={resetMesaForm} className="rounded-xl border border-slate-300 px-4 py-2">Limpiar</button>
            </div>
          </form>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-slate-600"><th className="px-2 py-2">ID</th><th className="px-2 py-2">Mesa</th><th className="px-2 py-2">Capacidad</th><th className="px-2 py-2">Area</th><th className="px-2 py-2">Bloqueada hasta</th><th className="px-2 py-2">Acciones</th></tr></thead>
              <tbody>
                {mesas.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100">
                    <td className="px-2 py-2">{m.id}</td>
                    <td className="px-2 py-2">{m.numero_mesa}</td>
                    <td className="px-2 py-2">{m.capacidad}</td>
                    <td className="px-2 py-2">{areaNameById(m.id_area)}</td>
                    <td className="px-2 py-2">{m.bloqueada_hasta ? toDateTimeInput(m.bloqueada_hasta) : "-"}</td>
                    <td className="px-2 py-2"><div className="flex gap-2"><button type="button" className="rounded-lg bg-amber-500 px-3 py-1 text-xs text-white" onClick={() => { setEditingMesaId(m.id); setMesaForm({ numero_mesa: String(m.numero_mesa), capacidad: String(m.capacidad), id_area: m.id_area ? String(m.id_area) : "", bloqueada_hasta: toDateTimeInput(m.bloqueada_hasta) }); }}>Editar</button><button type="button" className="rounded-lg bg-rose-600 px-3 py-1 text-xs text-white" onClick={() => void removeById("/api/mesas", m.id)}>Eliminar</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Reservas</h2>
          <form onSubmit={submitReserva} className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <select className="rounded-xl border border-slate-300 px-3 py-2" value={reservaForm.id_cliente} onChange={(e) => setReservaForm((v) => ({ ...v, id_cliente: e.target.value }))}>
              <option value="">Cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
              ))}
            </select>
            <select className="rounded-xl border border-slate-300 px-3 py-2" value={reservaForm.id_mesa} onChange={(e) => setReservaForm((v) => ({ ...v, id_mesa: e.target.value }))}>
              <option value="">Mesa</option>
              {mesas.map((m) => (
                <option key={m.id} value={m.id}>Mesa {m.numero_mesa}</option>
              ))}
            </select>
            <select className="rounded-xl border border-slate-300 px-3 py-2" value={reservaForm.id_estado} onChange={(e) => setReservaForm((v) => ({ ...v, id_estado: e.target.value }))}>
              <option value="">Estado</option>
              {estados.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre_estado}</option>
              ))}
            </select>
            <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Numero personas" value={reservaForm.num_personas} onChange={(e) => setReservaForm((v) => ({ ...v, num_personas: e.target.value }))} />
            <input type="datetime-local" className="rounded-xl border border-slate-300 px-3 py-2" value={reservaForm.fecha_hora_inicio} onChange={(e) => setReservaForm((v) => ({ ...v, fecha_hora_inicio: e.target.value }))} />
            <input type="datetime-local" className="rounded-xl border border-slate-300 px-3 py-2" value={reservaForm.fecha_hora_fin} onChange={(e) => setReservaForm((v) => ({ ...v, fecha_hora_fin: e.target.value }))} />
            <input className="rounded-xl border border-slate-300 px-3 py-2 md:col-span-2" placeholder="Notas" value={reservaForm.notas} onChange={(e) => setReservaForm((v) => ({ ...v, notas: e.target.value }))} />
            <div className="md:col-span-4 flex gap-2">
              <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-60">{editingReservaId ? "Actualizar" : "Guardar"}</button>
              <button type="button" onClick={resetReservaForm} className="rounded-xl border border-slate-300 px-4 py-2">Limpiar</button>
            </div>
          </form>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-slate-600"><th className="px-2 py-2">ID</th><th className="px-2 py-2">Cliente</th><th className="px-2 py-2">Mesa</th><th className="px-2 py-2">Estado</th><th className="px-2 py-2">Inicio</th><th className="px-2 py-2">Fin</th><th className="px-2 py-2">Personas</th><th className="px-2 py-2">Acciones</th></tr></thead>
              <tbody>
                {reservas.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="px-2 py-2">{r.id}</td>
                    <td className="px-2 py-2">{clienteLabel(r.id_cliente)}</td>
                    <td className="px-2 py-2">{mesaLabel(r.id_mesa)}</td>
                    <td className="px-2 py-2">{estadoLabel(r.id_estado)}</td>
                    <td className="px-2 py-2">{toDateTimeInput(r.fecha_hora_inicio)}</td>
                    <td className="px-2 py-2">{toDateTimeInput(r.fecha_hora_fin)}</td>
                    <td className="px-2 py-2">{r.num_personas}</td>
                    <td className="px-2 py-2"><div className="flex gap-2"><button type="button" className="rounded-lg bg-amber-500 px-3 py-1 text-xs text-white" onClick={() => { setEditingReservaId(r.id); setReservaForm({ id_cliente: String(r.id_cliente), id_mesa: String(r.id_mesa), id_estado: String(r.id_estado), fecha_hora_inicio: toDateTimeInput(r.fecha_hora_inicio), fecha_hora_fin: toDateTimeInput(r.fecha_hora_fin), num_personas: String(r.num_personas), notas: r.notas ?? "" }); }}>Editar</button><button type="button" className="rounded-lg bg-rose-600 px-3 py-1 text-xs text-white" onClick={() => void removeById("/api/reservas", r.id)}>Eliminar</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}