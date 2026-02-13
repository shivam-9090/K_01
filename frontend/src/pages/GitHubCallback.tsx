import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function GitHubCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get("github_code");
    const error = searchParams.get("error");

    // Immediately redirect to profile with the params
    if (code) {
      navigate(`/profile?github_code=${code}`, { replace: true });
    } else if (error) {
      navigate(`/profile?error=${error}`, { replace: true });
    } else {
      navigate("/profile", { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-gray-600">Connecting your GitHub account...</p>
      </div>
    </div>
  );
}
