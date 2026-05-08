function dialogPolyfill() {
  const triggers = document.querySelectorAll('[dialogtarget]');
  const dialogs = document.querySelectorAll('dialog');

  const CLOSE_ATTR = 'data-closing';
  const CLOSE_MS = 500;

  // --- open ---
  for (const el of Array.from(triggers)) {
    el.addEventListener('click', onTriggerClick);
  }

  // --- close (button + backdrop click + esc) ---
  for (const dlg of Array.from(dialogs)) {
    dlg.addEventListener('click', (e) => onDialogClick(e, dlg));

    // Esc key: prevent instant close so we can animate
    dlg.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeWithAnimation(dlg);
    });
  }

  function onTriggerClick(event) {
    const target = event.target;
    const trigger = target.closest('[dialogtarget]');
    if (!trigger) return;

    const id = trigger.getAttribute('dialogtarget');
    const dlg = id ? document.getElementById(id) : null;
    if (!dlg) return;

    // if it was mid-closing, cancel closing and reopen cleanly
    dlg.removeAttribute(CLOSE_ATTR);

    // show
    if (!dlg.open) dlg.showModal();
  }

  function onDialogClick(event, dlg) {
    const target = event.target;

    // close button inside dialog
    if (target.closest('[dialogclose]')) {
      closeWithAnimation(dlg);
      return;
    }

    // optional: backdrop click closes
    // if (target === dlg) closeWithAnimation(dlg)
  }

  function closeWithAnimation(dlg) {
    if (!dlg.open) return;

    // Avoid stacking multiple close handlers
    if (dlg.hasAttribute(CLOSE_ATTR)) return;

    dlg.setAttribute(CLOSE_ATTR, '');

    const done = () => {
      cleanup();
      dlg.removeAttribute(CLOSE_ATTR);

      // only close if still open
      if (dlg.open) dlg.close();
    };

    const onEnd = (e) => {
      // Only react to transition on the dialog itself
      if (e.target !== dlg) return;
      done();
    };

    const cleanup = () => {
      dlg.removeEventListener('transitionend', onEnd);
      clearTimeout(timer);
    };

    dlg.addEventListener('transitionend', onEnd, { passive: true });

    // Safari sometimes drops transitionend -> hard fallback
    const timer = window.setTimeout(done, CLOSE_MS + 80);
  }
}

document.addEventListener('DOMContentLoaded', dialogPolyfill);