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
    id: 'usr_student_1',
    studentId: '211-35-101',
    name: 'Tanvir Hossain',
    email: 'tanvir.swe@student.mu.edu.bd',
    role: 'STUDENT',
    batchId: 'batch_58',
    batchName: '58th Batch',
    currentSemester: 5,
    status: 'ACTIVE',
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'usr_cr_1',
    studentId: '211-35-102',
    name: 'Naimur Rahman (CR)',
    email: 'naimur.cr@student.mu.edu.bd',
    role: 'CR',
    batchId: 'batch_58',
    batchName: '58th Batch',
    currentSemester: 5,
    status: 'ACTIVE',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'usr_admin_1',
    studentId: 'admin_001',
    name: 'Department Admin',
    email: 'admin.swe@mu.edu.bd',
    role: 'ADMIN',
    batchId: 'batch_58',
    batchName: 'All Batches',
    currentSemester: 8,
    status: 'ACTIVE',
    profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

class MockAuthService {
  private users: User[];

  constructor() {
    this.users = this.loadUsers();
  }

  private loadUsers(): User[] {
    if (typeof window === 'undefined') return MOCK_DEFAULT_USERS;
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved users, resetting to MOCK_DEFAULT_USERS', e);
      }
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(MOCK_DEFAULT_USERS));
    return MOCK_DEFAULT_USERS;
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
      token: `mock_jwt_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
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
