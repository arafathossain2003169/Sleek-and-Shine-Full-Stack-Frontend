import { apiClient } from './client';
import { User } from '@/types/user';

export type OtpPurpose = 'register' | 'login' | 'reset';

/** Step 1 of sign-up / login: the password was accepted and a code was e-mailed. No session yet. */
export interface OtpChallenge {
  otpRequired: true;
  email: string;
  purpose: OtpPurpose;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface Session {
  user: User;
  accessToken: string;
}

/** The server answers with a challenge, or (only if OTP is switched off) straight with a session. */
export type AuthStepResult = OtpChallenge | Session;

export const isChallenge = (r: AuthStepResult): r is OtpChallenge => 'otpRequired' in r && r.otpRequired === true;

export const authApi = {
  register: (input: { name: string; email: string; password: string; phone?: string }) =>
    apiClient.post<AuthStepResult>('/auth/register', input),

  login: (input: { email: string; password: string }) => apiClient.post<AuthStepResult>('/auth/login', input),

  verifyOtp: (input: { email: string; purpose: OtpPurpose; code: string }) =>
    apiClient.post<Session>('/auth/verify-otp', input),

  resendOtp: (input: { email: string; purpose: OtpPurpose }) =>
    apiClient.post<OtpChallenge>('/auth/resend-otp', input),

  forgotPassword: (input: { email: string }) => apiClient.post<OtpChallenge>('/auth/forgot-password', input),

  resetPassword: (input: { email: string; code: string; newPassword: string }) =>
    apiClient.post<Record<string, never>>('/auth/reset-password', input),

  logout: () => apiClient.post<Record<string, never>>('/auth/logout'),

  me: () => apiClient.get<{ user: User }>('/auth/me'),

  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    apiClient.post<Session>('/auth/change-password', input),
};
