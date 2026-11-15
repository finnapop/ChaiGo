(() => {
  const greetings = [
    "你好！我是華語娘 ♡",
    "好久不見，好想你！",
    "今天也一起學中文吧！",
  ];
  let greetingIndex = 0;
  let rotationTimer = 0;
  let interactionTimer = 0;
  let fadeTimer = 0;
  let interactionUntil = 0;
  let fieldFocused = false;
  let widgetFocused = false;
  let pointerOnWidget = false;
  let isHidden = false;

  const root = document.createElement("aside");
  root.className = "floating-vtuber";
  root.setAttribute("aria-label", "華語娘常駐陪伴視窗");
  root.dataset.interacting = "false";

  const bubbleWrap = document.createElement("div");
  bubbleWrap.className = "floating-vtuber__bubble-wrap";

  const bubbleLink = document.createElement("a");
  bubbleLink.className = "floating-vtuber__bubble";
  bubbleLink.href = "https://chaigo-aituber-kit.vercel.app/";
  bubbleLink.target = "_blank";
  bubbleLink.rel = "noopener noreferrer";
  bubbleLink.setAttribute("aria-label", "前往 AI Chat，另開視窗");

  const message = document.createElement("span");
  message.className = "floating-vtuber__message";
  message.textContent = greetings[greetingIndex];
  bubbleLink.append(message);

  const closeButton = document.createElement("button");
  closeButton.className = "floating-vtuber__close";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "暫時隱藏陪伴視窗");
  closeButton.textContent = "×";

  const characterButton = document.createElement("button");
  characterButton.className = "floating-vtuber__character";
  characterButton.type = "button";
  characterButton.setAttribute("aria-label", "切換下一句問候");

  const characterImage = document.createElement("img");
  characterImage.src = "./popup.png";
  characterImage.alt = "";
  characterImage.width = 500;
  characterImage.height = 530;
  characterButton.append(characterImage);

  bubbleWrap.append(bubbleLink, closeButton);
  root.append(bubbleWrap, characterButton);
  document.body.append(root);

  const isTextEntry = (element) => element instanceof HTMLElement && Boolean(
    element.matches("input, textarea, select, [contenteditable='true'], [role='textbox']"),
  );

  const isPaused = () => (
    isHidden ||
    document.hidden ||
    fieldFocused ||
    widgetFocused ||
    pointerOnWidget ||
    Date.now() < interactionUntil
  );

  const clearRotation = () => {
    window.clearTimeout(rotationTimer);
    rotationTimer = 0;
  };

  const scheduleRotation = () => {
    clearRotation();
    if (isPaused()) return;
    rotationTimer = window.setTimeout(rotateIdleGreeting, 8000);
  };

  function setMessage(text) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.clearTimeout(fadeTimer);
    if (reducedMotion) {
      message.textContent = text;
      message.classList.remove("is-changing");
    } else {
      message.classList.add("is-changing");
      fadeTimer = window.setTimeout(() => {
        message.textContent = text;
        message.classList.remove("is-changing");
      }, 180);
    }
  }

  function showGreeting(nextIndex) {
    if (isHidden) return;
    clearRotation();
    greetingIndex = nextIndex;
    setMessage(greetings[greetingIndex]);
    scheduleRotation();
  }

  function showAnswerFeedback(isCorrect) {
    if (isHidden) return;
    clearRotation();
    setMessage(isCorrect ? "答對了！太棒了！" : "沒關係，再試一次！");
    scheduleRotation();
  }

  function advanceGreeting() {
    showGreeting((greetingIndex + 1) % greetings.length);
  }

  function rotateIdleGreeting() {
    showGreeting(greetingIndex === 1 ? 2 : 1);
  }

  const updateInteractionState = () => {
    const interacting = isPaused();
    root.dataset.interacting = String(interacting);
    if (interacting) clearRotation();
    else scheduleRotation();
  };

  const pauseForPageControl = () => {
    interactionUntil = Date.now() + 1800;
    window.clearTimeout(interactionTimer);
    root.dataset.interacting = "true";
    clearRotation();
    interactionTimer = window.setTimeout(() => {
      updateInteractionState();
    }, 1850);
  };

  characterButton.addEventListener("click", advanceGreeting);
  window.addEventListener("chaigo:game-answer", (event) => {
    showAnswerFeedback(event.detail?.isCorrect === true);
  });

  closeButton.addEventListener("click", () => {
    isHidden = true;
    clearRotation();
    window.clearTimeout(interactionTimer);
    window.clearTimeout(fadeTimer);
    root.remove();
  });

  root.addEventListener("pointerenter", () => {
    pointerOnWidget = true;
    updateInteractionState();
  });

  root.addEventListener("pointerleave", () => {
    pointerOnWidget = false;
    updateInteractionState();
  });

  root.addEventListener("focusin", () => {
    widgetFocused = true;
    updateInteractionState();
  });

  root.addEventListener("focusout", () => {
    window.setTimeout(() => {
      widgetFocused = root.contains(document.activeElement);
      updateInteractionState();
    }, 0);
  });

  document.addEventListener("focusin", (event) => {
    if (isTextEntry(event.target)) {
      fieldFocused = true;
      updateInteractionState();
    }
  });

  document.addEventListener("focusout", (event) => {
    if (!isTextEntry(event.target)) return;
    window.setTimeout(() => {
      fieldFocused = isTextEntry(document.activeElement);
      updateInteractionState();
    }, 0);
  });

  document.addEventListener("pointerdown", (event) => {
    if (root.contains(event.target)) return;
    if (event.target instanceof Element && event.target.closest("button, a, input, select, textarea, [role='button']")) {
      pauseForPageControl();
    }
  });

  document.addEventListener("visibilitychange", updateInteractionState);
  scheduleRotation();
})();
