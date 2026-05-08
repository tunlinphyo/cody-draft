const lastFocusedTrigger = new WeakMap()
const processedEvents = new WeakSet()
const FIRST_FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([type="hidden"]):not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function togglePolyfill() {
  setupToggleListeners(document)
}

function handleToggleActivation(event) {
  if (processedEvents.has(event)) return

  processedEvents.add(event)

  if (event.defaultPrevented) return
  if (event.type !== 'command') return

  if (event.command !== '--toggle') return

  const trigger = getToggleTrigger(event)
  if (!trigger) return

  const target = getToggleTarget(event)
  if (!target) return

  const isOpening = target.hasAttribute('inert')

  target.toggleAttribute('inert', !isOpening)
  syncInert(target)

  if (isOpening) {
    lastFocusedTrigger.set(target, trigger)
    focusFirstFocusableElement(target)
    return
  }

  lastFocusedTrigger.get(target)?.focus()
}

function getToggleTrigger(event) {
  return event.source instanceof HTMLElement ? event.source : null
}

function getToggleTarget(event) {
  return event.target instanceof HTMLElement ? event.target : null
}

function focusFirstFocusableElement(target) {
  target.querySelector(FIRST_FOCUSABLE_SELECTOR)?.focus()
}

function getLinkedElements(id) {
  return document.querySelectorAll(`[data-inert-${CSS.escape(id)}]`)
}

function syncInert(target) {
  const isOpen = !target.hasAttribute('inert')

  if (!target.id) return

  for (const linkedElement of getLinkedElements(target.id)) {
    linkedElement.toggleAttribute('inert', isOpen)
  }
}

function setupToggleListeners(target) {
  target.addEventListener('command', handleToggleActivation, true)
}

document.addEventListener('DOMContentLoaded', togglePolyfill)