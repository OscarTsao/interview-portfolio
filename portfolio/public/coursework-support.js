const course = document.documentElement.dataset.coursework;
if (course === 'hw2') {
  for (const toggle of document.querySelectorAll('button.slider')) {
    const sync = () => toggle.setAttribute('aria-pressed', String(toggle.classList.contains('active')));
    sync(); toggle.addEventListener('click', sync);
  }
  const pad = document.createElement('div');
  pad.className = 'maze-directions'; pad.setAttribute('role', 'group'); pad.setAttribute('aria-label', '移動方向');
  for (const [key, label, symbol] of [['ArrowUp', '向上', '↑'], ['ArrowLeft', '向左', '←'], ['ArrowDown', '向下', '↓'], ['ArrowRight', '向右', '→']]) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = symbol; button.setAttribute('aria-label', label);
    button.addEventListener('click', () => document.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles:true})));
    pad.append(button);
  }
  document.querySelector('.maze-scroll').after(pad);
}
