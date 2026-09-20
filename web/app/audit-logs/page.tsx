"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentAdmin } from "../../lib/admin";
import { supabase } from "../../lib/supabase";
import AdminShell from "../../components/admin-shell";

type AuditLog = {
  id: string;
  table_name: string;
  record_id: string | null;
  action: string;
  changed_by: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
};

const ACTION_OPTIONS = ["ALL", "INSERT", "UPDATE", "DELETE"];

export default function AuditLogsPage() {
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");

    const admin = await getCurrentAdmin();

    if (!admin) {
      router.replace("/login");
      return;
    }

    const { data: auditData, error: auditError } = await supabase
      .from("audit_logs")
      .select(
        `
          id,
          table_name,
          record_id,
          action,
          changed_by,
          old_data,
          new_data,
          created_at
        `,
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (auditError) {
      setError(`Failed to load audit logs: ${auditError.message}`);
      setLoading(false);
      return;
    }

    const loadedLogs = auditData ?? [];

    /*
     * ---------------------------------------------------------
     * Load profiles for actors.
     *
     * Audit logs store changed_by as the authenticated user's
     * profile ID. We resolve those IDs into readable names.
     * ---------------------------------------------------------
     */
    const actorIds = [
      ...new Set(
        loadedLogs
          .map((log) => log.changed_by)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    let profileMap: Record<string, Profile> = {};

    if (actorIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, role")
        .in("id", actorIds);

      if (profileError) {
        setError(`Failed to load audit actors: ${profileError.message}`);
        setLoading(false);
        return;
      }

      profileMap = Object.fromEntries(
        (profileData ?? []).map((profile) => [profile.id, profile]),
      );
    }

    setLogs(loadedLogs);
    setProfiles(profileMap);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLogs();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return logs.filter((log) => {
      const actor = log.changed_by ? profiles[log.changed_by] : null;

      const actorName = actor?.full_name ?? "";
      const actorPhone = actor?.phone ?? "";

      const matchesSearch =
        !normalizedSearch ||
        log.table_name.toLowerCase().includes(normalizedSearch) ||
        (log.record_id ?? "").toLowerCase().includes(normalizedSearch) ||
        (log.changed_by ?? "").toLowerCase().includes(normalizedSearch) ||
        actorName.toLowerCase().includes(normalizedSearch) ||
        actorPhone.toLowerCase().includes(normalizedSearch);

      const matchesAction =
        actionFilter === "ALL" || log.action === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [logs, profiles, search, actionFilter]);

  function getActorName(log: AuditLog) {
    if (!log.changed_by) {
      return "System";
    }

    return profiles[log.changed_by]?.full_name ?? "Unknown user";
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString();
  }

  function toggleLog(logId: string) {
    setExpandedLogId((current) => (current === logId ? null : logId));
  }

  function formatJson(data: Record<string, unknown> | null) {
    if (!data) {
      return "No data";
    }

    return JSON.stringify(data, null, 2);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="center-page">
        <p>Loading audit logs...</p>
      </main>
    );
  }

  return (
    <AdminShell
      title="Audit Logs"
      subtitle="Review system activity and database changes"
      showBack
    >
      <section className="content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">SYSTEM ACTIVITY</p>

            <h2>Audit Logs</h2>

            <p className="muted">
              Review database operations performed by QuickServe users.
            </p>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => void loadLogs()}
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
            <label htmlFor="audit-search">Search activity</label>

            <div className="search-input-wrapper">
              <span className="search-icon">⌕</span>

              <input
                id="audit-search"
                type="text"
                placeholder="Table, record ID, actor..."
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
              <label htmlFor="action-filter">Action</label>

              <select
                id="action-filter"
                value={actionFilter}
                onChange={(event) => setActionFilter(event.target.value)}
              >
                {ACTION_OPTIONS.map((action) => (
                  <option key={action} value={action}>
                    {action === "ALL" ? "All actions" : action}
                  </option>
                ))}
              </select>
            </div>

            {(search || actionFilter !== "ALL") && (
              <button
                type="button"
                className="clear-filters-button"
                onClick={() => {
                  setSearch("");
                  setActionFilter("ALL");
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="filter-summary">
            <strong>{filteredLogs.length}</strong>
            <span>
              {filteredLogs.length === 1 ? "activity" : "activities"} found
            </span>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        {filteredLogs.length === 0 ? (
          <div className="empty-state">
            <h3>No audit activity found</h3>

            <p>
              There are no audit entries matching the current search and
              filters.
            </p>
          </div>
        ) : (
          <div className="request-list">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;

              return (
                <article key={log.id} className="request-card">
                  <div className="request-header">
                    <div>
                      <span className="request-number">{log.action}</span>

                      <span className="status-badge">{log.table_name}</span>
                    </div>

                    <span className="priority">
                      {formatDate(log.created_at)}
                    </span>
                  </div>

                  <div className="request-details">
                    <div>
                      <strong>Actor</strong>

                      <p>{getActorName(log)}</p>
                    </div>

                    <div>
                      <strong>Record ID</strong>

                      <p>{log.record_id ?? "Not specified"}</p>
                    </div>

                    <div>
                      <strong>Actor ID</strong>

                      <p>{log.changed_by ?? "System generated"}</p>
                    </div>
                  </div>

                  <div className="assignment-row">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => toggleLog(log.id)}
                    >
                      {isExpanded ? "Hide Details" : "View Changes"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="request-details">
                      <div>
                        <strong>Old Data</strong>

                        <pre className="audit-json">
                          {formatJson(log.old_data)}
                        </pre>
                      </div>

                      <div>
                        <strong>New Data</strong>

                        <pre className="audit-json">
                          {formatJson(log.new_data)}
                        </pre>
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
