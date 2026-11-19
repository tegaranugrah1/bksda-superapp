export interface Employee {
  id: number;
  nip: string;
  name: string;
  position: string;
  department: string;
  email: string | null;
  phone: string | null;
  photo: string | null;
  rank: string | null;
  is_active: boolean;
}

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  access_modules: string[];
  permissions: string[];
  is_active: boolean;
  employee: Employee | null;
  security?: { must_change_password: boolean; must_setup_2fa: boolean };
}

export interface LoginResponse {
  data: User;
  token: string;
  message?: string;
}

export interface TwoFactorChallenge {
  requires_2fa: true;
  challenge_token: string;
  message?: string;
}

export interface LoginCredentials {
  username: string;
  password?: string;
}
