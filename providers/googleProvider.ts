
import { IDataProvider, SyncStatus } from '../core/dataProvider';
import {
  Attendance,
  AttendanceItem,
  Behavior,
  ClassInfo,
  MessageThread,
  Message,
  Parent,
  Report,
  Student,
  Task,
  TaskReply,
  Announcement,
  Document,
  Question,
  User,
  ReportStats
} from '../core/types';

// URL của Web App mới từ Google Apps Script
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwq4av1SrB7x3xgs_kc-rgso2rsBNrz-iRDfDZcDNyHe-JFFbJ8Xo-KHifL3Wg2ncQk/exec';
const CURRENT_USER_KEY = 'homeroom_current_user';
const CACHE_KEY = 'homeroom_google_cache_v2';

interface CacheDB {
  classes: ClassInfo[];
  students: Student[];
  parents: Parent[];
  attendance: Attendance[];
  behaviors: Behavior[];
  announcements: Announcement[];
  documents: Document[];
  tasks: Task[];
  taskReplies: TaskReply[];
  threads: MessageThread[];
  messages: Message[];
  questions: Question[];
  lastSync: string | null;
}

const DEFAULT_CACHE: CacheDB = {
  classes: [], students: [], parents: [], attendance: [], behaviors: [],
  announcements: [], documents: [], tasks: [], taskReplies: [],
  threads: [], messages: [], questions: [], lastSync: null
};

export class GoogleProvider implements IDataProvider {
  private cache: CacheDB;
  private syncStatus: SyncStatus = 'IDLE';
  private listeners: ((status: SyncStatus, lastSync: Date | null) => void)[] = [];

  constructor() {
    this.cache = this.loadCache();
  }

  private loadCache(): CacheDB {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_CACHE, ...parsed };
      } catch (e) {
        return DEFAULT_CACHE;
      }
    }
    return DEFAULT_CACHE;
  }

  private saveCache() {
    localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache));
  }

  private setSyncStatus(status: SyncStatus) {
    this.syncStatus = status;
    this.notifyListeners();
  }

  private notifyListeners() {
    const lastSyncDate = this.cache.lastSync ? new Date(this.cache.lastSync) : null;
    this.listeners.forEach(cb => cb(this.syncStatus, lastSyncDate));
  }

  subscribe(callback: (status: SyncStatus, lastSync: Date | null) => void): () => void {
    this.listeners.push(callback);
    const lastSyncDate = this.cache.lastSync ? new Date(this.cache.lastSync) : null;
    callback(this.syncStatus, lastSyncDate);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  getSyncState() {
    return {
      status: this.syncStatus,
      lastSync: this.cache.lastSync ? new Date(this.cache.lastSync) : null
    };
  }

  private async call(action: string, payload: any = {}): Promise<any> {
    try {
      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || 'Lỗi xử lý yêu cầu từ máy chủ');
      return result.data;
    } catch (error: any) {
      console.error(`GAS API Error [${action}]:`, error);
      throw error;
    }
  }

  async init(): Promise<void> {
    return Promise.resolve();
  }

  async sync(): Promise<void> {
    if (this.syncStatus === 'SYNCING') return;
    this.setSyncStatus('SYNCING');

    try {
      const [
        classes, students, parents, attendance, behaviors,
        announcements, documents, tasks, taskReplies,
        threads, messages, questions
      ] = await Promise.all([
        this.call('classes.list'),
        this.call('students.list'),
        this.call('parents.list'),
        this.call('attendance.list'),
        this.call('behavior.list'),
        this.call('announcements.list'),
        this.call('documents.list'),
        this.call('tasks.list'),
        this.call('taskReplies.list'),
        this.call('messageThreads.list'),
        this.call('messages.list'),
        this.call('questions.list'),
      ]);

      this.cache = {
        ...this.cache,
        classes, students, parents, attendance, behaviors,
        announcements, documents, tasks, taskReplies,
        threads, messages, questions,
        lastSync: new Date().toISOString()
      };
      
      this.saveCache();
      this.setSyncStatus('IDLE');
    } catch (err) {
      this.setSyncStatus('ERROR');
    }
  }

  async login(username: string, password: string): Promise<User | null> {
    // Luôn trim và chuẩn hóa dữ liệu trước khi gửi
    const user = await this.call('auth.login', { 
      username: String(username).trim(), 
      password: String(password).trim() 
    });
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    }
    return user;
  }

  async register(user: Omit<User, 'id'>): Promise<User> {
    const newUser = await this.call('auth.register', {
      ...user,
      username: String(user.username).trim(),
      password: String(user.password).trim()
    });
    if (newUser) {
       localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    }
    return newUser;
  }

  async getCurrentUser(): Promise<User | null> {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  async logout(): Promise<void> {
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  async getClasses(): Promise<ClassInfo[]> { return this.cache.classes; }
  async addClass(info: ClassInfo): Promise<void> {
    this.cache.classes.push(info); this.saveCache();
    this.call('classes.create', info).catch(console.error);
  }
  async updateClass(info: ClassInfo): Promise<void> {
    const idx = this.cache.classes.findIndex(c => c.id === info.id);
    if (idx !== -1) { this.cache.classes[idx] = info; this.saveCache(); }
    this.call('classes.update', info).catch(console.error);
  }
  async removeClass(id: string): Promise<void> {
    this.cache.classes = this.cache.classes.filter(c => c.id !== id); this.saveCache();
    this.call('classes.delete', { id }).catch(console.error);
  }

  async getStudents(): Promise<Student[]> { return this.cache.students; }
  async getStudentsByClass(classId: string): Promise<Student[]> { 
      return this.cache.students.filter(s => s.classId === classId); 
  }
  async addStudent(student: Student): Promise<void> {
    this.cache.students.push(student); this.saveCache();
    this.call('students.create', student).catch(console.error);
  }
  async updateStudent(student: Student): Promise<void> {
    const idx = this.cache.students.findIndex(s => s.id === student.id);
    if (idx !== -1) { this.cache.students[idx] = student; this.saveCache(); }
    this.call('students.update', student).catch(console.error);
  }
  async removeStudent(id: string): Promise<void> {
    this.cache.students = this.cache.students.filter(s => s.id !== id); this.saveCache();
    this.call('students.delete', { id }).catch(console.error);
  }
  async updateStudentXP(studentId: string, points: number): Promise<Student> {
    const idx = this.cache.students.findIndex(s => s.id === studentId);
    if (idx === -1) throw new Error("Không tìm thấy học sinh");
    const s = this.cache.students[idx];
    const newXp = (s.xp || 0) + points;
    const newLevel = Math.floor(newXp / 100) + 1;
    const updated = { ...s, xp: newXp, level: newLevel };
    this.cache.students[idx] = updated; this.saveCache();
    this.call('students.update', updated).catch(console.error);
    return updated;
  }

  async getParents(): Promise<Parent[]> { return this.cache.parents; }
  async addParent(parent: Parent): Promise<void> {
    this.cache.parents.push(parent); this.saveCache();
    this.call('parents.create', parent).catch(console.error);
  }
  async updateParent(parent: Parent): Promise<void> {
    const idx = this.cache.parents.findIndex(p => p.id === parent.id);
    if (idx !== -1) { this.cache.parents[idx] = parent; this.saveCache(); }
    this.call('parents.update', parent).catch(console.error);
  }
  async removeParent(id: string): Promise<void> {
    this.cache.parents = this.cache.parents.filter(p => p.id !== id); this.saveCache();
    this.call('parents.delete', { id }).catch(console.error);
  }

  async getAttendance(classId: string, date: string): Promise<Attendance[]> {
    return this.cache.attendance.filter(a => a.classId === classId && a.date === date);
  }
  async getAttendanceRange(classId: string, startDate: string, endDate: string): Promise<Attendance[]> {
    return this.cache.attendance.filter(a => a.classId === classId && a.date >= startDate && a.date <= endDate);
  }
  async saveAttendance(classId: string, date: string, items: AttendanceItem[]): Promise<void> {
    this.cache.attendance = this.cache.attendance.filter(a => !(a.classId === classId && a.date === date));
    items.forEach(i => {
        this.cache.attendance.push({
            id: crypto.randomUUID(), 
            classId, date, studentId: i.studentId, status: i.status, note: i.note
        });
    });
    this.saveCache();
    this.call('attendance.saveBatch', { classId, date, items }).catch(console.error);
  }
  async getStudentAttendance(studentId: string, month: number, year: number): Promise<Attendance[]> {
     const prefix = `${year}-${month < 10 ? '0'+month : month}`;
     return this.cache.attendance.filter(a => a.studentId === studentId && a.date.startsWith(prefix));
  }

  async getBehaviors(classId: string, startDate?: string, endDate?: string): Promise<Behavior[]> {
    let res = this.cache.behaviors.filter(b => b.classId === classId);
    if (startDate) res = res.filter(b => b.date >= startDate);
    if (endDate) res = res.filter(b => b.date <= endDate);
    return res.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  async getStudentBehaviors(studentId: string): Promise<Behavior[]> {
    return this.cache.behaviors.filter(b => b.studentId === studentId);
  }
  async addBehavior(behavior: Behavior): Promise<void> {
    this.cache.behaviors.push(behavior); this.saveCache();
    this.call('behavior.create', behavior).catch(console.error);
  }
  async updateBehavior(behavior: Behavior): Promise<void> {
    const idx = this.cache.behaviors.findIndex(b => b.id === behavior.id);
    if(idx!==-1) { this.cache.behaviors[idx]=behavior; this.saveCache(); }
    this.call('behavior.update', behavior).catch(console.error);
  }
  async removeBehavior(id: string): Promise<void> {
    this.cache.behaviors = this.cache.behaviors.filter(b => b.id !== id); this.saveCache();
    this.call('behavior.delete', { id }).catch(console.error);
  }

  async getAnnouncements(classId: string): Promise<Announcement[]> {
    const list = this.cache.announcements.filter(a => a.classId === classId);
    return list.sort((a,b) => {
        if (a.pinned === b.pinned) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return a.pinned ? -1 : 1;
    });
  }
  async addAnnouncement(a: Announcement): Promise<void> {
    this.cache.announcements.unshift(a); this.saveCache();
    this.call('announcements.create', a).catch(console.error);
  }
  async updateAnnouncement(a: Announcement): Promise<void> {
    const idx = this.cache.announcements.findIndex(i => i.id === a.id);
    if(idx!==-1) { this.cache.announcements[idx]=a; this.saveCache(); }
    this.call('announcements.update', a).catch(console.error);
  }
  async removeAnnouncement(id: string): Promise<void> {
    this.cache.announcements = this.cache.announcements.filter(i => i.id !== id); this.saveCache();
    this.call('announcements.delete', { id }).catch(console.error);
  }

  async getDocuments(classId: string): Promise<Document[]> {
    return this.cache.documents.filter(d => d.classId === classId);
  }
  async addDocument(d: Document): Promise<void> {
    this.cache.documents.unshift(d); this.saveCache();
    this.call('documents.create', d).catch(console.error);
  }
  async updateDocument(d: Document): Promise<void> {
    const idx = this.cache.documents.findIndex(i => i.id === d.id);
    if(idx!==-1) { this.cache.documents[idx]=d; this.saveCache(); }
    this.call('documents.update', d).catch(console.error);
  }
  async removeDocument(id: string): Promise<void> {
    this.cache.documents = this.cache.documents.filter(i => i.id !== id); this.saveCache();
    this.call('documents.delete', { id }).catch(console.error);
  }

  async getTasks(classId: string): Promise<Task[]> {
    return this.cache.tasks.filter(t => t.classId === classId);
  }
  async addTask(t: Task): Promise<void> {
    this.cache.tasks.unshift(t); this.saveCache();
    this.call('tasks.create', t).catch(console.error);
  }
  async updateTask(t: Task): Promise<void> {
    const idx = this.cache.tasks.findIndex(i => i.id === t.id);
    if(idx!==-1) { this.cache.tasks[idx]=t; this.saveCache(); }
    this.call('tasks.update', t).catch(console.error);
  }
  async removeTask(id: string): Promise<void> {
    this.cache.tasks = this.cache.tasks.filter(i => i.id !== id); this.saveCache();
    this.call('tasks.delete', { id }).catch(console.error);
  }
  async getTaskReplies(taskId: string): Promise<TaskReply[]> {
    return this.cache.taskReplies.filter(r => r.taskId === taskId);
  }
  async replyTask(r: TaskReply): Promise<void> {
    const idx = this.cache.taskReplies.findIndex(x => x.taskId === r.taskId && x.studentId === r.studentId);
    if (idx !== -1) {
       this.cache.taskReplies[idx] = r;
       this.call('taskReplies.update', r).catch(console.error);
    } else {
       this.cache.taskReplies.push(r);
       this.call('taskReplies.create', r).catch(console.error);
    }
    this.saveCache();
  }

  async getAllThreads(): Promise<MessageThread[]> { return this.cache.threads; }
  async getThreadByStudent(studentId: string): Promise<MessageThread> {
    let t = this.cache.threads.find(x => x.threadKey === studentId);
    if (t) return t;
    const s = this.cache.students.find(x => x.id === studentId);
    const cls = this.cache.classes.find(c => c.id === s?.classId);
    const newThread: MessageThread = {
        id: crypto.randomUUID(),
        threadKey: studentId,
        participantsJson: JSON.stringify({
            studentName: s?.fullName,
            className: cls?.className,
            teacherName: cls?.homeroomTeacher,
            parentName: 'Phụ huynh'
        }),
        lastMessageAt: new Date().toISOString()
    };
    this.cache.threads.push(newThread); this.saveCache();
    this.call('messageThreads.create', newThread).catch(console.error);
    return newThread;
  }
  async getMessages(threadId: string): Promise<Message[]> {
    return this.cache.messages.filter(m => m.threadId === threadId);
  }
  async sendMessage(threadId: string, role: any, content: string): Promise<void> {
    const msg: Message = {
        id: crypto.randomUUID(),
        threadId, fromRole: role, content, createdAt: new Date().toISOString()
    };
    this.cache.messages.push(msg);
    const tIdx = this.cache.threads.findIndex(t => t.id === threadId);
    if (tIdx !== -1) { this.cache.threads[tIdx].lastMessageAt = msg.createdAt; }
    this.saveCache();
    this.call('messages.create', { threadId, fromRole: role, content }).catch(console.error);
  }

  async reportsWeekly(classId: string, startDate: string, endDate: string): Promise<Report> {
    const data = await this.call('reports.weeklySummary', { classId, startDate, endDate });
    
    const stats: ReportStats = {
      attendanceRate: data.attendanceRate,
      totalAbsences: data.totalAbsences,
      totalLates: data.totalLates,
      topPraise: data.topPraise || [],
      topWarn: [], // Logic mapping additional fields if needed
      taskCompletionRate: 0,
      parentReplyCount: data.parentReplyCount || 0,
      totalStudents: data.totalStudents || 0
    };

    return { 
        id: 'r_' + new Date().getTime(), 
        title: 'Báo cáo tuần', 
        type: 'WEEKLY', 
        startDate, 
        endDate, 
        generatedDate: new Date().toISOString(), 
        content: stats
    };
  }
  async reportsMonthly(classId: string, month: number, year: number): Promise<Report> {
    const data = await this.call('reports.monthlySummary', { classId, month, year });
    
    const stats: ReportStats = {
      attendanceRate: data.attendanceRate,
      totalAbsences: data.totalAbsences,
      totalLates: data.totalLates,
      topPraise: data.topPraise || [],
      topWarn: [],
      taskCompletionRate: 0,
      parentReplyCount: data.parentReplyCount || 0,
      totalStudents: data.totalStudents || 0
    };

    return { 
        id: 'r_' + new Date().getTime(), 
        title: 'Báo cáo tháng ' + month, 
        type: 'MONTHLY', 
        startDate: `${year}-${month}-01`, 
        endDate: `${year}-${month}-31`, 
        generatedDate: new Date().toISOString(), 
        content: stats
    };
  }

  async getQuestions(): Promise<Question[]> { return this.cache.questions; }
  async addQuestion(q: Question): Promise<void> {
    this.cache.questions.push(q); this.saveCache();
    this.call('questions.create', q).catch(console.error);
  }
  async updateQuestion(q: Question): Promise<void> {
    const idx = this.cache.questions.findIndex(i => i.id === q.id);
    if(idx!==-1) { this.cache.questions[idx]=q; this.saveCache(); }
    this.call('questions.update', q).catch(console.error);
  }
  async removeQuestion(id: string): Promise<void> {
    this.cache.questions = this.cache.questions.filter(i => i.id !== id); this.saveCache();
    this.call('questions.delete', { id }).catch(console.error);
  }
}
