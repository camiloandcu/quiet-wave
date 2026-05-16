// UI control management module

export function createControls(startButtonId, statusBadgeId) {
  const startBtn = document.getElementById(startButtonId);
  const statusBadge = document.getElementById(statusBadgeId);

  function setStatus(text) {
    statusBadge.textContent = text;
  }

  function setButtonText(text) {
    startBtn.textContent = text;
  }

  function onStartClick(callback) {
    startBtn.addEventListener('click', callback);
  }

  return { setStatus, setButtonText, onStartClick };
}
