import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { twoFAService } from "../services/twofa.service";
import { useAuthStore } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { GalleryVerticalEnd } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "../components/ui/input-otp";

export const TwoFAVerify: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateUser } = useAuthStore();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = location.state?.token;
  const email = location.state?.email || "your email";

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  const handleVerify = async () => {
    if (code.length !== 6 || loading) return;

    setError("");
    setLoading(true);

    try {
      const response = await twoFAService.verify2FALogin(token, code);

      if (!response.user || !response.user.email) {
        throw new Error("Invalid response from server");
      }

      // Save tokens and user data to localStorage
      localStorage.setItem("accessToken", response.accessToken);
      localStorage.setItem("refreshToken", response.refreshToken);
      localStorage.setItem("user", JSON.stringify(response.user));

      // Update auth store directly with the user data from response
      updateUser(response.user);

      // Reload to ensure all components have the latest state
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Invalid verification code",
      );
      setLoading(false);
    }
  };

  // Auto-submit when all 6 digits are filled
  useEffect(() => {
    if (code.length === 6 && !loading) {
      handleVerify();
    }
  }, [code]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            K_01 Inc.
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Verify your login</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Enter the verification code we sent to your email address:{" "}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>

              {error && (
                <div className="bg-destructive/15 border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-center py-2">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={(value) => setCode(value)}
                    id="otp-verification"
                  >
                    <InputOTPGroup className="gap-2">
                      <InputOTPSlot index={0} className="h-12 w-10 text-lg" />
                      <InputOTPSlot index={1} className="h-12 w-10 text-lg" />
                      <InputOTPSlot index={2} className="h-12 w-10 text-lg" />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup className="gap-2">
                      <InputOTPSlot index={3} className="h-12 w-10 text-lg" />
                      <InputOTPSlot index={4} className="h-12 w-10 text-lg" />
                      <InputOTPSlot index={5} className="h-12 w-10 text-lg" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div className="text-sm text-muted-foreground text-center">
                  Open your authenticator app to view the code.
                </div>

                <Button
                  className="w-full"
                  onClick={handleVerify}
                  disabled={code.length !== 6 || loading}
                >
                  {loading ? "Verifying..." : "Verify"}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Having trouble signing in?{" "}
                  <button
                    onClick={() => navigate("/login")}
                    className="hover:text-primary underline underline-offset-4 transition-colors inline-flex items-center gap-1"
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src="https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&q=80&w=1376&ixlib=rb-4.0.3"
          alt="Office"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
};
