# anchor()

---

<feature-status featureId="anchor-positioning"></feature-status>

---

<feature-status featureId="container-anchor-position-queries"></feature-status>

## Card Test

::: info
This is an info box.
:::

::: tip
This is a tip.
:::

::: warning
This is a warning.
:::

::: danger
This is a dangerous warning.
:::

::: details
This is a details block.
:::

## Anchor Demo

This demo combines CSS anchor positioning with the `commandfor` / `command="--toggle"` invoker pattern. Each contact trigger becomes an anchor, and the matching detail panel uses `position-anchor` with `anchor()` so it can open from the selected item without any JavaScript layout calculations.

<themed-iframe src="/ui-view/about-me-card/index.html" title="Anchor Demo" max-width="21rem" height="23rem"></themed-iframe>

[Anchor Tool](https://chrome.dev/anchor-tool/)

## position-try-fallbacks

<themed-iframe src="/notebook-view/anchor/position-anchor.html" title="position-try-fallbacks" max-width="20rem" height="24rem"></themed-iframe>

```css
:where(button) {
  anchor-name: --popover;
}

:where([popover]) {
  container-type: anchored;
  position-anchor: --popover;
  top: auto;
  bottom: anchor(top);
  left: calc(anchor(left) - 0.5rem);
  position-try-fallbacks: --try-right, --try-center;

  .popover-content {
    scale: 0;
    transition: scale 0.25s ease-out;
    transform-origin: left bottom;
  }
  &:popover-open .popover-content {
    scale: 1;
    transition: all 0.6s var(--ease-spring-2);

    @starting-style {
      scale: 0;
    }
  }

  @supports (animation-name: test-starting-style) {
    transition:
      display 0.25s allow-discrete,
      overlay 0.25s allow-discrete;
  }
}

@position-try --try-right {
  left: auto;
  right: calc(anchor(right) - 0.5rem);
}

@position-try --try-center {
  left: unset;
  justify-self: anchor-center;
}

@container anchored(fallback: --try-right) {
  [popover] .popover {
    transform-origin: calc(100% - 2rem) bottom;
  }
}

@container anchored(fallback: --try-center) {
  [popover] .popover {
    transform-origin: center bottom;
  }
}
```

## anchor-scope

<themed-iframe src="/notebook-view/motion-path/people.html" title="anchor-scope" max-width="20rem" height="24rem"></themed-iframe>

This demo used [toggle-polyfill](../polyfills/toggle-polyfill.md).

::: warning
Centering is handled in `@container anchored(fallback: --try-center)` rather than in the base `[popover]` rule.
When `justify-self: anchor-center` is used as the default placement, `position-try-fallbacks` never run, so it only works reliably as a
fallback, which keeps the transition origin and bubble arrow aligned with the anchor.
Tested in Chrome 146.0.7680.178.
:::

```css:line-numbers{3,6,12,13}
:where(ul) {
  & li {
    anchor-scope: --popover;

    & button {
      anchor-name: --popover;
    }
  }
}

:where([popover]) {
  container-type: anchored;
  position-anchor: --popover;
  overflow: visible;

  top: auto;
  bottom: calc(anchor(top) - 15px);
  left: calc(anchor(right) - 15px);
  position-try-fallbacks: --try-center, --try-right;

  .popover {
    transform-origin: left bottom;
    scale: 0;
    transition: scale 0.25s ease-out;

    border-radius: 20px;
    @supports(corner-shape: squircle) {
      border-radius: 40px;
      corner-shape: squircle;
    }
    border-bottom-left-radius: 0;
  }

  &:popover-open .popover {
    scale: 1;
    transition: all .6s var(--ease-spring-2);

    @starting-style {
      scale: 0;
    }
  }

  @supports (animation-name: test-starting-style) {
    transition:
      display 0.25s allow-discrete,
      overlay 0.25s allow-discrete;
  }
}

@position-try --try-right {
  left: auto;
  right: calc(anchor(left) - 15px);
}

@position-try --try-center {
  left: unset;
  bottom: calc(anchor(top) - 5px);
  justify-self: anchor-center;
}

@container anchored(fallback: --try-right) {
  [popover] .popover {
    transform-origin: right bottom;
    border-bottom-right-radius: 0;

    border-bottom-left-radius: 20px;
    @supports(corner-shape: squircle) {
      border-bottom-left-radius: 40px;
    }
  }
}

@container anchored(fallback: --try-center) {
  [popover] .popover {
    transform-origin: center bottom;

    border-radius: 20px;
    @supports(corner-shape: squircle) {
      border-radius: 40px;
    }

    &::before {
      content: '';
      display: block;
      position: absolute;
      width: 0.75rem;
      aspect-ratio: 1;
      rotate: 45deg;
      left: 50%;
      translate: -50% 0;
      bottom: -0.5rem;
      background-color: oklch(from Canvas l c h / 0.98);
      border: 2px solid oklch(from CanvasText l c h / 0.1);
      border-left: none;
      border-top: none;
    }
  }
}
```

## transition between anchor-name

<themed-iframe src="/notebook-view/anchor/anchor-hover.html" title="transition between anchor-name" max-width="24rem" height="20rem"></themed-iframe>

```css:line-numbers{2,9,15}
:where(ul) {
  anchor-name: --anchorhover;

  & a {
    width: 4rem;
    aspect-ratio: 3/2;

    &:is(:hover,:focus-visible) {
      anchor-name: --anchorhover;
    }
  }
}

:where(.blob) {
  position-anchor: --anchorhover;
  position: fixed;
  top: anchor(top);
  left: anchor(left);
  bottom: anchor(bottom);
  right: anchor(right);
}
```

## anchor-card

<themed-iframe src="/notebook-view/anchor/anchor-card.html" title="anchor-card" max-width="32rem" height="20rem"></themed-iframe>

This code uses the [Polyfill](../polyfills/anchor-card.md).

```html:line-numbers
<main anchorgroup>
  <ul anchorlist>
    <li><button anchoritem>Card One</button></li>
    <li><button anchoritem>Card Two</button></li>
    <li><button anchoritem>Card Three</button></li>
    <li><button anchoritem>Card Four</button></li>
  </ul>

  <article anchordialog>
    <button anchorclose></button>
    <div class="scroll-y">
      <h1 id="title"></h1>
    </div>
  </article>
</main>
```

```js:line-numbers
const main = document.querySelector('main')
main.addEventListener('anchorcard:open', ({ detail }) => {
  const item = detail.currentItem
  const target = detail.target
  const content = item.textContent.trim()
  const title = target.querySelector('#title')

  title.textContent = content
})
```
