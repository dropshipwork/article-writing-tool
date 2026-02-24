
import { Member } from "../types";

/**
 * SIMULATED BACKEND API SERVICE
 * In a real production environment, these functions would call your 
 * Python/Node.js endpoints (e.g., fetch('/api/members')).
 */

const STORAGE_KEY = 'as_members';

const getStoredMembers = (): Member[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [
      { 
        id: '1', 
        name: 'Master Admin', 
        email: 'admin@autostudio.ai', 
        accessKey: 'admin123', 
        role: 'Admin', 
        createdAt: Date.now(), 
        status: 'Active' 
      }
    ];
  } catch (e) {
    console.error("LocalStorage access failed:", e);
    return [
      { 
        id: '1', 
        name: 'Master Admin', 
        email: 'admin@autostudio.ai', 
        accessKey: 'admin123', 
        role: 'Admin', 
        createdAt: Date.now(), 
        status: 'Active' 
      }
    ];
  }
};

const safeSaveMembers = (members: Member[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  } catch (e) {
    console.error("LocalStorage save failed:", e);
  }
};

export const authApi = {
  /**
   * Simulates POST /api/add-member
   */
  async addMember(name: string, email: string, role: 'Admin' | 'Member'): Promise<{ success: boolean; member?: Member; error?: string }> {
    // Artificial latency to simulate network request
    await new Promise(resolve => setTimeout(resolve, 800));

    // Basic Validation
    if (!name || !email) {
      return { success: false, error: "Name and Email are required." };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: "Invalid email format." };
    }

    const members = getStoredMembers();

    // Duplicate Check
    const exists = members.find(m => m.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return { success: false, error: "A member with this email already exists." };
    }

    // Create Member Object
    const newMember: Member = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email: email.toLowerCase(),
      accessKey: Math.random().toString(36).substr(2, 12).toUpperCase(),
      role,
      createdAt: Date.now(),
      status: 'Active'
    };

    // "Save to Database" (LocalStorage)
    const updatedMembers = [...members, newMember];
    safeSaveMembers(updatedMembers);

    return { success: true, member: newMember };
  },

  /**
   * Simulates GET /api/members
   */
  async getMembers(): Promise<Member[]> {
    return getStoredMembers();
  },

  /**
   * Simulates DELETE /api/members/:id
   */
  async deleteMember(id: string): Promise<boolean> {
    if (id === '1') return false; // Protected
    const members = getStoredMembers();
    const updated = members.filter(m => m.id !== id);
    safeSaveMembers(updated);
    return true;
  },

  /**
   * Simulates PATCH /api/members/:id/status
   */
  async toggleStatus(id: string): Promise<Member | null> {
    const members = getStoredMembers();
    const index = members.findIndex(m => m.id === id);
    if (index === -1) return null;

    members[index].status = members[index].status === 'Active' ? 'Suspended' : 'Active';
    safeSaveMembers(members);
    return members[index];
  },

  /**
   * Updates the Gemini API key for a member
   */
  async updateMemberGeminiKey(id: string, key: string): Promise<boolean> {
    const members = getStoredMembers();
    const index = members.findIndex(m => m.id === id);
    if (index === -1) return false;

    members[index].geminiApiKey = key;
    safeSaveMembers(members);
    return true;
  },

  /**
   * Updates usage stats for a member
   */
  async updateUsage(id: string, type: 'keywords' | 'articles' | 'images'): Promise<Member | null> {
    const members = getStoredMembers();
    const index = members.findIndex(m => m.id === id);
    if (index === -1) return null;

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (!members[index].usage || (now - members[index].usage.lastReset > oneDay)) {
      members[index].usage = {
        keywords: 0,
        articles: 0,
        images: 0,
        lastReset: now
      };
    }

    members[index].usage![type]++;
    safeSaveMembers(members);
    return members[index];
  }
};
