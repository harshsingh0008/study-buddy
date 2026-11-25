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
  const credentialsForm = document.getElementById('credentials-form');
  const authNameInput = document.getElementById('auth-name-input');
  const authEmailInput = document.getElementById('auth-email-input');
  const authPasswordInput = document.getElementById('auth-password-input');
  const credentialsSubmit = document.getElementById('credentials-submit');
  const authModeToggle = document.getElementById('auth-mode-toggle');
  let authMode = 'login';

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
  const inputTodaySubject = document.getElementById('input-today-subject');
  const inputTodayDuration = document.getElementById('input-today-duration');
  const timeChips = document.querySelectorAll('.time-chip');
  const btnAddStudy = document.getElementById('btn-add-study');

  const stepperDaily = document.getElementById('stepper-daily');
  const stepperWeekly = document.getElementById('stepper-weekly');
  const stepperMonthly = document.getElementById('stepper-monthly');
  const btnSaveGoals = document.getElementById('btn-save-goals');

  // Specific Goals elements
  const inputGoalDesc = document.getElementById('input-goal-desc');
  const selectGoalType = document.getElementById('select-goal-type');
  const inputGoalDate = document.getElementById('input-goal-date');
  const btnAddSpecificGoal = document.getElementById('btn-add-specific-goal');
  const specificGoalsList = document.getElementById('specific-goals-list');
  const specificGoalsCount = document.getElementById('specific-goals-count');
  const goalFilterBtns = document.querySelectorAll('.goal-filter-btn');

  // Modal elements
  const modalEditGoal = document.getElementById('modal-edit-goal');
  const editGoalId = document.getElementById('edit-goal-id');
  const editGoalDesc = document.getElementById('edit-goal-desc');
  const editGoalType = document.getElementById('edit-goal-type');
  const editGoalDate = document.getElementById('edit-goal-date');
  const btnCloseEditModal = document.getElementById('btn-close-edit-modal');
  const btnCancelEditGoal = document.getElementById('btn-cancel-edit-goal');
  const btnSaveEditGoal = document.getElementById('btn-save-edit-goal');

  // Initialize Today's Date
  const todayStr = new Date().toISOString().split('T')[0];
  if (inputGoalDate) inputGoalDate.value = todayStr;
  if (editGoalDate) editGoalDate.value = todayStr;

  // Time preset chips click handlers
  timeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      timeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const timeVal = chip.getAttribute('data-time');
      if (inputTodayDuration) {
        inputTodayDuration.value = timeVal;
      }
    });
  });

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

  if (authModeToggle) {
    authModeToggle.addEventListener('click', () => {
      authMode = authMode === 'login' ? 'register' : 'login';
      const registering = authMode === 'register';
      authNameInput.classList.toggle('hidden', !registering);
      authNameInput.required = registering;
      authPasswordInput.autocomplete = registering ? 'new-password' : 'current-password';
      credentialsSubmit.textContent = registering ? 'Create account' : 'Sign in';
      authModeToggle.textContent = registering ? 'Already have an account? Sign in' : 'Create an account';
    });
  }

  if (credentialsForm) {
    credentialsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const registering = authMode === 'register';
      credentialsSubmit.disabled = true;
      credentialsSubmit.textContent = registering ? 'Creating account...' : 'Signing in...';

      try {
        const user = registering
          ? await API.register(authNameInput.value.trim(), authEmailInput.value.trim(), authPasswordInput.value)
          : await API.login(authEmailInput.value.trim(), authPasswordInput.value);
        authPasswordInput.value = '';
        await API.loadUserData();
        showApp(user);
        showToast(`Welcome to StudyBuddy, ${user.name}! 🎓`, 'success');
      } catch (error) {
        showToast(error.message || 'Unable to authenticate. Please try again.', 'info');
      } finally {
        credentialsSubmit.disabled = false;
        credentialsSubmit.textContent = authMode === 'register' ? 'Create account' : 'Sign in';
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

    // Specific Goals
    renderSpecificGoals();

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

      const subject = inputTodaySubject ? inputTodaySubject.value : "General";
      const duration = inputTodayDuration ? (parseInt(inputTodayDuration.value) || 45) : 45;

      btnAddStudy.disabled = true;
      btnAddStudy.textContent = "Saving...";

      await API.addStudyLog(topic, duration, subject);
      inputTodayStudy.value = '';
      await refreshUI();

      showToast(`Logged "${topic}" (${duration} mins) to your study tracker! 🎉`, "success");
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

  // Topic Info Modal elements
  const modalTopicInfo = document.getElementById('modal-topic-info');
  const topicInfoTitle = document.getElementById('topic-info-title');
  const topicInfoModelBadge = document.getElementById('topic-info-model-badge');
  const topicInfoContent = document.getElementById('topic-info-content');
  const btnCloseTopicModal = document.getElementById('btn-close-topic-modal');
  const btnCloseTopicNotes = document.getElementById('btn-close-topic-notes');
  const btnTopicAddStudy = document.getElementById('btn-topic-add-study');
  const btnTopicAddGoal = document.getElementById('btn-topic-add-goal');

  let currentTopicInModal = "";

  function closeTopicInfoModal() {
    if (modalTopicInfo) modalTopicInfo.classList.add('hidden');
  }

  if (btnCloseTopicModal) btnCloseTopicModal.addEventListener('click', closeTopicInfoModal);
  if (btnCloseTopicNotes) btnCloseTopicNotes.addEventListener('click', closeTopicInfoModal);

  if (btnTopicAddStudy) {
    btnTopicAddStudy.addEventListener('click', () => {
      if (currentTopicInModal && inputTodayStudy) {
        inputTodayStudy.value = currentTopicInModal;
        closeTopicInfoModal();
        switchTab('home');
        showToast(`Selected "${currentTopicInModal}"! Click "Add Study" to log it.`, "info");
      }
    });
  }

  if (btnTopicAddGoal) {
    btnTopicAddGoal.addEventListener('click', async () => {
      if (currentTopicInModal) {
        await API.addSpecificGoal(`Master ${currentTopicInModal}`, 'DAILY');
        closeTopicInfoModal();
        renderSpecificGoals();
        switchTab('goals');
        showToast(`Added "${currentTopicInModal}" to your study goals! 🎯`, "success");
      }
    });
  }

  async function openTopicInfoModal(topic) {
    if (!modalTopicInfo) return;
    currentTopicInModal = topic;
    topicInfoTitle.textContent = topic;
    topicInfoContent.innerHTML = '';
    modalTopicInfo.classList.remove('hidden');

    const subject = inputTodaySubject ? inputTodaySubject.value : "General";
    const data = await API.getTopicInfo(topic, subject);

    if (data.model && data.model.includes('gemini')) {
      topicInfoModelBadge.textContent = "✨ Powered by Google Gemini AI";
      topicInfoModelBadge.style.background = "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)";
    } else {
      topicInfoModelBadge.textContent = "📖 StudyBuddy Educational Notes";
      topicInfoModelBadge.style.background = "linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)";
    }

    topicInfoContent.innerHTML = formatMarkdownToHtml(data.content || "");
  }

  function formatMarkdownToHtml(md) {
    if (!md) return '';

    let html = md
      // Escape script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code spans
      .replace(/`([^`]+)`/g, '<code>$1</code>');

    // Process blocks / lines
    const lines = html.split('\n');
    let out = [];
    let inUl = false;
    let inOl = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      // Heading 3 / 4
      if (line.startsWith('### ')) {
        if (inUl) { out.push('</ul>'); inUl = false; }
        if (inOl) { out.push('</ol>'); inOl = false; }
        out.push(`<h4>${line.substring(4)}</h4>`);
        continue;
      }
      if (line.startsWith('## ')) {
        if (inUl) { out.push('</ul>'); inUl = false; }
        if (inOl) { out.push('</ol>'); inOl = false; }
        out.push(`<h3>${line.substring(3)}</h3>`);
        continue;
      }

      // Blockquotes / Tips
      if (line.startsWith('> ')) {
        if (inUl) { out.push('</ul>'); inUl = false; }
        if (inOl) { out.push('</ol>'); inOl = false; }
        out.push(`<div class="study-tip-callout">${line.substring(2)}</div>`);
        continue;
      }

      // Numbered list item: 1. Item
      const numMatch = line.match(/^([0-9]+)\.\s+(.*)/);
      if (numMatch) {
        if (inUl) { out.push('</ul>'); inUl = false; }
        if (!inOl) { out.push('<ol>'); inOl = true; }
        out.push(`<li>${numMatch[2]}</li>`);
        continue;
      }

      // Bullet item: - or *
      const bulletMatch = line.match(/^[-*•]\s+(.*)/);
      if (bulletMatch) {
        if (inOl) { out.push('</ol>'); inOl = false; }
        if (!inUl) { out.push('<ul>'); inUl = true; }
        out.push(`<li>${bulletMatch[1]}</li>`);
        continue;
      }

      // Normal text line
      if (line === '') {
        if (inUl) { out.push('</ul>'); inUl = false; }
        if (inOl) { out.push('</ol>'); inOl = false; }
      } else {
        if (!inUl && !inOl) {
          out.push(`<p>${line}</p>`);
        } else {
          out.push(`<span>${line}</span>`);
        }
      }
    }

    if (inUl) out.push('</ul>');
    if (inOl) out.push('</ol>');

    return out.join('');
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
        <div class="topic-name-wrap" title="Click to view full study notes & key concepts" data-topic="${t}">
          <div class="topic-name">${t}</div>
          <span class="topic-learn-hint">Click to learn & view key concepts 📖</span>
        </div>
        <div class="topic-actions-group">
          <button class="learn-topic-btn" title="Learn key concepts" data-topic="${t}">📖 Learn</button>
          <button class="stepper-btn add-topic-btn" title="Add as today's study topic" data-topic="${t}">+</button>
        </div>
      </div>
    `).join('');

    // Open Study Notes Modal when clicking topic name or Learn button
    topicListContainer.querySelectorAll('.topic-name-wrap, .learn-topic-btn').forEach(el => {
      el.addEventListener('click', () => {
        const topic = el.getAttribute('data-topic');
        openTopicInfoModal(topic);
      });
    });

    // Add directly to Today's Study
    topicListContainer.querySelectorAll('.add-topic-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
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
      btnTryAgain.disabled = true;
      const newTopics = await API.getAiRecommendations(true);
      renderAiTopics(newTopics);
      btnTryAgain.textContent = "Try Again";
      btnTryAgain.disabled = false;
      showToast("Fresh AI recommendations loaded! ✨", "info");
    });
  }

  if (btnSaveTopics) {
    btnSaveTopics.addEventListener('click', async () => {
      showToast("Topics bookmarked to your study plan! 🔖", "success");
    });
  }

  // ========================================================
  // SPECIFIC STUDY GOALS CONTROLLER
  // ========================================================
  let currentGoalFilter = 'all';

  if (goalFilterBtns) {
    goalFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        goalFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentGoalFilter = btn.getAttribute('data-filter');
        renderSpecificGoals();
      });
    });
  }

  function renderSpecificGoals() {
    if (!specificGoalsList) return;
    const goals = API.state.customGoals || [];

    // Counter badge
    if (specificGoalsCount) {
      const activeCount = goals.filter(g => !g.isCompleted).length;
      specificGoalsCount.textContent = `${activeCount} Active / ${goals.length} Total`;
    }

    let filtered = goals;
    if (currentGoalFilter === 'DAILY') {
      filtered = goals.filter(g => g.goalType === 'DAILY');
    } else if (currentGoalFilter === 'WEEKLY') {
      filtered = goals.filter(g => g.goalType === 'WEEKLY');
    } else if (currentGoalFilter === 'MONTHLY') {
      filtered = goals.filter(g => g.goalType === 'MONTHLY');
    } else if (currentGoalFilter === 'pending') {
      filtered = goals.filter(g => !g.isCompleted);
    } else if (currentGoalFilter === 'completed') {
      filtered = goals.filter(g => g.isCompleted);
    }

    if (filtered.length === 0) {
      specificGoalsList.innerHTML = `
        <div class="empty-state-box" style="padding: 24px;">
          <div class="empty-state-icon">🎯</div>
          <div class="empty-state-title">No goals found</div>
          <div class="empty-state-desc">Add a specific study target above to keep yourself accountable!</div>
        </div>
      `;
      return;
    }

    specificGoalsList.innerHTML = filtered.map(g => `
      <div class="specific-goal-item ${g.isCompleted ? 'completed' : ''}" data-id="${g.id}">
        <div class="goal-item-left">
          <button class="goal-check-btn ${g.isCompleted ? 'checked' : ''}" title="${g.isCompleted ? 'Mark Pending' : 'Mark Completed'}" data-id="${g.id}">
            ${g.isCompleted ? '✓' : ''}
          </button>
          <div class="goal-item-content">
            <span class="goal-desc-text">${escapeHtml(g.description)}</span>
            <div class="goal-item-meta">
              <span class="goal-type-chip ${g.goalType}">${g.goalType}</span>
              <span>🕒 Due: ${g.targetDate || 'Today'}</span>
            </div>
          </div>
        </div>
        <div class="goal-item-actions">
          <button class="btn-icon-action btn-edit-goal" title="Edit Goal" data-id="${g.id}">✏️</button>
          <button class="btn-icon-action delete btn-delete-goal" title="Delete Goal" data-id="${g.id}">🗑️</button>
        </div>
      </div>
    `).join('');

    // Toggle complete
    specificGoalsList.querySelectorAll('.goal-check-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const goal = goals.find(g => g.id == id);
        if (goal) {
          const newStatus = !goal.isCompleted;
          await API.toggleGoalCompletion(id, newStatus);
          renderSpecificGoals();
          showToast(newStatus ? "Goal completed! 🎉" : "Goal marked as pending", "info");
        }
      });
    });

    // Edit button
    specificGoalsList.querySelectorAll('.btn-edit-goal').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const goal = goals.find(g => g.id == id);
        if (goal) {
          openEditGoalModal(goal);
        }
      });
    });

    // Delete button
    specificGoalsList.querySelectorAll('.btn-delete-goal').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await API.deleteSpecificGoal(id);
        renderSpecificGoals();
        showToast("Goal removed", "info");
      });
    });
  }

  // Add specific goal action
  if (btnAddSpecificGoal) {
    btnAddSpecificGoal.addEventListener('click', async () => {
      const desc = inputGoalDesc.value.trim();
      const type = selectGoalType.value;
      const date = inputGoalDate.value || todayStr;

      if (!desc) {
        showToast("Please enter a goal description!", "info");
        inputGoalDesc.focus();
        return;
      }

      btnAddSpecificGoal.disabled = true;
      btnAddSpecificGoal.textContent = "Adding...";

      await API.addSpecificGoal(desc, type, date);
      inputGoalDesc.value = '';
      btnAddSpecificGoal.disabled = false;
      btnAddSpecificGoal.textContent = "+ Add Specific Goal";

      renderSpecificGoals();
      showToast("Goal added successfully! 🎯", "success");
    });

    if (inputGoalDesc) {
      inputGoalDesc.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          btnAddSpecificGoal.click();
        }
      });
    }
  }

  // Edit Goal Modal handlers
  function openEditGoalModal(goal) {
    if (!modalEditGoal) return;
    editGoalId.value = goal.id;
    editGoalDesc.value = goal.description;
    editGoalType.value = goal.goalType || "DAILY";
    editGoalDate.value = goal.targetDate || todayStr;
    modalEditGoal.classList.remove('hidden');
    editGoalDesc.focus();
  }

  function closeEditGoalModal() {
    if (modalEditGoal) modalEditGoal.classList.add('hidden');
  }

  if (btnCloseEditModal) btnCloseEditModal.addEventListener('click', closeEditGoalModal);
  if (btnCancelEditGoal) btnCancelEditGoal.addEventListener('click', closeEditGoalModal);

  if (btnSaveEditGoal) {
    btnSaveEditGoal.addEventListener('click', async () => {
      const id = editGoalId.value;
      const desc = editGoalDesc.value.trim();
      const type = editGoalType.value;
      const date = editGoalDate.value || todayStr;

      if (!desc) {
        showToast("Goal description cannot be empty!", "info");
        editGoalDesc.focus();
        return;
      }

      btnSaveEditGoal.disabled = true;
      btnSaveEditGoal.textContent = "Saving...";

      await API.updateSpecificGoal(id, desc, type, date);
      closeEditGoalModal();
      btnSaveEditGoal.disabled = false;
      btnSaveEditGoal.textContent = "Save Changes";

      renderSpecificGoals();
      showToast("Goal updated successfully! 🎯", "success");
    });
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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
