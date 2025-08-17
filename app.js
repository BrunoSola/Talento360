// ===== Config =====
const TOTAL_STEPS = 24; // ajuste após duplicar os blocos .step no HTML
const API_URL = 'https://<api-id>.execute-api.<regiao>.amazonaws.com/prod/disc'; // definir na Parte API
const STORAGE_KEY = 'talento360_state_v1';

// ===== Estado =====
let state = {
  startedAt: new Date().toISOString(),
  currentStep: 1,
  answers: {}, //
  nome: '',
  email: ''
};

// ===== Util =====
const saveState = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch {}
};
const qs = (s, root=document) => root.querySelector(s);
const qsa = (s, root=document) => [...root.querySelectorAll(s)];

// ===== UI refs =====
const form = qs('#disc-form');
const steps = qsa('.step');
const btnPrev = qs('#btn-prev');
const btnNext = qs('#btn-next');
const btnSubmit = qs('#btn-submit');
const progressBar = qs('#progress-bar');
const progressText = qs('#progress-text');
const msg = qs('#msg');
const inputNome = qs('#nome');
const inputEmail = qs('#email');

// ===== Init =====
loadState();
if (state.nome) inputNome.value = state.nome;
if (state.email) inputEmail.value = state.email;

function showStep(n) {
  state.currentStep = n;
  steps.forEach(step => step.hidden = Number(step.dataset.step) !== n);
  btnPrev.disabled = n === 1;
  btnNext.hidden = n === TOTAL_STEPS;
  btnSubmit.hidden = n !== TOTAL_STEPS;

  const pct = Math.round(((n - 1) / TOTAL_STEPS) * 100);
  progressBar.style.width = `${pct}%`;
  progressText.textContent = `Progresso: ${pct}%`;
  saveState();
}

function restoreAnswersForStep(n) {
  const name = `g${n}`;
  const val = state.answers[name];
  if (!val) return;
  const input = qs(`input[name="${name}"][value="${val}"]`);
  if (input) input.checked = true;
}

function saveCurrentStepAnswer() {
  const n = state.currentStep;
  const name = `g${n}`;
  const checked = qs(`input[name="${name}"]:checked`);
  if (checked) {
    state.answers[name] = checked.value;
    saveState();
    return true;
  }
  return false;
}

function validateIdentity() {
  state.nome = inputNome.value.trim();
  state.email = inputEmail.value.trim();
  if (!state.nome || !state.email) {
    msg.textContent = 'Preencha Nome e E-mail antes de começar.';
    msg.style.color = 'var(--danger)';
    return false;
  }
  msg.textContent = '';
  return true;
}

// Navegação
btnNext.addEventListener('click', () => {
  if (!validateIdentity()) return;
  if (!saveCurrentStepAnswer()) {
    msg.textContent = 'Selecione uma alternativa antes de continuar.';
    msg.style.color = 'var(--danger)';
    return;
  }
  const next = Math.min(state.currentStep + 1, TOTAL_STEPS);
  showStep(next);
  restoreAnswersForStep(next);
});

btnPrev.addEventListener('click', () => {
  const prev = Math.max(state.currentStep - 1, 1);
  showStep(prev);
  restoreAnswersForStep(prev);
});

// Submit
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!saveCurrentStepAnswer()) {
    msg.textContent = 'Selecione uma alternativa.';
    msg.style.color = 'var(--danger)';
    return;
  }
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    if (!state.answers[`g${i}`]) {
      msg.textContent = `Responda o Grupo ${i} antes de enviar.`;
      msg.style.color = 'var(--danger)';
      showStep(i);
      return;
    }
  }

  msg.textContent = 'Enviando...';
  msg.style.color = 'var(--muted)';

  const payload = {
    product: 'Talento360',
    respondent: { name: state.nome, email: state.email },
    answers: state.answers,
    startedAt: state.startedAt,
    submittedAt: new Date().toISOString(),
    version: 1
  };

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      mode: 'cors',
      credentials: 'omit'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    msg.textContent = data?.message || 'Respostas enviadas com sucesso!';
    msg.style.color = 'var(--acc2)';
    // Opcional: localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error(err);
    msg.textContent = 'Falha ao enviar. Verifique sua conexão e tente novamente.';
    msg.style.color = 'var(--danger)';
  }
});

// Inicializa
showStep(state.currentStep || 1);
restoreAnswersForStep(state.currentStep || 1);
