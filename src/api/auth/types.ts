export interface AuthProvider {
  authenticate(token: string): Promise<AuthResult>;
}

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  roles?: string[];
  error?: string;
}

/** No-op auth provider */
export class NoAuthProvider implements AuthProvider {
  async authenticate(_token: string): Promise<AuthResult> {
    return { authenticated: true, userId: 'anonymous', roles: ['*'] };
  }
}
