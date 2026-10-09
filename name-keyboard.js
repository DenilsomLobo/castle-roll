(() => {
  const input = document.querySelector('#player-name');
  const keyboard = document.querySelector('#player-keyboard');
  const error = document.querySelector('#name-error');
  if (!input || !keyboard) return;

  if (!window.matchMedia('(any-pointer: coarse)').matches) return;

  input.inputMode = 'none';
  keyboard.hidden = false;

  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
    ['Á', 'É', 'Í', 'Ó', 'Ú', 'Ã', 'Õ', 'Ç']
  ];

  function updateValue(value, start, end) {
    input.value = value;
    input.setSelectionRange(start, end);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus({ preventScroll: true });
    if (error) error.textContent = '';
  }

  function createKey(label, value, wide = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('aria-label', label);
    if (wide) button.className = 'keyboard-wide';
    button.addEventListener('pointerdown', (event) => event.preventDefault());
    button.addEventListener('click', () => {
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? start;
      if (input.value.length - (end - start) + value.length > input.maxLength) return;
      updateValue(
        input.value.slice(0, start) + value + input.value.slice(end),
        start + value.length,
        start + value.length
      );
    });
    return button;
  }

  rows.forEach((letters) => {
    const row = document.createElement('div');
    row.className = 'player-keyboard-row';
    letters.forEach((letter) => row.append(createKey(letter, letter)));
    keyboard.append(row);
  });

  const actions = document.createElement('div');
  actions.className = 'player-keyboard-row';
  const backspace = createKey('⌫', '', true);
  backspace.setAttribute('aria-label', 'Apagar caractere anterior');
  backspace.addEventListener('click', () => {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const from = start === end ? Math.max(0, start - 1) : start;
    updateValue(input.value.slice(0, from) + input.value.slice(end), from, from);
  });
  actions.append(backspace, createKey('ESPAÇO', ' ', true));
  keyboard.append(actions);
})();
