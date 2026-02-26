"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Cliente = {
  id: number;
  id_public: string;
  nombre: string;
  apellido: string;
  correo_electronico: string | null;
  numero_telefono: string | null;
  fecha_nacimiento: string | null;
  puntos_lealtad: number | null;
};

type ClienteForm = {
  nombre: string;
  apellido: string;
  correo_electronico: string;
  numero_telefono: string;
  fecha_nacimiento: string;
};

const initialForm: ClienteForm = {
  nombre: "",
  apellido: "",
  correo_electronico: "",
  numero_telefono: "",
  fecha_nacimiento: ""
};

function toDateInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function HomePage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState<ClienteForm>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadClientes() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/clientes", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudieron cargar clientes");
      const data = (await res.json()) as Cliente[];
      setClientes(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando clientes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClientes();
  }, []);

  const filteredClientes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clientes;

    return clientes.filter((c) => {
      return (
        c.nombre.toLowerCase().includes(q) ||
        c.apellido.toLowerCase().includes(q) ||
        (c.correo_electronico ?? "").toLowerCase().includes(q) ||
        (c.numero_telefono ?? "").toLowerCase().includes(q)
      );
    });
  }, [clientes, search]);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function startEdit(cliente: Cliente) {
    setEditingId(cliente.id);
    setForm({
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      correo_electronico: cliente.correo_electronico ?? "",
      numero_telefono: cliente.numero_telefono ?? "",
      fecha_nacimiento: toDateInput(cliente.fecha_nacimiento)
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        nombre: form.nombre,
        apellido: form.apellido,
        correo_electronico: form.correo_electronico || null,
        numero_telefono: form.numero_telefono || null,
        fecha_nacimiento: form.fecha_nacimiento || null
      };

      const isEditing = editingId !== null;
      const endpoint = isEditing ? `/api/clientes/${editingId}` : "/api/clientes";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const response = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(response?.error ?? "No se pudo guardar el cliente");
      }

      resetForm();
      await loadClientes();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando cliente");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    const ok = window.confirm("¿Seguro que deseas eliminar este cliente?");
    if (!ok) return;

    setError(null);

    try {
      const res = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo eliminar el cliente");
      if (editingId === id) resetForm();
      await loadClientes();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error eliminando cliente");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold text-slate-900">Gestion de Clientes</h1>
          <p className="mt-1 text-sm text-slate-600">Crear, buscar, editar y eliminar clientes</p>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">
            {editingId ? `Editar cliente #${editingId}` : "Nuevo cliente"}
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
              required
            />
            <input
              className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="Apellido"
              value={form.apellido}
              onChange={(e) => setForm((prev) => ({ ...prev, apellido: e.target.value }))}
              required
            />
            <input
              type="email"
              className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="Correo electronico"
              value={form.correo_electronico}
              onChange={(e) => setForm((prev) => ({ ...prev, correo_electronico: e.target.value }))}
            />
            <input
              className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="Numero telefono"
              value={form.numero_telefono}
              onChange={(e) => setForm((prev) => ({ ...prev, numero_telefono: e.target.value }))}
            />
            <input
              type="date"
              className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              value={form.fecha_nacimiento}
              onChange={(e) => setForm((prev) => ({ ...prev, fecha_nacimiento: e.target.value }))}
            />

            <div className="md:col-span-2 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
              >
                {saving ? "Guardando..." : editingId ? "Actualizar" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 px-4 py-2 text-slate-700"
              >
                Limpiar
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Clientes</h2>
            <input
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 md:w-72"
              placeholder="Buscar por nombre, apellido, correo o telefono"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          {loading ? (
            <p className="text-slate-600">Cargando...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="px-2 py-2">ID</th>
                    <th className="px-2 py-2">Nombre</th>
                    <th className="px-2 py-2">Apellido</th>
                    <th className="px-2 py-2">Correo</th>
                    <th className="px-2 py-2">Telefono</th>
                    <th className="px-2 py-2">Nacimiento</th>
                    <th className="px-2 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClientes.map((cliente) => (
                    <tr key={cliente.id} className="border-b border-slate-100">
                      <td className="px-2 py-2">{cliente.id}</td>
                      <td className="px-2 py-2">{cliente.nombre}</td>
                      <td className="px-2 py-2">{cliente.apellido}</td>
                      <td className="px-2 py-2">{cliente.correo_electronico ?? "-"}</td>
                      <td className="px-2 py-2">{cliente.numero_telefono ?? "-"}</td>
                      <td className="px-2 py-2">{toDateInput(cliente.fecha_nacimiento) || "-"}</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(cliente)}
                            className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-medium text-white"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cliente.id)}
                            className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-medium text-white"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredClientes.length === 0 && (
                <p className="py-4 text-center text-slate-500">No hay clientes para mostrar</p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}