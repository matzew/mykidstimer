/**
 * KidsTimer App - Main application logic
 */
(function () {
  'use strict';

  // === State ===
  const state = {
    tasks: [],
    activeTaskIndex: -1,
    editingTaskIndex: -1,
  };

  // === DOM Elements ===
  const dom = {
    timerDisplay: document.getElementById('timer-display'),
    timerContainer: document.getElementById('timer-container'),
    tasksList: document.getElementById('tasks-list'),
    btnStart: document.getElementById('btn-start'),
    btnPause: document.getElementById('btn-pause'),
    btnStop: document.getElementById('btn-stop'),
    btnAddTask: document.getElementById('btn-add-task'),
    modalOverlay: document.getElementById('modal-overlay'),
    modalTitle: document.getElementById('modal-title'),
    taskName: document.getElementById('task-name'),
    taskDuration: document.getElementById('task-duration'),
    colorPicker: document.getElementById('color-picker'),
    btnModalCancel: document.getElementById('btn-modal-cancel'),
    btnModalSave: document.getElementById('btn-modal-save'),
    mascotContainer: document.getElementById('mascot-container'),
  };

  // === Instances ===
  const clock = new AnalogClock('analog-clock');
  const timer = new CountdownTimer();

  let selectedColor = '#4A90D9';

  // === LocalStorage ===
  function saveTasks() {
    localStorage.setItem('kidstimer-tasks', JSON.stringify(state.tasks));
  }

  function loadTasks() {
    try {
      const saved = localStorage.getItem('kidstimer-tasks');
      if (saved) {
        state.tasks = JSON.parse(saved);
      }
    } catch (e) {
      state.tasks = [];
    }
  }

  // === Mascot ===
  function loadMascot() {
    fetch('assets/mascot.svg')
      .then(r => r.text())
      .then(svg => {
        dom.mascotContainer.innerHTML = svg;
        dom.mascotContainer.classList.add('mascot-blink');
      });
  }

  function mascotCelebrate() {
    dom.mascotContainer.classList.add('mascot-celebrate');
    setTimeout(() => {
      dom.mascotContainer.classList.remove('mascot-celebrate');
    }, 1500);
  }

  // === Task Rendering ===
  function renderTasks() {
    dom.tasksList.innerHTML = '';

    state.tasks.forEach((task, index) => {
      const card = document.createElement('div');
      card.className = 'task-card';
      if (index === state.activeTaskIndex) {
        card.classList.add('active');
      }
      if (task.completed) {
        card.classList.add('completed');
      }
      card.style.borderColor = task.color;

      card.innerHTML = `
        <div class="task-name">${escapeHtml(task.name)}</div>
        <div class="task-duration">${task.duration} Min</div>
        <button class="task-delete" title="Löschen">&times;</button>
      `;

      // Select task
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('task-delete')) return;
        if (timer.running) return; // Don't switch while running
        selectTask(index);
      });

      // Delete task
      card.querySelector('.task-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(index);
      });

      dom.tasksList.appendChild(card);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function selectTask(index) {
    if (index < 0 || index >= state.tasks.length) return;
    state.activeTaskIndex = index;
    const task = state.tasks[index];

    // Update timer border color
    dom.timerContainer.style.borderColor = task.color;

    // Enable start button
    dom.btnStart.disabled = task.completed;

    renderTasks();
  }

  function deleteTask(index) {
    if (timer.running && index === state.activeTaskIndex) {
      timer.stop();
      clock.clearOverlay();
      updateTimerUI(-1);
    }

    state.tasks.splice(index, 1);

    if (state.activeTaskIndex >= state.tasks.length) {
      state.activeTaskIndex = state.tasks.length - 1;
    }
    if (state.activeTaskIndex === index) {
      state.activeTaskIndex = -1;
    } else if (state.activeTaskIndex > index) {
      state.activeTaskIndex--;
    }

    saveTasks();
    renderTasks();
    updateButtonStates();
  }

  // === Timer Controls ===
  function startTimer() {
    if (state.activeTaskIndex < 0) return;
    const task = state.tasks[state.activeTaskIndex];
    if (task.completed) return;

    timer.start(task.duration);
    clock.setOverlay(new Date(), timer.getEndTime(), task.color);

    dom.btnStart.hidden = true;
    dom.btnPause.hidden = false;
    dom.btnStop.hidden = false;
  }

  function pauseTimer() {
    if (timer.paused) {
      timer.resume();
      dom.btnPause.textContent = 'Pause';
    } else {
      timer.pause();
      dom.btnPause.textContent = 'Weiter';
    }
  }

  function stopTimer() {
    timer.stop();
    clock.clearOverlay();
    updateTimerUI(-1);

    dom.btnStart.hidden = false;
    dom.btnPause.hidden = true;
    dom.btnStop.hidden = true;
    dom.btnPause.textContent = 'Pause';

    dom.btnStart.disabled = false;
  }

  function onTimerFinish() {
    const task = state.tasks[state.activeTaskIndex];
    if (task) {
      task.completed = true;
    }

    clock.clearOverlay();
    mascotCelebrate();
    playFinishSound();

    dom.btnStart.hidden = false;
    dom.btnPause.hidden = true;
    dom.btnStop.hidden = true;
    dom.btnPause.textContent = 'Pause';
    dom.btnStart.disabled = true;

    saveTasks();
    renderTasks();

    // Auto-select next incomplete task
    const nextIndex = state.tasks.findIndex((t, i) => i > state.activeTaskIndex && !t.completed);
    if (nextIndex >= 0) {
      selectTask(nextIndex);
    }
  }

  function playFinishSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.value = 0.15;
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3 + i * 0.15);
        osc.start(audioCtx.currentTime + i * 0.15);
        osc.stop(audioCtx.currentTime + 0.4 + i * 0.15);
      });
    } catch (e) {
      // Audio not available, that's fine
    }
  }

  function updateTimerUI(remainingMs) {
    if (remainingMs < 0) {
      dom.timerDisplay.textContent = '00:00';
    } else {
      dom.timerDisplay.textContent = CountdownTimer.formatTime(remainingMs);
    }
  }

  function updateButtonStates() {
    const hasActiveTask = state.activeTaskIndex >= 0;
    const activeTask = hasActiveTask ? state.tasks[state.activeTaskIndex] : null;
    dom.btnStart.disabled = !hasActiveTask || (activeTask && activeTask.completed);

    if (!timer.running) {
      dom.timerContainer.style.borderColor = activeTask ? activeTask.color : '#e2e8f0';
    }
  }

  // === Modal ===
  function openModal(editIndex) {
    state.editingTaskIndex = editIndex;

    if (editIndex >= 0) {
      const task = state.tasks[editIndex];
      dom.modalTitle.textContent = 'Aufgabe bearbeiten';
      dom.taskName.value = task.name;
      dom.taskDuration.value = task.duration;
      selectedColor = task.color;
    } else {
      dom.modalTitle.textContent = 'Neue Aufgabe';
      dom.taskName.value = '';
      dom.taskDuration.value = 15;
      selectedColor = '#4A90D9';
    }

    updateColorSelection();
    dom.modalOverlay.hidden = false;
    dom.taskName.focus();
  }

  function closeModal() {
    dom.modalOverlay.hidden = true;
  }

  function saveModal() {
    const name = dom.taskName.value.trim();
    const duration = parseInt(dom.taskDuration.value, 10);

    if (!name) {
      dom.taskName.focus();
      return;
    }
    if (!duration || duration < 1) {
      dom.taskDuration.focus();
      return;
    }

    if (state.editingTaskIndex >= 0) {
      state.tasks[state.editingTaskIndex].name = name;
      state.tasks[state.editingTaskIndex].duration = duration;
      state.tasks[state.editingTaskIndex].color = selectedColor;
    } else {
      state.tasks.push({
        name,
        duration,
        color: selectedColor,
        completed: false,
      });
    }

    saveTasks();
    renderTasks();
    closeModal();

    // Auto-select if it's the first task
    if (state.tasks.length === 1) {
      selectTask(0);
    }

    updateButtonStates();
  }

  function updateColorSelection() {
    dom.colorPicker.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.classList.toggle('selected', swatch.dataset.color === selectedColor);
    });
  }

  // === Main Loop ===
  function mainLoop() {
    const now = new Date();

    // Update timer
    if (timer.running) {
      const remaining = timer.tick();
      if (remaining === 0) {
        onTimerFinish();
      }

      // Update clock overlay to shrink from current time
      if (timer.running) {
        clock.setOverlay(now, timer.getEndTime(), state.tasks[state.activeTaskIndex].color);
      }
    }

    // Render clock
    clock.render(now);

    requestAnimationFrame(mainLoop);
  }

  // === Timer Callbacks ===
  timer.onTick = updateTimerUI;

  // === Event Listeners ===
  dom.btnStart.addEventListener('click', startTimer);
  dom.btnPause.addEventListener('click', pauseTimer);
  dom.btnStop.addEventListener('click', stopTimer);
  dom.btnAddTask.addEventListener('click', () => openModal(-1));
  dom.btnModalCancel.addEventListener('click', closeModal);
  dom.btnModalSave.addEventListener('click', saveModal);

  dom.modalOverlay.addEventListener('click', (e) => {
    if (e.target === dom.modalOverlay) closeModal();
  });

  dom.colorPicker.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      selectedColor = swatch.dataset.color;
      updateColorSelection();
    });
  });

  // Enter key in modal
  dom.taskName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveModal();
  });
  dom.taskDuration.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveModal();
  });

  // === Init ===
  loadTasks();
  loadMascot();
  renderTasks();
  updateButtonStates();
  mainLoop();
})();
