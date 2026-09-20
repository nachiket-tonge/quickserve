"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentAdmin } from "../../lib/admin";
import { supabase } from "../../lib/supabase";
import AdminShell from "../../components/admin-shell";

type Service = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ServiceForm = {
  name: string;
  description: string;
  is_active: boolean;
};

const EMPTY_FORM: ServiceForm = {
  name: "",
  description: "",
  is_active: true,
};

export default function ServicesPage() {
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError("");

    const admin = await getCurrentAdmin();

    if (!admin) {
      router.replace("/login");
      return;
    }

    const { data, error: serviceError } = await supabase
      .from("services")
      .select(
        `
          id,
          name,
          description,
          is_active,
          created_at,
          updated_at
        `,
      )
      .order("name", { ascending: true });

    if (serviceError) {
      setError(`Failed to load services: ${serviceError.message}`);
      setLoading(false);
      return;
    }

    setServices(data ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadServices();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadServices]);

  const filteredServices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return services;
    }

    return services.filter(
      (service) =>
        service.name.toLowerCase().includes(normalizedSearch) ||
        (service.description ?? "").toLowerCase().includes(normalizedSearch),
    );
  }, [services, search]);

  function openCreateForm() {
    setEditingServiceId(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(service: Service) {
    setEditingServiceId(service.id);

    setForm({
      name: service.name,
      description: service.description ?? "",
      is_active: service.is_active,
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingServiceId(null);
    setForm(EMPTY_FORM);
  }

  function handleFormChange(field: keyof ServiceForm, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  }

  async function saveService(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const description = form.description.trim();

    if (!name) {
      setError("Service name is required.");
      return;
    }

    if (name.length > 100) {
      setError("Service name must be 100 characters or less.");
      return;
    }

    if (description.length > 500) {
      setError("Service description must be 500 characters or less.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    if (editingServiceId) {
      const { error: updateError } = await supabase
        .from("services")
        .update({
          name,
          description: description || null,
          is_active: form.is_active,
        })
        .eq("id", editingServiceId);

      if (updateError) {
        setError(`Failed to update service: ${updateError.message}`);
        setSaving(false);
        return;
      }

      setSuccess(`${name} updated successfully.`);
    } else {
      const { error: insertError } = await supabase.from("services").insert({
        name,
        description: description || null,
        is_active: form.is_active,
      });

      if (insertError) {
        setError(`Failed to create service: ${insertError.message}`);
        setSaving(false);
        return;
      }

      setSuccess(`${name} created successfully.`);
    }

    setSaving(false);
    closeForm();
    await loadServices();
  }

  async function toggleService(service: Service) {
    const nextState = !service.is_active;

    setError("");
    setSuccess("");

    const action = nextState ? "activate" : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${service.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    const { error: updateError } = await supabase
      .from("services")
      .update({
        is_active: nextState,
      })
      .eq("id", service.id);

    if (updateError) {
      setError(`Failed to ${action} service: ${updateError.message}`);
      setSaving(false);
      return;
    }

    setSuccess(
      `${service.name} ${
        nextState ? "activated" : "deactivated"
      } successfully.`,
    );

    setSaving(false);

    await loadServices();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="center-page">
        <p>Loading services...</p>
      </main>
    );
  }

  return (
    <AdminShell
      title="Services"
      subtitle="Manage QuickServe services and availability"
      showBack
    >
      <section className="content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">SERVICE MANAGEMENT</p>

            <h2>Services</h2>

            <p className="muted">
              Create, update and manage services offered by QuickServe.
            </p>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="primary-button"
              onClick={openCreateForm}
            >
              + Add Service
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => void loadServices()}
            >
              Refresh
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => router.push("/dashboard")}
            >
              Dashboard
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        {success && <div className="success-box">{success}</div>}

        <div className="request-filters">
          <div className="search-filter">
            <label htmlFor="service-search">Search services</label>

            <div className="search-input-wrapper">
              <span className="search-icon">⌕</span>

              <input
                id="service-search"
                type="text"
                placeholder="Search by service name or description..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              {search && (
                <button
                  type="button"
                  className="clear-search-button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="filter-summary">
            <strong>{filteredServices.length}</strong>
            <span>
              {filteredServices.length === 1 ? "service" : "services"} found
            </span>
          </div>
        </div>

        {showForm && (
          <div className="request-card service-form-card">
            <div className="page-heading">
              <div>
                <p className="eyebrow">
                  {editingServiceId ? "EDIT SERVICE" : "NEW SERVICE"}
                </p>

                <h3>{editingServiceId ? "Edit Service" : "Create Service"}</h3>
              </div>
            </div>

            <form onSubmit={saveService}>
              <div className="request-details">
                <div className="form-group">
                  <label htmlFor="service-name">Service Name</label>

                  <input
                    id="service-name"
                    type="text"
                    value={form.name}
                    maxLength={100}
                    placeholder="e.g. Plumbing"
                    onChange={(event) =>
                      handleFormChange("name", event.target.value)
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="service-description">Description</label>

                  <textarea
                    id="service-description"
                    value={form.description}
                    maxLength={500}
                    placeholder="Describe the service..."
                    rows={4}
                    onChange={(event) =>
                      handleFormChange("description", event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="form-group service-active-field">
                <label htmlFor="service-active">Service Status</label>

                <select
                  id="service-active"
                  value={form.is_active ? "active" : "inactive"}
                  onChange={(event) =>
                    handleFormChange(
                      "is_active",
                      event.target.value === "active",
                    )
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="assignment-row">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingServiceId
                      ? "Update Service"
                      : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        )}

        {filteredServices.length === 0 ? (
          <div className="empty-state">
            <h3>No services found</h3>

            <p>
              {search
                ? "Try changing your search."
                : "No services have been created yet."}
            </p>
          </div>
        ) : (
          <div className="request-list">
            {filteredServices.map((service) => (
              <article key={service.id} className="request-card">
                <div className="request-header">
                  <div>
                    <span className="request-number">{service.name}</span>

                    <span
                      className={
                        service.is_active ? "status-badge" : "priority"
                      }
                    >
                      {service.is_active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                </div>

                <div className="request-details">
                  <div>
                    <strong>Description</strong>

                    <p>{service.description ?? "No description provided"}</p>
                  </div>

                  <div>
                    <strong>Created</strong>

                    <p>{new Date(service.created_at).toLocaleString()}</p>
                  </div>

                  <div>
                    <strong>Last Updated</strong>

                    <p>{new Date(service.updated_at).toLocaleString()}</p>
                  </div>

                  <div>
                    <strong>Service ID</strong>

                    <p>{service.id}</p>
                  </div>
                </div>

                <div className="assignment-row">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => openEditForm(service)}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className={
                      service.is_active ? "secondary-button" : "primary-button"
                    }
                    disabled={saving}
                    onClick={() => void toggleService(service)}
                  >
                    {service.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
