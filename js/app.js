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
    autoplay: false,
    autoplayCountdownId: null,
    runningTimers: new Map(), // taskIndex → CountdownTimer
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
    btnModalSaveAdd: document.getElementById('btn-modal-save-add'),
    autoplayCheckbox: document.getElementById('autoplay-checkbox'),
    mascotContainer: document.getElementById('mascot-container'),
  };

  // === Instances ===
  const clock = new AnalogClock('analog-clock');

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

  // === Autoplay ===
  function saveAutoplay() {
    localStorage.setItem('kidstimer-autoplay', JSON.stringify(state.autoplay));
  }

  function loadAutoplay() {
    try {
      const saved = localStorage.getItem('kidstimer-autoplay');
      if (saved !== null) {
        state.autoplay = JSON.parse(saved);
      }
    } catch (e) {
      state.autoplay = false;
    }
    dom.autoplayCheckbox.checked = state.autoplay;
  }

  function startAutoplayCountdown() {
    let count = 3;
    dom.timerDisplay.textContent = count + '...';
    dom.timerDisplay.classList.add('countdown-active');

    state.autoplayCountdownId = setInterval(() => {
      count--;
      if (count > 0) {
        dom.timerDisplay.textContent = count + '...';
      } else {
        cancelAutoplayCountdown();
        startTimer();
      }
    }, 1000);
  }

  function cancelAutoplayCountdown() {
    if (state.autoplayCountdownId !== null) {
      clearInterval(state.autoplayCountdownId);
      state.autoplayCountdownId = null;
    }
    dom.timerDisplay.classList.remove('countdown-active');
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
      if (state.runningTimers.has(index)) {
        card.classList.add('running');
      }
      card.style.borderColor = task.color;

      const countdownHtml = state.runningTimers.has(index)
        ? `<div class="task-countdown" data-timer-index="${index}"></div>`
        : '';

      card.innerHTML = `
        <div class="task-name">${escapeHtml(task.name)}</div>
        <div class="task-duration">${task.duration} ${I18n.t('task.minutes')}</div>
        ${countdownHtml}
        <button class="task-delete" title="${I18n.t('task.delete')}">&times;</button>
      `;

      // Select task (allowed even while other timers run)
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('task-delete')) return;
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

    // Update button states for selected task
    const isRunning = state.runningTimers.has(index);
    dom.btnStart.hidden = isRunning;
    dom.btnPause.hidden = !isRunning;
    dom.btnStop.hidden = !isRunning;
    dom.btnStart.disabled = task.completed || isRunning;

    if (isRunning) {
      const tmr = state.runningTimers.get(index);
      dom.btnPause.textContent = tmr.paused ? I18n.t('btn.resume') : I18n.t('btn.pause');
    } else {
      dom.btnPause.textContent = I18n.t('btn.pause');
    }

    // Update main display for selected task
    if (isRunning) {
      const tmr = state.runningTimers.get(index);
      const remaining = tmr.paused ? tmr.pausedRemaining : tmr.endTime.getTime() - Date.now();
      updateTimerUI(Math.max(0, remaining));
    } else {
      updateTimerUI(-1);
    }

    renderTasks();
  }

  function deleteTask(index) {
    // Stop the timer for this task if running
    if (state.runningTimers.has(index)) {
      state.runningTimers.get(index).stop();
      state.runningTimers.delete(index);
    }

    state.tasks.splice(index, 1);

    // Re-key running timers: shift indices above the deleted one
    const newTimers = new Map();
    for (const [idx, tmr] of state.runningTimers) {
      if (idx > index) {
        tmr._taskIndex = idx - 1;
        newTimers.set(idx - 1, tmr);
      } else {
        newTimers.set(idx, tmr);
      }
    }
    state.runningTimers = newTimers;

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
    if (state.runningTimers.has(state.activeTaskIndex)) return;

    const tmr = new CountdownTimer();
    tmr.onTick = (remaining) => {
      // Only update main display if this is the focused task
      if (state.activeTaskIndex === tmr._taskIndex) {
        updateTimerUI(remaining);
      }
    };
    tmr._taskIndex = state.activeTaskIndex;
    tmr.start(task.duration);
    state.runningTimers.set(state.activeTaskIndex, tmr);

    dom.btnStart.hidden = true;
    dom.btnPause.hidden = false;
    dom.btnStop.hidden = false;

    renderTasks();
  }

  function pauseTimer() {
    const tmr = state.runningTimers.get(state.activeTaskIndex);
    if (!tmr) return;

    if (tmr.paused) {
      tmr.resume();
      dom.btnPause.textContent = I18n.t('btn.pause');
    } else {
      tmr.pause();
      dom.btnPause.textContent = I18n.t('btn.resume');
    }
  }

  function stopTimer() {
    cancelAutoplayCountdown();
    const tmr = state.runningTimers.get(state.activeTaskIndex);
    if (tmr) {
      tmr.stop();
      state.runningTimers.delete(state.activeTaskIndex);
    }
    updateTimerUI(-1);

    dom.btnStart.hidden = false;
    dom.btnPause.hidden = true;
    dom.btnStop.hidden = true;
    dom.btnPause.textContent = I18n.t('btn.pause');

    dom.btnStart.disabled = false;

    renderTasks();
  }

  function onTimerFinish(taskIndex) {
    state.runningTimers.delete(taskIndex);

    const task = state.tasks[taskIndex];
    if (task) {
      task.completed = true;
    }

    mascotCelebrate();
    playFinishSound();

    // Update buttons if the finished task is the currently selected one
    if (taskIndex === state.activeTaskIndex) {
      dom.btnStart.hidden = false;
      dom.btnPause.hidden = true;
      dom.btnStop.hidden = true;
      dom.btnPause.textContent = I18n.t('btn.pause');
      dom.btnStart.disabled = true;
      updateTimerUI(-1);
    }

    saveTasks();
    renderTasks();

    // Auto-select next incomplete task (only if finished task was selected)
    if (taskIndex === state.activeTaskIndex) {
      const nextIndex = state.tasks.findIndex((t, i) => i > taskIndex && !t.completed);
      if (nextIndex >= 0) {
        selectTask(nextIndex);
        if (state.autoplay) {
          startAutoplayCountdown();
        }
      }
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
    const isRunning = hasActiveTask && state.runningTimers.has(state.activeTaskIndex);

    dom.btnStart.disabled = !hasActiveTask || (activeTask && activeTask.completed) || isRunning;
    dom.btnStart.hidden = isRunning;
    dom.btnPause.hidden = !isRunning;
    dom.btnStop.hidden = !isRunning;

    if (!isRunning) {
      dom.timerContainer.style.borderColor = activeTask ? activeTask.color : '#e2e8f0';
    }
  }

  // === Modal ===
  function openModal(editIndex) {
    state.editingTaskIndex = editIndex;

    if (editIndex >= 0) {
      const task = state.tasks[editIndex];
      dom.modalTitle.textContent = I18n.t('modal.editTask');
      dom.taskName.value = task.name;
      dom.taskDuration.value = task.duration;
      selectedColor = task.color;
    } else {
      dom.modalTitle.textContent = I18n.t('modal.newTask');
      dom.taskName.value = '';
      dom.taskDuration.value = 15;
      selectedColor = '#4A90D9';
    }

    updateColorSelection();
    dom.btnModalSaveAdd.hidden = (editIndex >= 0);
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

  function saveAndAddAnother() {
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

    state.tasks.push({
      name,
      duration,
      color: selectedColor,
      completed: false,
    });

    saveTasks();
    renderTasks();

    // Auto-select if it's the first task
    if (state.tasks.length === 1) {
      selectTask(0);
    }

    updateButtonStates();

    // Reset form for next task
    dom.taskName.value = '';
    dom.taskDuration.value = 15;
    selectedColor = '#4A90D9';
    updateColorSelection();
    dom.taskName.focus();
  }

  function updateColorSelection() {
    dom.colorPicker.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.classList.toggle('selected', swatch.dataset.color === selectedColor);
    });
  }

  // === Main Loop ===
  function mainLoop() {
    const now = new Date();
    const overlays = [];
    const finishedTasks = [];

    for (const [taskIndex, tmr] of state.runningTimers) {
      const remaining = tmr.tick();
      if (remaining === 0) {
        finishedTasks.push(taskIndex);
      } else if (remaining > 0) {
        overlays.push({
          startTime: now,
          endTime: tmr.getEndTime(),
          color: state.tasks[taskIndex].color,
        });
      }
    }

    finishedTasks.forEach(idx => onTimerFinish(idx));
    clock.setOverlays(overlays);

    // Update mini-countdowns on task cards
    for (const [taskIndex, tmr] of state.runningTimers) {
      const el = document.querySelector(`.task-countdown[data-timer-index="${taskIndex}"]`);
      if (el) {
        const rem = tmr.paused ? tmr.pausedRemaining : Math.max(0, tmr.endTime.getTime() - Date.now());
        el.textContent = CountdownTimer.formatTime(rem);
      }
    }

    clock.render(now);
    requestAnimationFrame(mainLoop);
  }

  // === Event Listeners ===
  dom.btnStart.addEventListener('click', startTimer);
  dom.btnPause.addEventListener('click', pauseTimer);
  dom.btnStop.addEventListener('click', stopTimer);
  dom.btnAddTask.addEventListener('click', () => openModal(-1));
  dom.btnModalCancel.addEventListener('click', closeModal);
  dom.btnModalSave.addEventListener('click', saveModal);
  dom.btnModalSaveAdd.addEventListener('click', saveAndAddAnother);

  dom.autoplayCheckbox.addEventListener('change', () => {
    state.autoplay = dom.autoplayCheckbox.checked;
    saveAutoplay();
    if (!state.autoplay) {
      cancelAutoplayCountdown();
    }
  });

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
  I18n.init().then(() => {
    loadTasks();
    loadAutoplay();
    loadMascot();
    renderTasks();
    updateButtonStates();
    mainLoop();
  });
})();
