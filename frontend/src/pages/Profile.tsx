import { useAuth } from "../context/AuthContext";

const Profile = () => {
  const { user } = useAuth();

  return (
    <div>
      <h1>Profile</h1>
      <div
        style={{
          background: "var(--card-bg)",
          padding: "2rem",
          borderRadius: "0.5rem",
          maxWidth: "600px",
          border: "1px solid var(--border-color)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "#000000",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
            }}
          >
            {user?.email.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2>{user?.email || "User Email"}</h2>
            <p style={{ color: "var(--text-secondary)" }}>
              Role: {user?.role || "BOSS"}
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gap: "1rem" }}>
          <div>
            <label
              style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}
            >
              Email
            </label>
            <p>{user?.email || "N/A"}</p>
          </div>
          <div>
            <label
              style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}
            >
              User ID
            </label>
            <p>{user?.id || "N/A"}</p>
          </div>
          {user?.companyId && (
            <div>
              <label
                style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}
              >
                Company ID
              </label>
              <p>{user.companyId}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
