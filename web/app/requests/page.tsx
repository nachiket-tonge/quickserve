
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentAdmin } from "../../lib/admin";
import { supabase } from "../../lib/supabase";
import AdminShell from "../../components/admin-shell";

type Request = {
  id: string;
  request_number: string;
  customer_id: string;
  agent_id: string | null;
  service_id: string;
  status: string;
  description: string | null;
  preferred_datetime: string | null;
  address: string | null;
  priority: string | null;
  created_at: string;
  updated_at?: string;
};

type Agent = {
  id: string;
  full_name: string | null;
  phone: string | null;
  service_ids: string[];
};

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

type StatusHistory = {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_at: string;
};

const STATUS_OPTIONS = [
  "ALL",
  "NEW",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

const PRIORITY_OPTIONS = ["ALL", "Low", "Medium", "High"];

export default function RequestsPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<Request[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [customers, setCustomers] = useState<Record<string, Profile>>({});
  const [services, setServices] = useState<Record<string, Service>>({});

  const [selectedAgents, setSelectedAgents] = useState<Record<string, string>>(
    {},
  );

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );

  const [statusHistory, setStatusHistory] = useState<
    Record<string, StatusHistory[]>
  >({});

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(
    null,
  );

  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(
    null,
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    const admin = await getCurrentAdmin();

    if (!admin) {
      router.replace("/login");
      return;
    }

    const [
      { data: requestData, error: requestError },
      { data: agentData, error: agentError },
      { data: serviceData, error: serviceError },
    ] = await Promise.all([
      supabase
        .from("service_requests")
        .select(
          `
            id,
            request_number,
            customer_id,
            agent_id,
            service_id,
            status,
            description,
            preferred_datetime,
            address,
            priority,
            created_at,
            updated_at
          `,
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("profiles")
        .select("id, full_name, phone")
        .eq("role", "agent")
        .order("full_name", { ascending: true }),

      supabase
        .from("services")
        .select("id, name, description, is_active")
        .order("name", { ascending: true }),
    ]);

    if (requestError) {
      setError(`Failed to load requests: ${requestError.message}`);
      setLoading(false);
      return;
    }

    if (agentError) {
      setError(`Failed to load agents: ${agentError.message}`);
      setLoading(false);
      return;
    }

    if (serviceError) {
      setError(`Failed to load services: ${serviceError.message}`);
      setLoading(false);
      return;
    }

    const loadedRequests = requestData ?? [];
    const loadedAgents = agentData ?? [];
    const loadedServices = serviceData ?? [];

    /*
     * ---------------------------------------------------------
     * Load agent-service mappings.
     *
     * This preserves the existing service-qualified assignment
     * behavior. An agent only appears for a request when the
     * agent_services mapping contains that request's service.
     * ---------------------------------------------------------
     */
    const { data: mappingData, error: mappingError } = await supabase
      .from("agent_services")
      .select("agent_id, service_id");

    if (mappingError) {
      setError(
        `Failed to load agent service mappings: ${mappingError.message}`,
      );
      setLoading(false);
      return;
    }

    const serviceIdsByAgent: Record<string, string[]> = {};

    for (const mapping of mappingData ?? []) {
      if (!serviceIdsByAgent[mapping.agent_id]) {
        serviceIdsByAgent[mapping.agent_id] = [];
      }

      serviceIdsByAgent[mapping.agent_id].push(mapping.service_id);
    }

    const preparedAgents: Agent[] = loadedAgents.map((agent) => ({
      ...agent,
      service_ids: serviceIdsByAgent[agent.id] ?? [],
    }));

    /*
     * ---------------------------------------------------------
     * Load customer profiles needed by the requests.
     * ---------------------------------------------------------
     */
    const customerIds = [
      ...new Set(loadedRequests.map((request) => request.customer_id)),
    ];

    let customerMap: Record<string, Profile> = {};

    if (customerIds.length > 0) {
      const { data: customerData, error: customerError } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", customerIds);

      if (customerError) {
        setError(`Failed to load customers: ${customerError.message}`);
        setLoading(false);
        return;
      }

      customerMap = Object.fromEntries(
        (customerData ?? []).map((customer) => [customer.id, customer]),
      );
    }

    setRequests(loadedRequests);
    setAgents(preparedAgents);
    setCustomers(customerMap);

    setServices(
      Object.fromEntries(
        loadedServices.map((service) => [service.id, service]),
      ),
    );

    setLoading(false);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPage();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadPage]);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return requests.filter((request) => {
      const customer = customers[request.customer_id];
      const service = services[request.service_id];
      const agent = agents.find((item) => item.id === request.agent_id);

      const matchesSearch =
        !normalizedSearch ||
        request.request_number.toLowerCase().includes(normalizedSearch) ||
        (customer?.full_name ?? "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (customer?.phone ?? "").toLowerCase().includes(normalizedSearch) ||
        (request.address ?? "").toLowerCase().includes(normalizedSearch) ||
        (service?.name ?? "").toLowerCase().includes(normalizedSearch) ||
        (agent?.full_name ?? "").toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" || request.status === statusFilter;

      const matchesPriority =
        priorityFilter === "ALL" ||
        (request.priority ?? "").toLowerCase() ===
          priorityFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [
    requests,
    customers,
    services,
    agents,
    search,
    statusFilter,
    priorityFilter,
  ]);

  function handleAgentChange(requestId: string, agentId: string) {
    setSelectedAgents((current) => ({
      ...current,
      [requestId]: agentId,
    }));

    setSuccess("");
    setError("");
  }

  async function assignRequest(request: Request) {
    const agentId = selectedAgents[request.id];

    if (!agentId) {
      setError("Please select an agent first.");
      return;
    }

    if (request.status !== "NEW") {
      setError("Only NEW requests can be assigned from this screen.");
      return;
    }

    const selectedAgent = agents.find((agent) => agent.id === agentId);

    if (!selectedAgent) {
      setError("Selected agent could not be found.");
      return;
    }

    if (!selectedAgent.service_ids.includes(request.service_id)) {
      setError(
        "This agent is not qualified for the service attached to this request.",
      );
      return;
    }

    setUpdatingRequestId(request.id);
    setError("");
    setSuccess("");

    const { data, error: updateError } = await supabase
      .from("service_requests")
      .update({
        agent_id: agentId,
        status: "ASSIGNED",
      })
      .eq("id", request.id)
      .eq("status", "NEW")
      .select(
        `
          id,
          request_number,
          agent_id,
          status
        `,
      )
      .maybeSingle();

    if (updateError) {
      setError(`Assignment failed: ${updateError.message}`);
      setUpdatingRequestId(null);
      return;
    }

    if (!data) {
      setError(
        "This request is no longer NEW. It may already have been assigned.",
      );
      setUpdatingRequestId(null);

      await loadPage();
      return;
    }

    setSuccess(
      `${request.request_number} assigned to ${
        selectedAgent.full_name ?? "selected agent"
      }.`,
    );

    setSelectedAgents((current) => {
      const updated = { ...current };
      delete updated[request.id];
      return updated;
    });

    setUpdatingRequestId(null);

    await loadPage();
  }

  async function updateRequestStatus(
    request: Request,
    newStatus: string,
  ) {
    if (request.status === newStatus) {
      return;
    }

    setUpdatingRequestId(request.id);
    setError("");
    setSuccess("");

    const { data, error: updateError } = await supabase
      .from("service_requests")
      .update({
        status: newStatus,
      })
      .eq("id", request.id)
      .eq("status", request.status)
      .select(
        `
          id,
          request_number,
          status
        `,
      )
      .maybeSingle();

    if (updateError) {
      setError(`Status update failed: ${updateError.message}`);
      setUpdatingRequestId(null);
      return;
    }

    if (!data) {
      setError(
        "The request changed before this update completed. Refreshing data.",
      );
      setUpdatingRequestId(null);
      await loadPage();
      return;
    }

    setSuccess(
      `${request.request_number} changed from ${request.status} to ${newStatus}.`,
    );

    setUpdatingRequestId(null);

    await loadPage();

    if (selectedRequestId === request.id) {
      await loadStatusHistory(request.id);
    }
  }

  async function loadStatusHistory(requestId: string) {
    setHistoryLoadingId(requestId);
    setError("");

    const { data, error: historyError } = await supabase
      .from("request_status_history")
      .select(
        `
          id,
          old_status,
          new_status,
          changed_by,
          changed_at
        `,
      )
      .eq("request_id", requestId)
      .order("changed_at", { ascending: false });

    if (historyError) {
      setError(`Failed to load status history: ${historyError.message}`);
      setHistoryLoadingId(null);
      return;
    }

    setStatusHistory((current) => ({
      ...current,
      [requestId]: data ?? [],
    }));

    setHistoryLoadingId(null);
  }

  async function toggleDetails(requestId: string) {
    setError("");
    setSuccess("");

    if (selectedRequestId === requestId) {
      setSelectedRequestId(null);
      return;
    }

    setSelectedRequestId(requestId);

    if (!statusHistory[requestId]) {
      await loadStatusHistory(requestId);
    }
  }

  function getAvailableAgents(request: Request) {
    return agents.filter((agent) =>
      agent.service_ids.includes(request.service_id),
    );
  }

  function getStatusActions(request: Request) {
    switch (request.status) {
      case "NEW":
        return ["CANCELLED"];

      case "ASSIGNED":
        return ["IN_PROGRESS", "CANCELLED"];

      case "IN_PROGRESS":
        return ["COMPLETED", "CANCELLED"];

      default:
        return [];
    }
  }

  function getCustomerName(request: Request) {
    return customers[request.customer_id]?.full_name ?? "Unknown customer";
  }

  function getServiceName(request: Request) {
    return services[request.service_id]?.name ?? "Unknown service";
  }

  function getAgentName(request: Request) {
    if (!request.agent_id) {
      return "Unassigned";
    }

    return (
      agents.find((agent) => agent.id === request.agent_id)?.full_name ??
      "Unknown agent"
    );
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="center-page">
        <p>Loading requests...</p>
      </main>
    );
  }

  return (
    <AdminShell
      title="Service Requests"
      subtitle="Manage assignments and service request operations"
      showBack
    >
      <section className="content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">REQUEST MANAGEMENT</p>

            <h2>Service Requests</h2>

            <p className="muted">
              Search, filter, assign and manage QuickServe service requests.
            </p>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={loadPage}
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

        <div className="request-filters">
          <div className="search-filter">
            <label htmlFor="request-search">Search requests</label>

            <div className="search-input-wrapper">
              <span className="search-icon">⌕</span>

              <input
                id="request-search"
                type="text"
                placeholder="Request number, customer, phone, service..."
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

          <div className="filter-controls">
            <div className="form-group">
              <label htmlFor="status-filter">Status</label>

              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL" ? "All statuses" : status}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="priority-filter">Priority</label>

              <select
                id="priority-filter"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
              >
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority === "ALL" ? "All priorities" : priority}
                  </option>
                ))}
              </select>
            </div>

            {(search || statusFilter !== "ALL" || priorityFilter !== "ALL") && (
              <button
                type="button"
                className="clear-filters-button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setPriorityFilter("ALL");
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="filter-summary">
            <strong>{filteredRequests.length}</strong>
            <span>
              {filteredRequests.length === 1 ? "request" : "requests"} found
            </span>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        {success && <div className="success-box">{success}</div>}

        {filteredRequests.length === 0 ? (
          <div className="empty-state">
            <h3>No matching requests</h3>

            <p>Try changing the search text or clearing one of the filters.</p>
          </div>
        ) : (
          <div className="request-list">
            {filteredRequests.map((request) => {
              const qualifiedAgents = getAvailableAgents(request);
              const actions = getStatusActions(request);
              const isUpdating = updatingRequestId === request.id;
              const isDetailsOpen = selectedRequestId === request.id;

              return (
                <article key={request.id} className="request-card">
                  <div className="request-header">
                    <div>
                      <span className="request-number">
                        {request.request_number}
                      </span>

                      <span className="status-badge">{request.status}</span>
                    </div>

                    <span className="priority">
                      {request.priority ?? "No priority"}
                    </span>
                  </div>

                  <div className="request-details">
                    <div>
                      <strong>Customer</strong>

                      <p>{getCustomerName(request)}</p>
                    </div>

                    <div>
                      <strong>Service</strong>

                      <p>{getServiceName(request)}</p>
                    </div>

                    <div>
                      <strong>Assigned Agent</strong>

                      <p>{getAgentName(request)}</p>
                    </div>

                    <div>
                      <strong>Preferred Time</strong>

                      <p>
                        {request.preferred_datetime
                          ? new Date(
                              request.preferred_datetime,
                            ).toLocaleString()
                          : "Not specified"}
                      </p>
                    </div>
                  </div>

                  <div className="request-details">
                    <div>
                      <strong>Description</strong>

                      <p>{request.description ?? "No description provided"}</p>
                    </div>

                    <div>
                      <strong>Address</strong>

                      <p>{request.address ?? "No address provided"}</p>
                    </div>
                  </div>

                  <div className="assignment-row">
                    {request.status === "NEW" && (
                      <>
                        <div className="form-group assignment-select">
                          <label htmlFor={`agent-${request.id}`}>
                            Assign Agent
                          </label>

                          <select
                            id={`agent-${request.id}`}
                            value={selectedAgents[request.id] ?? ""}
                            onChange={(event) =>
                              handleAgentChange(request.id, event.target.value)
                            }
                          >
                            <option value="">Select an agent</option>

                            {qualifiedAgents.map((agent) => (
                              <option key={agent.id} value={agent.id}>
                                {agent.full_name ?? "Unnamed Agent"}
                                {agent.phone ? ` — ${agent.phone}` : ""}
                              </option>
                            ))}
                          </select>

                          {qualifiedAgents.length === 0 && (
                            <p className="muted">
                              No agent is currently qualified for this service.
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          className="primary-button assign-button"
                          disabled={!selectedAgents[request.id] || isUpdating}
                          onClick={() => assignRequest(request)}
                        >
                          {isUpdating ? "Assigning..." : "Assign Request"}
                        </button>
                      </>
                    )}

                    {request.status !== "NEW" && (
                      <div>
                        <strong>Current Agent</strong>

                        <p>{getAgentName(request)}</p>
                      </div>
                    )}

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void toggleDetails(request.id)}
                    >
                      {isDetailsOpen ? "Hide Details" : "View Details"}
                    </button>
                  </div>

                  {actions.length > 0 && (
                    <div className="assignment-row">
                      <div>
                        <strong>Admin Actions</strong>

                        <p className="muted">
                          The database will validate the requested transition.
                        </p>
                      </div>

                      <div className="topbar-actions">
                        {actions.map((action) => (
                          <button
                            key={action}
                            type="button"
                            className={
                              action === "CANCELLED"
                                ? "secondary-button"
                                : "primary-button"
                            }
                            disabled={isUpdating}
                            onClick={() =>
                              void updateRequestStatus(request, action)
                            }
                          >
                            {isUpdating
                              ? "Updating..."
                              : action === "IN_PROGRESS"
                                ? "Start Work"
                                : action === "COMPLETED"
                                  ? "Complete Request"
                                  : "Cancel Request"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isDetailsOpen && (
                    <div className="request-details">
                      <div>
                        <strong>Request ID</strong>

                        <p>{request.id}</p>
                      </div>

                      <div>
                        <strong>Customer Phone</strong>

                        <p>
                          {customers[request.customer_id]?.phone ??
                            "Not provided"}
                        </p>
                      </div>

                      <div>
                        <strong>Created</strong>

                        <p>{new Date(request.created_at).toLocaleString()}</p>
                      </div>

                      <div>
                        <strong>Last Updated</strong>

                        <p>
                          {request.updated_at
                            ? new Date(request.updated_at).toLocaleString()
                            : "Not available"}
                        </p>
                      </div>

                      <div>
                        <strong>Service Description</strong>

                        <p>
                          {services[request.service_id]?.description ??
                            "No service description"}
                        </p>
                      </div>

                      <div>
                        <strong>Status History</strong>

                        {historyLoadingId === request.id ? (
                          <p>Loading history...</p>
                        ) : statusHistory[request.id]?.length ? (
                          <div>
                            {statusHistory[request.id].map((history) => (
                              <p key={history.id}>
                                {history.old_status ?? "INITIAL"} →{" "}
                                {history.new_status} —{" "}
                                {new Date(history.changed_at).toLocaleString()}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p>No status history recorded yet.</p>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
