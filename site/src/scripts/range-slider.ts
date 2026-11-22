class RangeSlider extends HTMLElement {
  private abort?: AbortController;
  private observer?: MutationObserver;

  connectedCallback() {
    if (this.abort) return;
    this.abort = new AbortController();
    const input = this.querySelector('input')!;
    const sync = () => {
      const min = Number(input.min);
      const max = Number(input.max);
      const value = Number(input.value);
      const progress =
        max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;
      const disabled = input.matches(':disabled');
      const text = disabled ? '∅' : `${input.value}${this.dataset.unit || ''}`;
      this.style.setProperty('--slider-progress', String(progress));
      this.querySelector('output')!.value = text;
      input.setAttribute('aria-valuetext', text);
      if (disabled && this.dataset.disabledTooltip) {
        input.setAttribute('aria-description', this.dataset.disabledTooltip);
      } else {
        input.removeAttribute('aria-description');
      }
    };
    this.addEventListener(
      'pointerenter',
      () => this.removeAttribute('data-tooltip-dismissed'),
      {
        signal: this.abort.signal,
      },
    );
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape' && this.matches(':hover'))
          this.setAttribute('data-tooltip-dismissed', '');
      },
      { signal: this.abort.signal },
    );
    input.addEventListener('input', sync, { signal: this.abort.signal });
    input.addEventListener('change', sync, { signal: this.abort.signal });
    // Wait until the browser restores the form controls' default values.
    input.form?.addEventListener('reset', () => requestAnimationFrame(sync), {
      signal: this.abort.signal,
    });
    this.observer = new MutationObserver(sync);
    this.observer.observe(input, {
      attributes: true,
      attributeFilter: ['disabled'],
    });
    // Fieldset disabling is inherited without changing the input's own attribute.
    let ancestor = this.parentElement;
    while (ancestor) {
      if (ancestor instanceof HTMLFieldSetElement)
        this.observer.observe(ancestor, {
          attributes: true,
          attributeFilter: ['disabled'],
        });
      ancestor = ancestor.parentElement;
    }
    sync();
  }

  disconnectedCallback() {
    this.observer?.disconnect();
    this.observer = undefined;
    this.abort?.abort();
    this.abort = undefined;
  }
}

if (!customElements.get('range-slider'))
  customElements.define('range-slider', RangeSlider);
