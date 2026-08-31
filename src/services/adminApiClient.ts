import { supabase } from '../lib/supabase';
import type {
  User,
  Batch,
  Course,
  Faculty,
  RoutineSlot,
  Exam,
  BatchAnnouncement,
  DepartmentNotice,
  Resource,
  NotificationItem,
  AuditLog,
  UserRole,
} from '../types';

export interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalCRs: number;
  totalAdmins: number;
  totalBatches: number;
  activeBatches: number;
  totalCourses: number;
  totalFaculty: number;
  totalRoutineSlots: number;
  totalExams: number;
  totalAnnouncements: number;
  totalNotices: number;
  totalResources: number;
  pendingResources: number;
  totalNotifications: number;
  recentAuditLogs: AuditLog[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  message?: string;
}

class AdminApiClient {
  private baseUrl = '/api/admin';

  private async getAuthHeaders(): Promise<HeadersInit> {
    let token = '';
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      token = sessionData.session?.access_token || '';
    } catch {
      // Fallback token extraction
    }

    if (!token) {
      // Try local storage token key if available
      token = localStorage.getItem('swe_admin_token') || localStorage.getItem('auth_token') || '';
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
    });

    let json: ApiResponse<T>;
    try {
      json = await response.json();
    } catch {
      throw new Error(`Server returned HTTP ${response.status} with non-JSON body`);
    }

    if (!response.ok || !json.success) {
      const errMsg = json.error?.message || `Request failed with status ${response.status}`;
      const err = new Error(errMsg) as any;
      err.code = json.error?.code || 'API_ERROR';
      err.status = response.status;
      throw err;
    }

    return json.data as T;
  }

  // ==========================================
  // STATS & OVERVIEW
  // ==========================================
  async getStats(): Promise<AdminStats> {
    return this.request<AdminStats>('/stats');
  }

  // ==========================================
  // USERS
  // ==========================================
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/users');
  }

  async createUser(user: Partial<User>): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async updateUserRole(id: string, role: UserRole): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.request<{ deleted: boolean }>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // BATCHES
  // ==========================================
  async getBatches(): Promise<Batch[]> {
    return this.request<Batch[]>('/batches');
  }

  async createBatch(batch: Partial<Batch>): Promise<Batch> {
    return this.request<Batch>('/batches', {
      method: 'POST',
      body: JSON.stringify(batch),
    });
  }

  async updateBatch(id: string, updates: Partial<Batch>): Promise<Batch> {
    return this.request<Batch>(`/batches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteBatch(id: string): Promise<void> {
    await this.request<{ deleted: boolean }>(`/batches/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // COURSES
  // ==========================================
  async getCourses(): Promise<Course[]> {
    return this.request<Course[]>('/courses');
  }

  async createCourse(course: Partial<Course>): Promise<Course> {
    return this.request<Course>('/courses', {
      method: 'POST',
      body: JSON.stringify(course),
    });
  }

  async updateCourse(id: string, updates: Partial<Course>): Promise<Course> {
    return this.request<Course>(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteCourse(id: string): Promise<void> {
    await this.request<{ deleted: boolean }>(`/courses/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // FACULTY
  // ==========================================
  async getFaculty(): Promise<Faculty[]> {
    return this.request<Faculty[]>('/faculty');
  }

  async createFaculty(faculty: Partial<Faculty>): Promise<Faculty> {
    return this.request<Faculty>('/faculty', {
      method: 'POST',
      body: JSON.stringify(faculty),
    });
  }

  async updateFaculty(id: string, updates: Partial<Faculty>): Promise<Faculty> {
    return this.request<Faculty>(`/faculty/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteFaculty(id: string): Promise<void> {
    await this.request<{ deleted: boolean }>(`/faculty/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // ROUTINE SLOTS
  // ==========================================
  async getRoutineSlots(batchId?: string): Promise<RoutineSlot[]> {
    const query = batchId ? `?batchId=${encodeURIComponent(batchId)}` : '';
    return this.request<RoutineSlot[]>(`/routine-slots${query}`);
  }

  async getRoutines(batchId?: string): Promise<RoutineSlot[]> {
    return this.getRoutineSlots(batchId);
  }

  async createRoutineSlot(slot: Partial<RoutineSlot>): Promise<RoutineSlot> {
    return this.request<RoutineSlot>('/routine-slots', {
      method: 'POST',
      body: JSON.stringify(slot),
    });
  }

  async updateRoutineSlot(id: string, updates: Partial<RoutineSlot>): Promise<RoutineSlot> {
    return this.request<RoutineSlot>(`/routine-slots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteRoutineSlot(id: string): Promise<void> {
    await this.request<{ deleted: boolean }>(`/routine-slots/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkImportRoutines(
    batchId: string,
    slots: any[],
    mode: 'REPLACE' | 'APPEND'
  ): Promise<{ message: string; count: number }> {
    return this.request<{ message: string; count: number }>('/routine/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ batchId, slots, mode }),
    });
  }

  // ==========================================
  // EXAMS
  // ==========================================
  async getExams(batchId?: string): Promise<Exam[]> {
    const query = batchId ? `?batchId=${encodeURIComponent(batchId)}` : '';
    return this.request<Exam[]>(`/exams${query}`);
  }

  async createExam(exam: Partial<Exam>): Promise<Exam> {
    return this.request<Exam>('/exams', {
      method: 'POST',
      body: JSON.stringify(exam),
    });
  }

  async updateExam(id: string, updates: Partial<Exam>): Promise<Exam> {
    return this.request<Exam>(`/exams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteExam(id: string): Promise<void> {
    await this.request<{ deleted: boolean }>(`/exams/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // ANNOUNCEMENTS
  // ==========================================
  async getAnnouncements(batchId?: string): Promise<BatchAnnouncement[]> {
    const query = batchId ? `?batchId=${encodeURIComponent(batchId)}` : '';
    return this.request<BatchAnnouncement[]>(`/announcements${query}`);
  }

  async createAnnouncement(announcement: Partial<BatchAnnouncement>): Promise<BatchAnnouncement> {
    return this.request<BatchAnnouncement>('/announcements', {
      method: 'POST',
      body: JSON.stringify(announcement),
    });
  }

  async updateAnnouncement(id: string, updates: Partial<BatchAnnouncement>): Promise<BatchAnnouncement> {
    return this.request<BatchAnnouncement>(`/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await this.request<{ deleted: boolean }>(`/announcements/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // DEPARTMENT NOTICES
  // ==========================================
  async getNotices(): Promise<DepartmentNotice[]> {
    return this.request<DepartmentNotice[]>('/department-notices');
  }

  async createNotice(notice: Partial<DepartmentNotice>): Promise<DepartmentNotice> {
    return this.request<DepartmentNotice>('/department-notices', {
      method: 'POST',
      body: JSON.stringify(notice),
    });
  }

  async updateNotice(id: string, updates: Partial<DepartmentNotice>): Promise<DepartmentNotice> {
    return this.request<DepartmentNotice>(`/department-notices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteNotice(id: string): Promise<void> {
    await this.request<{ deleted: boolean }>(`/department-notices/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // RESOURCES
  // ==========================================
  async getResources(): Promise<Resource[]> {
    return this.request<Resource[]>('/resources');
  }

  async getPendingResources(): Promise<Resource[]> {
    return this.request<Resource[]>('/resources/pending');
  }

  async verifyResource(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    rejectionReason?: string
  ): Promise<Resource> {
    return this.request<Resource>(`/resources/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ status, rejectionReason }),
    });
  }

  async createResource(resource: Partial<Resource>): Promise<Resource> {
    return this.request<Resource>('/resources', {
      method: 'POST',
      body: JSON.stringify(resource),
    });
  }

  async updateResource(id: string, updates: Partial<Resource>): Promise<Resource> {
    return this.request<Resource>(`/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteResource(id: string): Promise<void> {
    await this.request<{ deleted: boolean }>(`/resources/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  async getNotifications(userId?: string): Promise<NotificationItem[]> {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return this.request<NotificationItem[]>(`/notifications${query}`);
  }

  async createNotification(notification: Partial<NotificationItem>): Promise<NotificationItem> {
    return this.request<NotificationItem>('/notifications', {
      method: 'POST',
      body: JSON.stringify(notification),
    });
  }

  async updateNotification(id: string, updates: Partial<NotificationItem>): Promise<NotificationItem> {
    return this.request<NotificationItem>(`/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteNotification(id: string): Promise<void> {
    await this.request<{ deleted: boolean }>(`/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    return this.request<AuditLog[]>(`/audit-logs?limit=${limit}`);
  }
}

export const adminApiClient = new AdminApiClient();
