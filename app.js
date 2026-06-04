const COURSE_STORAGE_KEY = "ue5CourseProgressV1";

function getState() {
  const fallback = {
    completedLectures: [],
    completedPractices: [],
    projectCompleted: false,
    testScore: null,
    testPercentage: null,
    lastLecture: 1,
    lastPractice: 1,
    updatedAt: null
  };

  try {
    const raw = localStorage.getItem(COURSE_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    return {
      ...fallback,
      ...parsed,
      completedLectures: Array.isArray(parsed.completedLectures) ? parsed.completedLectures : [],
      completedPractices: Array.isArray(parsed.completedPractices) ? parsed.completedPractices : []
    };
  } catch (error) {
    return fallback;
  }
}

function saveState(nextState) {
  const state = {
    ...nextState,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(state));
  return state;
}

function updateState(mutator) {
  const current = getState();
  const next = mutator({ ...current });
  return saveState(next);
}

function getOverallProgress(state) {
  const totalItems = courseData.lectures.length + courseData.practices.length + 2;
  const completedItems =
    state.completedLectures.length +
    state.completedPractices.length +
    (state.projectCompleted ? 1 : 0) +
    (state.testScore !== null ? 1 : 0);

  return {
    totalItems,
    completedItems,
    percentage: Math.round((completedItems / totalItems) * 100)
  };
}

function setProgressUI() {
  const state = getState();
  const { percentage } = getOverallProgress(state);
  document.querySelectorAll("[data-progress-label]").forEach((node) => {
    node.textContent = `${percentage}%`;
  });
  document.querySelectorAll("[data-progress-fill]").forEach((node) => {
    node.style.width = `${percentage}%`;
  });
  const ring = document.querySelector("[data-ring-progress]");
  if (ring) {
    ring.style.background =
      `radial-gradient(circle at center, rgba(9, 13, 20, 1) 58%, transparent 59%), ` +
      `conic-gradient(var(--accent-strong) ${percentage * 3.6}deg, var(--accent-warm) ${percentage * 3.6}deg, rgba(255, 255, 255, 0.08) 0deg)`;
  }
}

function setActiveNav() {
  const page = document.body.dataset.page;
  const pageMap = {
    home: "home",
    program: "program",
    lectures: "lectures",
    "lecture-detail": "lectures",
    practice: "practice",
    "practice-detail": "practice",
    project: "project",
    test: "test",
    dashboard: "dashboard"
  };
  document.querySelectorAll("[data-nav]").forEach((node) => {
    if (node.dataset.nav === pageMap[page]) {
      node.classList.add("is-active");
    }
  });
}

function createTagList(items) {
  return items.map((item) => `<span>${item}</span>`).join("");
}

function createMetaTags(items) {
  return items.map((item) => `<span class="status-pill">${item}</span>`).join("");
}

function renderParagraphGroup(paragraphs) {
  if (!Array.isArray(paragraphs) || !paragraphs.length) {
    return "";
  }
  return paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("");
}

function renderBulletGroup(items) {
  if (!Array.isArray(items) || !items.length) {
    return "";
  }
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function renderPracticeGallery(images) {
  if (!Array.isArray(images) || !images.length) {
    return "";
  }
  return `
    <section class="practice-gallery-block">
      <h2>Иллюстрации из методических материалов</h2>
      <div class="practice-gallery">
        ${images.map((image) => `
          <figure class="practice-figure">
            <img src="${image.src}" alt="${image.caption}" loading="lazy">
            <figcaption>${image.caption}</figcaption>
          </figure>
        `).join("")}
      </div>
    </section>
  `;
}

function getPracticeBadge(practice) {
  return practice.badge || `Практика ${practice.id}`;
}

function renderPracticeBlocks(blocks) {
  if (!Array.isArray(blocks) || !blocks.length) {
    return "";
  }

  return blocks.map((block) => {
    if (block.type === "heading") {
      return `<h2>${block.text}</h2>`;
    }
    if (block.type === "figure") {
      return `
        <figure class="doc-figure">
          ${block.src ? `<img src="${block.src}" alt="${block.caption}" loading="lazy">` : ""}
          <figcaption>${block.caption}</figcaption>
        </figure>
      `;
    }
    if (block.type === "list") {
      return `<ul>${block.items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
    }
    return `<p>${block.text}</p>`;
  }).join("");
}

function renderPracticeContent(practice) {
  if (Array.isArray(practice.documentBlocks) && practice.documentBlocks.length) {
    return renderPracticeBlocks(practice.documentBlocks);
  }

  return `
    ${practice.overviewTitle ? `<h2>${practice.overviewTitle}</h2>` : ""}
    ${renderParagraphGroup(practice.overview)}
    ${practice.skillsTitle ? `<h2>${practice.skillsTitle}</h2>` : ""}
    ${renderBulletGroup(practice.skills)}
    <h2>Цель задания</h2>
    <p>${practice.goal}</p>
    <h2>Что получится в результате</h2>
    <p>${practice.outcome}</p>
    <h2>Пошаговая инструкция</h2>
    <ol>${practice.steps.map((step) => `<li>${step}</li>`).join("")}</ol>
    ${renderPracticeGallery(practice.images)}
    <h2>Контрольный результат</h2>
    <p>${practice.control}</p>
    <h2>Частые ошибки</h2>
    <ul>${practice.mistakes.map((item) => `<li>${item}</li>`).join("")}</ul>
    <h2>Дополнительное задание повышенной сложности</h2>
    <p>${practice.advanced}</p>
  `;
}
function renderHome() {
  const highlightContainer = document.getElementById("home-highlights");
  const lectureContainer = document.getElementById("home-featured-lectures");
  const practiceContainer = document.getElementById("home-practices");

  if (highlightContainer) {
    highlightContainer.innerHTML = courseData.homeHighlights.map((item) => `
      <article class="summary-card">
        <div class="card-topline">
          <strong>${item.title}</strong>
          <span class="word-chip">${item.badge}</span>
        </div>
        <p>${item.text}</p>
      </article>
    `).join("");
  }

  if (lectureContainer) {
    lectureContainer.innerHTML = courseData.lectures.slice(0, 4).map((lecture) => `
      <article class="lesson-card">
        <div class="card-topline">
          <strong>Лекция ${lecture.id}</strong>
          <span class="word-chip">${lecture.wordCountLabel}</span>
        </div>
        <h3>${lecture.title}</h3>
        <p>${lecture.summary}</p>
        <div class="lesson-meta">${createMetaTags(lecture.meta)}</div>
        <a class="button button-secondary" href="lecture.html?id=${lecture.id}">Открыть лекцию</a>
      </article>
    `).join("");
  }

  if (practiceContainer) {
    practiceContainer.innerHTML = courseData.practices.slice(0, 3).map((practice) => `
      <article class="practice-card">
        <div class="card-topline">
          <strong>${getPracticeBadge(practice)}</strong>
          <span class="word-chip">${Array.isArray(practice.documentBlocks) ? "Полный документ" : `${practice.steps.length} шагов`}</span>
        </div>
        <h3>${practice.title}</h3>
        <p>${practice.goal}</p>
        <a class="button button-ghost" href="practice-item.html?id=${practice.id}">Перейти к практике</a>
      </article>
    `).join("");
  }
}

function renderProgram() {
  const timeline = document.getElementById("program-timeline");
  const skills = document.getElementById("program-skills");
  const path = document.getElementById("program-path");

  if (timeline) {
    timeline.innerHTML = courseData.lectures.map((lecture) => `
      <article class="module-card">
        <div class="card-topline">
          <strong>Модуль ${lecture.id}</strong>
          <span class="word-chip">${lecture.duration}</span>
        </div>
        <h3>${lecture.title}</h3>
        <p>${lecture.summary}</p>
        <div class="lesson-meta">${createMetaTags(lecture.meta)}</div>
        <a class="button button-secondary" href="lecture.html?id=${lecture.id}">Изучить модуль</a>
      </article>
    `).join("");
  }

  if (skills) {
    skills.innerHTML = createTagList(courseData.skills);
  }

  if (path) {
    path.innerHTML = courseData.learningPath.map((item, index) => `
      <div class="stack-item">
        <strong>${index + 1}. ${item.title}</strong>
        <p>${item.text}</p>
      </div>
    `).join("");
  }
}

function renderLectureList() {
  const container = document.getElementById("lecture-list");
  if (!container) {
    return;
  }
  const state = getState();
  container.innerHTML = courseData.lectures.map((lecture) => {
    const done = state.completedLectures.includes(lecture.id);
    return `
      <article class="lesson-card">
        <div class="card-topline">
          <strong>Лекция ${lecture.id}</strong>
          <span class="status-pill ${done ? "status-ok" : ""}">${done ? "Пройдена" : "Не пройдена"}</span>
        </div>
        <h3>${lecture.title}</h3>
        <p>${lecture.summary}</p>
        <div class="lesson-meta">${createMetaTags([...lecture.meta, lecture.wordCountLabel])}</div>
        <a class="button button-secondary" href="lecture.html?id=${lecture.id}">Открыть лекцию</a>
      </article>
    `;
  }).join("");
}

function renderLectureDetail() {
  const container = document.getElementById("lecture-detail");
  if (!container) {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const lectureId = Number(params.get("id")) || 1;
  const lecture = courseData.lectures.find((item) => item.id === lectureId) || courseData.lectures[0];

  updateState((state) => {
    state.lastLecture = lecture.id;
    return state;
  });

  const state = getState();
  const done = state.completedLectures.includes(lecture.id);

  container.innerHTML = `
    <p class="eyebrow">Лекция ${lecture.id}</p>
    <h1>${lecture.title}</h1>
    <p>${lecture.summary}</p>
    <div class="article-meta">${createMetaTags([...lecture.meta, lecture.wordCountLabel])}</div>
    <div class="article-actions">
      <button class="button ${done ? "button-secondary" : "button-primary"}" data-toggle-lecture="${lecture.id}">
        ${done ? "Снять отметку о прохождении" : "Отметить лекцию как пройденную"}
      </button>
      <a class="button button-ghost" href="lectures.html">Вернуться к списку лекций</a>
    </div>
    ${lecture.sections.map(renderSection).join("")}
    <div class="article-nav">
      ${lecture.id > 1 ? `<a class="button button-ghost" href="lecture.html?id=${lecture.id - 1}">Предыдущая лекция</a>` : ""}
      ${lecture.id < courseData.lectures.length ? `<a class="button button-secondary" href="lecture.html?id=${lecture.id + 1}">Следующая лекция</a>` : `<a class="button button-primary" href="practice.html">Перейти к практике</a>`}
    </div>
  `;

  const button = container.querySelector("[data-toggle-lecture]");
  button.addEventListener("click", () => {
    updateState((draft) => {
      const exists = draft.completedLectures.includes(lecture.id);
      draft.completedLectures = exists
        ? draft.completedLectures.filter((id) => id !== lecture.id)
        : [...draft.completedLectures, lecture.id].sort((a, b) => a - b);
      return draft;
    });
    renderLectureDetail();
    setProgressUI();
  });
}

function renderPracticeList() {
  const container = document.getElementById("practice-list");
  if (!container) {
    return;
  }
  const state = getState();
  container.innerHTML = courseData.practices.map((practice) => {
    const done = state.completedPractices.includes(practice.id);
    const detailChip = Array.isArray(practice.documentBlocks) ? "Полный документ" : `${practice.steps.length} шагов`;
    return `
      <article class="practice-card">
        <div class="card-topline">
          <strong>${getPracticeBadge(practice)}</strong>
          <span class="status-pill ${done ? "status-ok" : ""}">${done ? "Готово" : "В процессе"}</span>
        </div>
        <h3>${practice.title}</h3>
        <p>${practice.goal}</p>
        <div class="practice-meta">${createMetaTags([detailChip, practice.resultLabel])}</div>
        <a class="button button-secondary" href="practice-item.html?id=${practice.id}">Открыть практику</a>
      </article>
    `;
  }).join("");
}

function renderPracticeDetail() {
  const container = document.getElementById("practice-detail");
  if (!container) {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const practiceId = Number(params.get("id")) || 1;
  const practice = courseData.practices.find((item) => item.id === practiceId) || courseData.practices[0];

  updateState((state) => {
    state.lastPractice = practice.id;
    return state;
  });

  const state = getState();
  const done = state.completedPractices.includes(practice.id);
  const detailChip = Array.isArray(practice.documentBlocks) ? "Полный документ" : `${practice.steps.length} шагов`;

  container.innerHTML = `
    <p class="eyebrow">${getPracticeBadge(practice)}</p>
    <h1>${practice.title}</h1>
    <p>${practice.goal}</p>
    <div class="article-meta">${createMetaTags([practice.resultLabel, detailChip])}</div>
    <div class="article-actions">
      <button class="button ${done ? "button-secondary" : "button-primary"}" data-toggle-practice="${practice.id}">
        ${done ? "Снять отметку о выполнении" : "Отметить практику как выполненную"}
      </button>
      <a class="button button-ghost" href="practice.html">Вернуться к списку практик</a>
    </div>
    ${renderPracticeContent(practice)}
    <div class="article-nav">
      ${practice.id > 1 ? `<a class="button button-ghost" href="practice-item.html?id=${practice.id - 1}">Предыдущая практика</a>` : ""}
      ${practice.id < courseData.practices.length ? `<a class="button button-secondary" href="practice-item.html?id=${practice.id + 1}">Следующая практика</a>` : `<a class="button button-primary" href="project.html">Перейти к проекту</a>`}
    </div>
  `;

  const button = container.querySelector("[data-toggle-practice]");
  button.addEventListener("click", () => {
    updateState((draft) => {
      const exists = draft.completedPractices.includes(practice.id);
      draft.completedPractices = exists
        ? draft.completedPractices.filter((id) => id !== practice.id)
        : [...draft.completedPractices, practice.id].sort((a, b) => a - b);
      return draft;
    });
    renderPracticeDetail();
    setProgressUI();
  });
}
function renderProject() {
  const container = document.getElementById("project-detail");
  if (!container) {
    return;
  }
  const state = getState();
  const done = state.projectCompleted;
  const project = courseData.project;
  container.innerHTML = `
    <p class="eyebrow">Итоговый проект</p>
    <h1>${project.title}</h1>
    <p>${project.description}</p>
    <div class="article-meta">${createMetaTags(project.meta)}</div>
    <div class="article-actions">
      <button class="button ${done ? "button-secondary" : "button-primary"}" data-toggle-project>
        ${done ? "Снять отметку о завершении этапа проекта" : "Отметить раздел проекта как изученный"}
      </button>
      <a class="button button-primary" href="game/index.html">Открыть игру</a>
      <a class="button button-ghost" href="dashboard.html">Открыть кабинет</a>
    </div>
    ${project.sections.map(renderSection).join("")}
  `;

  container.querySelector("[data-toggle-project]").addEventListener("click", () => {
    updateState((draft) => {
      draft.projectCompleted = !draft.projectCompleted;
      return draft;
    });
    renderProject();
    setProgressUI();
  });
}

function renderTest() {
  const form = document.getElementById("test-form");
  const answerKey = document.getElementById("answer-key");
  const resultBox = document.getElementById("test-result");

  if (!form || !answerKey || !resultBox) {
    return;
  }

  const normalizeText = (value) => value.trim().toLowerCase().replace(/\s+/g, " ");

  const arraysEqual = (left, right) => (
    left.length === right.length && left.every((value, index) => value === right[index])
  );

  const renderQuestion = (question, index) => {
    const type = question.type || "single";

    if (type === "multi") {
      return `
        <section class="question-card">
          <div class="question-head">
            <h3>${index + 1}. ${question.question}</h3>
            <span class="question-type">Несколько ответов</span>
          </div>
          <p class="question-hint">Выберите все подходящие варианты.</p>
          <div class="options-group">
            ${question.options.map((option, optionIndex) => `
              <label class="option-item">
                <input type="checkbox" name="question-${question.id}" value="${optionIndex}">
                <span>${option}</span>
              </label>
            `).join("")}
          </div>
        </section>
      `;
    }

    if (type === "text") {
      return `
        <section class="question-card">
          <div class="question-head">
            <h3>${index + 1}. ${question.question}</h3>
            <span class="question-type">Письменный ответ</span>
          </div>
          <p class="question-hint">Введите краткий ответ по существу.</p>
          <textarea class="text-answer" name="question-${question.id}" rows="4" placeholder="Введите ответ" required></textarea>
        </section>
      `;
    }

    if (type === "match") {
      return `
        <section class="question-card">
          <div class="question-head">
            <h3>${index + 1}. ${question.question}</h3>
            <span class="question-type">Сопоставление</span>
          </div>
          <p class="question-hint">Для каждого пункта слева выберите верное соответствие справа.</p>
          <div class="match-grid">
            ${question.pairs.map((pair, pairIndex) => `
              <label class="match-row">
                <strong>${pair.left}</strong>
                <select name="question-${question.id}-pair-${pairIndex}" required>
                  <option value="">Выберите соответствие</option>
                  ${question.pairs.map((option, optionIndex) => `
                    <option value="${optionIndex}">${option.right}</option>
                  `).join("")}
                </select>
              </label>
            `).join("")}
          </div>
        </section>
      `;
    }

    return `
      <section class="question-card">
        <div class="question-head">
          <h3>${index + 1}. ${question.question}</h3>
          <span class="question-type">Один ответ</span>
        </div>
        <div class="options-group">
          ${question.options.map((option, optionIndex) => `
            <label class="option-item">
              <input type="radio" name="question-${question.id}" value="${optionIndex}" required>
              <span>${option}</span>
            </label>
          `).join("")}
        </div>
      </section>
    `;
  };

  const renderAnswerKey = (question, index) => {
    const type = question.type || "single";

    if (type === "multi") {
      const answers = question.correct.map((answerIndex) => question.options[answerIndex]).join("; ");
      return `<li><strong>${index + 1}.</strong> ${answers}</li>`;
    }

    if (type === "text") {
      const answers = question.acceptedAnswers.join("; ");
      return `<li><strong>${index + 1}.</strong> ${answers}</li>`;
    }

    if (type === "match") {
      return `
        <li>
          <strong>${index + 1}.</strong>
          <ul>
            ${question.pairs.map((pair) => `<li>${pair.left} — ${pair.right}</li>`).join("")}
          </ul>
        </li>
      `;
    }

    return `<li><strong>${index + 1}.</strong> ${question.options[question.correct]}</li>`;
  };

  const getQuestionScore = (question, answers) => {
    const type = question.type || "single";

    if (type === "multi") {
      const selected = answers.getAll(`question-${question.id}`).map(Number).sort((a, b) => a - b);
      const expected = [...question.correct].sort((a, b) => a - b);
      return arraysEqual(selected, expected) ? 1 : 0;
    }

    if (type === "text") {
      const rawAnswer = answers.get(`question-${question.id}`);
      if (typeof rawAnswer !== "string") {
        return 0;
      }
      const normalizedAnswer = normalizeText(rawAnswer);
      return question.acceptedAnswers.some((answer) => normalizeText(answer) === normalizedAnswer) ? 1 : 0;
    }

    if (type === "match") {
      const isCorrect = question.pairs.every((pair, pairIndex) => {
        const answer = answers.get(`question-${question.id}-pair-${pairIndex}`);
        return answer !== null && Number(answer) === pairIndex;
      });
      return isCorrect ? 1 : 0;
    }

    const rawAnswer = answers.get(`question-${question.id}`);
    return rawAnswer !== null && Number(rawAnswer) === question.correct ? 1 : 0;
  };

  const singleCount = courseData.test.questions.filter((question) => (question.type || "single") === "single").length;
  const multiCount = courseData.test.questions.filter((question) => question.type === "multi").length;
  const textCount = courseData.test.questions.filter((question) => question.type === "text").length;
  const matchCount = courseData.test.questions.filter((question) => question.type === "match").length;

  form.innerHTML = `
    <h2>Итоговый тест по Unreal Engine 5</h2>
    <p class="test-summary">
      В тесте ${courseData.test.questions.length} заданий: ${singleCount} с одним правильным ответом, ${multiCount} с несколькими вариантами, ${textCount} с письменным ответом и ${matchCount} на соответствие.
    </p>
    ${courseData.test.questions.map((question, index) => renderQuestion(question, index)).join("")}
    <button type="submit" class="button button-primary">Проверить результат</button>
  `;

  answerKey.innerHTML = `
    <h2>Правильные ответы</h2>
    <ol>
      ${courseData.test.questions.map((question, index) => renderAnswerKey(question, index)).join("")}
    </ol>
  `;

  const state = getState();
  if (state.testScore !== null) {
    resultBox.innerHTML = `
      <h2>Последний результат</h2>
      <p>Правильных ответов: <strong>${state.testScore} из ${courseData.test.questions.length}</strong></p>
      <p>Процент успешности: <strong>${state.testPercentage}%</strong></p>
      <p>${state.testPercentage >= 70 ? "Хороший результат: вы уверенно ориентируетесь в базовых системах UE5." : "Рекомендуется повторить лекции по Blueprint, механикам и упаковке проекта."}</p>
    `;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const answers = new FormData(form);
    const score = courseData.test.questions.reduce((sum, question) => sum + getQuestionScore(question, answers), 0);

    const percentage = Math.round((score / courseData.test.questions.length) * 100);
    updateState((draft) => {
      draft.testScore = score;
      draft.testPercentage = percentage;
      return draft;
    });

    resultBox.innerHTML = `
      <h2>Результат готов</h2>
      <p>Правильных ответов: <strong>${score} из ${courseData.test.questions.length}</strong></p>
      <p>Процент успешности: <strong>${percentage}%</strong></p>
      <p>${percentage >= 85 ? "Отлично: курс усвоен на очень хорошем уровне." : percentage >= 70 ? "Хорошо: база освоена, можно переходить к самостоятельным экспериментам." : "Есть пробелы: лучше вернуться к нужным лекциям и повторить ключевые темы."}</p>
    `;
    setProgressUI();
  });
}

function renderDashboard() {
  const summary = document.getElementById("dashboard-summary");
  const breakdown = document.getElementById("dashboard-breakdown");
  const next = document.getElementById("dashboard-next");
  const results = document.getElementById("dashboard-results");

  if (!summary || !breakdown || !next || !results) {
    return;
  }

  const state = getState();
  const overall = getOverallProgress(state);
  const nextLecture = courseData.lectures.find((item) => !state.completedLectures.includes(item.id)) || courseData.lectures[courseData.lectures.length - 1];
  const nextPractice = courseData.practices.find((item) => !state.completedPractices.includes(item.id)) || courseData.practices[courseData.practices.length - 1];

  summary.innerHTML = `
    <p class="eyebrow">Сводка</p>
    <h2>Текущий статус обучения</h2>
    <p class="summary-number">${overall.completedItems} / ${overall.totalItems}</p>
    <p>Завершено элементов программы с учетом лекций, практики, проекта и теста.</p>
  `;

  breakdown.innerHTML = `
    <p class="eyebrow">Разбивка</p>
    <h2>Что уже отмечено</h2>
    <p>Лекции: <strong>${state.completedLectures.length} из ${courseData.lectures.length}</strong></p>
    <div class="progress-track"><div class="progress-fill" style="width:${Math.round((state.completedLectures.length / courseData.lectures.length) * 100)}%"></div></div>
    <p>Практика: <strong>${state.completedPractices.length} из ${courseData.practices.length}</strong></p>
    <div class="progress-track"><div class="progress-fill" style="width:${Math.round((state.completedPractices.length / courseData.practices.length) * 100)}%"></div></div>
    <p>Проект: <strong>${state.projectCompleted ? "изучен" : "не отмечен"}</strong></p>
    <p>Тест: <strong>${state.testScore !== null ? `${state.testPercentage}%` : "не пройден"}</strong></p>
  `;

  next.innerHTML = `
    <p class="eyebrow">Следующий шаг</p>
    <h2>Куда вернуться сейчас</h2>
    <p>Следующая лекция для изучения: <strong>${nextLecture.title}</strong></p>
    <div class="article-actions">
      <a class="button button-secondary" href="lecture.html?id=${nextLecture.id}">Открыть лекцию</a>
      <a class="button button-ghost" href="practice-item.html?id=${nextPractice.id}">Открыть практику</a>
    </div>
  `;

  results.innerHTML = `
    <p class="eyebrow">Результаты</p>
    <h2>Состояние обучения</h2>
    <p>${state.testScore !== null ? `Последний тест: <strong>${state.testScore} / ${courseData.test.questions.length}</strong>` : "Тест еще не пройден."}</p>
    <p>${state.updatedAt ? `Последнее обновление прогресса: <strong>${new Date(state.updatedAt).toLocaleString("ru-RU")}</strong>` : "Отметки пока не сохранены."}</p>
    <div class="mini-list">
      <span>Последняя лекция: ${state.lastLecture}</span>
      <span>Последняя практика: ${state.lastPractice}</span>
      <span>${state.projectCompleted ? "Проект изучен" : "Проект не отмечен"}</span>
    </div>
  `;
}

function renderSection(section) {
  if (section.type === "paragraphs") {
    return `
      <section>
        <h2>${section.title}</h2>
        ${section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}
      </section>
    `;
  }
  if (section.type === "list") {
    return `
      <section>
        <h2>${section.title}</h2>
        ${section.intro ? `<p>${section.intro}</p>` : ""}
        <ul>${section.items.map((item) => `<li>${item}</li>`).join("")}</ul>
      </section>
    `;
  }
  if (section.type === "ordered") {
    return `
      <section>
        <h2>${section.title}</h2>
        ${section.intro ? `<p>${section.intro}</p>` : ""}
        <ol>${section.items.map((item) => `<li>${item}</li>`).join("")}</ol>
      </section>
    `;
  }
  if (section.type === "code") {
    return `
      <section>
        <h2>${section.title}</h2>
        ${section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}
        <div class="article-code"><code>${section.code}</code></div>
      </section>
    `;
  }
  return "";
}

function init() {
  setActiveNav();
  setProgressUI();
  renderHome();
  renderProgram();
  renderLectureList();
  renderLectureDetail();
  renderPracticeList();
  renderPracticeDetail();
  renderProject();
  renderTest();
  renderDashboard();
}

document.addEventListener("DOMContentLoaded", init);
