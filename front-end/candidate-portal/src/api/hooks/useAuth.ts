import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { QUERY_KEYS } from './queryKeys';
import { sendOtp, verifyOtp, getMe, logoutUser } from '../services/auth.service';
import { loginSuccess, logout } from '../../store/slices/authSlice';
import type { SendOtpPayload, VerifyOtpPayload } from '../../types/auth.types';

export function useAuthMe(enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.AUTH.ME,
    queryFn: getMe,
    staleTime: 15 * 60 * 1000,
    gcTime: Infinity,
    enabled,
  });
}

export function useSendOtp() {
  return useMutation({
    mutationFn: (payload: SendOtpPayload) => sendOtp(payload),
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

export function useLogout() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => logoutUser(),
    onSuccess: () => {
      dispatch(logout());
      queryClient.clear();
      window.location.replace('/');
    },
  });
}
