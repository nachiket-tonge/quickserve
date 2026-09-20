"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin-shell";
import { supabase } from "@/lib/supabase";

type Agent = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

type AgentService = {
  agent_id: string;
  service_id: string;
  services: {
    name: string;
  } | null;
};

export default function AgentsPage() {
  const router = useRouter();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [agentServices, setAgentServices] = useState<AgentService[]>([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  /*
   * ---------------------------------------------------------
   * Load agents, services and agent-service mappings
   * ---------------------------------------------------------
   */
  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      /*
       * Load agents
       */
      const { data: agentData, error: agentError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, role, created_at")
        .eq("role", "agent")
        .order("created_at", { ascending: false });

      if (agentError) {
        throw new Error(agentError.message);
      }

      const loadedAgents = (agentData ?? []) as Agent[];

      /*
       * Load active services
       */
      const { data: serviceData, error: serviceError } = await supabase
        .from("services")
        .select("id, name, description, is_active")
        .eq("is_active", true)
        .order("name");

      if (serviceError) {
        throw new Error(serviceError.message);
      }

      /*
       * Load agent-service mappings
       */
      const agentIds = loadedAgents.map((agent) => agent.id);

      let mappingData: AgentService[] = [];

      if (agentIds.length > 0) {
        const { data: mappingRows, error: mappingError } = await supabase
          .from("agent_services")
          .select(
            `
              agent_id,
              service_id,
              services (
                name
              )
            `,
          )
          .in("agent_id", agentIds);

        if (mappingError) {
          throw new Error(mappingError.message);
        }

        mappingData = (mappingRows ?? []).map((row) => ({
          agent_id: row.agent_id,
          service_id: row.service_id,
          services: Array.isArray(row.services)
            ? (row.services[0] ?? null)
            : row.services,
        }));
      }

      setAgents(loadedAgents);
      setServices((serviceData ?? []) as Service[]);
      setAgentServices(mappingData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAgents();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAgents]);

  /*
   * ---------------------------------------------------------
   * Service selection
   * ---------------------------------------------------------
   */
  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((current) => {
      if (current.includes(serviceId)) {
        return current.filter((id) => id !== serviceId);
      }

      return [...current, serviceId];
    });
  };

  /*
   * ---------------------------------------------------------
   * Create Agent
   * ---------------------------------------------------------
   */
  const handleCreateAgent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (password.length < 8) {
      setError("Temporary password must contain at least 8 characters.");
      return;
    }

    if (selectedServiceIds.length === 0) {
      setError("Select at least one service for the agent.");
      return;
    }

    setCreating(true);

    try {
      /*
       * Get current authenticated Admin session.
       */
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      /*
       * Send request to our secure server-side API.
       */
      const response = await fetch("/api/admin/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          password,
          serviceIds: selectedServiceIds,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create agent");
      }

      setSuccess("Agent created successfully.");

      /*
       * Reset form.
       */
      setFullName("");
      setPhone("");
      setEmail("");
      setPassword("");
      setSelectedServiceIds([]);

      /*
       * Reload the agent list.
       */
      await loadAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setCreating(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * Filter agents
   * ---------------------------------------------------------
   */
  const filteredAgents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return agents;
    }

    return agents.filter((agent) => {
      const name = agent.full_name?.toLowerCase() ?? "";
      const phoneNumber = agent.phone?.toLowerCase() ?? "";
      const id = agent.id.toLowerCase();

      return (
        name.includes(query) ||
        phoneNumber.includes(query) ||
        id.includes(query)
      );
    });
  }, [agents, search]);

  /*
   * ---------------------------------------------------------
   * Get service names for an agent
   * ---------------------------------------------------------
   */
  const getAgentServiceNames = (agentId: string) => {
    return agentServices
      .filter((mapping) => mapping.agent_id === agentId)
      .map((mapping) => mapping.services?.name)
      .filter((name): name is string => Boolean(name));
  };

  return (
    <AdminShell
      title="Agents"
      subtitle="Manage service agents and their specializations."
    >
      <div className="page-content">
        {/* -------------------------------------------------- */}
        {/* Create Agent */}
        {/* -------------------------------------------------- */}

        <section className="content-card">
          <div className="section-header">
            <div>
              <h2>Create Agent</h2>
              <p>
                Create an agent account and assign the services they can handle.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateAgent}>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Agent full name"
                />
              </div>

              <div className="form-field">
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  type="text"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Phone number"
                />
              </div>

              <div className="form-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="agent@example.com"
                />
              </div>

              <div className="form-field">
                <label htmlFor="password">Temporary Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                />
              </div>
            </div>

            {/* ------------------------------------------------ */}
            {/* Services */}
            {/* ------------------------------------------------ */}

            <div className="service-selection">
              <div className="service-selection-header">
                <div>
                  <h3>Services</h3>
                  <p>Select the services this agent is qualified to handle.</p>
                </div>

                <span>{selectedServiceIds.length} selected</span>
              </div>

              {services.length === 0 ? (
                <div className="empty-state">
                  No active services are available.
                </div>
              ) : (
                <div className="service-checkbox-grid">
                  {services.map((service) => {
                    const selected = selectedServiceIds.includes(service.id);

                    return (
                      <label
                        key={service.id}
                        className={`service-checkbox ${
                          selected ? "selected" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleService(service.id)}
                        />

                        <div>
                          <strong>{service.name}</strong>

                          {service.description && (
                            <small>{service.description}</small>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {success && <div className="alert alert-success">{success}</div>}

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={creating}
              >
                {creating ? "Creating..." : "Create Agent"}
              </button>
            </div>
          </form>
        </section>

        {/* -------------------------------------------------- */}
        {/* Agent List */}
        {/* -------------------------------------------------- */}

        <section className="content-card">
          <div className="section-header">
            <div>
              <h2>Agents</h2>
              <p>View registered agents and their assigned services.</p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={() => void loadAgents()}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="toolbar">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, phone or ID..."
            />

            <span className="toolbar-count">
              {filteredAgents.length} agent
              {filteredAgents.length === 1 ? "" : "s"}
            </span>
          </div>

          {loading ? (
            <div className="empty-state">Loading agents...</div>
          ) : filteredAgents.length === 0 ? (
            <div className="empty-state">No agents found.</div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Phone</th>
                    <th>Services</th>
                    <th>Role</th>
                    <th>Joined</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAgents.map((agent) => {
                    const serviceNames = getAgentServiceNames(agent.id);

                    return (
                      <tr key={agent.id}>
                        <td>
                          <div className="primary-text">
                            {agent.full_name || "Unnamed Agent"}
                          </div>

                          <div className="secondary-text">{agent.id}</div>
                        </td>

                        <td>{agent.phone || "—"}</td>

                        <td>
                          {serviceNames.length === 0 ? (
                            <span className="secondary-text">No services</span>
                          ) : (
                            <div className="badge-list">
                              {serviceNames.map((serviceName) => (
                                <span
                                  key={serviceName}
                                  className="service-badge"
                                >
                                  {serviceName}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        <td>
                          <span className="role-badge agent">{agent.role}</span>
                        </td>

                        <td>
                          {new Date(agent.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
