const TEST_LENGTH = 40;
const TEST_DURATION_SECONDS = 30 * 60;
const PASS_PERCENTAGE = 90;

const nav = document.getElementById("questionNav");
const content = document.getElementById("testContent");
const progress = document.getElementById("progress");
const timer = document.getElementById("timer");
const finishButton = document.getElementById("finishBtn");

let testQuestions = [];
let answers = [];
let currentQuestion = 0;
let secondsLeft = TEST_DURATION_SECONDS;
let timerId = null;
let finished = false;

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function calculateCategoryAllocation(categories, targetCount) {
  if (categories.length > targetCount) {
    throw new Error("Pocet kategorii je vyssi ako pocet otazok v teste.");
  }

  const total = categories.reduce((sum, category) => sum + category.questions.length, 0);
  const allocation = categories.map((category, index) => {
    const exact = (category.questions.length / total) * targetCount;
    return { index, exact, count: Math.max(1, Math.floor(exact)) };
  });
  let allocated = allocation.reduce((sum, item) => sum + item.count, 0);

  while (allocated < targetCount) {
    const candidate = [...allocation]
      .filter((item) => item.count < categories[item.index].questions.length)
      .sort((a, b) => (b.exact - b.count) - (a.exact - a.count) || a.index - b.index)[0];
    if (!candidate) throw new Error("Nie je k dispozicii dostatok otazok.");
    candidate.count += 1;
    allocated += 1;
  }

  while (allocated > targetCount) {
    const candidate = [...allocation]
      .filter((item) => item.count > 1)
      .sort((a, b) => (b.count - b.exact) - (a.count - a.exact) || b.count - a.count)[0];
    if (!candidate) throw new Error("Test nie je mozne rozdelit medzi vsetky kategorie.");
    candidate.count -= 1;
    allocated -= 1;
  }
  return allocation;
}

function generateTest() {
  const categories = otazkyPodlaOkruhov.filter((category) => category.questions.length > 0);
  const allocation = calculateCategoryAllocation(categories, TEST_LENGTH);
  const selected = [];

  allocation.forEach(({ index, count }) => {
    const category = categories[index];
    shuffle(category.questions).slice(0, count).forEach((question) => {
      selected.push({ ...question, category: category.okruh });
    });
  });
  return shuffle(selected);
}

function formatTime(value) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

function updateHeader() {
  const answeredCount = answers.filter((answer) => answer !== null).length;
  progress.textContent = answeredCount + " / " + TEST_LENGTH + " zodpovedan\u00fdch";
  timer.textContent = formatTime(secondsLeft);
  timer.classList.toggle("warning", secondsLeft <= 5 * 60 && !finished);
  finishButton.disabled = finished || answeredCount !== TEST_LENGTH;
}

function renderNavigation() {
  nav.innerHTML = "";
  testQuestions.forEach((question, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nav-number";
    button.textContent = String(index + 1);
    button.setAttribute("aria-label", "Ot\u00e1zka " + (index + 1));
    button.classList.toggle("current", index === currentQuestion && !finished);
    button.classList.toggle("answered", answers[index] !== null);
    button.addEventListener("click", () => {
      currentQuestion = index;
      renderQuestion();
      renderNavigation();
    });
    nav.appendChild(button);
  });
}

function createControlButton(label, disabled, direction) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "control-btn";
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener("click", () => {
    currentQuestion += direction;
    renderQuestion();
    renderNavigation();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  return button;
}

function renderQuestion() {
  const question = testQuestions[currentQuestion];
  const savedAnswer = answers[currentQuestion];
  content.innerHTML = "";
  const card = document.createElement("article");
  card.className = "question-card";

  const label = document.createElement("div");
  label.className = "question-label";
  label.textContent = "Ot\u00e1zka " + (currentQuestion + 1) + " z " + TEST_LENGTH + " \u00b7 " + question.category;
  card.appendChild(label);

  const title = document.createElement("h2");
  title.className = "question-text";
  title.textContent = question.questionName;
  card.appendChild(title);

  if (question.imageUrl) {
    const image = document.createElement("img");
    image.className = "question-image";
    image.src = question.imageUrl;
    image.alt = "Obr\u00e1zok k ot\u00e1zke";
    card.appendChild(image);
  }

  const answersContainer = document.createElement("div");
  answersContainer.className = "answers";
  question.answers.forEach((answer, answerIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-btn";
    button.textContent = answer.text;
    button.disabled = savedAnswer !== null || finished;
    if (savedAnswer !== null || finished) {
      button.classList.toggle("correct", answer.isCorrect);
      button.classList.toggle("wrong", savedAnswer === answerIndex && !answer.isCorrect);
    }
    button.addEventListener("click", () => selectAnswer(answerIndex));
    answersContainer.appendChild(button);
  });
  card.appendChild(answersContainer);

  const feedback = document.createElement("p");
  feedback.className = "feedback";
  if (savedAnswer !== null) {
    const correct = question.answers[savedAnswer].isCorrect;
    feedback.classList.add(correct ? "correct" : "wrong");
    feedback.textContent = correct
      ? "Spr\u00e1vna odpove\u010f."
      : "Nespr\u00e1vna odpove\u010f. Spr\u00e1vna odpove\u010f je ozna\u010den\u00e1 zelenou.";
  }
  card.appendChild(feedback);

  const controls = document.createElement("div");
  controls.className = "question-controls";
  controls.appendChild(createControlButton("\u2190 Predch\u00e1dzaj\u00faca", currentQuestion === 0, -1));
  controls.appendChild(createControlButton("Nasleduj\u00faca \u2192", currentQuestion === TEST_LENGTH - 1, 1));
  card.appendChild(controls);
  content.appendChild(card);
}

function selectAnswer(answerIndex) {
  if (finished || answers[currentQuestion] !== null) return;
  answers[currentQuestion] = answerIndex;
  updateHeader();
  renderNavigation();
  renderQuestion();
}

function finishTest(dueToTimeout) {
  if (finished) return;
  const answeredCount = answers.filter((answer) => answer !== null).length;
  if (!dueToTimeout && answeredCount !== TEST_LENGTH) return;
  finished = true;
  clearInterval(timerId);
  secondsLeft = Math.max(0, secondsLeft);
  updateHeader();
  renderResults(dueToTimeout);
}

function renderResults(dueToTimeout) {
  const correctCount = testQuestions.reduce((sum, question, index) => {
    const selected = answers[index];
    return sum + (selected !== null && question.answers[selected].isCorrect ? 1 : 0);
  }, 0);
  const percentage = (correctCount / TEST_LENGTH) * 100;
  const passed = percentage >= PASS_PERCENTAGE;
  const categoryStats = new Map();

  testQuestions.forEach((question, index) => {
    const result = categoryStats.get(question.category) || { total: 0, correct: 0 };
    result.total += 1;
    const selected = answers[index];
    if (selected !== null && question.answers[selected].isCorrect) result.correct += 1;
    categoryStats.set(question.category, result);
  });

  content.innerHTML = "";
  nav.hidden = true;
  const card = document.createElement("section");
  card.className = "results-card";
  const status = document.createElement("h2");
  status.className = "result-status " + (passed ? "passed" : "failed");
  status.textContent = passed ? "Pre\u0161iel si" : "Nepre\u0161iel si";
  card.appendChild(status);

  if (dueToTimeout) {
    const message = document.createElement("p");
    message.textContent = "\u010casov\u00fd limit uplynul. Nezodpovedan\u00e9 ot\u00e1zky boli vyhodnoten\u00e9 ako nespr\u00e1vne.";
    card.appendChild(message);
  }

  const stats = document.createElement("div");
  stats.className = "result-stats";
  [
    [percentage.toFixed(1) + " %", "\u00faspe\u0161nos\u0165"],
    [String(correctCount), "spr\u00e1vne"],
    [String(TEST_LENGTH - correctCount), "nespr\u00e1vne"],
  ].forEach(([value, label]) => {
    const stat = document.createElement("div");
    stat.className = "stat";
    const strong = document.createElement("strong");
    strong.textContent = value;
    stat.append(strong, document.createTextNode(label));
    stats.appendChild(stat);
  });
  card.appendChild(stats);

  const heading = document.createElement("h3");
  heading.textContent = "V\u00fdsledky pod\u013ea kateg\u00f3ri\u00ed";
  card.appendChild(heading);
  const table = document.createElement("table");
  table.className = "category-results";
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Kateg\u00f3ria", "Spr\u00e1vne"].forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    headRow.appendChild(th);
  });
  head.appendChild(headRow);
  table.appendChild(head);
  const body = document.createElement("tbody");
  categoryStats.forEach((result, category) => {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    const scoreCell = document.createElement("td");
    nameCell.textContent = category;
    scoreCell.textContent = result.correct + " / " + result.total;
    row.append(nameCell, scoreCell);
    body.appendChild(row);
  });
  table.appendChild(body);
  card.appendChild(table);

  const newTestButton = document.createElement("button");
  newTestButton.type = "button";
  newTestButton.className = "new-test-btn";
  newTestButton.textContent = "Spusti\u0165 nov\u00fd test";
  newTestButton.addEventListener("click", () => location.reload());
  card.appendChild(newTestButton);
  content.appendChild(card);
  finishButton.hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showError(message) {
  content.innerHTML = "";
  const card = document.createElement("div");
  card.className = "error-card";
  const title = document.createElement("strong");
  title.textContent = "Test sa nepodarilo na\u010d\u00edta\u0165.";
  const detail = document.createElement("p");
  detail.textContent = message;
  card.append(title, detail);
  content.appendChild(card);
  nav.hidden = true;
  finishButton.hidden = true;
}

function startTimer() {
  timerId = setInterval(() => {
    secondsLeft -= 1;
    updateHeader();
    if (secondsLeft <= 0) finishTest(true);
  }, 1000);
}

finishButton.addEventListener("click", () => finishTest(false));

try {
  testQuestions = generateTest();
  if (testQuestions.length !== TEST_LENGTH) {
    throw new Error("Vygenerovalo sa iba " + testQuestions.length + " otazok.");
  }
  answers = Array(TEST_LENGTH).fill(null);
  updateHeader();
  renderNavigation();
  renderQuestion();
  startTimer();
} catch (error) {
  showError(error.message);
}
