import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authService } from "../services/auth.service";
import { AlertCircle, Building2, User, Phone } from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]:;"'<>,.?/]).{12,}$/,
      "Password must include uppercase, lowercase, number, and special character",
    ),
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(100),
  mobile: z
    .string()
    .regex(
      /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
      "Please enter a valid mobile number",
    ),
});

type RegisterInput = z.infer<typeof registerSchema>;

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setError(null);
    try {
      await authService.register(data);
      alert("✅ Registration successful! Please login with your credentials.");
      navigate("/login");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again.",
      );
    }
  };

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit(onSubmit)}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create Company Account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Register as a BOSS to start managing your team
          </p>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2 border border-destructive/20">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Name and Mobile Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="name">Full Name</FieldLabel>
            <div className="relative">
              <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                placeholder="John Doe"
                {...register("name")}
                className={`pl-9 ${errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
            </div>
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="mobile">Mobile Number</FieldLabel>
            <div className="relative">
              <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="mobile"
                placeholder="+1 234..."
                {...register("mobile")}
                className={`pl-9 ${errors.mobile ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
            </div>
            {errors.mobile && (
              <p className="text-xs text-destructive">
                {errors.mobile.message}
              </p>
            )}
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="companyName">Company Name</FieldLabel>
          <div className="relative">
            <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="companyName"
              placeholder="Acme Inc."
              {...register("companyName")}
              className={`pl-9 ${errors.companyName ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
          </div>
          {errors.companyName && (
            <p className="text-xs text-destructive">
              {errors.companyName.message}
            </p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            {...register("email")}
            className={
              errors.email
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            {...register("password")}
            className={
              errors.password
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }
          />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </Field>

        <Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating Account..." : "Register Company"}
          </Button>
        </Field>

        <FieldSeparator>Already have an account?</FieldSeparator>

        <div className="text-center">
          <Link
            to="/login"
            className="underline underline-offset-4 text-sm font-medium"
          >
            Login to existing account
          </Link>
        </div>
      </FieldGroup>
    </form>
  );
}
