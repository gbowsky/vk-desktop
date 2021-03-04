<template>
  <Scrolly
    ref="scrollyRef"
    :class="scrollyClass"
    :vclass="scrollyVClass"
    :lock="lock"
    @scroll="onScroll"
  >
    <div
      ref="root"
      class="vue-recycle-scroller"
      :class="{ ready, 'direction-vertical': true }"
    >
      <!-- @scroll.passive="onScroll" -->
      <div
        ref="wrapper"
        :style="{ minHeight: totalSize + 'px' }"
        class="vue-recycle-scroller__item-wrapper"
      >
        <div
          v-for="view of pool"
          :key="view.nr.id"
          :style="ready ? { transform: `translateY(${view.position}px)` } : null"
          class="vue-recycle-scroller__item-view"
          :class="{ hover: hoverKey === view.nr.key }"
          @mouseenter="hoverKey = view.nr.key"
          @mouseleave="hoverKey = null"
        >
          <slot
            :item="view.item"
            :index="view.nr.index"
            :active="view.nr.used"
          />
        </div>
      </div>

      <ResizeObserver @notify="handleResize" />
    </div>
  </Scrolly>
</template>

<script>
import { reactive } from 'vue';
import { scrollParent } from './common';

import ResizeObserver from './resizeObserver.vue';
import Scrolly from '../Scrolly.vue';

let uid = 0;

function getValFromKey(obj, key) {
  for (const keyChunk of key.split('.')) {
    obj = obj[keyChunk];
  }

  return obj;
}

export default {
  props: {
    items: {
      type: Array,
      required: true
    },

    keyField: {
      type: String,
      default: 'id'
    },

    itemSize: {
      type: Number,
      default: null
    },

    minItemSize: {
      type: [Number, String],
      default: null
    },

    sizeField: {
      type: String,
      default: 'size'
    },

    typeField: {
      type: String,
      default: 'type'
    },

    buffer: {
      type: Number,
      default: 500
    },

    scrollyClass: {
      type: [String, Object, Array]
    },
    scrollyVClass: {
      type: [String, Object, Array]
    },
    lock: {
      type: Boolean
    }
  },

  components: {
    ResizeObserver,
    Scrolly
  },

  emits: ['update', 'scroll'],

  data: () => ({
    pool: [],
    totalSize: 0,
    ready: false,
    hoverKey: null
  }),

  created() {
    this.$_startIndex = 0;
    this.$_endIndex = 0;
    this.$_views = new Map();
    this.$_unusedViews = new Map();
    this.$_scrollDirty = false;
    this.$_lastUpdateScrollPosition = 0;
  },

  setup(props) {
    const state = reactive({
      root: null,
      scrollyRef: null,

      pool: [],
      totalSize: 0,
      ready: false,
      hoverKey: null
    });

    return state;
  },

  computed: {
    sizes() {
      if (this.itemSize === null) {
        const sizes = {
          '-1': { accumulator: 0 }
        };
        const { items } = this;
        const field = this.sizeField;
        const { minItemSize } = this;
        let computedMinSize = 10000;
        let accumulator = 0;
        let current;
        for (let i = 0, l = items.length; i < l; i++) {
          current = items[i][field] || minItemSize;
          if (current < computedMinSize) {
            computedMinSize = current;
          }
          accumulator += current;
          sizes[i] = { accumulator, size: current };
        }
        this.$_computedMinItemSize = computedMinSize;
        return sizes;
      }
      return [];
    },

    simpleArray() {
      return this.items.length && typeof this.items[0] !== 'object';
    }
  },

  watch: {
    items() {
      this.updateVisibleItems(true);
    },

    sizes: {
      handler() {
        this.updateVisibleItems(false);
      },
      deep: true
    }
  },

  mounted() {
    this.removeListeners();
    this.$nextTick(() => {
      this.updateVisibleItems(true);
      this.ready = true;
    });
  },

  beforeUnmount() {
    this.removeListeners();
  },

  methods: {
    addView(pool, index, item, key, type) {
      const view = {
        item,
        position: 0
      };
      view.nr = {
        id: uid++,
        index,
        used: true,
        key,
        type
      };
      pool.push(view);
      return view;
    },

    unuseView(view, fake = false) {
      const unusedViews = this.$_unusedViews;
      const { type } = view.nr;
      let unusedPool = unusedViews.get(type);
      if (!unusedPool) {
        unusedPool = [];
        unusedViews.set(type, unusedPool);
      }
      unusedPool.push(view);
      if (!fake) {
        view.nr.used = false;
        view.position = -9999;
        this.$_views.delete(view.nr.key);
      }
    },

    handleResize() {
      if (this.ready) {
        this.updateVisibleItems(false);
      }
    },

    onScroll(event) {
      this.$emit('scroll', event);
      if (!this.$_scrollDirty) {
        this.$_scrollDirty = true;
        requestAnimationFrame(() => {
          this.$_scrollDirty = false;
          const { continuous } = this.updateVisibleItems(false, true);

          // It seems sometimes chrome doesn't fire scroll event :/
          // When non continous scrolling is ending, we force a refresh
          if (!continuous) {
            clearTimeout(this.$_refreshTimout);
            this.$_refreshTimout = setTimeout(this.onScroll, 100);
          }
        });
      }
    },

    updateVisibleItems(checkItem, checkPositionDiff = false) {
      const { itemSize } = this;
      const minItemSize = this.$_computedMinItemSize;
      const { typeField } = this;
      const keyField = this.simpleArray ? null : this.keyField;
      const { items } = this;
      const count = items.length;
      const { sizes } = this;
      const views = this.$_views;
      const unusedViews = this.$_unusedViews;
      const { pool } = this;
      let startIndex; let endIndex;
      let totalSize;

      if (!count) {
        startIndex = endIndex = totalSize = 0;
      } else {
        const scroll = this.getScroll();

        // Skip update if user hasn't scrolled enough
        if (checkPositionDiff) {
          let positionDiff = scroll.start - this.$_lastUpdateScrollPosition;
          if (positionDiff < 0) positionDiff = -positionDiff;
          if ((itemSize === null && positionDiff < minItemSize) || positionDiff < itemSize) {
            return {
              continuous: true
            };
          }
        }
        this.$_lastUpdateScrollPosition = scroll.start;

        const { buffer } = this;
        scroll.start -= buffer;
        scroll.end += buffer;

        // Variable size mode
        if (itemSize === null) {
          let h;
          let a = 0;
          let b = count - 1;
          let i = ~~(count / 2);
          let oldI;

          // Searching for startIndex
          do {
            oldI = i;
            h = sizes[i].accumulator;
            if (h < scroll.start) {
              a = i;
            } else if (i < count - 1 && sizes[i + 1].accumulator > scroll.start) {
              b = i;
            }
            i = ~~((a + b) / 2);
          } while (i !== oldI);
          i < 0 && (i = 0);
          startIndex = i;

          // For container style
          totalSize = sizes[count - 1].accumulator;

          // Searching for endIndex
          for (endIndex = i; endIndex < count && sizes[endIndex].accumulator < scroll.end; endIndex++);
          if (endIndex === -1) {
            endIndex = items.length - 1;
          } else {
            endIndex++;
            // Bounds
            endIndex > count && (endIndex = count);
          }
        } else {
          // Fixed size mode
          startIndex = ~~(scroll.start / itemSize);
          endIndex = Math.ceil(scroll.end / itemSize);

          // Bounds
          startIndex < 0 && (startIndex = 0);
          endIndex > count && (endIndex = count);

          totalSize = count * itemSize;
        }
      }

      this.totalSize = totalSize;

      let view;

      const continuous = startIndex <= this.$_endIndex && endIndex >= this.$_startIndex;

      if (this.$_continuous !== continuous) {
        if (continuous) {
          views.clear();
          unusedViews.clear();
          for (let i = 0, l = pool.length; i < l; i++) {
            view = pool[i];
            this.unuseView(view);
          }
        }
        this.$_continuous = continuous;
      } else if (continuous) {
        for (let i = 0, l = pool.length; i < l; i++) {
          view = pool[i];
          if (view.nr.used) {
            // Update view item index
            if (checkItem) {
              view.nr.index = items.findIndex((item) => (
                keyField
                  ? getValFromKey(item, keyField) === getValFromKey(view.item, keyField)
                  : item === view.item
              ));
            }

            // Check if index is still in visible range
            if (
              view.nr.index === -1 ||
              view.nr.index < startIndex ||
              view.nr.index >= endIndex
            ) {
              this.unuseView(view);
            }
          }
        }
      }

      const unusedIndex = continuous ? null : new Map();

      let item; let type; let unusedPool;
      let v;
      for (let i = startIndex; i < endIndex; i++) {
        item = items[i];
        const key = keyField ? getValFromKey(item, keyField) : item;
        if (key == null) {
          throw new Error(`Key is ${key} on item (keyField is '${keyField}')`);
        }
        view = views.get(key);

        if (!itemSize && !sizes[i].size) {
          if (view) this.unuseView(view);
          continue;
        }

        // No view assigned to item
        if (!view) {
          type = item[typeField];
          unusedPool = unusedViews.get(type);

          if (continuous) {
            // Reuse existing view
            if (unusedPool && unusedPool.length) {
              view = unusedPool.pop();
              view.item = item;
              view.nr.used = true;
              view.nr.index = i;
              view.nr.key = key;
              view.nr.type = type;
            } else {
              view = this.addView(pool, i, item, key, type);
            }
          } else {
            // Use existing view
            // We don't care if they are already used
            // because we are not in continous scrolling
            v = unusedIndex.get(type) || 0;

            if (!unusedPool || v >= unusedPool.length) {
              view = this.addView(pool, i, item, key, type);
              this.unuseView(view, true);
              unusedPool = unusedViews.get(type);
            }

            view = unusedPool[v];
            view.item = item;
            view.nr.used = true;
            view.nr.index = i;
            view.nr.key = key;
            view.nr.type = type;
            unusedIndex.set(type, v + 1);
            v++;
          }
          views.set(key, view);
        } else {
          view.nr.used = true;
          view.item = item;
        }

        // Update position
        if (itemSize === null) {
          view.position = sizes[i - 1].accumulator;
        } else {
          view.position = i * itemSize;
        }
      }

      this.$_startIndex = startIndex;
      this.$_endIndex = endIndex;

      // After the user has finished scrolling
      // Sort views so text selection is correct
      clearTimeout(this.$_sortTimer);
      this.$_sortTimer = setTimeout(this.sortViews, 300);

      return {
        continuous
      };
    },

    getListenerTarget() {
      let target = scrollParent(this.$el);
      // Fix global scroll target for Chrome and Safari
      if (target === window.document.documentElement || target === window.document.body) {
        target = window;
      }

      return target;
    },

    getScroll() {
      const { viewport } = this.scrollyRef;
      const scrollState = {
        start: viewport.scrollTop,
        end: viewport.scrollTop + viewport.clientHeight
      };

      return scrollState;
    },

    addListeners() {
      this.listenerTarget = this.getListenerTarget();
      this.listenerTarget.addEventListener('resize', this.handleResize);
    },

    removeListeners() {
      if (!this.listenerTarget) {
        return;
      }

      this.listenerTarget.removeEventListener('resize', this.handleResize);

      this.listenerTarget = null;
    },

    scrollToItem(index) {
      let scroll;
      if (this.itemSize === null) {
        scroll = index > 0 ? this.sizes[index - 1].accumulator : 0;
      } else {
        scroll = index * this.itemSize;
      }
      this.scrollToPosition(scroll);
    },

    scrollToPosition(position) {
      this.$el.scrollTop = position;
    },

    sortViews() {
      this.pool.sort((viewA, viewB) => viewA.nr.index - viewB.nr.index);
    }
  }
};
</script>

<style>
.vue-recycle-scroller {
  position: relative;
}

.vue-recycle-scroller.direction-vertical:not(.page-mode) {
  overflow-y: auto;
}

.vue-recycle-scroller__item-wrapper {
  flex: 1;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

.vue-recycle-scroller.ready .vue-recycle-scroller__item-view {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}

.vue-recycle-scroller.direction-vertical .vue-recycle-scroller__item-wrapper {
  width: 100%;
}

.vue-recycle-scroller.ready.direction-vertical .vue-recycle-scroller__item-view {
  width: 100%;
}
</style>
