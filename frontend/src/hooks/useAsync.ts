import { useState, useEffect, useCallback } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export interface UseAsyncOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Custom hook for handling async operations with loading, error, and data states
 *
 * @example
 * const { data, loading, error, execute } = useAsync(fetchData);
 *
 * useEffect(() => {
 *   execute();
 * }, []);
 *
 * @example
 * const { data, loading, error } = useAsync(fetchData, { immediate: true });
 */
export function useAsync<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions = {},
) {
  const { immediate = false, onSuccess, onError } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]) => {
      setState({ data: null, loading: true, error: null });

      try {
        const response = await asyncFunction(...args);
        setState({ data: response, loading: false, error: null });

        if (onSuccess) {
          onSuccess(response);
        }

        return response;
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error("An error occurred");
        setState({ data: null, loading: false, error: err });

        if (onError) {
          onError(err);
        }

        throw error;
      }
    },
    [asyncFunction, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Hook for handling async operations with manual triggers (for mutations)
 *
 * @example
 * const { loading, error, execute } = useMutation(createTask);
 *
 * const handleSubmit = async (data) => {
 *   await execute(data);
 * };
 */
export function useMutation<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions = {},
) {
  return useAsync<T>(asyncFunction, { ...options, immediate: false });
}
