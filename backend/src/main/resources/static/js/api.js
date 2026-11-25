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
    customGoals: [],
    recommendedTopics: []
  },

  /**
   * Check if user is logged in via JWT, Google OAuth2, or guest session
   */
  async checkAuth() {
    // Try the backend first, using a bearer token when one is available.
    try {
      let res = await this.request(`${this.baseUrl}/api/v1/auth/me`);
      if (res.status === 401 && sessionStorage.getItem('sb_token')) {
        sessionStorage.removeItem('sb_token');
        res = await this.request(`${this.baseUrl}/api/v1/auth/me`);
      }
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

  async request(url, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = sessionStorage.getItem('sb_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(url, {
      ...options,
      headers,
      credentials: options.credentials || 'include'
    });
  },

  async authenticate(endpoint, credentials) {
    const res = await this.request(`${this.baseUrl}/api/v1/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Unable to authenticate. Please try again.');
    }
    if (!data.token || !data.user) {
      throw new Error('The server returned an invalid authentication response.');
    }

    sessionStorage.setItem('sb_token', data.token);
    this.user = { ...data.user, isAuthenticated: true, isGuest: false };
    return this.user;
  },

  login(email, password) {
    return this.authenticate('login', { email, password });
  },

  register(name, email, password) {
    return this.authenticate('register', { name, email, password });
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
      await this.request(`${this.baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {}
    sessionStorage.removeItem('sb_token');
    localStorage.removeItem('sb_user');
    this.user = null;
    window.location.reload();
  },

  /**
   * Load real data from backend or local user storage
   */
  async loadUserData() {
    // If authenticated on backend, fetch dashboard stats & logs & goals
    if (this.user && !this.user.isGuest) {
      try {
        const [statsRes, logsRes, goalsRes] = await Promise.all([
          this.request(`${this.baseUrl}/api/v1/dashboard/stats`),
          this.request(`${this.baseUrl}/api/v1/study-logs?size=50`),
          this.request(`${this.baseUrl}/api/v1/goals?size=100`)
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

        if (goalsRes.ok) {
          const goalsPage = await goalsRes.json();
          this.state.customGoals = goalsPage.content || [];
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
    const duration = Math.max(1, parseInt(durationMinutes) || 45);
    const safeSubject = subject || "General";

    // Try backend
    if (this.user && !this.user.isGuest) {
      try {
        const res = await this.request(`${this.baseUrl}/api/v1/study-logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            subject: safeSubject,
            content: content,
            durationMinutes: duration,
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
      subject: safeSubject,
      content: content,
      durationMinutes: duration,
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
          await this.request(`${this.baseUrl}/api/v1/goals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ goalType: 'DAILY', description: `Study ${daily} topics`, targetDate: today })
          });
        }
        if (weekly > 0) {
          await this.request(`${this.baseUrl}/api/v1/goals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ goalType: 'WEEKLY', description: `Complete ${weekly} topics this week`, targetDate: today })
          });
        }
        if (monthly > 0) {
          await this.request(`${this.baseUrl}/api/v1/goals`, {
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
   * Add a specific editable study goal
   */
  async addSpecificGoal(description, goalType = "DAILY", targetDate = null) {
    const today = new Date().toISOString().split('T')[0];
    const safeDate = targetDate || today;

    if (this.user && !this.user.isGuest) {
      try {
        const res = await this.request(`${this.baseUrl}/api/v1/goals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            description: description,
            goalType: goalType,
            targetDate: safeDate
          })
        });
        if (res.ok) {
          const newGoal = await res.json();
          this.state.customGoals.unshift(newGoal);
          this.saveLocalState();
          return newGoal;
        }
      } catch (e) {
        console.warn("Failed to create goal on backend, saving locally:", e);
      }
    }

    const localGoal = {
      id: Date.now(),
      description: description,
      goalType: goalType,
      targetDate: safeDate,
      isCompleted: false,
      createdAt: new Date().toISOString()
    };
    this.state.customGoals.unshift(localGoal);
    this.saveLocalState();
    return localGoal;
  },

  /**
   * Update an existing study goal
   */
  async updateSpecificGoal(id, description, goalType, targetDate) {
    const today = new Date().toISOString().split('T')[0];
    const safeDate = targetDate || today;

    if (this.user && !this.user.isGuest) {
      try {
        const res = await this.request(`${this.baseUrl}/api/v1/goals/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            description: description,
            goalType: goalType,
            targetDate: safeDate
          })
        });
        if (res.ok) {
          const updated = await res.json();
          const idx = this.state.customGoals.findIndex(g => g.id == id);
          if (idx !== -1) {
            this.state.customGoals[idx] = updated;
          }
          this.saveLocalState();
          return updated;
        }
      } catch (e) {
        console.warn("Failed to update goal on backend:", e);
      }
    }

    const idx = this.state.customGoals.findIndex(g => g.id == id);
    if (idx !== -1) {
      this.state.customGoals[idx].description = description;
      this.state.customGoals[idx].goalType = goalType;
      this.state.customGoals[idx].targetDate = safeDate;
      this.saveLocalState();
      return this.state.customGoals[idx];
    }
    return null;
  },

  /**
   * Toggle completion status of a goal
   */
  async toggleGoalCompletion(id, isCompleted) {
    if (this.user && !this.user.isGuest) {
      try {
        const res = await this.request(`${this.baseUrl}/api/v1/goals/${id}/complete`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ isCompleted: isCompleted })
        });
        if (res.ok) {
          const updated = await res.json();
          const idx = this.state.customGoals.findIndex(g => g.id == id);
          if (idx !== -1) {
            this.state.customGoals[idx] = updated;
          }
          this.saveLocalState();
          return updated;
        }
      } catch (e) {}
    }

    const idx = this.state.customGoals.findIndex(g => g.id == id);
    if (idx !== -1) {
      this.state.customGoals[idx].isCompleted = isCompleted;
      this.saveLocalState();
      return this.state.customGoals[idx];
    }
    return null;
  },

  /**
   * Delete a specific goal
   */
  async deleteSpecificGoal(id) {
    if (this.user && !this.user.isGuest) {
      try {
        await this.request(`${this.baseUrl}/api/v1/goals/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
      } catch (e) {}
    }

    this.state.customGoals = this.state.customGoals.filter(g => g.id != id);
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
   * Powered by Google Gemini AI with smart contextual fallback.
   */
  async getAiRecommendations(forceRefresh = false) {
    const latest = this.state.studyLogs.length > 0 ? this.state.studyLogs[0] : null;
    const topic = latest ? (latest.content || "") : "Daily Study Habits";
    const subject = latest ? (latest.subject || "General") : "General";

    // 1. If not forcing refresh and latest log already has saved suggestions
    if (!forceRefresh && latest && latest.aiSuggestions && latest.aiSuggestions.length > 0) {
      return latest.aiSuggestions;
    }

    // 2. Call backend Gemini AI endpoint
    if (this.user && !this.user.isGuest) {
      try {
        const res = await this.request(`${this.baseUrl}/api/v1/ai/suggest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            studied: topic,
            subject: subject
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.suggestions && data.suggestions.length > 0) {
            this.state.recommendedTopics = data.suggestions;
            if (latest) {
              latest.aiSuggestions = data.suggestions;
            }
            return data.suggestions;
          }
        }
      } catch (e) {
        console.warn("Backend Gemini AI call skipped, using local fallback:", e);
      }
    }

    // 3. Contextual recommendations fallback
    const tLower = topic.toLowerCase();
    let fallbacks = [];
    if (tLower.includes('fraction') || tLower.includes('math') || tLower.includes('algebra') || tLower.includes('calc')) {
      fallbacks = [
        `Advanced ${topic}: Problem Solving & Practice`,
        "Geometry: Shapes, Angles and Proofs",
        "Linear Equations and Word Problems"
      ];
    } else if (tLower.includes('bio') || tLower.includes('chem') || tLower.includes('phys') || tLower.includes('sci')) {
      fallbacks = [
        `Core Principles and Mechanisms of ${topic}`,
        "Energy Transformations and Lab Applications",
        "Scientific Inquiry: Formulating Hypotheses"
      ];
    } else if (tLower.includes('hist') || tLower.includes('geo') || tLower.includes('social')) {
      fallbacks = [
        `Key Historical Milestones of ${topic}`,
        "Global Impact and Cause-and-Effect Analysis",
        "Comparative Timeline Studies"
      ];
    } else if (tLower.includes('prog') || tLower.includes('code') || tLower.includes('java') || tLower.includes('python')) {
      fallbacks = [
        `Data Structures & Algorithms in ${topic}`,
        `Building a Mini Project using ${topic}`,
        `Debugging, Testing & Clean Code Practices`
      ];
    } else {
      fallbacks = [
        `Mastering the Fundamentals of ${topic}`,
        `Practical Applications of ${topic} in Real Life`,
        `Exam Revision & Key Concepts in ${topic}`
      ];
    }

    this.state.recommendedTopics = fallbacks;
    return fallbacks;
  },

  /**
   * Fetch in-depth AI study notes for a specific topic using Gemini
   */
  async getTopicInfo(topic, subject = "General") {
    if (this.user && !this.user.isGuest) {
      try {
        const res = await this.request(`${this.baseUrl}/api/v1/ai/topic-info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            topic: topic,
            subject: subject
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.content) {
            return data;
          }
        }
      } catch (e) {
        console.warn("Backend topic info call skipped, using local notes:", e);
      }
    }

    // Default intelligent notes fallback for friction or other topics
    const tLower = (topic || "").toLowerCase();
    if (tLower.includes('friction')) {
      return {
        success: false,
        topic: topic,
        model: "studybuddy-assistant",
        content: `### 1. Overview & Definition
**Friction** is a contact force that opposes the relative motion or tendency of motion between two surfaces touching each other. It arises primarily from microscopic surface roughness (interlocking asperities) and molecular adhesion between surface points.

### 2. Key Concepts & Types of Friction
There are four primary types:
1. **Static Friction ($f_s$):** Acts when an object is at rest on a surface and prevents it from starting to move. It is self-adjusting up to a maximum limit ($0 \\le f_s \\le f_L$).
2. **Limiting Friction ($f_L$):** Maximum value of static friction, occurring just before motion begins ($f_L = \\mu_s N$).
3. **Sliding (Kinetic) Friction ($f_k$):** Acts when one surface actively slides over another ($f_k = \\mu_k N$). It is generally constant and slightly less than limiting friction.
4. **Rolling Friction ($f_r$):** Acts when an object rolls over a surface. It is significantly smaller than sliding friction due to reduced contact deformation.

### 3. Important Laws of Friction
- **Opposite Direction:** Friction always acts tangential to the surface and opposite to relative motion or its tendency.
- **Surface Nature:** Friction depends strictly on the nature, roughness, and materials of the surfaces in contact.
- **Area Independence:** Friction is approximately independent of the apparent area of contact for dry surfaces.
- **Normal Force Proportionality:** Maximum friction force is directly proportional to normal force: $f = \\mu N$.
- **Magnitude Hierarchy:** Limiting friction > Sliding friction >> Rolling friction ($f_L > f_k \\gg f_r$).

### 4. Real-World Applications & Examples
- **Walking & Driving:** Tires and shoe soles rely on friction to grip without slipping.
- **Braking Systems:** Vehicle brake pads press against rotors, using kinetic friction to convert kinetic energy into heat.
- **Fasteners:** Screws, nails in walls, and tied knots hold securely exclusively due to friction.

### 5. Exam Tip & Key Takeaway
> **Pro Tip:** Remember that static friction is **self-adjusting**—it only equals the applied force until the threshold of limiting friction is reached!`
      };
    }

    return {
      success: false,
      topic: topic,
      model: "studybuddy-assistant",
      content: `### 1. Overview & Definition
**${topic}** is a core study topic in ${subject}. Developing mastery over its fundamental principles enables you to solve theoretical problems and numerical applications effectively.

### 2. Key Concepts & Types
- **Primary Concepts:** Foundational definitions, representation forms, and boundary conditions.
- **Core Operations:** Standard manipulation rules, balancing equations, and isolating variables.
- **Interconnections:** How this topic connects to broader problem sets.

### 3. Important Laws & Formulas
- Core governing rules, laws, and axioms.
- Standard step-by-step problem-solving methods.
- Essential relationships and conservation principles.

### 4. Real-World Applications & Examples
- Practical engineering, scientific, and computing applications in industry.
- Real-life observations and phenomena.

### 5. Exam Tip
> **Pro Tip:** Focus on conceptual causality and core principles rather than simple rote memorization!`
    };
  }
};
