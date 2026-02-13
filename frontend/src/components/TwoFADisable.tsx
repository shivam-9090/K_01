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
import { Loader2, AlertTriangle } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "./ui/input-otp";

interface TwoFADisableProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const TwoFADisable: React.FC<TwoFADisableProps> = ({
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await twoFAService.disable2FA(code, password);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to disable 2FA");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            Are you sure you want to disable 2FA? This will make your account
            less secure.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/15 border-destructive/20 rounded-md p-3 text-sm text-destructive font-medium border">
            {error}
          </div>
        )}

        <div className="flex items-start gap-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
          <div className="text-sm text-yellow-700 dark:text-yellow-600">
            Disabling 2FA removes an extra layer of security. We recommend
            keeping it enabled to protect your account.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Current Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Verification Code</Label>
            <div className="flex justify-center py-2">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => setCode(value)}
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
            <p className="text-xs text-muted-foreground text-center">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={loading || !password || code.length !== 6}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable 2FA
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
