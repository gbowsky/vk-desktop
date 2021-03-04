import { processOptions, throttle, deepEqual } from './utils';

class VisibilityState {
  constructor(el, options) {
    this.el = el;
    this.observer = null;
    this.createObserver(options);
  }

  get threshold() {
    return (this.options.intersection && this.options.intersection.threshold) || 0;
  }

  createObserver(options) {
    if (this.observer) {
      this.destroyObserver();
    }

    this.options = processOptions(options);

    this.callback = (result, entry) => {
      this.options.callback(result, entry);
    };

    this.oldResult = undefined;

    this.observer = new IntersectionObserver((entries) => {
      let entry = entries[0];

      if (entries.length > 1) {
        const intersectingEntry = entries.find((e) => e.isIntersecting);
        if (intersectingEntry) {
          entry = intersectingEntry;
        }
      }

      if (this.callback) {
        // Use isIntersecting if possible because browsers can report isIntersecting as true, but intersectionRatio as 0, when something very slowly enters the viewport.
        const result = entry.isIntersecting && entry.intersectionRatio >= this.threshold;
        if (result === this.oldResult) return;
        this.oldResult = result;
        this.callback(result, entry);
      }
    }, { root: this.el.parentElement });

    // Wait for the element to be in document
    setTimeout(() => {
      if (this.observer) {
        this.observer.observe(this.el);
      }
    });
  }

  destroyObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Cancel throttled call
    if (this.callback && this.callback._clear) {
      this.callback._clear();
      this.callback = null;
    }
  }
}

function mounted(el, { value }) {
  if (!value) return;
  const state = new VisibilityState(el, value);
  el._vue_visibilityState = state;
}

function updated(el, { value, oldValue }) {
  if (deepEqual(value, oldValue)) return;
  const state = el._vue_visibilityState;
  if (!value) {
    unmounted(el);
    return;
  }
  if (state) {
    state.createObserver(value);
  } else {
    mounted(el, { value });
  }
}

function unmounted(el) {
  const state = el._vue_visibilityState;
  if (state) {
    state.destroyObserver();
    delete el._vue_visibilityState;
  }
}

export default {
  mounted,
  updated,
  unmounted
};
