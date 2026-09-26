import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000/api";

const emptyLead = {
  name: "",
  email: "",
  phone: "",
  company: "",
  status: "New",
  source: "Website",
  followUpDate: "",
  followUpStatus: "Pending",
  notes: "",
};
function isOverdue(lead) {
  if (!lead.followUpDate) return false;

  if (lead.followUpStatus !== "Pending") return false;

  const today = new Date();
  const followUpDate = new Date(lead.followUpDate);

  today.setHours(0, 0, 0, 0);
  followUpDate.setHours(0, 0, 0, 0);

  return followUpDate < today;
}

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [token, setToken] = useState(
    localStorage.getItem("token") || ""
  );
  const [salesUsers, setSalesUsers] = useState([]);

  const [user, setUser] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Search, filter, sorting and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [followUpFilter, setFollowUpFilter] = useState("All");
  const [sortOption, setSortOption] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const leadsPerPage = 5;

  // Edit and view modal
  const [editingLead, setEditingLead] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);



  // Login data
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // Register data
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    role: "sales",
  });

  // Add lead data
  const [leadData, setLeadData] = useState(emptyLead);

  const getErrorMessage = (data, fallback) =>
    data?.message || data?.error || fallback;

  // Fetch logged-in user
  const fetchUser = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "User fetch failed")
        );
      }

      setUser(data.user || data.data?.user || data);
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Fetch all leads
  const fetchLeads = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/leads`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to fetch leads")
        );
      }

      setLeads(
        data.leads ||
          data.data?.leads ||
          (Array.isArray(data) ? data : [])
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };
  async function fetchSalesUsers() {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(
      "http://localhost:5000/api/auth/sales-users",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch sales users");
    }

    setSalesUsers(data.users || []);
  } catch (error) {
    console.error("Fetch Sales Users Error:", error);
  }
}

  const getFollowUpStatus = (date) => {
  if (!date) return "No Follow-up";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const followUpDate = new Date(date);
  followUpDate.setHours(0, 0, 0, 0);

  if (followUpDate < today) return "Overdue";
  if (followUpDate.getTime() === today.getTime()) return "Today";

  return "Upcoming";
};

  // Login
  const handleLogin = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Login failed")
        );
      }

      const receivedToken =
        data.token ||
        data.accessToken ||
        data.data?.token;

      if (!receivedToken) {
        throw new Error("Token not received from server");
      }

      localStorage.setItem("token", receivedToken);

      setToken(receivedToken);
      setMessage("Login successful!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Register
  const handleRegister = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...registerData,
            role: "sales",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Registration failed")
        );
      }

      setMessage(
        "Registration successful! Please login."
      );

      setIsLogin(true);

      setLoginData({
        email: registerData.email,
        password: "",
      });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Add new lead
  const handleAddLead = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(leadData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to add lead")
        );
      }

      setLeadData(emptyLead);
      setCurrentPage(1);

      setMessage("Lead added successfully!");

      await fetchLeads();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Update lead status
  const updateLeadStatus = async (leadId, status) => {
    try {
      const response = await fetch(
        `${API_URL}/leads/${leadId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Status update failed")
        );
      }

      setMessage("Lead status updated!");

      await fetchLeads();
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Open edit form
  const editLead = (lead) => {
  // console.log("EDIT CLICKED:", lead);
  setEditingLead({ ...lead });
  setMessage("Edit mode opened");
};
  //AssignLead function
  async function assignLead(leadId, userId) {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(
      `http://localhost:5000/api/leads/${leadId}/assign`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignedTo: userId,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to assign lead");
    }

    // Update lead in frontend
    setLeads((prevLeads) =>
      prevLeads.map((lead) =>
        lead._id === leadId
          ? {
              ...lead,
              assignedTo: data.lead.assignedTo,
            }
          : lead
      )
    );

    alert("Lead assigned successfully!");
  } catch (error) {
    console.error("Assign Lead Error:", error);
    alert(error.message);
  }
}

  // Update complete lead
  const updateLead = async (updatedLead) => {
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/leads/${updatedLead._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
  name: updatedLead.name,
  email: updatedLead.email,
  phone: updatedLead.phone,
  company: updatedLead.company,
  status: updatedLead.status,
  source: updatedLead.source,
  followUpDate: updatedLead.followUpDate,
  followUpStatus: updatedLead.followUpStatus,
  notes: updatedLead.notes,
}),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to update lead")
        );
      }

      setEditingLead(null);
      setMessage("Lead updated successfully!");

      await fetchLeads();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };


  // Delete lead
  const deleteLead = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this lead?"
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/leads/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to delete lead")
        );
      }

      setMessage("Lead deleted successfully!");

      await fetchLeads();
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Export leads as CSV
  const exportLeadsToCSV = () => {
    if (!leads.length) {
      setMessage("No leads available to export");
      return;
    }

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Company",
      "Status",
      "Source",
    ];

    const rows = leads.map((lead) => [
      lead.name,
      lead.email,
      lead.phone,
      lead.company,
      lead.status,
      lead.source,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value ?? "").replace(
                /"/g,
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "crm-leads.csv";

    document.body.appendChild(link);

    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    setMessage("Leads exported successfully!");
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");

    setToken("");
    setUser(null);
    setLeads([]);
    setEditingLead(null);
    setSelectedLead(null);
    setMessage("");
  };

  // Fetch data after login
  useEffect(() => {
    if (token) {
      fetchUser();
      fetchLeads();
      
    }
  }, [token]);
  useEffect(() => {
  if (token && user?.role === "admin") {
    fetchSalesUsers();
  }
}, [token, user]);
  // Search, status filter and source filter
  const filteredLeads = leads.filter((lead) => {
    const searchText = `
      ${lead.name || ""}
      ${lead.email || ""}
      ${lead.company || ""}
    `.toLowerCase();

    const matchesSearch = searchText.includes(
      searchTerm.toLowerCase()
    );

    const matchesStatus =
      statusFilter === "All" ||
      lead.status === statusFilter;

    const matchesSource =
      sourceFilter === "All" ||
      lead.source === sourceFilter;
      const matchFollowUp =
  followUpFilter === "All" ||
  lead.followUpStatus === followUpFilter;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesSource &&
      matchFollowUp
    );
  });

  // Sorting
  const sortedLeads = [...filteredLeads].sort(
    (a, b) => {
      if (sortOption === "nameAsc") {
        return (a.name || "").localeCompare(
          b.name || ""
        );
      }

      if (sortOption === "nameDesc") {
        return (b.name || "").localeCompare(
          a.name || ""
        );
      }

      if (sortOption === "oldest") {
        return (
          new Date(a.createdAt || 0) -
          new Date(b.createdAt || 0)
        );
      }

      // Default: Newest first
      return (
        new Date(b.createdAt || 0) -
        new Date(a.createdAt || 0)
      );
    }
  );

  // Pagination
  const totalPages = Math.ceil(
    sortedLeads.length / leadsPerPage
  );

  const startIndex =
    (currentPage - 1) * leadsPerPage;

  const currentLeads = sortedLeads.slice(
    startIndex,
    startIndex + leadsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    statusFilter,
    sourceFilter,
    followUpFilter,
    sortOption,
  ]);

  // Prevent invalid page number
  useEffect(() => {
    if (
      totalPages > 0 &&
      currentPage > totalPages
    ) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Dashboard statistics
  const totalLeads = leads.length;

  const newLeads = leads.filter(
    (lead) => lead.status === "New"
  ).length;

  const contactedLeads = leads.filter(
    (lead) => lead.status === "Contacted"
  ).length;

  const qualifiedLeads = leads.filter(
    (lead) => lead.status === "Qualified"
  ).length;

  const wonLeads = leads.filter(
    (lead) => lead.status === "Won"
  ).length;

  const lostLeads = leads.filter(
    (lead) => lead.status === "Lost"
  ).length;

  const pendingFollowUps = leads.filter(
  (lead) => lead.followUpStatus === "Pending"
).length;

const overdueFollowUps = leads.filter(
  (lead) => isOverdue(lead)
).length;

const dueTodayFollowUps = leads.filter((lead) => {
  if (!lead.followUpDate) return false;
  if (lead.followUpStatus !== "Pending") return false;

  const today = new Date();
  const followUpDate = new Date(lead.followUpDate);

  today.setHours(0, 0, 0, 0);
  followUpDate.setHours(0, 0, 0, 0);

  return followUpDate.getTime() === today.getTime();
}).length;



  // Login/Register screen
  if (!token) {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authCard}>
          <h1 style={styles.logo}>
            CRM System
          </h1>

          <p style={styles.subtitle}>
            Manage your customers and leads
          </p>

          <div style={styles.tabContainer}>
            <button
              style={
                isLogin
                  ? styles.activeTab
                  : styles.tab
              }
              onClick={() => {
                setIsLogin(true);
                setMessage("");
              }}
            >
              Login
            </button>

            <button
              style={
                !isLogin
                  ? styles.activeTab
                  : styles.tab
              }
              onClick={() => {
                setIsLogin(false);
                setMessage("");
              }}
            >
              Register
            </button>
          </div>

          {message && (
            <p style={styles.message}>
              {message}
            </p>
          )}

          {isLogin ? (
            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="Email"
                value={loginData.email}
                onChange={(e) =>
                  setLoginData({
                    ...loginData,
                    email: e.target.value,
                  })
                }
                required
                style={styles.input}
              />

              <input
                type="password"
                placeholder="Password"
                value={loginData.password}
                onChange={(e) =>
                  setLoginData({
                    ...loginData,
                    password: e.target.value,
                  })
                }
                required
                style={styles.input}
              />

              <button
                type="submit"
                style={styles.primaryButton}
                disabled={loading}
              >
                {loading
                  ? "Logging in..."
                  : "Login"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <input
                type="text"
                placeholder="Name"
                value={registerData.name}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    name: e.target.value,
                  })
                }
                required
                style={styles.input}
              />

              <input
                type="email"
                placeholder="Email"
                value={registerData.email}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    email: e.target.value,
                  })
                }
                required
                style={styles.input}
              />

              <input
                type="password"
                placeholder="Password"
                value={registerData.password}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    password: e.target.value,
                  })
                }
                required
                style={styles.input}
              />

              <input
                type="hidden"
                value="sales"
                readOnly
              />

              <button
                type="submit"
                style={styles.primaryButton}
                disabled={loading}
              >
                {loading
                  ? "Registering..."
                  : "Register"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Dashboard screen
  return (
    <div style={styles.dashboard}>
      <header style={styles.header}>
        <h2>CRM Dashboard</h2>

        <div style={styles.headerRight}>
          <div>
            <span>
              {user?.name || "User"}
            </span>

            <div style={styles.userRole}>
              Role: {user?.role || "Unknown"}
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={styles.logoutButton}
          >
            Logout
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <h2>Welcome to CRM 👋</h2>

        {/* Statistics Cards */}
        <div style={styles.statsGrid}>
          {[
  ["Total Leads", totalLeads],
  ["New Leads", newLeads],
  ["Won Leads", wonLeads],
  ["Lost Leads", lostLeads],
  ["Pending Follow-ups", pendingFollowUps],
  ["Overdue Follow-ups", overdueFollowUps],
  ["Due Today" , dueTodayFollowUps],
]
          .map(([label, count]) => (
            <div
              style={styles.statCard}
              key={label}
            >
              <h3>{label}</h3>

              <p style={styles.statNumber}>
                {count}
              </p>
            </div>
          ))}
        </div>

        {/* Status Chart */}
        <section style={styles.card}>
          <h3>
            Lead Status Overview 📊
          </h3>

          {[
            ["New", newLeads],
            ["Contacted", contactedLeads],
            ["Qualified", qualifiedLeads],
            ["Won", wonLeads],
            ["Lost", lostLeads],
          ].map(([name, count]) => {
            const percentage =
              totalLeads === 0
                ? 0
                : Math.round(
                    (count / totalLeads) * 100
                  );

            return (
              <div
                key={name}
                style={styles.chartRow}
              >
                <div style={styles.chartLabel}>
                  <span>{name}</span>

                  <span>
                    {count} ({percentage}%)
                  </span>
                </div>

                <div
                  style={styles.chartBackground}
                >
                  <div
                    style={{
                      ...styles.chartBar,
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </section>

        {message && (
          <p style={styles.message}>
            {message}
          </p>
        )}

        {/* Add Lead Form */}
        <section style={styles.card}>
          <h3>Add New Lead</h3>

          <form onSubmit={handleAddLead}>
            <div style={styles.formGrid}>
              {[
                ["name", "Lead Name", "text"],
                ["email", "Email", "email"],
                ["phone", "Phone", "text"],
                ["company", "Company", "text"],
              ].map(
                ([field, placeholder, type]) => (
                  <input
                    key={field}
                    type={type}
                    placeholder={placeholder}
                    value={leadData[field]}
                    onChange={(e) =>
                      setLeadData({
                        ...leadData,
                        [field]: e.target.value,
                      })
                    }
                    required
                    style={styles.input}
                  />
                )
              )}

              <select
                value={leadData.status}
                onChange={(e) =>
                  setLeadData({
                    ...leadData,
                    status: e.target.value,
                  })
                }
                style={styles.input}
              >
                {[
                  "New",
                  "Contacted",
                  "Qualified",
                  "Won",
                  "Lost",
                ].map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                ))}
              </select>

              <select
                value={leadData.source}
                onChange={(e) =>
                  setLeadData({
                    ...leadData,
                    source: e.target.value,
                  })
                }
                style={styles.input}
              >
                {[
                  "Website",
                  "Referral",
                  "Social Media",
                  "Other",
                ].map((source) => (
                  <option
                    key={source}
                    value={source}
                  >
                    {source}
                  </option>
                ))}
              </select>
              {/* Follow-up Date */}
<input
  type="date"
  value={leadData.followUpDate}
  onChange={(e) =>
    setLeadData({
      ...leadData,
      followUpDate: e.target.value,
    })
  }
  style={styles.input}
/>

{/* Follow-up Status */}
<select
  value={leadData.followUpStatus}
  onChange={(e) =>
    setLeadData({
      ...leadData,
      followUpStatus: e.target.value,
    })
  }
  style={styles.input}
>
  <option value="Pending">Pending</option>
  <option value="Completed">Completed</option>
  <option value="Cancelled">Cancelled</option>
</select>

{/* Notes */}
<textarea
  placeholder="Add lead notes..."
  value={leadData.notes}
  onChange={(e) =>
    setLeadData({
      ...leadData,
      notes: e.target.value,
    })
  }
  style={styles.textarea}
/>

            </div>

            <button
              type="submit"
              style={styles.primaryButton}
              disabled={loading}
            >
              {loading
                ? "Adding..."
                : "Add Lead"}
            </button>
          </form>
        </section>
        {/* Edit Lead Form */}
        {editingLead && (
          <section style={styles.card}>
            <h3>Edit Lead ✏️</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateLead(editingLead);
              }}
            >
              <div style={styles.formGrid}>
                {[
                  ["name", "Lead Name", "text"],
                  ["email", "Email", "email"],
                  ["phone", "Phone", "text"],
                  ["company", "Company", "text"],
                ].map(
                  ([field, placeholder, type]) => (
                    <input
                      key={field}
                      type={type}
                      placeholder={placeholder}
                      value={editingLead[field] || ""}
                      onChange={(e) =>
                        setEditingLead({
                          ...editingLead,
                          [field]: e.target.value,
                        })
                      }
                      required
                      style={styles.input}
                    />
                  )
                )}

                <select
                  value={editingLead.status || "New"}
                  onChange={(e) =>
                    setEditingLead({
                      ...editingLead,
                      status: e.target.value,
                    })
                  }
                  style={styles.input}
                >
                  {[
                    "New",
                    "Contacted",
                    "Qualified",
                    "Won",
                    "Lost",
                  ].map((status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  ))}
                </select>

                <select
                  value={editingLead.source || "Website"}
                  onChange={(e) =>
                    setEditingLead({
                      ...editingLead,
                      source: e.target.value,
                    })
                  }
                  style={styles.input}
                >
                  {[
                    "Website",
                    "Referral",
                    "Social Media",
                    "Other",
                  ].map((source) => (
                    <option
                      key={source}
                      value={source}
                    >
                      {source}
                    </option>
                  ))}
                </select>
                {/* Follow-up Date */}
<input
  type="date"
  value={editingLead.followUpDate || ""}
  onChange={(e) =>
    setEditingLead({
      ...editingLead,
      followUpDate: e.target.value,
    })
  }
  style={styles.input}
/>

{/* Follow-up Status */}
<select
  value={editingLead.followUpStatus || "Pending"}
  onChange={(e) =>
    setEditingLead({
      ...editingLead,
      followUpStatus: e.target.value,
    })
  }
  style={styles.input}
>
  <option value="Pending">Pending</option>
  <option value="Completed">Completed</option>
  <option value="Cancelled">Cancelled</option>
</select>

{/* Notes */}
<textarea
  placeholder="Add lead notes..."
  value={editingLead.notes || ""}
  onChange={(e) =>
    setEditingLead({
      ...editingLead,
      notes: e.target.value,
    })
  }
  style={styles.textarea}
/>

                
              </div>

              <div style={styles.buttonRow}>
                <button
                  type="submit"
                  style={styles.primaryButton}
                  disabled={loading}
                >
                  {loading
                    ? "Saving..."
                    : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* All Leads */}
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <h3>All Leads</h3>

            <div style={styles.buttonRow}>
              <button
                onClick={exportLeadsToCSV}
                style={styles.exportButton}
              >
                Export CSV
              </button>

              <button
                onClick={fetchLeads}
                style={styles.refreshButton}
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div style={styles.filterRow}>
            <input
              type="text"
              placeholder="Search by name, email or company..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              style={styles.searchInput}
            />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              style={styles.filterSelect}
            >
              <option value="All">
                All Statuses
              </option>

              {[
                "New",
                "Contacted",
                "Qualified",
                "Won",
                "Lost",
              ].map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              ))}
            </select>

            <select
              value={sortOption}
              onChange={(e) =>
                setSortOption(e.target.value)
              }
              style={styles.filterSelect}
            >
              <option value="newest">
                Newest First
              </option>

              <option value="oldest">
                Oldest First
              </option>

              <option value="nameAsc">
                Name: A to Z
              </option>

              <option value="nameDesc">
                Name: Z to A
              </option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) =>
                setSourceFilter(e.target.value)
              }
              style={styles.filterSelect}
            >
              <option value="All">
                All Sources
              </option>

              {[
                "Website",
                "Referral",
                "Social Media",
                "Other",
              ].map((source) => (
                <option
                  key={source}
                  value={source}
                >
                  {source}
                </option>
              ))}
            </select>
            {/* follow up status filter */}
                <select
  value={followUpFilter}
  onChange={(e) => setFollowUpFilter(e.target.value)}
  style={styles.filterSelect}
>
  <option value="All">All Follow-ups</option>
  <option value="Pending">Pending</option>
  <option value="Completed">Completed</option>
  <option value="Cancelled">Cancelled</option>
</select>
          </div>

          {loading && leads.length === 0 ? (
            <p>Loading leads...</p>
          ) : leads.length === 0 ? (
            <p>No leads found.</p>
          ) : sortedLeads.length === 0 ? (
            <p>No matching leads found.</p>
          ) : (
            <>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {[
                        "Name",
                        "Email",
                        "Phone",
                        "Company",
                        "Status",
                        "Source",
                        "Follow-up",
                        "Assigned To",
                        "Actions",
                      ].map((heading) => (
                        <th
                          style={styles.th}
                          key={heading}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {currentLeads.map((lead) => (
                      <tr key={lead._id}>
                        <td style={styles.td}>
                          {lead.name}
                        </td>

                        <td style={styles.td}>
                          {lead.email}
                        </td>

                        <td style={styles.td}>
                          {lead.phone}
                        </td>

                        <td style={styles.td}>
                          {lead.company}
                        </td>

                        <td style={styles.td}>
                          <select
                            value={lead.status}
                            onChange={(e) =>
                              updateLeadStatus(
                                lead._id,
                                e.target.value
                              )
                            }
                            style={styles.statusSelect}
                          >

                            {[
                              "New",
                              "Contacted",
                              "Qualified",
                              "Won",
                              "Lost",
                            ].map((status) => (
                              <option
                                key={status}
                                value={status}
                              >
                                {status}
                              </option>
                            ))}
                          </select>
                          {isOverdue(lead) && (
  <span
    style={{
      color: "red",
      fontWeight: "bold",
      fontSize: "12px",
      display: "block",
      marginTop: "5px",
    }}
  >
    ⚠️ Overdue
  </span>
)}
                        </td>

                        <td style={styles.td}>
                          {lead.source}
                        </td>
                        <td style={styles.td}>
  <span
    style={{
      ...styles.followUpBadge,
      ...(getFollowUpStatus(lead.followUpDate) === "Overdue"
        ? styles.overdue
        : getFollowUpStatus(lead.followUpDate) === "Today"
        ? styles.today
        : getFollowUpStatus(lead.followUpDate) === "Upcoming"
        ? styles.upcoming
        : styles.noFollowUp),
    }}
  >
    {getFollowUpStatus(lead.followUpDate)}
  </span>
</td>
{/* Assigned To */}
<td style={styles.td}>
  {user?.role === "admin" ? (
    <select
      value={lead.assignedTo?._id || ""}
      onChange={(e) =>
        assignLead(lead._id, e.target.value)
      }
      style={styles.statusSelect}
    >
      <option value="">Unassigned</option>

      {salesUsers.map((salesUser) => (
        <option
          key={salesUser._id}
          value={salesUser._id}
        >
          {salesUser.name}
        </option>
      ))}
    </select>
  ) : (
    <span>
      {lead.assignedTo?.name || "Unassigned"}
    </span>
  )}
</td>
                        <td style={styles.td}>
                          <button
                            onClick={() =>
                              setSelectedLead(lead)
                            }
                            style={styles.viewButton}
                          >
                            View
                          </button>

                          <button
                            onClick={() =>
                              editLead(lead)
                            }
                            style={styles.editButton}
                          >
                            Edit
                          </button>

                          {user?.role === "admin" && (
                            <button
                              onClick={() =>
                                deleteLead(lead._id)
                              }
                              style={styles.deleteButton}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={styles.pagination}>
                <button
                  onClick={() =>
                    setCurrentPage(
                      (page) => page - 1
                    )
                  }
                  disabled={currentPage === 1}
                  style={{
                    ...styles.paginationButton,
                    ...(currentPage === 1
                      ? styles.disabledButton
                      : {}),
                  }}
                >
                  Previous
                </button>

                <span style={styles.pageText}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage(
                      (page) => page + 1
                    )
                  }
                  disabled={
                    currentPage === totalPages
                  }
                  style={{
                    ...styles.paginationButton,
                    ...(currentPage === totalPages
                      ? styles.disabledButton
                      : {}),
                  }}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>
      </main>

      {/* View Lead Modal */}
      {selectedLead && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2>Lead Details</h2>

              <button
                onClick={() =>
                  setSelectedLead(null)
                }
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>

            <div style={styles.detailsGrid}>
              {[
                ["Name", selectedLead.name],
                ["Email", selectedLead.email],
                ["Phone", selectedLead.phone],
                ["Company", selectedLead.company],
                ["Status", selectedLead.status],
                ["Source", selectedLead.source],
                ["Follow-up Date", selectedLead.followUpDate
  ? new Date(selectedLead.followUpDate).toLocaleDateString()
  : "Not set"],

["Follow-up Status", selectedLead.followUpStatus || "Pending"],

["Notes", selectedLead.notes || "No notes added"],
                [
                  "Created At",
                  selectedLead.createdAt
                    ? new Date(
                        selectedLead.createdAt
                      ).toLocaleString()
                    : "Not available",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={styles.detailItem}
                >
                  <strong>{label}</strong>
                  <p>
                    {value || "Not available"}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() =>
                setSelectedLead(null)
              }
              style={styles.closeModalButton}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
const styles = {
  authContainer: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#eef2f7",
    padding: "20px",
  },

  authCard: {
    width: "100%",
    maxWidth: "420px",
    background: "white",
    padding: "30px",
    borderRadius: "15px",
    boxShadow: "0 5px 25px rgba(0,0,0,0.1)",
  },

  logo: {
    textAlign: "center",
    color: "#2563eb",
  },

  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: "25px",
  },

  tabContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },

  tab: {
    flex: 1,
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    background: "#f5f5f5",
    cursor: "pointer",
  },

  activeTab: {
    flex: 1,
    padding: "12px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
  },

  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  textarea: {
  width: "100%",
  minHeight: "90px",
  padding: "12px",
  border: "1px solid #ddd",
  borderRadius: "8px",
  fontSize: "14px",
  fontFamily: "inherit",
  resize: "vertical",
  boxSizing: "border-box",
},

  primaryButton: {
    width: "100%",
    padding: "13px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "bold",
  },

  message: {
    padding: "10px",
    background: "#f0fdf4",
    color: "#166534",
    borderRadius: "6px",
    marginBottom: "15px",
  },

  dashboard: {
    minHeight: "100vh",
    background: "#f1f5f9",
  },

  header: {
    background: "#1e293b",
    color: "white",
    padding: "18px 30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },

  userRole: {
    fontSize: "12px",
    color: "#cbd5e1",
  },

  logoutButton: {
    padding: "10px 15px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },

  main: {
    maxWidth: "1200px",
    margin: "auto",
    padding: "30px 20px",
  },

  card: {
    background: "white",
    padding: "25px",
    borderRadius: "12px",
    marginBottom: "25px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    overflow: "hidden",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "10px",
  },

  buttonRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  cancelButton: {
    padding: "13px",
    background: "#64748b",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px",
  },

  refreshButton: {
    padding: "10px 15px",
    background: "#0f766e",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },

  exportButton: {
    padding: "10px 15px",
    background: "#7c3aed",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },

  filterRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    margin: "15px 0",
  },

  searchInput: {
    padding: "12px",
    width: "100%",
    maxWidth: "400px",
    border: "1px solid #ddd",
    borderRadius: "8px",
  },

  filterSelect: {
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    background: "white",
  },

  tableWrapper: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "850px",
  },

  th: {
    textAlign: "left",
    padding: "12px",
    background: "#e2e8f0",
  },

  td: {
    padding: "12px",
    borderBottom: "1px solid #e2e8f0",
  },

  statusSelect: {
    padding: "7px",
    border: "1px solid #ddd",
    borderRadius: "6px",
  },

  viewButton: {
    background: "#0f766e",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "5px",
    cursor: "pointer",
    marginRight: "5px",
  },

  editButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "5px",
    cursor: "pointer",
    marginRight: "5px",
  },

  deleteButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "5px",
    cursor: "pointer",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "15px",
    marginBottom: "25px",
  },

  statCard: {
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    borderLeft: "4px solid #2563eb",
  },

  statNumber: {
    fontSize: "30px",
    fontWeight: "bold",
    color: "#2563eb",
  },

  chartRow: {
    marginBottom: "18px",
  },

  chartLabel: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "6px",
  },

  chartBackground: {
    width: "100%",
    height: "12px",
    background: "#e2e8f0",
    borderRadius: "10px",
    overflow: "hidden",
  },

  chartBar: {
    height: "100%",
    background: "#2563eb",
    borderRadius: "10px",
  },

  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "20px",
    marginTop: "20px",
  },

  paginationButton: {
    padding: "10px 18px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },

  disabledButton: {
    background: "#cbd5e1",
    color: "#64748b",
    cursor: "not-allowed",
  },

  pageText: {
    fontWeight: "bold",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.65)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
  },

  modalCard: {
    width: "100%",
    maxWidth: "600px",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "white",
    borderRadius: "15px",
    padding: "25px",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  closeButton: {
    background: "#fee2e2",
    color: "#b91c1c",
    border: "none",
    borderRadius: "50%",
    width: "35px",
    height: "35px",
    cursor: "pointer",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "15px",
  },

  detailItem: {
    padding: "12px",
    background: "#f8fafc",
    borderRadius: "8px",
  },

  closeModalButton: {
    width: "100%",
    marginTop: "20px",
    padding: "12px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  followUpBadge: {
  padding: "5px 10px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: "600",
  display: "inline-block",
},

overdue: {
  backgroundColor: "#fee2e2",
  color: "#b91c1c",
},

today: {
  backgroundColor: "#fef3c7",
  color: "#92400e",
},

upcoming: {
  backgroundColor: "#dcfce7",
  color: "#166534",
},

noFollowUp: {
  backgroundColor: "#f3f4f6",
  color: "#6b7280",
},
};

export default App;