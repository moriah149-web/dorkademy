// ============================================================
// Dorkademy - Study App for OT Licensing Exam
// ============================================================

// --- State ---
let DATA = { topics: [], questions: [], simulations: [] };
let state = {
    currentPage: 'dashboard',
    currentTopicId: null,
    // Test state
    testQuestions: [],   // array of question objects for current test
    testIndex: 0,        // currently viewed question index
    testSelections: [],   // array of selected option index per question (-1 = unanswered)
    testType: '',         // 'simulation', 'topic', 'practice', 'weak'
    testSimId: null,      // simulation id if applicable
    // Timer state
    timerSeconds: 0,      // remaining seconds
    timerInterval: null   // setInterval id
};

// --- Config ---
const SIMULATION_DURATION_MINUTES = 180; // 3 hours — CONFIRM with Moria

// --- LocalStorage Keys ---
const LS = {
    MISTAKES: 'dorkademy_mistakes',
    STREAK: 'dorkademy_streak',
    HISTORY: 'dorkademy_history',
    DAILY_DONE: 'dorkademy_daily_done',
    MASTERY: 'dorkademy_mastery',
    EXAM_DATE: 'dorkademy_exam_date',
    SIM_STATE: 'dorkademy_sim_state'
};

// --- Init ---
async function init() {
    try {
        const resp = await fetch('questions.json');
        DATA = await resp.json();
        if (!DATA.simulations) DATA.simulations = [];
    } catch (e) {
        console.error('Failed to load questions:', e);
        return;
    }
    updateStreak();

    // First visit: show exam date picker if no date set
    if (!load(LS.EXAM_DATE)) {
        showExamDateModal();
    } else {
        renderDashboard();
    }
}

// --- Exam Date ---
function getExamDate() {
    const saved = load(LS.EXAM_DATE);
    if (!saved) return null;
    const d = new Date(saved);
    d.setHours(0, 0, 0, 0);
    return d;
}

function showExamDateModal() {
    document.getElementById('examDateModal').classList.add('active');
    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    const input = document.getElementById('examDateInput');
    input.min = today;
    // Pre-fill with saved date if editing
    const saved = load(LS.EXAM_DATE);
    if (saved) input.value = saved;
}

function saveExamDate() {
    const input = document.getElementById('examDateInput');
    if (!input.value) {
        alert('בבקשה בחרי תאריך בחינה');
        return;
    }
    const isFirst = !load(LS.EXAM_DATE);
    save(LS.EXAM_DATE, input.value);
    document.getElementById('examDateModal').classList.remove('active');
    trackEvent(isFirst ? 'signup' : 'exam-date-changed', { date: input.value });
    renderDashboard();
    navigateTo('dashboard');
}

// --- Navigation ---
function navigateTo(page, data) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const pageEl = document.getElementById('page-' + page);
    if (pageEl) pageEl.classList.add('active');

    const navBtn = document.querySelector(`.nav-btn[data-page="${page}"]`);
    if (navBtn) navBtn.classList.add('active');

    state.currentPage = page;
    window.scrollTo(0, 0);

    switch (page) {
        case 'dashboard': renderDashboard(); break;
        case 'simulations': renderSimulations(); break;
        case 'topic': renderTopic(data); break;
        case 'weak-questions': renderWeakQuestions(); break;
        case 'history': renderHistory(); break;
        case 'settings': renderSettings(); break;
    }
}

function toggleMobileMenu() {
    document.getElementById('mobileMenu').classList.toggle('open');
}

// --- Dashboard ---
function renderDashboard() {
    renderCountdown();
    renderDailyPlan();
    renderStats();
    renderTopicsGrid();
}

function renderCountdown() {
    const exam = getExamDate();
    if (!exam) {
        document.getElementById('countdownDays').textContent = '--';
        document.getElementById('countdownDateLabel').textContent = 'לא הוגדר תאריך';
        return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
    document.getElementById('countdownDays').textContent = Math.max(0, diff);
    document.getElementById('countdownDateLabel').textContent =
        exam.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function renderDailyPlan() {
    const container = document.getElementById('dailyPlanCard');
    const exam = getExamDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const dailyDone = load(LS.DAILY_DONE) || {};

    if (!exam) {
        container.innerHTML = `
            <h3>📅 הגדירי תאריך בחינה</h3>
            <p style="color:var(--text-light);margin-bottom:16px">
                כדי לבנות לך תוכנית לימוד מותאמת, צריך לדעת מתי הבחינה שלך.
            </p>
            <button class="daily-plan-btn" onclick="showExamDateModal()">הגדרת תאריך בחינה</button>`;
        return;
    }

    const daysLeft = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 7) {
        container.innerHTML = `
            <h3>🎯 שבוע אחרון! מבחני סימולציה + חזרה על טעויות</h3>
            <p style="color:var(--text-light);margin-bottom:16px">
                תתרכזי במבחני סימולציה מלאים ובתרגול השאלות שטעית בהן.
            </p>
            <div class="daily-plan-action">
                <button class="daily-plan-btn" onclick="navigateTo('simulations')">לכי למבחני סימולציה</button>
                ${dailyDone[todayStr] ? '<span class="daily-check">✓ למדת היום!</span>' : ''}
            </div>`;
        return;
    }

    const topics = DATA.topics;
    // Build weighted plan: distribute topics across remaining days by question share
    const totalQuestions = DATA.questions.length;
    const studyDays = Math.max(1, daysLeft - 7); // reserve last 7 days for simulations
    // Each topic gets days proportional to its question count
    const topicDays = topics.map(t => {
        const count = DATA.questions.filter(q => q.topicId === t.id).length;
        return { topic: t, days: Math.max(1, Math.round((count / totalQuestions) * studyDays)) };
    });
    // Build a flat schedule of topic assignments
    const schedule = [];
    topicDays.forEach(td => {
        for (let i = 0; i < td.days; i++) schedule.push(td.topic);
    });
    // Pick today's topics from the schedule
    const dayIndex = Math.floor((today - new Date(today.getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24)) % Math.max(1, schedule.length);
    const topicsPerDay = Math.max(1, Math.ceil(schedule.length / studyDays));
    const todayTopics = [];
    const seen = new Set();
    for (let i = 0; i < topicsPerDay; i++) {
        const t = schedule[(dayIndex + i) % schedule.length];
        if (!seen.has(t.id)) { todayTopics.push(t); seen.add(t.id); }
    }

    const questionsCount = todayTopics.reduce((sum, t) => {
        return sum + DATA.questions.filter(q => q.topicId === t.id).length;
    }, 0);

    container.innerHTML = `
        <h3>📖 משימות היום - ${questionsCount} שאלות</h3>
        <div class="daily-plan-topics">
            ${todayTopics.map(t => `<span class="daily-topic-tag">${t.icon} ${t.name}</span>`).join('')}
        </div>
        <div class="daily-plan-action">
            <button class="daily-plan-btn" onclick="startDailyPlan('${todayTopics.map(t => t.id).join(',')}')">
                התחלי ללמוד
            </button>
            ${dailyDone[todayStr] ? '<span class="daily-check">✓ למדת היום!</span>' : ''}
        </div>`;
}

function startDailyPlan(topicIds) {
    const ids = topicIds.split(',');
    const questions = DATA.questions.filter(q => ids.includes(q.topicId));
    if (questions.length === 0) return;
    startTest(shuffleArray([...questions]).slice(0, 20), 'practice');
    markDailyDone();
}

function markDailyDone() {
    const todayStr = new Date().toISOString().split('T')[0];
    const dailyDone = load(LS.DAILY_DONE) || {};
    if (!dailyDone[todayStr]) trackEvent('plan-day-completed');
    dailyDone[todayStr] = true;
    save(LS.DAILY_DONE, dailyDone);
}

function renderStats() {
    const mastery = load(LS.MASTERY) || {};
    const mistakes = load(LS.MISTAKES) || {};
    const topics = DATA.topics;

    let masteredCount = 0;
    topics.forEach(t => {
        if ((mastery[t.id] || 0) >= 50) masteredCount++;
    });
    document.getElementById('statTopics').textContent = Math.round((masteredCount / topics.length) * 100) + '%';

    // % of all questions that have been answered at least once
    const totalQs = DATA.questions.length;
    const answeredQs = Object.keys(mistakes).filter(id => {
        const m = mistakes[id];
        return m && (m.correct + m.wrong) > 0;
    }).length;
    document.getElementById('statAvgScore').textContent = totalQs > 0 ? Math.round((answeredQs / totalQs) * 100) + '%' : '0%';

    const streak = load(LS.STREAK) || 0;
    document.getElementById('statStreak').textContent = streak;

    const weakCount = Object.values(mistakes).filter(m => m.wrong > 0 && m.correctStreak < 3).length;
    document.getElementById('statWeak').textContent = weakCount;
}

function renderTopicsGrid() {
    const grid = document.getElementById('topicsGrid');
    const mastery = load(LS.MASTERY) || {};

    grid.innerHTML = DATA.topics.map(topic => {
        const count = DATA.questions.filter(q => q.topicId === topic.id).length;
        const masteryPct = mastery[topic.id] || 0;
        return `
            <div class="topic-card" onclick="navigateTo('topic', '${topic.id}')">
                <div class="topic-card-icon">${topic.icon}</div>
                <div class="topic-card-name">${topic.name}</div>
                <div class="topic-card-desc">${topic.description}</div>
                <div class="topic-card-stats">
                    <span>${count} שאלות</span>
                    <span class="topic-mastery">${masteryPct}% שליטה</span>
                </div>
                <div class="topic-progress-bar">
                    <div class="topic-progress-fill" style="width: ${masteryPct}%"></div>
                </div>
            </div>`;
    }).join('');
}

// --- Simulations Page ---
function renderSimulations() {
    const grid = document.getElementById('simsGrid');
    const history = load(LS.HISTORY) || [];

    grid.innerHTML = (DATA.simulations || []).map(sim => {
        const hasQuestions = sim.questionIds && sim.questionIds.length > 0;
        const simHistory = history.filter(h => h.simId === sim.id);
        const bestScore = simHistory.length > 0 ? Math.max(...simHistory.map(h => h.score)) : null;
        const attempts = simHistory.length;

        return `
            <div class="sim-card ${hasQuestions ? '' : 'disabled'}">
                <div class="sim-card-icon">📝</div>
                <div class="sim-card-name">${sim.name}</div>
                <div class="sim-card-desc">${sim.description}</div>
                <div class="sim-card-meta">
                    ${hasQuestions ? `${sim.questionIds.length} שאלות | ציון עובר: ${sim.passingScore}` : 'בקרוב...'}
                </div>
                <button class="sim-card-btn" ${hasQuestions ? `onclick="startSimulation('${sim.id}')"` : 'disabled'}>
                    ${hasQuestions ? '🎯 התחלי סימולציה' : '🔒 עדיין לא זמין'}
                </button>
                ${simHistory.length > 0 ? `
                    <div class="sim-card-history">
                        ${attempts} ניסיונות |
                        ציון הכי גבוה: <span class="sim-best-score ${bestScore >= 60 ? 'pass' : 'fail'}">${bestScore}%</span>
                    </div>` : ''}
            </div>`;
    }).join('');
}

function startSimulation(simId) {
    const sim = DATA.simulations.find(s => s.id === simId);
    if (!sim || !sim.questionIds || sim.questionIds.length === 0) return;

    // Check for saved state to resume
    const savedState = load(LS.SIM_STATE);
    if (savedState && savedState.simId === simId) {
        if (confirm('יש לך סימולציה שלא הסתיימה. להמשיך מאיפה שהפסקת?')) {
            resumeSimulation(savedState);
            return;
        } else {
            clearSavedSimState();
        }
    }

    const questions = sim.questionIds
        .map(id => DATA.questions.find(q => q.id === id))
        .filter(Boolean);

    state.testSimId = simId;
    trackEvent('simulation-started', { simId });
    startTest(shuffleArray([...questions]), 'simulation');
}

// --- Topic Page ---
function renderTopic(topicId) {
    state.currentTopicId = topicId || state.currentTopicId;
    const topic = DATA.topics.find(t => t.id === state.currentTopicId);
    if (!topic) return;

    const questions = DATA.questions.filter(q => q.topicId === topic.id);

    document.getElementById('topicHeader').innerHTML = `
        <h1>${topic.icon} ${topic.name}</h1>
        <p>${topic.description} - ${questions.length} שאלות</p>`;

    document.getElementById('topicQuestionsList').innerHTML = `
        <h3>שאלות בנושא (${questions.length})</h3>
        ${questions.map((q, i) => `
            <div class="topic-q-item">
                <div class="topic-q-text">${i + 1}. ${q.question}</div>
                <div class="topic-q-source">${q.source}</div>
            </div>`).join('')}`;
}

function startTopicTest() {
    const questions = DATA.questions.filter(q => q.topicId === state.currentTopicId);
    if (questions.length === 0) return;
    const testQs = shuffleArray([...questions]).slice(0, Math.min(15, questions.length));
    startTest(testQs, 'topic');
}

function startTopicPractice() {
    const questions = DATA.questions.filter(q => q.topicId === state.currentTopicId);
    if (questions.length === 0) return;
    startTest(shuffleArray([...questions]), 'practice');
}

// ============================================================
// TEST ENGINE — exam-style, no feedback during, review at end
// ============================================================

function startTest(questions, type) {
    state.testQuestions = questions;
    state.testIndex = 0;
    state.testSelections = new Array(questions.length).fill(-1);
    state.testType = type;

    // Timer: only for simulations
    stopTimer();
    const timerEl = document.getElementById('simTimer');
    if (type === 'simulation') {
        state.timerSeconds = SIMULATION_DURATION_MINUTES * 60;
        timerEl.style.display = '';
        startTimer();
    } else {
        timerEl.style.display = 'none';
    }

    // Navigate to test page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-test').classList.add('active');
    window.scrollTo(0, 0);

    renderQuestionNav();
    renderQuestion();
}

function resumeSimulation(simState) {
    const sim = DATA.simulations.find(s => s.id === simState.simId);
    if (!sim) return;

    // Restore question order from saved IDs
    state.testQuestions = simState.questionOrder
        .map(id => DATA.questions.find(q => q.id === id))
        .filter(Boolean);
    state.testIndex = simState.currentIndex || 0;
    state.testSelections = simState.selections;
    state.testType = 'simulation';
    state.testSimId = simState.simId;
    state.timerSeconds = simState.remainingSeconds;

    const timerEl = document.getElementById('simTimer');
    timerEl.style.display = '';
    startTimer();

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-test').classList.add('active');
    window.scrollTo(0, 0);

    renderQuestionNav();
    renderQuestion();
}

// --- Timer ---
function startTimer() {
    updateTimerDisplay();
    state.timerInterval = setInterval(() => {
        state.timerSeconds--;
        updateTimerDisplay();
        if (state.timerSeconds <= 0) {
            stopTimer();
            clearSavedSimState();
            alert('הזמן נגמר! המבחן מוגש אוטומטית.');
            forceSubmitTest();
        }
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

function updateTimerDisplay() {
    const el = document.getElementById('simTimer');
    if (!el) return;
    const h = Math.floor(state.timerSeconds / 3600);
    const m = Math.floor((state.timerSeconds % 3600) / 60);
    const s = state.timerSeconds % 60;
    el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

    // Warning state at 15 minutes
    if (state.timerSeconds <= 900 && state.timerSeconds > 0) {
        el.classList.add('warning');
    } else {
        el.classList.remove('warning');
    }
}

function saveSimState() {
    if (state.testType !== 'simulation') return;
    const simState = {
        simId: state.testSimId,
        questionOrder: state.testQuestions.map(q => q.id),
        selections: state.testSelections,
        currentIndex: state.testIndex,
        remainingSeconds: state.timerSeconds,
        savedAt: new Date().toISOString()
    };
    save(LS.SIM_STATE, simState);
}

function clearSavedSimState() {
    localStorage.removeItem(LS.SIM_STATE);
}

function forceSubmitTest() {
    // Same as submitTest but without confirmation prompts
    const total = state.testQuestions.length;
    const answers = state.testQuestions.map((q, i) => {
        const selected = state.testSelections[i];
        const isCorrect = selected === q.correctIndex;
        return { questionId: q.id, selected, correct: q.correctIndex, isCorrect: selected !== -1 && isCorrect };
    });
    const correct = answers.filter(a => a.isCorrect).length;
    const score = Math.round((correct / total) * 100);
    answers.forEach(a => { if (a.selected !== -1) updateMistakesBank(a.questionId, a.isCorrect); });
    const history = load(LS.HISTORY) || [];
    history.unshift({ date: new Date().toISOString(), type: state.testType, topicId: state.currentTopicId, simId: state.testSimId || null, total, correct, score });
    if (history.length > 50) history.length = 50;
    save(LS.HISTORY, history);
    updateMastery();
    markDailyDone();
    updateStreak();
    state.testAnswers = answers;
    showResults(score, correct, total);
}

function renderQuestionNav() {
    const nav = document.getElementById('questionNav');
    nav.innerHTML = state.testQuestions.map((_, i) => {
        const isCurrent = i === state.testIndex;
        const isAnswered = state.testSelections[i] !== -1;
        let cls = 'q-dot';
        if (isCurrent) cls += ' current';
        if (isAnswered) cls += ' answered';
        return `<button class="${cls}" onclick="goToQuestion(${i})">${i + 1}</button>`;
    }).join('');
}

function renderQuestion() {
    const q = state.testQuestions[state.testIndex];
    if (!q) return;

    const total = state.testQuestions.length;
    const current = state.testIndex + 1;
    const answeredCount = state.testSelections.filter(s => s !== -1).length;

    document.getElementById('testProgressText').textContent = `שאלה ${current} מתוך ${total}`;
    document.getElementById('testProgressBar').style.width = `${(current / total) * 100}%`;
    document.getElementById('answeredCount').textContent = `${answeredCount}/${total} נענו`;
    document.getElementById('questionNumber').textContent = `שאלה ${current}`;
    document.getElementById('questionText').textContent = q.question;

    const selectedIndex = state.testSelections[state.testIndex];
    const letters = ['א', 'ב', 'ג', 'ד'];

    document.getElementById('optionsList').innerHTML = q.options.map((opt, i) => {
        const isSelected = i === selectedIndex;
        return `
            <button class="option-btn ${isSelected ? 'selected' : ''}" onclick="selectAnswer(${i})" id="option-${i}">
                <span class="option-letter">${letters[i]}</span>
                <span>${opt}</span>
            </button>`;
    }).join('');

    // Update nav buttons
    document.getElementById('prevBtn').disabled = state.testIndex === 0;
    document.getElementById('nextBtn').disabled = state.testIndex === total - 1;

    // Update question nav dots
    renderQuestionNav();
}

function selectAnswer(index) {
    state.testSelections[state.testIndex] = index;
    const q = state.testQuestions[state.testIndex];
    if (q) trackEvent('question-answered', { topic: q.topicId });

    // Re-render options to show selection (no correct/wrong feedback)
    const options = document.querySelectorAll('.option-btn');
    options.forEach((btn, i) => {
        btn.classList.toggle('selected', i === index);
    });

    // Update nav dot and answered count
    renderQuestionNav();
    const answeredCount = state.testSelections.filter(s => s !== -1).length;
    document.getElementById('answeredCount').textContent =
        `${answeredCount}/${state.testQuestions.length} נענו`;
}

function goToQuestion(index) {
    state.testIndex = index;
    renderQuestion();
    window.scrollTo(0, 0);
}

function prevQuestion() {
    if (state.testIndex > 0) {
        state.testIndex--;
        renderQuestion();
        window.scrollTo(0, 0);
    }
}

function nextQuestion() {
    if (state.testIndex < state.testQuestions.length - 1) {
        state.testIndex++;
        renderQuestion();
        window.scrollTo(0, 0);
    }
}

function submitTest() {
    const total = state.testQuestions.length;
    const unanswered = state.testSelections.filter(s => s === -1).length;

    if (unanswered > 0) {
        if (!confirm(`יש לך ${unanswered} שאלות שלא ענית עליהן. להגיש בכל זאת?`)) {
            return;
        }
    } else {
        if (!confirm('להגיש את המבחן?')) return;
    }

    stopTimer();
    clearSavedSimState();

    // Calculate results
    const answers = state.testQuestions.map((q, i) => {
        const selected = state.testSelections[i];
        const isCorrect = selected === q.correctIndex;
        return {
            questionId: q.id,
            selected: selected,
            correct: q.correctIndex,
            isCorrect: selected !== -1 && isCorrect
        };
    });

    const correct = answers.filter(a => a.isCorrect).length;
    const score = Math.round((correct / total) * 100);

    // Update mistakes bank for each question
    answers.forEach(a => {
        if (a.selected !== -1) {
            updateMistakesBank(a.questionId, a.isCorrect);
        }
    });

    // Save history
    const history = load(LS.HISTORY) || [];
    const historyEntry = {
        date: new Date().toISOString(),
        type: state.testType,
        topicId: state.currentTopicId,
        simId: state.testSimId || null,
        total: total,
        correct: correct,
        score: score
    };
    history.unshift(historyEntry);
    if (history.length > 50) history.length = 50;
    save(LS.HISTORY, history);

    // Update mastery
    updateMastery();

    // Mark daily done & streak
    markDailyDone();
    updateStreak();

    // Track completion
    if (state.testType === 'simulation') {
        trackEvent('simulation-completed', { simId: state.testSimId, score });
    }

    // Store answers in state for results page
    state.testAnswers = answers;

    // Show results
    showResults(score, correct, total);
}

function showResults(score, correct, total) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-results').classList.add('active');
    window.scrollTo(0, 0);

    // Score circle animation
    const pct = score / 100;
    const circumference = 339.292;
    const offset = circumference * (1 - pct);
    const scoreFill = document.getElementById('scoreFill');
    const isExam = state.testType === 'simulation' || state.testType === 'topic';
    const passed = score >= 60;

    scoreFill.className = 'score-fill ' + (isExam ? (passed ? 'pass' : 'fail') : '');
    // Reset and animate
    scoreFill.style.strokeDashoffset = circumference;
    setTimeout(() => {
        scoreFill.style.strokeDashoffset = offset;
    }, 100);

    document.getElementById('scoreText').textContent = score + '%';

    const passFail = document.getElementById('passFail');
    if (state.testType === 'simulation') {
        passFail.textContent = passed ? '🎉 עברת את הסימולציה!' : '😔 לא עברת - תמשיכי להתאמן!';
        passFail.className = 'pass-fail ' + (passed ? 'pass' : 'fail');
    } else if (state.testType === 'topic') {
        passFail.textContent = passed ? '🎉 עברת!' : '😔 לא עברת - תמשיכי להתאמן!';
        passFail.className = 'pass-fail ' + (passed ? 'pass' : 'fail');
    } else {
        passFail.textContent = score >= 80 ? '🌟 מצוין!' : score >= 60 ? '👍 כל הכבוד!' : '💪 ממשיכים להתאמן!';
        passFail.className = 'pass-fail';
    }

    document.getElementById('resultsSummary').textContent =
        `${correct} תשובות נכונות מתוך ${total}`;

    // Per-topic breakdown (simulations only)
    const breakdownEl = document.getElementById('topicBreakdown');
    if (state.testType === 'simulation') {
        const topicStats = {};
        state.testAnswers.forEach(a => {
            const q = DATA.questions.find(qq => qq.id === a.questionId);
            if (!q) return;
            if (!topicStats[q.topicId]) topicStats[q.topicId] = { correct: 0, total: 0 };
            topicStats[q.topicId].total++;
            if (a.isCorrect) topicStats[q.topicId].correct++;
        });

        const topicRows = DATA.topics
            .filter(t => topicStats[t.id])
            .map(t => {
                const s = topicStats[t.id];
                const pct = Math.round((s.correct / s.total) * 100);
                const passed = pct >= 60;
                return { topic: t, correct: s.correct, total: s.total, pct, passed };
            })
            .sort((a, b) => a.pct - b.pct);

        const weakest3 = topicRows.slice(0, 3);

        breakdownEl.style.display = 'block';
        breakdownEl.innerHTML = `
            <h3>📊 פירוט לפי נושא</h3>
            <table class="breakdown-table">
                <thead><tr><th>נושא</th><th>ציון</th><th>תוצאה</th></tr></thead>
                <tbody>
                    ${topicRows.map(r => `
                        <tr class="${r.passed ? '' : 'weak-row'}">
                            <td>${r.topic.icon} ${r.topic.name}</td>
                            <td>${r.correct}/${r.total} (${r.pct}%)</td>
                            <td>${r.passed ? '<span class="tag correct">עוברת</span>' : '<span class="tag wrong">לא עוברת</span>'}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
            ${weakest3.length > 0 ? `
                <div class="weakest-topics">
                    <h4>💪 3 הנושאים שכדאי לחזק:</h4>
                    ${weakest3.map(r => `
                        <button class="weak-topic-btn" onclick="navigateTo('topic', '${r.topic.id}')">
                            ${r.topic.icon} ${r.topic.name} (${r.pct}%) — תרגלי נושא זה
                        </button>`).join('')}
                </div>` : ''}`;
    } else {
        breakdownEl.style.display = 'none';
    }

    // Build review lists
    const wrongAnswers = state.testAnswers.filter(a => !a.isCorrect);
    const correctAnswers = state.testAnswers.filter(a => a.isCorrect);
    const letters = ['א', 'ב', 'ג', 'ד'];

    document.getElementById('wrongTitle').textContent = `❌ שאלות שטעיתי (${wrongAnswers.length})`;

    document.getElementById('wrongAnswersList').innerHTML = wrongAnswers.map(a => {
        const q = DATA.questions.find(qq => qq.id === a.questionId);
        const selectedText = a.selected === -1
            ? 'לא ענית'
            : `${letters[a.selected]}. ${q.options[a.selected]}`;
        const selectedClass = a.selected === -1 ? 'wrong' : 'wrong';
        return `
            <div class="answer-item wrong">
                <div class="answer-question">${q.question}</div>
                <div class="answer-detail">
                    בחרת: <span class="tag ${selectedClass}">${selectedText}</span>
                </div>
                <div class="answer-detail">
                    נכון: <span class="tag correct">${letters[a.correct]}. ${q.options[a.correct]}</span>
                </div>
                <div class="answer-explanation">${q.explanation}</div>
                <button class="report-error-link" onclick="openErrorReportForQuestion('${q.id}')">🚩 דיווח על טעות</button>
            </div>`;
    }).join('');

    document.getElementById('correctTitle').textContent = `✅ שאלות שעניתי נכון (${correctAnswers.length})`;
    document.getElementById('correctAnswersList').innerHTML = correctAnswers.map(a => {
        const q = DATA.questions.find(qq => qq.id === a.questionId);
        return `
            <div class="answer-item correct">
                <div class="answer-question">${q.question}</div>
                <div class="answer-detail">
                    תשובה: <span class="tag correct">${letters[a.correct]}. ${q.options[a.correct]}</span>
                </div>
                <div class="answer-explanation">${q.explanation}</div>
                <button class="report-error-link" onclick="openErrorReportForQuestion('${q.id}')">🚩 דיווח על טעות</button>
            </div>`;
    }).join('');
}

function practiceMistakes() {
    const wrongIds = state.testAnswers.filter(a => !a.isCorrect).map(a => a.questionId);
    const questions = DATA.questions.filter(q => wrongIds.includes(q.id));
    if (questions.length === 0) {
        alert('אין שאלות לתרגול!');
        return;
    }
    state.testSimId = null;
    startTest(shuffleArray([...questions]), 'weak');
}

function confirmExitTest() {
    if (state.testType === 'simulation') {
        if (confirm('לצאת מהסימולציה? ההתקדמות תישמר ותוכלי לחזור.')) {
            stopTimer();
            saveSimState();
            state.testSimId = null;
            navigateTo('dashboard');
        }
    } else {
        if (confirm('בטוח שתרצי לצאת מהמבחן? ההתקדמות לא תישמר.')) {
            state.testSimId = null;
            navigateTo('dashboard');
        }
    }
}

// --- Mistakes Bank ---
function updateMistakesBank(questionId, isCorrect) {
    const mistakes = load(LS.MISTAKES) || {};
    if (!mistakes[questionId]) {
        mistakes[questionId] = { wrong: 0, correct: 0, correctStreak: 0, lastSeen: null };
    }
    const entry = mistakes[questionId];
    entry.lastSeen = new Date().toISOString();

    if (isCorrect) {
        entry.correct++;
        entry.correctStreak++;
    } else {
        entry.wrong++;
        entry.correctStreak = 0;
    }
    save(LS.MISTAKES, mistakes);
}

function updateMastery() {
    const mistakes = load(LS.MISTAKES) || {};
    const mastery = {};

    DATA.topics.forEach(topic => {
        const topicQs = DATA.questions.filter(q => q.topicId === topic.id);
        if (topicQs.length === 0) { mastery[topic.id] = 0; return; }

        let totalScore = 0;
        let answered = 0;
        topicQs.forEach(q => {
            const m = mistakes[q.id];
            if (m && (m.correct + m.wrong) > 0) {
                answered++;
                totalScore += m.correct / (m.correct + m.wrong);
            }
        });

        const answeredRatio = answered / topicQs.length;
        const avgCorrectness = answered > 0 ? totalScore / answered : 0;
        mastery[topic.id] = Math.round(answeredRatio * avgCorrectness * 100);
    });

    save(LS.MASTERY, mastery);
}

// --- Streak ---
function updateStreak() {
    const dailyDone = load(LS.DAILY_DONE) || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    let streak = 0;
    let checkDate = new Date(today);

    while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (dailyDone[dateStr]) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else if (dateStr === todayStr) {
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    save(LS.STREAK, streak);
}

// --- Weak Questions Page ---
function renderWeakQuestions() {
    const container = document.getElementById('weakQuestionsContent');
    const mistakes = load(LS.MISTAKES) || {};

    const weakQIds = Object.entries(mistakes)
        .filter(([id, m]) => m.wrong > 0 && m.correctStreak < 3)
        .sort((a, b) => b[1].wrong - a[1].wrong)
        .map(([id]) => id);

    const weakQuestions = weakQIds.map(id => DATA.questions.find(q => q.id === id)).filter(Boolean);

    if (weakQuestions.length === 0) {
        container.innerHTML = `
            <div class="weak-empty">
                <div class="empty-icon">🎉</div>
                <h3>אין שאלות חלשות!</h3>
                <p>כל הכבוד! תמשיכי לתרגל כדי לשמור על הרמה</p>
            </div>`;
        return;
    }

    container.innerHTML = `
        <button class="weak-start-btn" onclick="startWeakPractice()">
            🔄 תרגול ${weakQuestions.length} שאלות חלשות
        </button>
        <div style="margin-top:24px">
            ${weakQuestions.map(q => {
                const m = mistakes[q.id];
                const topic = DATA.topics.find(t => t.id === q.topicId);
                return `
                    <div class="topic-q-item">
                        <div class="topic-q-text">${q.question}</div>
                        <div class="topic-q-source">
                            ${topic ? topic.icon + ' ' + topic.name : ''} |
                            ❌ ${m.wrong} טעויות | ✅ ${m.correctStreak}/3 ברצף
                        </div>
                    </div>`;
            }).join('')}
        </div>`;
}

function startWeakPractice() {
    const mistakes = load(LS.MISTAKES) || {};
    const weakQIds = Object.entries(mistakes)
        .filter(([id, m]) => m.wrong > 0 && m.correctStreak < 3)
        .map(([id]) => id);

    const questions = weakQIds.map(id => DATA.questions.find(q => q.id === id)).filter(Boolean);
    if (questions.length === 0) return;
    state.testSimId = null;
    startTest(shuffleArray([...questions]), 'weak');
}

// --- History Page ---
function renderHistory() {
    const container = document.getElementById('historyList');
    const history = load(LS.HISTORY) || [];

    if (history.length === 0) {
        container.innerHTML = '<div class="history-empty"><p>עדיין לא עשית מבחנים</p></div>';
        return;
    }

    const typeNames = {
        simulation: 'מבחן סימולציה',
        topic: 'מבחן נושא',
        practice: 'תרגול',
        weak: 'תרגול טעויות'
    };

    container.innerHTML = history.map(h => {
        const date = new Date(h.date);
        const dateStr = date.toLocaleDateString('he-IL');
        const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        const topicName = h.topicId ? (DATA.topics.find(t => t.id === h.topicId)?.name || '') : '';
        const simName = h.simId ? (DATA.simulations.find(s => s.id === h.simId)?.name || '') : '';
        const label = simName || topicName;
        const isExam = h.type === 'simulation' || h.type === 'topic';
        const passed = h.score >= 60;

        return `
            <div class="history-item">
                <div class="history-info">
                    <h3>${typeNames[h.type] || h.type} ${label ? '- ' + label : ''}</h3>
                    <p>${dateStr} ${timeStr} | ${h.correct}/${h.total} נכון</p>
                </div>
                <div class="history-score ${isExam ? (passed ? 'pass' : 'fail') : ''}">${h.score}%</div>
            </div>`;
    }).join('');
}

// --- Settings ---
function renderSettings() {
    const history = load(LS.HISTORY) || [];
    const mistakes = load(LS.MISTAKES) || {};
    const totalAnswered = Object.values(mistakes).reduce((s, m) => s + m.correct + m.wrong, 0);
    const totalCorrect = Object.values(mistakes).reduce((s, m) => s + m.correct, 0);
    const examDate = getExamDate();
    const examDateStr = examDate
        ? examDate.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : 'לא הוגדר';

    document.getElementById('settingsExamDate').innerHTML = `
        <p>תאריך בחינה נוכחי: <strong>${examDateStr}</strong></p>
        <button class="action-btn secondary" onclick="showExamDateModal()" style="margin-top:8px">שינוי תאריך בחינה</button>`;

    document.getElementById('settingsStats').innerHTML = `
        <p>שאלות בבנק: <strong>${DATA.questions.length}</strong></p>
        <p>סה"כ תשובות: <strong>${totalAnswered}</strong></p>
        <p>תשובות נכונות: <strong>${totalCorrect}</strong></p>
        <p>מבחנים שנעשו: <strong>${history.length}</strong></p>
        <p>שאלות חלשות: <strong>${Object.values(mistakes).filter(m => m.wrong > 0 && m.correctStreak < 3).length}</strong></p>`;
}

function resetProgress() {
    if (confirm('בטוח? כל ההתקדמות תימחק - ציונים, שאלות חלשות, רצף ימים.')) {
        Object.values(LS).forEach(key => localStorage.removeItem(key));
        alert('ההתקדמות אופסה!');
        navigateTo('dashboard');
    }
}

// --- Error Report ---
const ERROR_REPORT_EMAIL = 'moria@dorkademy.co.il'; // UPDATE this email

function openErrorReport() {
    const q = state.testQuestions[state.testIndex];
    if (!q) return;
    document.getElementById('errorReportQuestion').textContent = `שאלה: ${q.id} — ${q.question.substring(0, 80)}...`;
    document.getElementById('errorReportText').value = '';
    document.getElementById('errorReportModal').classList.add('active');
}

function openErrorReportForQuestion(questionId) {
    const q = DATA.questions.find(qq => qq.id === questionId);
    if (!q) return;
    state._reportQuestionId = questionId;
    document.getElementById('errorReportQuestion').textContent = `שאלה: ${q.id} — ${q.question.substring(0, 80)}...`;
    document.getElementById('errorReportText').value = '';
    document.getElementById('errorReportModal').classList.add('active');
}

function closeErrorReport() {
    document.getElementById('errorReportModal').classList.remove('active');
    state._reportQuestionId = null;
}

function sendErrorReport() {
    const qId = state._reportQuestionId || (state.testQuestions[state.testIndex] ? state.testQuestions[state.testIndex].id : null);
    const comment = document.getElementById('errorReportText').value.trim();
    const q = DATA.questions.find(qq => qq.id === qId);

    const subject = encodeURIComponent(`דיווח טעות — שאלה ${qId}`);
    const body = encodeURIComponent(
        `שאלה: ${qId}\n` +
        `טקסט: ${q ? q.question : 'לא נמצא'}\n` +
        `הערה: ${comment || '(ללא הערה)'}\n` +
        `תאריך: ${new Date().toLocaleString('he-IL')}`
    );

    window.open(`mailto:${ERROR_REPORT_EMAIL}?subject=${subject}&body=${body}`, '_self');
    trackEvent('error-report-sent', { questionId: qId });
    closeErrorReport();
    alert('תודה על הדיווח! 🙏');
}

// --- Analytics ---
function trackEvent(name, data) {
    if (typeof window.goatcounter === 'undefined') return;
    try {
        const path = data ? `${name}/${Object.values(data).join('/')}` : name;
        window.goatcounter.count({ path: path, title: name, event: true });
    } catch (e) { /* analytics should never break the app */ }
}

// --- Utilities ---
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function save(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.error('Save error:', e); }
}

function load(key) {
    try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : null; } catch (e) { return null; }
}

// --- Start ---
document.addEventListener('DOMContentLoaded', init);
