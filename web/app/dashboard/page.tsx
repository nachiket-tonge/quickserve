"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminShell from "../../components/admin-shell";
import { getCurrentAdmin } from "../../lib/admin";
import { supabase } from "../../lib/supabase";

type Stats = {
  totalRequests: number;
  newRequests: number;
  assignedRequests: number;
  activeRequests: number;
  completedRequests: number;
  totalAgents: number;
  totalCustomers: number;
};

type RecentRequest = {
  id: string;
  request_number: string;
  status: string;
  priority: string | null;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [stats, setStats] = useState<Stats>({
    totalRequests: 0,
    newRequests: 0,
    assignedRequests: 0,
    activeRequests: 0,
    completedRequests: 0,
    totalAgents: 0,
    totalCustomers: 0,
  });

  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [adminName, setAdminName] = useState("Administrator");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const admin = await getCurrentAdmin();

      if (!admin) {
        router.replace("/login");
        return;
      }

      setAdminName(admin.profile.full_name || "Administrator");

      const [
        { count: totalRequests },
        { count: newRequests },
        { count: assignedRequests },
        { count: activeRequests },
        { count: completedRequests },
        { count: totalAgents },
        { count: totalCustomers },
        { data: recentData },
      ] = await Promise.all([
        supabase
          .from("service_requests")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("service_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "NEW"),

        supabase
          .from("service_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "ASSIGNED"),

        supabase
          .from("service_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "IN_PROGRESS"),

        supabase
          .from("service_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "COMPLETED"),

        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "agent"),

        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "customer"),

        supabase
          .from("service_requests")
          .select("id, request_number, status, priority, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setStats({
        totalRequests: totalRequests ?? 0,
        newRequests: newRequests ?? 0,
        assignedRequests: assignedRequests ?? 0,
        activeRequests: activeRequests ?? 0,
        completedRequests: completedRequests ?? 0,
        totalAgents: totalAgents ?? 0,
        totalCustomers: totalCustomers ?? 0,
      });

      setRecentRequests(recentData ?? []);
      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <main className="center-page">
        <p>Loading dashboard...</p>
      </main>
    );
  }

  return (
    <AdminShell title="Dashboard" subtitle={`Welcome back, ${adminName}`}>
      <div className="dashboard-page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">OVERVIEW</p>
            <h2>QuickServe Operations</h2>
            <p className="muted">
              Monitor requests, agents and customers from one place.
            </p>
          </div>

          <Link href="/requests" className="primary-button">
            View Requests
          </Link>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Requests</span>
            <strong>{stats.totalRequests}</strong>
            <span className="stat-description">All service requests</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">New Requests</span>
            <strong>{stats.newRequests}</strong>
            <span className="stat-description">Waiting for assignment</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Assigned</span>
            <strong>{stats.assignedRequests}</strong>
            <span className="stat-description">Assigned to agents</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">In Progress</span>
            <strong>{stats.activeRequests}</strong>
            <span className="stat-description">Currently being handled</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Completed</span>
            <strong>{stats.completedRequests}</strong>
            <span className="stat-description">Successfully completed</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Agents</span>
            <strong>{stats.totalAgents}</strong>
            <span className="stat-description">Registered agents</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Customers</span>
            <strong>{stats.totalCustomers}</strong>
            <span className="stat-description">Registered customers</span>
          </div>
        </div>

        <section className="dashboard-section">
          <div className="section-title-row">
            <div>
              <h3>Recent Requests</h3>
              <p>Latest service activity.</p>
            </div>

            <Link href="/requests" className="text-link">
              View all →
            </Link>
          </div>

          {recentRequests.length === 0 ? (
            <div className="empty-state">
              <h3>No requests yet</h3>
              <p>Service requests will appear here.</p>
            </div>
          ) : (
            <div className="dashboard-request-list">
              {recentRequests.map((request) => (
                <div className="dashboard-request-row" key={request.id}>
                  <div>
                    <strong>{request.request_number}</strong>

                    <span>{new Date(request.created_at).toLocaleString()}</span>
                  </div>

                  <div className="dashboard-request-right">
                    <span className="status-badge">{request.status}</span>

                    <span className="priority">
                      {request.priority ?? "No priority"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
