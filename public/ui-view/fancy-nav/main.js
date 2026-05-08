
class ActiveLink {
    constructor(elem) {
        this.elem = elem
        this.linkEls = this.getLinks()

        this.handleClick = this.handleClick.bind(this)
        this.addListeners()
    }

    addListeners() {
        this.elem.addEventListener('click', this.handleClick)
    }

    handleClick(event) {
        const target = event.target
        if (target.tagName !== 'A') return
        
        // event.preventDefault()
        for (const el of Array.from(this.linkEls)) {
            if (el === event.target) el.classList.add('active')
            else el.classList.remove('active')
        }
    }

    getLinks() {
        return this.elem.querySelectorAll('a')
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const navEl = document.getElementById('nav')
    new ActiveLink(navEl)
})