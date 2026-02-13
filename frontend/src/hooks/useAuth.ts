import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/auth.service";
import { queryKeys } from "../lib/query-client";
import { LoginInput, RegisterInput } from "../schemas/validation";

export const useLogin = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: LoginInput) => authService.login(data),
    onSuccess: () => {
      navigate("/dashboard");
    },
  });
};

export const useRegister = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: RegisterInput) => authService.register(data),
    onSuccess: () => {
      navigate("/dashboard");
    },
  });
};

export const useLogout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.clear();
      navigate("/login");
    },
  });
};

export const useProfile = () => {
  return useQuery({
    queryKey: queryKeys.auth.profile,
    queryFn: () => authService.getProfile(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
