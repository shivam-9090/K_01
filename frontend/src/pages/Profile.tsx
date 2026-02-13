import React, { useState, useEffect } from "react";
import { useProfile } from "../hooks/useAuth";
import { useAuthStore } from "../context/AuthContext";
import { TwoFASetup } from "../components/TwoFASetup";
import { TwoFADisable } from "../components/TwoFADisable";
import { authService } from "../services/auth.service";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import { Camera, Github, Loader2 } from "lucide-react";

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(8, "Password must be at least 8 characters"),
    newPassword: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]:;"'<>,.?/])/,
        "Must include uppercase, lowercase, number, and symbol",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const updateCompanySchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
});

type UpdateProfileForm = z.infer<typeof updateProfileSchema>;
type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
type UpdateCompanyForm = z.infer<typeof updateCompanySchema>;

const Profile: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { isLoading, refetch } = useProfile();
  const location = useLocation();
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLinkingGitHub, setIsLinkingGitHub] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const profileForm = useForm<UpdateProfileForm>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user?.name || "",
    },
  });

  const passwordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  const companyForm = useForm<UpdateCompanyForm>({
    resolver: zodResolver(updateCompanySchema),
    defaultValues: {
      companyName: user?.company?.name || "",
    },
  });

  const handle2FASuccess = async () => {
    try {
      const freshProfile = await authService.getProfile();
      localStorage.setItem("user", JSON.stringify(freshProfile));
      updateUser(freshProfile);
      await refetch();
      setShowEnableModal(false);
      setShowDisableModal(false);
    } catch (error) {
      window.location.reload();
    }
  };

  const onUpdateProfile = async (data: UpdateProfileForm) => {
    try {
      setErrorMessage("");
      setSuccessMessage("");
      const response = await authService.updateProfile(data.name);

      // Update user in store and localStorage
      if (!user?.id) return;
      const updatedUser = { ...user, name: response.user.name };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      updateUser(updatedUser);

      setSuccessMessage("Profile updated successfully!");
      setIsEditingName(false);
      await refetch();
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message || "Failed to update profile",
      );
    }
  };

  const onChangePassword = async (data: ChangePasswordForm) => {
    try {
      setErrorMessage("");
      setSuccessMessage("");
      await authService.changePassword(data.oldPassword, data.newPassword);
      setSuccessMessage("Password changed successfully! You'll be logged out.");
      passwordForm.reset();

      // Logout after 2 seconds
      setTimeout(() => {
        localStorage.clear();
        window.location.href = "/login";
      }, 2000);
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message || "Failed to change password",
      );
    }
  };

  const onUpdateCompany = async (data: UpdateCompanyForm) => {
    try {
      setErrorMessage("");
      setSuccessMessage("");
      await authService.updateCompanyName(data.companyName);

      // Update user in store and localStorage
      if (!user?.id || !user?.company?.id) return;
      const updatedUser = {
        ...user,
        company: { id: user.company.id, name: data.companyName },
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      updateUser(updatedUser);

      setSuccessMessage("Company name updated successfully!");
      setIsEditingCompany(false);
      await refetch();
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message || "Failed to update company name",
      );
    }
  };

  // GitHub OAuth handlers
  const handleConnectGitHub = async () => {
    try {
      setErrorMessage("");
      setIsLinkingGitHub(true);
      const url = await authService.getGitHubAuthUrl();

      if (!url || typeof url !== "string") {
        throw new Error("Invalid URL received from server");
      }

      // Add a small delay to ensure logs are visible and UI updates
      setTimeout(() => {
        window.location.href = url;
      }, 500);
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to initiate GitHub connection";
      setErrorMessage(`GitHub Connection Error: ${errorMsg}`);
      setIsLinkingGitHub(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseGitHubAvatar = async () => {
    if (!user?.githubAvatarUrl) return;

    try {
      // Update profile to use GitHub avatar
      const response = await authService.updateProfile(
        user.name || undefined,
        user.githubAvatarUrl,
      );
      const updatedUser = { ...user, ...response.user };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      updateUser(updatedUser);
      setSuccessMessage("Profile picture updated with GitHub avatar!");
      setIsEditingAvatar(false);
      await refetch();
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message || "Failed to update avatar",
      );
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;

    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);

      // You'll need to implement avatar upload endpoint
      const response = await authService.uploadAvatar(formData);
      const updatedUser = { ...user, ...response.user };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      updateUser(updatedUser);
      setSuccessMessage("Profile picture updated successfully!");
      setIsEditingAvatar(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      await refetch();
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message || "Failed to upload avatar",
      );
    }
  };

  const handleUnlinkGitHub = async () => {
    if (!confirm("Are you sure you want to unlink your GitHub account?")) {
      return;
    }

    try {
      setErrorMessage("");
      setSuccessMessage("");
      await authService.unlinkGitHubAccount();

      if (!user?.id) return;
      const updatedUser = {
        ...user,
        id: user.id,
        githubId: undefined,
        githubUsername: undefined,
        githubAvatarUrl: undefined,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      updateUser(updatedUser);

      setSuccessMessage("GitHub account unlinked successfully!");
      await refetch();
    } catch (error: any) {
      setErrorMessage("Failed to unlink GitHub account");
    }
  };

  // Handle GitHub OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const windowParams = new URLSearchParams(window.location.search);
    const code = params.get("github_code");
    const windowCode = windowParams.get("github_code");
    const error = params.get("error");

    const actualCode = code || windowCode;

    if (error) {
      setErrorMessage("GitHub authentication failed");
      window.history.replaceState({}, "", "/profile");
      return;
    }

    if (actualCode && !isLinkingGitHub && user?.id) {
      const processedCodeKey = `github_oauth_processed_${actualCode}`;
      const alreadyProcessed = sessionStorage.getItem(processedCodeKey);

      if (alreadyProcessed) {
        window.history.replaceState({}, "", "/profile");
        return;
      }

      sessionStorage.setItem(processedCodeKey, "1");

      setIsLinkingGitHub(true);
      authService
        .linkGitHubAccount(actualCode)
        .then(async (response) => {
          const updatedUser = {
            ...user,
            id: user.id,
            githubId: response.user.githubId,
            githubUsername: response.user.githubUsername,
            githubAvatarUrl: response.user.githubAvatarUrl,
          };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          updateUser(updatedUser);
          setSuccessMessage("GitHub account linked successfully!");
          await refetch();
        })
        .catch((error) => {
          setErrorMessage(
            "Failed to link GitHub account: " +
              (error.response?.data?.message || error.message),
          );
        })
        .finally(() => {
          setIsLinkingGitHub(false);
          window.history.replaceState({}, "", "/profile");
        });
    }
  }, [location.search, location]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings and preferences.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4 text-sm font-medium text-green-800 dark:text-green-300">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-destructive/15 border border-destructive/20 rounded-lg p-4 text-sm font-medium text-destructive">
          {errorMessage}
        </div>
      )}

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          {user?.role === "EMPLOYEE" && (
            <TabsTrigger value="employee">Employee Details</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>Click to edit your avatar.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative group">
                  <Avatar className="w-32 h-32 border-4 border-muted">
                    <AvatarImage src={avatarPreview || user?.githubAvatarUrl} />
                    <AvatarFallback className="text-4xl bg-primary text-primary-foreground">
                      {user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full shadow-lg"
                    onClick={() => setIsEditingAvatar(!isEditingAvatar)}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-4 text-center">
                  <h3 className="font-semibold text-lg">
                    {user?.name || "User"}
                  </h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Badge className="mt-2" variant="outline">
                    {user?.role}
                  </Badge>
                </div>

                {isEditingAvatar && (
                  <div className="w-full mt-6 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <Separator />
                    <div className="grid w-full items-center gap-1.5">
                      <Label htmlFor="avatar-upload">Upload an image</Label>
                      <Input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="cursor-pointer"
                      />
                    </div>
                    {avatarFile && (
                      <Button onClick={handleUploadAvatar} className="w-full">
                        Upload
                      </Button>
                    )}
                    {user?.githubAvatarUrl && (
                      <Button
                        variant="outline"
                        onClick={handleUseGitHubAvatar}
                        className="w-full gap-2"
                      >
                        <Github className="w-4 h-4" /> Use GitHub Avatar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => setIsEditingAvatar(false)}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details here.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Full Name</Label>
                  {isEditingName ? (
                    <form
                      onSubmit={profileForm.handleSubmit(onUpdateProfile)}
                      className="flex gap-2"
                    >
                      <Input
                        {...profileForm.register("name")}
                        placeholder="Your name"
                      />
                      <Button type="submit">Save</Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditingName(false)}
                      >
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between p-2 rounded-md border bg-muted/50">
                      <span>{user?.name || "Not provided"}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingName(true)}
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                  {profileForm.formState.errors.name && (
                    <p className="text-destructive text-sm">
                      {profileForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <div className="p-2 rounded-md border bg-muted text-muted-foreground">
                      {user?.email}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Mobile</Label>
                    <div className="p-2 rounded-md border bg-muted text-muted-foreground">
                      {user?.mobile || "Not provided"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <div>
                      <Badge
                        variant={user?.isActive ? "default" : "destructive"}
                      >
                        {user?.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Last Login</Label>
                    <div className="text-sm text-muted-foreground pt-2">
                      {user?.lastLogin
                        ? new Date(user.lastLogin).toLocaleString()
                        : "Never"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                {user?.role === "BOSS"
                  ? "Manage your company details."
                  : "View your company information."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user?.company ? (
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  {user.role === "BOSS" && isEditingCompany ? (
                    <form
                      onSubmit={companyForm.handleSubmit(onUpdateCompany)}
                      className="flex max-w-md gap-2"
                    >
                      <Input {...companyForm.register("companyName")} />
                      <Button type="submit">Save</Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditingCompany(false)}
                      >
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between max-w-md p-2 rounded-md border bg-muted/50">
                      <span className="font-semibold">{user.company.name}</span>
                      {user.role === "BOSS" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingCompany(true)}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  )}
                  {companyForm.formState.errors.companyName && (
                    <p className="text-destructive text-sm">
                      {companyForm.formState.errors.companyName.message}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground">
                  No company information associated with your account.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {/* Two-Factor Auth Section */}
          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">
                  {user?.isTwoFAEnabled
                    ? "2FA is enabled"
                    : "2FA is not enabled"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {user?.isTwoFAEnabled
                    ? "Your account is protected with two-factor authentication."
                    : "We recommend enabling 2FA for better security."}
                </p>
              </div>
              <Button
                variant={user?.isTwoFAEnabled ? "destructive" : "default"}
                onClick={() =>
                  user?.isTwoFAEnabled
                    ? setShowDisableModal(true)
                    : setShowEnableModal(true)
                }
              >
                {user?.isTwoFAEnabled ? "Disable 2FA" : "Set up 2FA"}
              </Button>
            </CardContent>
          </Card>

          {/* Change Password Section */}
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isChangingPassword ? (
                <Button
                  onClick={() => setIsChangingPassword(true)}
                  variant="outline"
                >
                  Change Password
                </Button>
              ) : (
                <form
                  onSubmit={passwordForm.handleSubmit(onChangePassword)}
                  className="space-y-4 max-w-md"
                >
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input
                      type="password"
                      {...passwordForm.register("oldPassword")}
                    />
                    {passwordForm.formState.errors.oldPassword && (
                      <p className="text-destructive text-sm">
                        {passwordForm.formState.errors.oldPassword.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      {...passwordForm.register("newPassword")}
                    />
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-destructive text-sm">
                        {passwordForm.formState.errors.newPassword.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm Password</Label>
                    <Input
                      type="password"
                      {...passwordForm.register("confirmPassword")}
                    />
                    {passwordForm.formState.errors.confirmPassword && (
                      <p className="text-destructive text-sm">
                        {passwordForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="submit">Update Password</Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setIsChangingPassword(false);
                        passwordForm.reset();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>GitHub Integration</CardTitle>
              <CardDescription>
                Connect your GitHub account to access repository features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user?.githubUsername ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-lg border">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={user.githubAvatarUrl} />
                      <AvatarFallback>
                        <Github />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">
                        {user.githubName || user.githubUsername}
                      </h4>
                      <a
                        href={user.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        @{user.githubUsername}
                      </a>
                      {user.githubCompany && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {user.githubCompany}
                        </p>
                      )}
                    </div>
                    <Button variant="destructive" onClick={handleUnlinkGitHub}>
                      Unlink
                    </Button>
                  </div>

                  {user.githubBio && (
                    <div className="p-4 rounded-md bg-muted text-sm italic">
                      "{user.githubBio}"
                    </div>
                  )}

                  <div className="flex gap-4">
                    {user.githubUrl && (
                      <Button asChild variant="secondary" className="gap-2">
                        <a
                          href={user.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Github className="w-4 h-4" /> GitHub Profile
                        </a>
                      </Button>
                    )}
                    {user.githubBlog && (
                      <Button asChild variant="outline">
                        <a
                          href={
                            user.githubBlog.startsWith("http")
                              ? user.githubBlog
                              : `https://${user.githubBlog}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Website
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center border-2 border-dashed rounded-lg">
                  <div className="p-4 bg-muted rounded-full">
                    <Github className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold">Connect to GitHub</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Link your GitHub account to sync your profile avatar and
                      access repository integration features.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleConnectGitHub}
                    disabled={isLinkingGitHub}
                    className="gap-2"
                  >
                    {isLinkingGitHub ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Github className="w-4 h-4" />
                    )}
                    Connect GitHub Account
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {user?.role === "EMPLOYEE" && (
          <TabsContent value="employee">
            <Card>
              <CardHeader>
                <CardTitle>Employee Details</CardTitle>
                <CardDescription>
                  Your performance and skills overview.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="mb-2 block">Skills</Label>
                  <div className="flex flex-wrap gap-2">
                    {user.skills && user.skills.length > 0 ? (
                      user.skills.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No skills listed.
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Achievements</Label>
                  <div className="p-3 bg-muted/30 rounded-md border text-sm">
                    {user.achievements || "No achievements recorded."}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Attendance</Label>
                  <div className="text-2xl font-bold">
                    {user.attendance || 0}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      days
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {showEnableModal && (
        <TwoFASetup
          onClose={() => setShowEnableModal(false)}
          onSuccess={handle2FASuccess}
        />
      )}

      {showDisableModal && (
        <TwoFADisable
          onClose={() => setShowDisableModal(false)}
          onSuccess={handle2FASuccess}
        />
      )}
    </div>
  );
};

export default Profile;
