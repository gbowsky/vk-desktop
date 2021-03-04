import { h } from 'vue';
import { ItemProps, SlotProps } from './props';

/**
 * item and slot component both use similar wrapper
 * we need to know their size change at any time
 */

const Wrapper = {
  mounted() {
    this.resizeObserver = new ResizeObserver(() => {
      this.dispatchSizeChange();
    });
    console.log(this);
    this.resizeObserver.observe(this.$el);

    this.dispatchSizeChange();
  },

  // since componet will be reused, so disptach when updated
  updated() {
    this.dispatchSizeChange();
  },

  beforeDestroy() {
    this.resizeObserver.disconnect();
    this.resizeObserver = null;
  },

  methods: {
    getCurrentSize() {
      return this.$el ? this.$el.offsetHeight : 0;
    },

    // tell parent current size identify by unqiue key
    dispatchSizeChange() {
      console.log(this.$parent);
      this.$parent.$emit('item_resize', this.uniqueKey, this.getCurrentSize(), this.hasInitial);
    }
  }
};

// wrapping for item
export const Item = {
  mixins: [Wrapper],

  props: ItemProps,

  render() {
    const { component, extraProps = {}, index, scopedSlots = {}, uniqueKey } = this;
    extraProps.source = this.source;
    extraProps.index = index;

    return h('div', {
      key: uniqueKey,
      attrs: {
        role: 'listitem'
      }
    }, [h(component, {
      props: extraProps,
      scopedSlots
    })]);
  }
};

// wrapping for slot
export const Slot = {
  mixins: [Wrapper],

  props: SlotProps,

  render(h) {
    const { uniqueKey } = this;

    return h('div', {
      key: uniqueKey,
      attrs: {
        role: uniqueKey
      }
    }, this.$slots.default);
  }
};
