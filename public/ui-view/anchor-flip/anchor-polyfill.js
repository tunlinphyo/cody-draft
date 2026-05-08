function anchorCardPolyfill() {
  const groups = document.querySelectorAll('[anchorgroup]')
  const defaultEventName = 'anchorcard'

  for (let group of groups) {
    const eventName = group.getAttribute('anchorgroup') || defaultEventName
    const items = group.querySelectorAll('[anchoritem]')

    const dialog = group.querySelector('[anchortarget]')
    const target = group.querySelector('[anchorpos]')
    const targetClose = group.querySelector('[anchorclose]')
    const blob = document.createElement('div')
    blob.setAttribute('anchorblob', '')

    if (!(dialog && target && targetClose)) continue

    group.appendChild(blob)

    let currentItem = null

    for (let item of items) {
      item.addEventListener('click', () => handleItemClick(item))
    }

    targetClose.addEventListener('click', handleItemClose)

    function handleItemClick(item) {
      currentItem = item
      currentItem.setAttribute('anchoritem', 'open')
      document.dispatchEvent(new CustomEvent(`${eventName}:open`, {
        detail: { item, dialog }
      }))
      dialog.showModal()
      requestAnimationFrame(() => {
        target.setAttribute('anchorpos', 'open')
        blob.addEventListener('transitionend', () => {
          dialog.setAttribute('show', '')
          document.dispatchEvent(new CustomEvent(`${eventName}:opened`, {
            detail: { item, dialog }
          }))
        }, { once: true })
      })
    }

    function handleItemClose() {
      if (!currentItem) return
      target.setAttribute('anchortarget', '')
      blob.setAttribute('anchorblob', '')
      document.dispatchEvent(new CustomEvent(`${eventName}:close`, {
        detail: { item: currentItem, blob }
      }))
      blob.addEventListener('transitionend', () => {
        currentItem.setAttribute('anchoritem', '')
        document.dispatchEvent(new CustomEvent(`${eventName}:closed`, {
          detail: { item: currentItem, blob }
        }))
        currentItem = null
      }, { once: true })
    }
  }
}

document.addEventListener('DOMContentLoaded', anchorCardPolyfill)