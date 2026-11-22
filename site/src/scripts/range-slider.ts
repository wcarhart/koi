class RangeSlider extends HTMLElement {
  private abort?: AbortController;

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
      const text = `${input.value}${this.dataset.unit || ''}`;
      this.style.setProperty('--slider-progress', String(progress));
      this.querySelector('output')!.value = text;
      input.setAttribute('aria-valuetext', text);
    };
    input.addEventListener('input', sync, { signal: this.abort.signal });
    input.addEventListener('change', sync, { signal: this.abort.signal });
    // Wait until the browser restores the form controls' default values.
    input.form?.addEventListener('reset', () => requestAnimationFrame(sync), {
      signal: this.abort.signal,
    });
    sync();
  }

  disconnectedCallback() {
    this.abort?.abort();
    this.abort = undefined;
  }
}

if (!customElements.get('range-slider'))
  customElements.define('range-slider', RangeSlider);
