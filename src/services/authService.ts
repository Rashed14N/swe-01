import { User, UserRole } from '../types';
import { saveUserToSupabase } from './supabaseDataService';

export interface SignupParams {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  studentId?: string;
  batchId?: string;
  batchName?: string;
  phone?: string;
}

export interface AuthSession {
  token: string;
  user: User;
  createdAt: string;
}

const USERS_STORAGE_KEY = 'swe_portal_registered_users';
const SESSION_STORAGE_KEY = 'swe_portal_auth_session';

const MOCK_DEFAULT_USERS: User[] = [
  {
    id: 'user-admin-1',
    studentId: 'admin101',
    name: 'admin101',
    email: 'admin@swe.edu',
    role: 'ADMIN',
    batchId: 'batch_58',
    batchName: 'All Batches',
    currentSemester: 0,
    status: 'ACTIVE',
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
];

class MockAuthService {
  private users: User[];

  constructor() {
    this.users = this.loadUsers();
  }

  private loadUsers(): User[] {
    if (typeof window === 'undefined') return MOCK_DEFAULT_USERS;
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    let usersList: User[] = [];
    if (saved) {
      try {
        usersList = JSON.parse(saved);
      } catch (e) {
        usersList = [];
      }
    }
    
    // Guarantee ADMIN user is always in the list with ADMIN role
    for (const defaultUser of MOCK_DEFAULT_USERS) {
      const existingIndex = usersList.findIndex(
        u => u.id === defaultUser.id || 
             u.studentId?.toLowerCase() === defaultUser.studentId.toLowerCase() ||
             u.email?.toLowerCase() === defaultUser.email?.toLowerCase()
      );
      if (existingIndex === -1) {
        usersList.unshift(defaultUser);
      } else if (defaultUser.role === 'ADMIN' && usersList[existingIndex].role !== 'ADMIN') {
        usersList[existingIndex].role = 'ADMIN';
      }
    }

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersList));
    return usersList;
  }

  private saveUsers(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(this.users));
    }
  }

  public getSession(): AuthSession | null {
    if (typeof window === 'undefined') return null;
    const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionData) return null;
    try {
      return JSON.parse(sessionData);
    } catch (e) {
      return null;
    }
  }

  private setSession(user: User): AuthSession {
    const session: AuthSession = {
      token: `session_${user.id}_${user.studentId || 'id'}_${user.role}_${Date.now()}`,
      user,
      createdAt: new Date().toISOString()
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
    return session;
  }

  public clearSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  public login(identifier: string, _password?: string, preferredRole?: UserRole): { success: boolean; session?: AuthSession; error?: string } {
    const input = identifier.trim().toLowerCase();
    
    // Always refresh users from localStorage in case a user registered in another tab/action
    this.users = this.loadUsers();

    let user = this.users.find(
      u => u.email?.toLowerCase() === input || 
           u.studentId?.toLowerCase() === input ||
           u.id.toLowerCase() === input
    );

    if (user) {
      if (preferredRole && user.role !== preferredRole) {
        user = { ...user, role: preferredRole };
        this.updateUser(user);
      }
    } else {
      return { 
        success: false, 
        error: 'Account not found for this Student ID or Email. Please register or check your credentials.' 
      };
    }

    const session = this.setSession(user);
    // Asynchronously sync to Supabase
    saveUserToSupabase(user).catch(() => {});
    return { success: true, session };
  }

  public signUp(params: SignupParams): { success: boolean; session?: AuthSession; error?: string } {
    const normalizedEmail = params.email.trim().toLowerCase();

    if (this.users.some(u => u.email?.toLowerCase() === normalizedEmail)) {
      return { success: false, error: 'An account with this email address already exists.' };
    }

    const newUser: User = {
      id: `usr_${Date.now()}`,
      studentId: params.studentId || `211-35-${Math.floor(100 + Math.random() * 899)}`,
      name: params.name.trim(),
      email: normalizedEmail,
      phone: params.phone,
      role: params.role,
      batchId: params.batchId || 'batch_58',
      batchName: params.batchName || '58th Batch',
      currentSemester: 5,
      status: 'ACTIVE',
      profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.users.push(newUser);
    this.saveUsers();

    const session = this.setSession(newUser);
    saveUserToSupabase(newUser).catch(() => {});
    return { success: true, session };
  }

  public switchUserRole(userId: string, newRole: UserRole): User | null {
    const index = this.users.findIndex(u => u.id === userId);
    if (index === -1) return null;

    const updatedUser = { ...this.users[index], role: newRole, updatedAt: new Date().toISOString() };
    this.users[index] = updatedUser;
    this.saveUsers();

    const currentSession = this.getSession();
    if (currentSession && currentSession.user.id === userId) {
      this.setSession(updatedUser);
    }

    return updatedUser;
  }

  public updateUser(updatedUser: User): void {
    this.users = this.loadUsers();
    const index = this.users.findIndex(
      u => u.id === updatedUser.id || 
           (u.studentId && updatedUser.studentId && u.studentId.toLowerCase() === updatedUser.studentId.toLowerCase()) || 
           (u.email && updatedUser.email && u.email.toLowerCase() === updatedUser.email.toLowerCase())
    );
    if (index !== -1) {
      this.users[index] = { ...this.users[index], ...updatedUser, updatedAt: new Date().toISOString() };
    } else {
      this.users.push({ ...updatedUser, updatedAt: new Date().toISOString() });
    }
    this.saveUsers();

    const currentSession = this.getSession();
    if (currentSession && (currentSession.user.id === updatedUser.id || currentSession.user.studentId === updatedUser.studentId)) {
      this.setSession(updatedUser);
    }
    saveUserToSupabase(updatedUser).catch(() => {});
  }

  public getAllUsers(): User[] {
    return this.users;
  }
}

export const authService = new MockAuthService();
