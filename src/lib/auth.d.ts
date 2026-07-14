declare module "@/lib/use-auth" {
  export function useAuth(): {
    user: import("firebase/auth").User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
  };
}
