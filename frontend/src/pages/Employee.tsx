import { useEffect, useState } from "react";
import api from "../api/axios";

interface Employee {
  id: string;
  email: string;
  mobile?: string;
  role: string;
  skills?: string[];
  achievements?: string;
  attendance?: number;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

const Employee = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/employees");
      // Assuming response structure is { data: [...] } or just [...]
      // Adjust based on your backend response format
      setEmployees(response.data.data || response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Employees</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          }}
        >
          {employees.map((emp) => (
            <div
              key={emp.id}
              style={{
                background: "var(--card-bg)",
                padding: "1rem",
                borderRadius: "0.5rem",
                border: "1px solid var(--border-color)",
              }}
            >
              <h3>{emp.email.split("@")[0]}</h3>
              <p style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                {emp.role}
              </p>
              {emp.mobile && (
                <p style={{ color: "var(--text-secondary)" }}>{emp.mobile}</p>
              )}
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                  opacity: 0.8,
                }}
              >
                {emp.email}
              </p>
              {emp.skills && emp.skills.length > 0 && (
                <div
                  style={{
                    marginTop: "0.5rem",
                    display: "flex",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  {emp.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: "0.75rem",
                        background: "var(--border-color)",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "0.25rem",
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Employee;
