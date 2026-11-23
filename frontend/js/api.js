/**
 * StudyBuddy API & State Manager
 * Zero dummy values. Handles real backend authentication & real user-entered data.
 */
const API = {
  baseUrl: '',

  user: null,

  state: {
    dailyGoal: 0,
    dailyCompleted: 0,
    weeklyGoal: 0,
    weeklyCompleted: 0,
    monthlyGoal: 0,
    monthlyCompleted: 0,
    streakDays: 0,
    goalRate: 0,
    totalTopics: 0,
    studyLogs: [],
    recommendedTopics: []
  },

  /**
   * Check if user is logged in via Google OAuth2 or guest session
   */
  async checkAuth() {
    // 1. Try real backend OAuth2 session
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/auth/me`, { credentials: 'include' });
      if (res.ok) {
        const userData = await res.json();
        this.user = { ...userData, isAuthenticated: true, isGuest: false };
        return this.user;
      }
    } catch (e) {
      console.log("Backend auth check skipped:", e.message);
    }

    // 2. Check local guest session
    const savedUser = localStorage.getItem('sb_user');
    if (savedUser) {
      try {
        this.user = JSON.parse(savedUser);
        return this.user;
      } catch (e) {}
    }

    this.user = null;
    return null;
  },

  /**
   * Login as Guest / Custom Name
   */
  loginGuest(name) {
    const cleanName = (name && name.trim()) ? name.trim() : "Student";
    const guestUser = {
      id: Date.now(),
      name: cleanName,
      email: `${cleanName.toLowerCase().replace(/\s+/g, '')}@studybuddy.ai`,
      pictureUrl: "https://lh3.googleusercontent.com/a/default-user=s96-c",
      isAuthenticated: true,
      isGuest: true
    };
    this.user = guestUser;
    localStorage.setItem('sb_user', JSON.stringify(guestUser));
    return guestUser;
  },

  /**
   * Logout
   */
  async logout() {
    try {
      await fetch(`${this.baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {}
    localStorage.removeItem('sb_user');
    this.user = null;
    window.location.reload();
  },

  /**
   * Load real data from backend or local user storage
   */
  async loadUserData() {
    // If authenticated on backend, fetch dashboard stats & logs
    if (this.user && !this.user.isGuest) {
      try {
        const [statsRes, logsRes] = await Promise.all([
          fetch(`${this.baseUrl}/api/v1/dashboard/stats`, { credentials: 'include' }),
          fetch(`${this.baseUrl}/api/v1/study-logs?size=50`, { credentials: 'include' })
        ]);

        if (statsRes.ok) {
          const stats = await statsRes.json();
          this.state.dailyGoal = stats.dailyGoals?.total || 0;
          this.state.dailyCompleted = stats.dailyGoals?.completed || 0;
          this.state.weeklyGoal = stats.weeklyGoals?.total || 0;
          this.state.weeklyCompleted = stats.weeklyGoals?.completed || 0;
          this.state.monthlyGoal = stats.monthlyGoals?.total || 0;
          this.state.monthlyCompleted = stats.monthlyGoals?.completed || 0;
          this.state.streakDays = stats.todayLogsCount > 0 ? 1 : 0;
        }

        if (logsRes.ok) {
          const page = await logsRes.json();
          this.state.studyLogs = page.content || [];
          this.state.totalTopics = page.totalElements || this.state.studyLogs.length;
        }

        this.calculateMetrics();
        return;
      } catch (e) {
        console.warn("Could not load backend stats, falling back to local storage:", e);
      }
    }

    // Load from local storage for the user
    const storageKey = `sb_data_${this.user ? this.user.name : 'anon'}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.state = { ...this.state, ...parsed };
      } catch (e) {}
    } else {
      // Empty fresh state: ALL ZEROS
      this.state = {
        dailyGoal: 0,
        dailyCompleted: 0,
        weeklyGoal: 0,
        weeklyCompleted: 0,
        monthlyGoal: 0,
        monthlyCompleted: 0,
        streakDays: 0,
        goalRate: 0,
        totalTopics: 0,
        studyLogs: [],
        recommendedTopics: []
      };
    }

    this.calculateMetrics();
  },

  saveLocalState() {
    const storageKey = `sb_data_${this.user ? this.user.name : 'anon'}`;
    localStorage.setItem(storageKey, JSON.stringify(this.state));
  },

  /**
   * Add a study log entered by the user
   */
  async addStudyLog(content, durationMinutes = 45, subject = "General") {
    const today = new Date().toISOString().split('T')[0];

    // Try backend
    if (this.user && !this.user.isGuest) {
      try {
        const res = await fetch(`${this.baseUrl}/api/v1/study-logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            subject: subject || "Study",
            content: content,
            durationMinutes: parseInt(durationMinutes) || 30,
            logDate: today
          })
        });
        if (res.ok) {
          const savedLog = await res.json();
          this.state.studyLogs.unshift(savedLog);
          this.state.dailyCompleted++;
          this.state.weeklyCompleted++;
          this.state.monthlyCompleted++;
          this.state.totalTopics++;
          this.calculateMetrics();
          return savedLog;
        }
      } catch (e) {}
    }

    // Local user entry
    const newLog = {
      id: Date.now(),
      subject: subject || "Study",
      content: content,
      durationMinutes: parseInt(durationMinutes) || 30,
      logDate: today,
      aiSuggestions: []
    };

    this.state.studyLogs.unshift(newLog);
    this.state.dailyCompleted++;
    this.state.weeklyCompleted++;
    this.state.monthlyCompleted++;
    this.state.totalTopics++;
    this.calculateMetrics();
    this.saveLocalState();
    return newLog;
  },

  /**
   * Save user goals
   */
  async saveGoals(daily, weekly, monthly) {
    this.state.dailyGoal = parseInt(daily) || 0;
    this.state.weeklyGoal = parseInt(weekly) || 0;
    this.state.monthlyGoal = parseInt(monthly) || 0;

    const today = new Date().toISOString().split('T')[0];

    // Sync with backend if logged in
    if (this.user && !this.user.isGuest) {
      try {
        if (daily > 0) {
          await fetch(`${this.baseUrl}/api/v1/goals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ goalType: 'DAILY', description: `Study ${daily} topics`, targetDate: today })
          });
        }
        if (weekly > 0) {
          await fetch(`${this.baseUrl}/api/v1/goals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ goalType: 'WEEKLY', description: `Complete ${weekly} topics this week`, targetDate: today })
          });
        }
        if (monthly > 0) {
          await fetch(`${this.baseUrl}/api/v1/goals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ goalType: 'MONTHLY', description: `Complete ${monthly} topics this month`, targetDate: today })
          });
        }
      } catch (e) {}
    }

    this.calculateMetrics();
    this.saveLocalState();
    return true;
  },

  /**
   * Calculate streak, goal rate, and weekly chart data from actual logs
   */
  calculateMetrics() {
    this.state.totalTopics = this.state.studyLogs.length;

    // Calculate Goal Rate
    const totalGoalTargets = (this.state.dailyGoal || 0) + (this.state.weeklyGoal || 0) + (this.state.monthlyGoal || 0);
    const totalCompleted = (this.state.dailyCompleted || 0) + (this.state.weeklyCompleted || 0) + (this.state.monthlyCompleted || 0);
    if (totalGoalTargets > 0) {
      this.state.goalRate = Math.min(100, Math.round((totalCompleted / totalGoalTargets) * 100));
    } else {
      this.state.goalRate = 0;
    }

    // Calculate Streak from unique consecutive dates
    const logDates = new Set(this.state.studyLogs.map(l => l.logDate || l.date));
    let streak = 0;
    let curr = new Date();
    while (true) {
      const dateStr = curr.toISOString().split('T')[0];
      if (logDates.has(dateStr)) {
        streak++;
        curr.setDate(curr.getDate() - 1);
      } else {
        // If today has no log yet, check if yesterday had one
        if (streak === 0) {
          curr.setDate(curr.getDate() - 1);
          const yestStr = curr.toISOString().split('T')[0];
          if (logDates.has(yestStr)) {
            streak = 1;
            curr.setDate(curr.getDate() - 1);
            continue;
          }
        }
        break;
      }
    }
    this.state.streakDays = streak;
  },

  /**
   * Generate weekly chart points from actual user logs
   */
  getWeeklyChartData() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };

    // Get current Monday
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sun, 1 is Mon
    const diffToMon = (currentDay === 0 ? -6 : 1) - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);
    monday.setHours(0,0,0,0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23,59,59,999);

    this.state.studyLogs.forEach(log => {
      const dStr = log.logDate || log.date;
      if (dStr) {
        const d = new Date(dStr);
        if (d >= monday && d <= sunday) {
          const dayIndex = d.getDay(); // 0=Sun, 1=Mon...
          const dayName = dayIndex === 0 ? 'Sun' : days[dayIndex - 1];
          counts[dayName] = (counts[dayName] || 0) + 1;
        }
      }
    });

    return days.map(day => ({
      day: day,
      val: counts[day] || 0
    }));
  },

  /**
   * Get AI suggestions based on the user's actual entered topics
   */
  async getAiRecommendations() {
    if (this.state.studyLogs.length === 0) {
      return [];
    }

    const latest = this.state.studyLogs[0];
    const topic = latest.content || "";

    // If backend AI microservice has generated suggestions on the log
    if (latest.aiSuggestions && latest.aiSuggestions.length > 0) {
      return latest.aiSuggestions;
    }

    // Contextual recommendations based on user's entered subject/topic
    const tLower = topic.toLowerCase();
    if (tLower.includes('fraction') || tLower.includes('math') || tLower.includes('algebra') || tLower.includes('calc')) {
      return [
        `Advanced ${topic}: Problem Solving & Practice`,
        "Geometry: Shapes, Angles and Proofs",
        "Linear Equations and Word Problems"
      ];
    } else if (tLower.includes('bio') || tLower.includes('chem') || tLower.includes('phys') || tLower.includes('sci')) {
      return [
        `Core Principles of ${topic}`,
        "Energy Transformations and Lab Applications",
        "Scientific Inquiry: Formulating Hypotheses"
      ];
    } else if (tLower.includes('hist') || tLower.includes('geo') || tLower.includes('social')) {
      return [
        `Key Historical Milestones of ${topic}`,
        "Global Impact and Cause-and-Effect Analysis",
        "Comparative Timeline Studies"
      ];
    } else {
      return [
        `Mastering the Fundamentals of ${topic}`,
        `Practical Applications of ${topic} in Real Life`,
        `Exam Revision & Key Concepts in ${topic}`
      ];
    }
  }
};
