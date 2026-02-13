import React, { useState } from "react";
import { twoFAService } from "../services/twofa.service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Copy, Loader2 } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "./ui/input-otp";

interface TwoFASetupProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const TwoFASetup: React.FC<TwoFASetupProps> = ({
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<"password" | "qr" | "verify">("password");
  const [password, setPassword] = useState("");
  const [qrData, setQrData] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await twoFAService.generateSecret();
      setQrData(data);
      setStep("qr");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to generate QR code");
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await twoFAService.enable2FA(
        qrData.secret,
        verificationCode,
        password,
      );
      setBackupCodes(result.backupCodes || []);
      setStep("verify");
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid verification code");
      setVerificationCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onSuccess();
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            Add an extra layer of security to your account.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/15 border-destructive/20 rounded-md p-3 text-sm text-destructive font-medium border">
            {error}
          </div>
        )}

        {step === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Confirm Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !password}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "qr" && qrData && (
          <form onSubmit={handleEnable2FA} className="space-y-4">
            <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-muted/30">
              <div className="bg-white p-2 rounded-lg border shadow-sm">
                <img
                  src={qrData.qrCode}
                  alt="2FA QR Code"
                  className="w-48 h-48"
                />
              </div>
              <p className="mt-4 text-sm text-muted-foreground text-center">
                Scan this QR code with your authenticator app (Google
                Authenticator, Authy, etc.)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Manual Entry Key</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 rounded border bg-muted font-mono text-sm break-all">
                  {qrData.secret}
                </code>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(qrData.secret)}
                  title="Copy key"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Verification Code</Label>
              <div className="flex justify-center py-2">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={(value) => setVerificationCode(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("password")}
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enable 2FA
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "verify" && backupCodes.length > 0 && (
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900 p-4 rounded-lg">
              <h4 className="flex items-center gap-2 font-medium text-yellow-800 dark:text-yellow-500">
                ⚠️ Save Your Backup Codes
              </h4>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-600">
                Store these codes in a safe place. Each code can be used once if
                you lose access to your authenticator app.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg bg-muted/50">
              {backupCodes.map((code, index) => (
                <div
                  key={index}
                  className="p-2 text-center font-mono text-sm bg-background border rounded"
                >
                  {code}
                </div>
              ))}
            </div>

            <Button
              onClick={handleComplete}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              I have saved my backup codes
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
