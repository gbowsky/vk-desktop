import { h } from 'vue';

export default {
  props: {
    items: {
      type: Array,
      required: true
    },
    itemHeight: {
      type: Number,
      required: true
    },

    /**
     * Indicates the amount of elements not visible to render. They are kind of useful
     * if the user scrolls very fast or in similar cases.
     * In my tests 5 seems to be ideal most of the times
     */
    bench: {
      type: Number,
      default: 5
    }
  },

  data() {
    return {
      firstItemToRender: null, // index of the first item to render
      lastItemToRender: null, // index of the last item to render
      scrollTop: 0 // current scrolltop offset of the scrollable container
    };
  },

  computed: {
    firstToRender() {
      return Math.max(0, this.firstItemToRender - this.bench);
    },

    lastToRender() {
      return Math.min(this.items.length, this.lastItemToRender + this.bench);
    }
  },

  watch: {
    /**
     * If the height of the items changes we need to recalculate the visible items and
     * re-render if needed
     */
    itemHeight() {
      this.update();
    }
  },

  /**
     * Setup the initial state and attach the scroll listener
     */
  mounted() {
    this.firstItemToRender = 0;
    this.lastItemToRender = Math.floor(this.$el.clientHeight / this.itemHeight);

    this.$el.addEventListener('scroll', this.onScroll, { passive: true });
  },

  methods: {

    /**
     * Triggers an update.
     * Fake a scroll to recalculate the visible items
     */
    update() {
      this.$nextTick(() => {
        this.onScroll({
          target: {
            scrollTop: this.scrollTop
          }
        });
      });
    },

    /**
     * @param evt - the scroll event
     */
    onScroll(evt) {
      this.scrollTop = evt.target.scrollTop;
      this.firstItemToRender = Math.floor(this.scrollTop / this.itemHeight);
      this.lastItemToRender = this.firstItemToRender + Math.ceil(this.$el.clientHeight / this.itemHeight);
    },

    /**
     * Return the VNode of the elements to render
     * @param {Function} h - Vue render function
     */
    getRenderedItems(h) {
      const toRender = this.items.slice(this.firstToRender, this.lastToRender);
      return toRender.map((item, i) => h('div', {
        style: {
          position: 'absolute',
          left: 0,
          right: 0,
          top: (this.firstToRender + i) * this.itemHeight + 'px'
        }
      }, this.$slots.default(item)));
    }
  },

  render() {
    const list = this.getRenderedItems(h);

    const inner = h('div', {
      class: 'vue-virtualized-list',
      style: {
        display: 'block',
        height: this.items.length * this.itemHeight + 'px'
      }
    }, list);

    const outer = h('div', {
      class: 'vue-virtualized-list__scroll',
      style: {
        height: '100%',
        overflow: 'auto',
        position: 'relative',
        display: 'block'
      }
    }, [inner])

    return outer;
  }
};
