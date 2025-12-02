export interface User {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  bracketSubmitted?: boolean;
  bracketSubmittedAt?: string | null;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface SignupData {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginData {
  email: string;
  password: string;
}
