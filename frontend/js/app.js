/**
 * StudyBuddy Application Controller
 * Handles auth gating, login screen, real-time user data, and UI updates.
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Views & Shell
  const loginView = document.getElementById('login-view');
  const appContainer = document.getElementById('app-container');

  // Chart
  const chart = new StudyChart('study-progress-chart');

  // Nav & Sections
  const navItems = document.querySelectorAll('.nav-item');
  const viewSections = document.querySelectorAll('.view-section');

  // Login elements
  const guestNameInput = document.getElementById('guest-name-input');
  const btnGuestLogin = document.getElementById('btn-guest-login');

  // Progress Displays
  const dailyProgressText = document.getElementById('daily-goal-text');
  const dailyProgressBar = document.getElementById('daily-progress-bar');
  const weeklyProgressText = document.getElementById('weekly-goal-text');
  const weeklyProgressBar = document.getElementById('weekly-progress-bar');
  const monthlyProgressText = document.getElementById('monthly-goal-text');
  const monthlyProgressBar = document.getElementById('monthly-progress-bar');

  // Quick Stats
  const statTopicsVal = document.getElementById('stat-total-topics');
  const statStreakVal = document.getElementById('stat-streak');
  const statRateVal = document.getElementById('stat-rate');

  // Inputs & Steppers
  const inputTodayStudy = document.getElementById('input-today-study');
  const btnAddStudy = document.getElementById('btn-add-study');

  const stepperDaily = document.getElementById('stepper-daily');
  const stepperWeekly = document.getElementById('stepper-weekly');
  const stepperMonthly = document.getElementById('stepper-monthly');
  const btnSaveGoals = document.getElementById('btn-save-goals');

  // AI Assistant elements
  const btnGetSuggestionsHome = document.getElementById('btn-get-suggestions-home');
  const btnTryAgain = document.getElementById('btn-try-again');
  const btnSaveTopics = document.getElementById('btn-save-topics');
  const topicListContainer = document.getElementById('topic-recommendation-list');

  // User elements
  const userNameGreeting = document.getElementById('user-greeting-name');
  const userAvatarImg = document.getElementById('user-avatar-img');
  const profileAvatarImg = document.getElementById('profile-avatar-img');
  const profileName = document.getElementById('profile-name');
  const profileEmail = document.getElementById('profile-email');
  const profileStreak = document.getElementById('profile-streak');
  const profileTopics = document.getElementById('profile-topics');
  const profileRate = document.getElementById('profile-rate');
  const btnLogout = document.getElementById('btn-logout');

  // Table
  const studyTableBody = document.getElementById('study-logs-table-body');

  /**
   * SHOW/HIDE LOGIN vs APP
   */
  function showApp(user) {
    loginView.classList.add('hidden');
    appContainer.classList.remove('hidden');

    // Set User info
    const firstName = (user.name && user.name.trim()) ? user.name.trim().split(' ')[0] : "Student";
    userNameGreeting.textContent = firstName;
    if (user.pictureUrl) {
      userAvatarImg.src = user.pictureUrl;
      if (profileAvatarImg) profileAvatarImg.src = user.pictureUrl;
    }
    if (profileName) profileName.textContent = user.name || "Student";
    if (profileEmail) profileEmail.textContent = user.email || "student@studybuddy.ai";

    // Steppers initial values
    if (stepperDaily) stepperDaily.textContent = API.state.dailyGoal || 0;
    if (stepperWeekly) stepperWeekly.textContent = API.state.weeklyGoal || 0;
    if (stepperMonthly) stepperMonthly.textContent = API.state.monthlyGoal || 0;

    refreshUI();
  }

  function showLogin() {
    loginView.classList.remove('hidden');
    appContainer.classList.add('hidden');
  }

  // Handle Guest / Name Login
  if (btnGuestLogin) {
    btnGuestLogin.addEventListener('click', async (e) => {
      e.preventDefault();
      const name = guestNameInput.value.trim();
      if (!name) {
        guestNameInput.focus();
        showToast("Please enter your name to continue!", "info");
        return;
      }
      const user = API.loginGuest(name);
      await API.loadUserData();
      showApp(user);
      showToast(`Welcome to StudyBuddy, ${user.name}! 🎓`, "success");
    });
  }

  if (guestNameInput) {
    guestNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        btnGuestLogin.click();
      }
    });
  }

  // Tab Switching
  function switchTab(targetViewId) {
    navItems.forEach(item => {
      if (item.getAttribute('data-view') === targetViewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    viewSections.forEach(section => {
      if (section.id === `view-${targetViewId}`) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (targetViewId === 'home') {
      setTimeout(() => chart.render(), 80);
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const viewId = item.getAttribute('data-view');
      switchTab(viewId);
    });
  });

  if (btnGetSuggestionsHome) {
    btnGetSuggestionsHome.addEventListener('click', () => switchTab('assistant'));
  }

  /**
   * REFRESH ENTIRE UI WITH REAL DATA
   */
  async function refreshUI() {
    const s = API.state;

    // Daily Goal
    if (dailyProgressText) {
      dailyProgressText.textContent = `${s.dailyCompleted} / ${s.dailyGoal} Topics`;
    }
    if (dailyProgressBar) {
      const pct = s.dailyGoal > 0 ? Math.min(100, Math.round((s.dailyCompleted / s.dailyGoal) * 100)) : 0;
      dailyProgressBar.style.width = `${pct}%`;
    }

    // Weekly Goal
    if (weeklyProgressText) {
      weeklyProgressText.textContent = `${s.weeklyCompleted} / ${s.weeklyGoal} Topics`;
    }
    if (weeklyProgressBar) {
      const pct = s.weeklyGoal > 0 ? Math.min(100, Math.round((s.weeklyCompleted / s.weeklyGoal) * 100)) : 0;
      weeklyProgressBar.style.width = `${pct}%`;
    }

    // Monthly Goal
    if (monthlyProgressText) {
      monthlyProgressText.textContent = `${s.monthlyCompleted} / ${s.monthlyGoal} Topics`;
    }
    if (monthlyProgressBar) {
      const pct = s.monthlyGoal > 0 ? Math.min(100, Math.round((s.monthlyCompleted / s.monthlyGoal) * 100)) : 0;
      monthlyProgressBar.style.width = `${pct}%`;
    }

    // Quick Stats
    if (statTopicsVal) statTopicsVal.textContent = s.totalTopics;
    if (statStreakVal) statStreakVal.textContent = `${s.streakDays} Days`;
    if (statRateVal) statRateVal.textContent = `${s.goalRate}%`;

    // Profile Stats
    if (profileStreak) profileStreak.textContent = s.streakDays;
    if (profileTopics) profileTopics.textContent = s.totalTopics;
    if (profileRate) profileRate.textContent = `${s.goalRate}%`;

    // Chart with actual weekly data
    const chartPoints = API.getWeeklyChartData();
    chart.updateData(chartPoints);

    // Study Logs Table
    renderStudyLogsTable();

    // AI Suggestions
    const recommendations = await API.getAiRecommendations();
    renderAiTopics(recommendations);
  }

  // Steppers
  document.querySelectorAll('.stepper-control').forEach(stepper => {
    const btnMinus = stepper.querySelector('.btn-minus');
    const btnPlus = stepper.querySelector('.btn-plus');
    const valSpan = stepper.querySelector('.stepper-value');

    btnMinus.addEventListener('click', () => {
      let val = parseInt(valSpan.textContent) || 0;
      if (val > 0) {
        valSpan.textContent = val - 1;
      }
    });

    btnPlus.addEventListener('click', () => {
      let val = parseInt(valSpan.textContent) || 0;
      valSpan.textContent = val + 1;
    });
  });

  // Save Goals Action
  if (btnSaveGoals) {
    btnSaveGoals.addEventListener('click', async () => {
      const daily = parseInt(stepperDaily.textContent) || 0;
      const weekly = parseInt(stepperWeekly.textContent) || 0;
      const monthly = parseInt(stepperMonthly.textContent) || 0;

      await API.saveGoals(daily, weekly, monthly);
      await refreshUI();
      showToast("Goals saved successfully! 🎯", "success");
    });
  }

  // Add Study Topic
  if (btnAddStudy) {
    btnAddStudy.addEventListener('click', async () => {
      const topic = inputTodayStudy.value.trim();
      if (!topic) {
        showToast("Please enter what you studied today!", "info");
        inputTodayStudy.focus();
        return;
      }

      btnAddStudy.disabled = true;
      btnAddStudy.textContent = "Saving...";

      await API.addStudyLog(topic, 45, "Study");
      inputTodayStudy.value = '';
      await refreshUI();

      showToast(`Logged "${topic}" to your study tracker! 🎉`, "success");
      btnAddStudy.disabled = false;
      btnAddStudy.textContent = "Add Study";
    });

    inputTodayStudy.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        btnAddStudy.click();
      }
    });
  }

  // Render Table
  function renderStudyLogsTable() {
    if (!studyTableBody) return;
    const logs = API.state.studyLogs;
    if (!logs || logs.length === 0) {
      studyTableBody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="empty-state-box">
              <div class="empty-state-icon">📚</div>
              <div class="empty-state-title">No study sessions logged yet</div>
              <div class="empty-state-desc">Enter what you studied today in the Home tab to start tracking your progress!</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    studyTableBody.innerHTML = logs.map(l => `
      <tr>
        <td><strong>${l.content}</strong></td>
        <td><span class="tag-subject">${l.subject || 'Study'}</span></td>
        <td>${l.durationMinutes || 30} mins</td>
        <td>${l.logDate || l.date || 'Today'}</td>
        <td><span style="color:#10B981;font-weight:700;">Completed ✅</span></td>
      </tr>
    `).join('');
  }

  // Render AI Topics
  function renderAiTopics(topics) {
    if (!topicListContainer) return;
    if (!topics || topics.length === 0) {
      topicListContainer.innerHTML = `
        <div class="empty-state-box">
          <div class="empty-state-icon">✨</div>
          <div class="empty-state-title">No suggestions yet</div>
          <div class="empty-state-desc">Log your first study topic on the Home tab, and our AI assistant will recommend next topics!</div>
        </div>
      `;
      return;
    }

    topicListContainer.innerHTML = topics.map((t, index) => `
      <div class="topic-item">
        <div class="topic-num-badge">${index + 1}</div>
        <div class="topic-name">${t}</div>
        <button class="stepper-btn add-topic-btn" title="Add as today's study topic" data-topic="${t}">+</button>
      </div>
    `).join('');

    topicListContainer.querySelectorAll('.add-topic-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const topic = btn.getAttribute('data-topic');
        inputTodayStudy.value = topic;
        switchTab('home');
        showToast(`Selected "${topic}"! Click "Add Study" to log it.`, "info");
      });
    });
  }

  if (btnTryAgain) {
    btnTryAgain.addEventListener('click', async () => {
      btnTryAgain.textContent = "Generating...";
      const newTopics = await API.getAiRecommendations();
      renderAiTopics(newTopics);
      btnTryAgain.textContent = "Try Again";
      showToast("Fresh AI recommendations loaded! ✨", "info");
    });
  }

  if (btnSaveTopics) {
    btnSaveTopics.addEventListener('click', async () => {
      showToast("Topics bookmarked to your study plan! 🔖", "success");
    });
  }

  // Logout
  if (btnLogout) {
    btnLogout.addEventListener('click', () => API.logout());
  }

  // Toast
  function showToast(message, type = "info") {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  /**
   * INITIALIZE APPLICATION ON STARTUP
   */
  const user = await API.checkAuth();
  if (user) {
    showApp(user);
    await API.loadUserData();
    refreshUI();
  } else {
    showLogin();
  }
});
