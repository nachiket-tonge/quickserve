"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "../../components/admin-shell";
import { getCurrentAdmin } from "../../lib/admin";
import { supabase } from "../../lib/supabase";

type Customer = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
};

export default function CustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");

    const admin = await getCurrentAdmin();

    if (!admin) {
      router.replace("/login");
      return;
    }

    const { data, error: customersError } = await supabase
      .from("profiles")
      .select("id, full_name, phone, role, created_at")
      .eq("role", "customer")
      .order("created_at", { ascending: false });

    if (customersError) {
      setError(`Failed to load customers: ${customersError.message}`);
      setLoading(false);
      return;
    }

    setCustomers(data ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCustomers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCustomers]);

  const filteredCustomers = customers.filter((customer) => {
    const query = search.toLowerCase().trim();

    if (!query) {
      return true;
    }

    return (
      (customer.full_name ?? "").toLowerCase().includes(query) ||
      (customer.phone ?? "").toLowerCase().includes(query) ||
      customer.id.toLowerCase().includes(query)
    );
  });

  return (
    <AdminShell
      title="Customers"
      subtitle="View and manage registered QuickServe customers"
      showBack
    >
      <div className="page-heading">
        <div>
          <p className="eyebrow">CUSTOMER MANAGEMENT</p>

          <h2>Customers</h2>

          <p className="muted">
            {customers.length} registered customer
            {customers.length === 1 ? "" : "s"}.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => void loadCustomers()}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="management-toolbar">
        <div className="search-box">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Search by name, phone or ID..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="result-count">
          {filteredCustomers.length} result
          {filteredCustomers.length === 1 ? "" : "s"}
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Loading customers...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="empty-state">
          <h3>No customers found</h3>

          <p>
            {search
              ? "Try changing your search."
              : "There are currently no registered customers."}
          </p>
        </div>
      ) : (
        <div className="management-card">
          <div className="table-wrapper">
            <table className="management-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="person-cell">
                        <div className="person-avatar">
                          {(customer.full_name ?? "C").charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {customer.full_name || "Unnamed Customer"}
                          </strong>

                          <span className="person-id">{customer.id}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      {customer.phone || (
                        <span className="table-muted">Not provided</span>
                      )}
                    </td>

                    <td>
                      <span className="role-badge customer-role">Customer</span>
                    </td>

                    <td>
                      {new Date(customer.created_at).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
