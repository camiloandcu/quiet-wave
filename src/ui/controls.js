// UI control management module

export function createControls(startButtonId, statusBadgeId) {
  const startBtn = document.getElementById(startButtonId);
  const statusBadge = document.getElementById(statusBadgeId);
  const effectToggle = document.getElementById('effectToggle');
  const mixSlider = document.getElementById('mixSlider');
  const modeLabel = document.getElementById('modeLabel');

  function setStatus(text) {
    if (statusBadge) statusBadge.textContent = text;
  }

  function setButtonText(text) {
    if (startBtn) startBtn.textContent = text;
  }

  function onStartClick(callback) {
    if (startBtn) startBtn.addEventListener('click', callback);
  }

  function onEffectToggle(callback) {
    if (effectToggle) effectToggle.addEventListener('change', (e) => callback(e.target.checked));
  }

  function onMixChange(callback) {
    if (mixSlider) mixSlider.addEventListener('input', (e) => callback(parseFloat(e.target.value)));
  }

  function setMixValue(v) {
    if (mixSlider) mixSlider.value = String(v);
    if (modeLabel) modeLabel.textContent = Math.round(v * 100) + '%';
  }

  function setModeLabel(text) {
    if (modeLabel) modeLabel.textContent = text;
  }

  return { setStatus, setButtonText, onStartClick, onEffectToggle, onMixChange, setMixValue, setModeLabel };
}
