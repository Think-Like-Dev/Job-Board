import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { QUERY_KEYS } from './queryKeys';
import { login, verifyOtp, getMe, logoutUser } from '../services/auth.service';
import { loginSuccess, logout, setInitialized } from '@store/slices/authSlice';
import type { RootState } from '@/store';
import type { LoginPayload, VerifyOtpPayload } from '@/types/auth.types';

export function useAuthMe(enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.AUTH.ME,
    queryFn: getMe,
    staleTime: 15 * 60 * 1000,
    gcTime: Infinity,
    enabled,
    retry: false,
  });
}

/**
 * Restores the Redux auth state from the HttpOnly session cookie once per
 * app load. A 401 simply means "not signed in" and must not redirect.
 */
export function useAuthBootstrap() {
  const dispatch = useDispatch();
  const isInitialized = useSelector(
    (state: RootState) => state.auth.isInitialized,
  );
  const { data, isSuccess, isError } = useAuthMe(!isInitialized);

  useEffect(() => {
    if (isInitialized) return;
    if (isSuccess && data) {
      dispatch(loginSuccess(data));
    } else if (isError) {
      dispatch(setInitialized());
    }
  }, [isInitialized, isSuccess, isError, data, dispatch]);
}

export function useLogin() {
  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
  });
}

export function useVerifyOtp() {
  const dispatch = useDispatch();
  return useMutation({
    mutationFn: (payload: VerifyOtpPayload) => verifyOtp(payload),
    onSuccess: (data) => {
      dispatch(loginSuccess(data.user));
    },
  });
}

/**
 * Destroys the server session (`POST /auth/logout` deletes the Redis session
 * and clears the HttpOnly cookie), then clears all client state. The soft
 * redirect avoids a full page reload; the router already renders the login
 * screen once `isAuthenticated` is false.
 */
export function useLogout() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: () => logoutUser(),
    onSuccess: () => {
      dispatch(logout());
      queryClient.clear();
      navigate('/login', { replace: true });
    },
    onError: () => {
      toast.error(t('auth.logoutError'));
    },
  });
}
