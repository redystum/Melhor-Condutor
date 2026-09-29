/**
 * Melhor Condutor - Frontend Application Controller
 * Handles real-time exam workflow, state management, timer, and results review.
 */

// Application State
const state = {
  options: null,
  selectedCategory: "B",
  selectedType: "novas",
  selectedThemes: new Set(),
  
  exam: null,
  currentQIndex: 0,
  answers: {}, // questionId -> "A" | "B" | "C" | "D"
  timerInterval: null,
  timeRemainingSeconds: 0,

  review: null,
  reviewFilter: "all",
};

// DOM Element Selectors
const els = {
  // Overlays
  loadingOverlay: document.getElementById("loading-overlay"),
  loadingMsg: document.getElementById("loading-msg"),

  // Header
  headerEmail: document.getElementById("header-email"),

  // Views
  viewSelection: document.getElementById("view-selection"),
  viewExam: document.getElementById("view-exam"),
  viewResults: document.getElementById("view-results"),

  // Selection Screen
  userStatsCard: document.getElementById("user-stats-card"),
  statIndice: document.getElementById("stat-indice"),
  statTests: document.getElementById("stat-tests"),
  statSuccess: document.getElementById("stat-success"),
  statFailed: document.getElementById("stat-failed"),
  statWrong: document.getElementById("stat-wrong"),

  recommendedCard: document.getElementById("recommended-card"),
  recommendedText: document.getElementById("recommended-text"),
  btnStartRecommended: document.getElementById("btn-start-recommended"),

  categoryGrid: document.getElementById("category-grid"),
  typesGrid: document.getElementById("types-grid"),
  themesContainer: document.getElementById("themes-container"),
  themesList: document.getElementById("themes-list"),
  btnSelectAllThemes: document.getElementById("btn-select-all-themes"),
  btnClearThemes: document.getElementById("btn-clear-themes"),
  btnStartCustom: document.getElementById("btn-start-custom"),

  // Exam Screen
  currentQNum: document.getElementById("current-q-num"),
  totalQNum: document.getElementById("total-q-num"),
  hudTimer: document.getElementById("hud-timer"),
  timerDisplay: document.getElementById("timer-display"),
  examProgressFill: document.getElementById("exam-progress-fill"),
  btnFinishExam: document.getElementById("btn-finish-exam"),
  btnHudHelp: document.getElementById("btn-hud-help"),
  helpDialog: document.getElementById("help-dialog"),
  btnCloseHelp: document.getElementById("btn-close-help"),

  carouselStrip: document.getElementById("carousel-strip"),
  carouselPrev: document.getElementById("carousel-prev"),
  carouselNext: document.getElementById("carousel-next"),

  qNumBadge: document.getElementById("q-num-badge"),
  qStatement: document.getElementById("q-statement"),
  btnQInlineNext: document.getElementById("btn-q-inline-next"),
  qImageContainer: document.getElementById("q-image-container"),
  qImage: document.getElementById("q-image"),
  btnZoomImage: document.getElementById("btn-zoom-image"),
  optionsContainer: document.getElementById("options-container"),
  btnPrevQ: document.getElementById("btn-prev-question"),
  btnNextQ: document.getElementById("btn-next-question"),
  answeredRatio: document.getElementById("answered-ratio"),
  questionsGrid: document.getElementById("questions-grid"),

  // Results Screen
  verdictBanner: document.getElementById("verdict-banner"),
  verdictIcon: document.getElementById("verdict-icon"),
  verdictTitle: document.getElementById("verdict-title"),
  verdictSubtitle: document.getElementById("verdict-subtitle"),
  btnBackToLobby: document.getElementById("btn-back-to-lobby"),
  linkBomcondutorReview: document.getElementById("link-bomcondutor-review"),

  metricWrong: document.getElementById("metric-wrong"),
  metricCorrect: document.getElementById("metric-correct"),
  metricTime: document.getElementById("metric-time"),
  metricDifficulty: document.getElementById("metric-difficulty"),

  filterAll: document.getElementById("filter-all"),
  filterWrong: document.getElementById("filter-wrong"),
  filterCorrect: document.getElementById("filter-correct"),
  countAll: document.getElementById("count-all"),
  countWrong: document.getElementById("count-wrong"),
  countCorrect: document.getElementById("count-correct"),
  reviewQuestionsList: document.getElementById("review-questions-list"),

  // Dialogs
  lightboxDialog: document.getElementById("lightbox-dialog"),
  lightboxImg: document.getElementById("lightbox-img"),
  lightboxClose: document.getElementById("lightbox-close"),

  confirmSubmitDialog: document.getElementById("confirm-submit-dialog"),
  confirmDialogMsg: document.getElementById("confirm-dialog-msg"),
  btnCancelSubmit: document.getElementById("btn-cancel-submit"),
  btnConfirmSubmit: document.getElementById("btn-confirm-submit"),
};

// UI Helpers
function showLoading(message) {
  els.loadingMsg.textContent = message || "A carregar dados em tempo real...";
  els.loadingOverlay.classList.add("active");
}

function hideLoading() {
  els.loadingOverlay.classList.remove("active");
}

function switchView(viewName) {
  [els.viewSelection, els.viewExam, els.viewResults].forEach(v => v.classList.remove("active"));
  if (viewName === "selection") els.viewSelection.classList.add("active");
  if (viewName === "exam") els.viewExam.classList.add("active");
  if (viewName === "results") els.viewResults.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 1. Initial Load & Fetch Options
async function initApp() {
  showLoading("A carregar opções do Bom Condutor...");
  try {
    // 1. Check status and display the authenticated user's email
    const statusRes = await fetch("/api/status").catch(() => null);
    if (statusRes?.ok) {
      const status = await statusRes.json();
      if (status.email) {
        els.headerEmail.textContent = status.email;
      }
    }

    // 2. Fetch selections and user stats from /api/teste/options
    const optionsRes = await fetch("/api/teste/options");
    if (!optionsRes.ok) throw new Error("Erro ao carregar opções do Bom Condutor");
    const data = await optionsRes.json();
    state.options = data;

    renderLobby(data);
  } catch (err) {
    console.error(err);
    alert(`Erro ao iniciar aplicação: ${err.message}`);
  } finally {
    hideLoading();
  }
}

// Render Lobby / Selection Controls
function renderLobby(data) {
  // Render user stats if present
  if (data.userStats) {
    const s = data.userStats;
    els.userStatsCard.style.display = "block";
    els.statIndice.textContent = (s.indice ? (s.indice * 100).toFixed(1) : "0.0") + "%";
    els.statTests.textContent = s.tests || "0";
    els.statSuccess.textContent = s.success || "0";
    els.statFailed.textContent = s.failed || "0";
    els.statWrong.textContent = s.wrong || "0";

    // Recommended test card
    if (s.guide && s.guide.url) {
      els.recommendedCard.style.display = "block";
      els.recommendedText.innerHTML = s.guide.text || `Teste da categoria <strong>${s.guide.categoria}</strong> do tipo <strong>${s.guide.tipo}</strong>.`;
      els.btnStartRecommended.onclick = () => startExam({ url: s.guide.url });
    }
  }

  // Render Categories
  els.categoryGrid.innerHTML = "";
  data.categories.forEach(cat => {
    const card = document.createElement("div");
    card.className = `category-card ${cat.id === state.selectedCategory ? "selected" : ""}`;
    card.innerHTML = `
      <div class="cat-badge">${cat.name}</div>
      <div class="cat-desc">${cat.desc}</div>
    `;
    card.onclick = () => {
      state.selectedCategory = cat.id;
      document.querySelectorAll(".category-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      renderThemes();
      validateCustomSelection();
    };
    els.categoryGrid.appendChild(card);
  });

  // Render Types
  els.typesGrid.innerHTML = "";
  data.types.forEach(t => {
    const card = document.createElement("div");
    card.className = `type-card ${t.id === state.selectedType ? "selected" : ""}`;
    card.innerHTML = `
      <div class="type-name">
        <span>${t.name}</span>
        ${t.id === "tematico" ? '<i class="fa-solid fa-layer-group"></i>' : ""}
      </div>
      <div class="type-desc">${t.desc}</div>
    `;
    card.onclick = () => {
      state.selectedType = t.id;
      document.querySelectorAll(".type-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      
      if (t.id === "tematico") {
        els.themesContainer.style.display = "block";
        renderThemes();
      } else {
        els.themesContainer.style.display = "none";
      }
      validateCustomSelection();
    };
    els.typesGrid.appendChild(card);
  });

  renderThemes();
  validateCustomSelection();
}

// Render Themes for the selected category
function renderThemes() {
  els.themesList.innerHTML = "";
  state.selectedThemes.clear();

  const themesObj = state.options?.themes?.[state.selectedCategory] || {};
  const entries = Object.entries(themesObj);

  if (entries.length === 0) {
    els.themesList.innerHTML = `<p style="color: var(--text-dim); font-size: 0.9rem;">Sem temas específicos configurados para esta categoria.</p>`;
    return;
  }

  entries.forEach(([idStr, name]) => {
    const id = Number(idStr);
    const item = document.createElement("label");
    item.className = "theme-checkbox-card";
    item.innerHTML = `
      <input type="checkbox" value="${id}">
      <span class="theme-label">${name}</span>
    `;

    const checkbox = item.querySelector("input");
    checkbox.onchange = () => {
      if (checkbox.checked) {
        state.selectedThemes.add(id);
        item.classList.add("selected");
      } else {
        state.selectedThemes.delete(id);
        item.classList.remove("selected");
      }
      validateCustomSelection();
    };

    els.themesList.appendChild(item);
  });
}

// Themes Batch Actions
els.btnSelectAllThemes.onclick = () => {
  const checkboxes = els.themesList.querySelectorAll("input[type='checkbox']");
  checkboxes.forEach(cb => {
    cb.checked = true;
    state.selectedThemes.add(Number(cb.value));
    cb.closest(".theme-checkbox-card")?.classList.add("selected");
  });
  validateCustomSelection();
};

els.btnClearThemes.onclick = () => {
  const checkboxes = els.themesList.querySelectorAll("input[type='checkbox']");
  checkboxes.forEach(cb => {
    cb.checked = false;
    cb.closest(".theme-checkbox-card")?.classList.remove("selected");
  });
  state.selectedThemes.clear();
  validateCustomSelection();
};

// Validate if Custom Test can be started
function validateCustomSelection() {
  if (state.selectedType === "tematico") {
    els.btnStartCustom.disabled = state.selectedThemes.size === 0;
  } else {
    els.btnStartCustom.disabled = !state.selectedCategory || !state.selectedType;
  }
}

els.btnStartCustom.onclick = () => {
  startExam({
    category: state.selectedCategory,
    type: state.selectedType,
    themes: Array.from(state.selectedThemes)
  });
};

// 2. Start Exam Workflow
async function startExam(requestPayload) {
  showLoading("A raspar as questões do Bom Condutor em tempo real...");
  try {
    const res = await fetch("/api/teste/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload)
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || "Falha ao iniciar o teste.");
    }

    state.exam = data.setup;
    state.currentQIndex = 0;
    state.answers = {};

    setupExamScreen();
    switchView("exam");
  } catch (err) {
    console.error(err);
    alert(`Erro ao iniciar exame: ${err.message}`);
  } finally {
    hideLoading();
  }
}

// Setup Exam HUD & Screen
function setupExamScreen() {
  const exam = state.exam;
  if (els.totalQNum) els.totalQNum.textContent = exam.questions.length;

  // Setup Timer (30 minutes default)
  const durationMins = exam.time || 30;
  state.timeRemainingSeconds = durationMins * 60;
  startTimer();

  // Render navigation palette & carousel strip
  renderQuestionsPalette();
  renderQuestion(0);
}

// Timer Logic
function startTimer() {
  if (state.timerInterval) clearInterval(state.timerInterval);

  function updateDisplay() {
    const mins = Math.floor(state.timeRemainingSeconds / 60);
    const secs = state.timeRemainingSeconds % 60;
    els.timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (state.timeRemainingSeconds <= 120) {
      els.hudTimer.className = "hud-timer danger";
    } else if (state.timeRemainingSeconds <= 300) {
      els.hudTimer.className = "hud-timer warning";
    } else {
      els.hudTimer.className = "hud-timer";
    }

    if (state.timeRemainingSeconds <= 0) {
      clearInterval(state.timerInterval);
      alert("O tempo do exame terminou! As suas respostas serão submetidas automaticamente.");
      submitExam(true);
    }
    state.timeRemainingSeconds--;
  }

  updateDisplay();
  state.timerInterval = setInterval(updateDisplay, 1000);
}

// Render Current Question
function renderQuestion(index) {
  state.currentQIndex = index;
  const exam = state.exam;
  const q = exam.questions[index];

  if (els.currentQNum) els.currentQNum.textContent = index + 1;
  if (els.qNumBadge) {
    const numSpan = els.qNumBadge.querySelector(".q-num-val");
    if (numSpan) numSpan.textContent = index + 1;
    else els.qNumBadge.textContent = index + 1;

    els.qNumBadge.disabled = index === 0;
    els.qNumBadge.title = index === 0 ? "Primeira questão" : "Voltar à questão anterior";
    els.qNumBadge.onclick = () => {
      if (state.currentQIndex > 0) {
        renderQuestion(state.currentQIndex - 1);
      }
    };
  }

  // Statement & Image
  els.qStatement.textContent = q.questao;
  els.qImage.src = q.proxyImageUrl || q.imageUrl;

  // Image zoom button
  if (els.btnZoomImage) {
    els.btnZoomImage.onclick = (e) => {
      e.stopPropagation();
      openLightbox(q.proxyImageUrl || q.imageUrl);
    };
  }
  els.qImageContainer.onclick = () => {
    openLightbox(q.proxyImageUrl || q.imageUrl);
  };

  // Inline next button
  if (els.btnQInlineNext) {
    els.btnQInlineNext.disabled = index === exam.questions.length - 1;
    els.btnQInlineNext.onclick = () => {
      if (state.currentQIndex < exam.questions.length - 1) {
        renderQuestion(state.currentQIndex + 1);
      }
    };
  }

  // Options List
  els.optionsContainer.innerHTML = "";
  const answers = q.respostas;
  const currentPick = state.answers[q.id];

  Object.entries(answers).forEach(([letter, text]) => {
    const card = document.createElement("div");
    card.className = `option-card ${currentPick === letter ? "selected" : ""}`;
    card.innerHTML = `
      <div class="option-letter-pill">${letter}</div>
      <div class="option-text">${text}</div>
    `;

    card.onclick = () => {
      // Toggle or select
      if (state.answers[q.id] === letter) {
        delete state.answers[q.id];
      } else {
        state.answers[q.id] = letter;
      }
      renderQuestion(index);
      updateProgress();
    };

    els.optionsContainer.appendChild(card);
  });

  // Navigation buttons state
  if (els.btnPrevQ) els.btnPrevQ.disabled = index === 0;
  if (els.btnNextQ) els.btnNextQ.disabled = index === exam.questions.length - 1;
  if (els.carouselPrev) els.carouselPrev.disabled = index === 0;
  if (els.carouselNext) els.carouselNext.disabled = index === exam.questions.length - 1;

  updateProgress();

  // Auto-scroll active carousel button into center view
  if (els.carouselStrip) {
    const activeCarouselBtn = els.carouselStrip.querySelector(`.carousel-q-btn[data-idx="${index}"]`);
    if (activeCarouselBtn) {
      activeCarouselBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }
}

// Navigation Palette & Carousel Strip
function renderQuestionsPalette() {
  const exam = state.exam;

  // 1. Render Carousel Strip
  if (els.carouselStrip) {
    els.carouselStrip.innerHTML = "";
    exam.questions.forEach((q, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "carousel-q-btn";
      btn.dataset.idx = idx;
      btn.textContent = idx + 1;
      btn.onclick = () => renderQuestion(idx);
      els.carouselStrip.appendChild(btn);
    });
  }

  // 2. Render Desktop Sidebar Palette
  if (els.questionsGrid) {
    els.questionsGrid.innerHTML = "";
    exam.questions.forEach((q, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "q-btn";
      btn.textContent = idx + 1;
      btn.onclick = () => renderQuestion(idx);
      els.questionsGrid.appendChild(btn);
    });
  }
}

// Update progress bar & button states
function updateProgress() {
  const exam = state.exam;
  const answeredCount = Object.keys(state.answers).length;
  const total = exam.questions.length;

  if (els.answeredRatio) els.answeredRatio.textContent = `${answeredCount} / ${total}`;
  const pct = (answeredCount / total) * 100;
  if (els.examProgressFill) els.examProgressFill.style.width = `${pct}%`;

  // Update button classes in carousel strip
  if (els.carouselStrip) {
    const cBtns = els.carouselStrip.querySelectorAll(".carousel-q-btn");
    cBtns.forEach((btn, idx) => {
      const q = exam.questions[idx];
      btn.classList.toggle("answered", !!state.answers[q.id]);
      btn.classList.toggle("current", idx === state.currentQIndex);
    });
  }

  // Update button classes in grid
  if (els.questionsGrid) {
    const btns = els.questionsGrid.querySelectorAll(".q-btn");
    btns.forEach((btn, idx) => {
      const q = exam.questions[idx];
      btn.classList.toggle("answered", !!state.answers[q.id]);
      btn.classList.toggle("current", idx === state.currentQIndex);
    });
  }
}

// Nav Buttons
if (els.btnPrevQ) {
  els.btnPrevQ.onclick = () => {
    if (state.currentQIndex > 0) renderQuestion(state.currentQIndex - 1);
  };
}
if (els.btnNextQ) {
  els.btnNextQ.onclick = () => {
    if (state.currentQIndex < state.exam.questions.length - 1) {
      renderQuestion(state.currentQIndex + 1);
    }
  };
}
if (els.carouselPrev) {
  els.carouselPrev.onclick = () => {
    if (state.currentQIndex > 0) renderQuestion(state.currentQIndex - 1);
  };
}
if (els.carouselNext) {
  els.carouselNext.onclick = () => {
    if (state.currentQIndex < state.exam.questions.length - 1) {
      renderQuestion(state.currentQIndex + 1);
    }
  };
}

// Help Modal
if (els.btnHudHelp && els.helpDialog) {
  els.btnHudHelp.onclick = () => els.helpDialog.showModal();
}
if (els.btnCloseHelp && els.helpDialog) {
  els.btnCloseHelp.onclick = () => els.helpDialog.close();
}

// Keyboard Shortcuts Support (1-4, A-D, Arrows)
window.addEventListener("keydown", (e) => {
  if (!els.viewExam.classList.contains("active")) return;
  
  const key = e.key.toUpperCase();
  const q = state.exam?.questions[state.currentQIndex];
  if (!q) return;

  const letterMap = { "1": "A", "2": "B", "3": "C", "4": "D" };
  const chosenLetter = letterMap[key] || (["A", "B", "C", "D"].includes(key) ? key : null);

  if (chosenLetter && q.respostas[chosenLetter]) {
    state.answers[q.id] = chosenLetter;
    renderQuestion(state.currentQIndex);
  } else if (e.key === "ArrowLeft") {
    if (state.currentQIndex > 0) renderQuestion(state.currentQIndex - 1);
  } else if (e.key === "ArrowRight") {
    if (state.currentQIndex < state.exam.questions.length - 1) renderQuestion(state.currentQIndex + 1);
  }
});

// Lightbox
els.qImageContainer.onclick = () => {
  els.lightboxImg.src = els.qImage.src;
  els.lightboxDialog.showModal();
};
els.lightboxClose.onclick = () => els.lightboxDialog.close();
els.lightboxDialog.onclick = (e) => {
  if (e.target === els.lightboxDialog) els.lightboxDialog.close();
};

// Submit Exam Workflow
els.btnFinishExam.onclick = () => {
  const answeredCount = Object.keys(state.answers).length;
  const total = state.exam.questions.length;
  const missing = total - answeredCount;

  if (missing > 0) {
    els.confirmDialogMsg.textContent = `Ainda tem ${missing} questão(ões) por responder. Tem a certeza que pretende terminar o exame?`;
    els.confirmSubmitDialog.showModal();
  } else {
    submitExam(false);
  }
};

els.btnCancelSubmit.onclick = () => els.confirmSubmitDialog.close();
els.btnConfirmSubmit.onclick = () => {
  els.confirmSubmitDialog.close();
  submitExam(true);
};

async function submitExam(force) {
  if (state.timerInterval) clearInterval(state.timerInterval);
  showLoading("A submeter as respostas e a obter a correção oficial do Bom Condutor...");

  try {
    // Construct picks object: { [id]: pick || -1 }
    const picks = {};
    state.exam.questions.forEach(q => {
      picks[q.id] = state.answers[q.id] || -1;
    });

    const res = await fetch("/api/teste/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hash: state.exam.hash,
        picks: picks,
        force: !!force
      })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || "Erro ao processar as respostas no servidor.");
    }

    state.review = data.review;
    renderResults(data.review, data.setup || state.exam);
    switchView("results");
  } catch (err) {
    console.error(err);
    alert(`Erro ao submeter teste: ${err.message}`);
  } finally {
    hideLoading();
  }
}

// Explanation Decryption Helper (Reversed from Bom Condutor BCapp.min.js)
function decryptExplanation(questionId, cipher) {
  if (!cipher || typeof cipher !== "string") return null;
  const trimmed = cipher.trim();
  if (trimmed.startsWith("<p") || trimmed.includes(" ") || trimmed.length < 15) {
    return trimmed;
  }
  try {
    const qidStr = String(questionId);
    let sum = 0;
    for (let i = 0; i < qidStr.length; i++) {
      sum += parseInt(qidStr[i], 10) || 0;
    }
    const r = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const o = sum % r.length;
    const a = r.substring(o) + r.substring(0, o);

    let transliterated = "";
    for (let i = 0; i < trimmed.length; i++) {
      const idx = a.indexOf(trimmed[i]);
      transliterated += (idx !== -1) ? r[idx] : trimmed[i];
    }

    const decoded = atob(transliterated);
    try {
      return JSON.parse(decoded);
    } catch {
      return decoded;
    }
  } catch (e) {
    return cipher;
  }
}

// Comments Cache & Toggle Handler
const commentsCache = new Map();

window.toggleQuestionComments = async function(qid, btn) {
  const drawer = document.getElementById(`comments-drawer-${qid}`);
  if (!drawer) return;

  const isOpen = drawer.classList.contains("open");
  if (isOpen) {
    drawer.classList.remove("open");
    btn.innerHTML = `<i class="fa-regular fa-comments"></i> Ver Comentários`;
    return;
  }

  drawer.classList.add("open");
  btn.innerHTML = `<i class="fa-solid fa-comments"></i> Ocultar Comentários`;

  if (commentsCache.has(qid)) {
    renderCommentsInDrawer(drawer, commentsCache.get(qid));
    return;
  }

  drawer.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem;"><i class="fa-solid fa-spinner fa-spin"></i> A carregar comentários do Bom Condutor...</div>`;

  try {
    const res = await fetch(`/api/question/${qid}/comments`);
    const data = await res.json();
    const comments = data.comments || [];
    commentsCache.set(qid, comments);
    renderCommentsInDrawer(drawer, comments);
  } catch (err) {
    drawer.innerHTML = `<div style="color: var(--danger); font-size: 0.85rem; padding: 0.5rem;"><i class="fa-solid fa-triangle-exclamation"></i> Não foi possível carregar os comentários.</div>`;
  }
};

function renderCommentsInDrawer(drawer, comments) {
  if (!comments || comments.length === 0) {
    drawer.innerHTML = `<div style="color: var(--text-dim); font-size: 0.85rem; padding: 0.5rem;"><i class="fa-regular fa-comment-dots"></i> Esta questão ainda não possui comentários no Bom Condutor.</div>`;
    return;
  }

  let html = "";
  comments.forEach(c => {
    let dateStr = "";
    if (c.createdAt) {
      try {
        dateStr = new Date(c.createdAt).toLocaleDateString("pt-PT", { year: "numeric", month: "short", day: "numeric" });
      } catch {}
    }

    html += `
      <div class="comment-bubble ${c.isOfficial ? "official" : ""}">
        <div class="comment-meta">
          <span class="comment-author">${c.author || "Anónimo"}</span>
          ${c.isOfficial ? '<span class="comment-official-tag"><i class="fa-solid fa-shield-halved"></i> Bom Condutor</span>' : ""}
          <span class="comment-time">${dateStr}</span>
        </div>
        <div class="comment-msg">${c.message}</div>
      </div>
    `;
  });
  drawer.innerHTML = html;
}

// Helper: Calculate max allowed wrong answers (general 10% rule)
function getMaxAllowedWrong(total) {
  if (total <= 10) return 1;
  if (total <= 20) return 3;
  if (total <= 30) return 3;
  if (total <= 40) return 4;
  return Math.max(1, Math.round(total * 0.1));
}

// 3. Render Results Screen
function renderResults(review, examSetup) {
  const wrongCount = review.wrong ?? 0;
  const correctCount = review.correct ?? 0;
  
  const totalQuestions = (review.questions && review.questions.length > 0) 
    ? review.questions.length 
    : (examSetup?.questions?.length || 30);

  const maxAllowedWrong = getMaxAllowedWrong(totalQuestions);

  // If Bom Condutor provides review.result boolean, use it; otherwise evaluate against maxAllowedWrong
  const isApproved = (typeof review.result === "boolean")
    ? review.result
    : (wrongCount <= maxAllowedWrong);

  // Verdict Banner
  els.verdictBanner.className = `verdict-banner glass-panel ${isApproved ? "approved" : "failed"}`;
  els.verdictIcon.innerHTML = isApproved 
    ? '<i class="fa-solid fa-trophy"></i>' 
    : '<i class="fa-solid fa-circle-xmark"></i>';
  els.verdictTitle.textContent = isApproved ? "Aprovado!" : "Reprovado";
  els.verdictSubtitle.textContent = isApproved
    ? `Excelente prestação! Errou apenas ${wrongCount} questão(ões) (limite oficial: ${maxAllowedWrong}).`
    : `Cometeu ${wrongCount} erros. No exame oficial de condução o limite máximo é de ${maxAllowedWrong} respostas erradas.`;

  // Fix "Ver no Bom Condutor" URL to always point to https://www.bomcondutor.pt/testes/<hash>
  if (review.permalink) {
    els.linkBomcondutorReview.style.display = "inline-flex";
    const cleanPermalink = String(review.permalink)
      .trim()
      .replace(/^https?:\/\/[^\/]+\/(testes?\/)?/, "")
      .replace(/^\/?(testes?\/)?/, "");
    els.linkBomcondutorReview.href = `https://www.bomcondutor.pt/testes/${cleanPermalink}`;
  } else {
    els.linkBomcondutorReview.style.display = "none";
  }

  // Profile save status indicator
  const existingProfileBadge = document.getElementById("profile-save-badge");
  if (existingProfileBadge) existingProfileBadge.remove();

  const profileBadge = document.createElement("div");
  profileBadge.id = "profile-save-badge";
  profileBadge.style.cssText = "margin-top: 0.75rem; font-size: 0.8rem; display: flex; align-items: center; gap: 0.4rem; justify-content: center;";
  
  if (review._savedToProfile) {
    profileBadge.style.color = "var(--success)";
    profileBadge.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Teste guardado no perfil Bom Condutor';
  } else if (review._savedToProfile === false) {
    profileBadge.style.color = "var(--warning, #f59e0b)";
    profileBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Teste pode não ter sido guardado no perfil';
  }
  
  if (review._savedToProfile !== undefined) {
    els.verdictBanner.appendChild(profileBadge);
  }

  // Metrics
  els.metricWrong.textContent = wrongCount;
  els.metricCorrect.textContent = correctCount;
  els.metricTime.textContent = formatTime(review.time || 0);

  // Difficulty - display string ("Muito Difícil", "Média", "Fácil", etc.) instead of [object Object]/10
  let diffDisplay = "Média";
  if (review.difficulty) {
    if (typeof review.difficulty === "object") {
      diffDisplay = review.difficulty.text || review.difficulty.label || review.difficulty.name || "Média";
    } else {
      diffDisplay = String(review.difficulty);
    }
  }
  els.metricDifficulty.textContent = diffDisplay;

  // Filter Counts
  els.countAll.textContent = totalQuestions;
  els.countWrong.textContent = wrongCount;
  els.countCorrect.textContent = correctCount;

  // Render question cards
  renderReviewCards("all", review, examSetup);
}

function formatTime(seconds) {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function renderReviewCards(filter, review, examSetup) {
  state.reviewFilter = filter;
  els.reviewQuestionsList.innerHTML = "";

  const questions = (review.questions && review.questions.length > 0) 
    ? review.questions 
    : (examSetup?.questions || []);
  const answersList = review.answers || []; // array of { pick, solution }

  questions.forEach((q, idx) => {
    let ans = {};
    if (Array.isArray(answersList)) {
      ans = answersList.find(a => a.id === q.id) || answersList[idx] || {};
    } else if (answersList && typeof answersList === "object") {
      ans = answersList[q.id] || answersList[String(q.id)] || {};
    }

    const solution = ans.solution;
    const userPick = (ans.pick && ans.pick !== -1) ? ans.pick : state.answers[q.id];
    const isCorrect = userPick === solution;

    if (filter === "wrong" && isCorrect) return;
    if (filter === "correct" && !isCorrect) return;

    const card = document.createElement("div");
    card.className = `review-card glass-panel ${isCorrect ? "correct" : "wrong"}`;

    let optionsHtml = "";
    Object.entries(q.respostas).forEach(([letter, text]) => {
      const isSolution = letter === solution;
      const isUserPick = letter === userPick;
      const isUserWrong = isUserPick && !isCorrect;

      let classes = "review-opt";
      let badge = "";

      if (isSolution) {
        classes += " is-solution";
        badge = '<span class="review-opt-badge correct"><i class="fa-solid fa-check"></i> Correta</span>';
      } else if (isUserWrong) {
        classes += " is-user-wrong";
        badge = '<span class="review-opt-badge wrong"><i class="fa-solid fa-xmark"></i> Sua Resposta</span>';
      }

      optionsHtml += `
        <div class="${classes}">
          <div class="option-letter-pill">${letter}</div>
          <div class="option-text">${text}</div>
          ${badge}
        </div>
      `;
    });

    // Resolve explanation (decrypted)
    let rawExp = q.explicacao;
    if (!rawExp && examSetup?.questions) {
      const matchQ = examSetup.questions.find(sq => sq.id === q.id);
      if (matchQ?.explicacao) rawExp = matchQ.explicacao;
    }
    const decryptedExp = decryptExplanation(q.id, rawExp);

    card.innerHTML = `
      <div class="review-header">
        <span class="q-tag">Questão ${idx + 1} de ${questions.length}</span>
        <span class="review-status-badge ${isCorrect ? "correct" : "wrong"}">
          <i class="fa-solid ${isCorrect ? "fa-circle-check" : "fa-circle-xmark"}"></i>
          ${isCorrect ? "Acertou" : "Errou"}
        </span>
      </div>

      <div class="review-body">
        <div class="review-img-box" onclick="openLightbox('${q.proxyImageUrl || q.imageUrl}')">
          <img src="${q.proxyImageUrl || q.imageUrl}" alt="Imagem questão ${idx + 1}" loading="lazy">
        </div>
        <div class="review-details">
          <div class="review-question-text">${q.questao}</div>
          <div class="review-options">${optionsHtml}</div>
          ${decryptedExp ? `
            <div class="review-explanation">
              <div class="review-explanation-header">
                <i class="fa-solid fa-lightbulb"></i> Explicação Oficial Bom Condutor
              </div>
              <div class="review-explanation-content">${decryptedExp}</div>
            </div>
          ` : ""}
          <div class="review-comments-wrapper">
            <button type="button" class="btn-toggle-comments" onclick="toggleQuestionComments(${q.id}, this)">
              <i class="fa-regular fa-comments"></i> Ver Comentários
            </button>
            <div class="comments-drawer" id="comments-drawer-${q.id}"></div>
          </div>
        </div>
      </div>
    `;

    els.reviewQuestionsList.appendChild(card);
  });
}

function openLightbox(src) {
  els.lightboxImg.src = src;
  els.lightboxDialog.showModal();
}

// Filter Pills Click Events
[els.filterAll, els.filterWrong, els.filterCorrect].forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    renderReviewCards(btn.dataset.filter, state.review, state.exam);
  };
});

// Back to Lobby / Start New Test
els.btnBackToLobby.onclick = () => {
  switchView("selection");
  initApp(); // Refresh user stats & recommended test
};

// Brand click resets to lobby
document.getElementById("brand-logo").onclick = () => {
  if (els.viewExam.classList.contains("active")) {
    if (confirm("Deseja sair do exame em curso? O seu progresso atual não será guardado.")) {
      if (state.timerInterval) clearInterval(state.timerInterval);
      switchView("selection");
    }
  } else {
    switchView("selection");
  }
};

// Start application
document.addEventListener("DOMContentLoaded", initApp);
