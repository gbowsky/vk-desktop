import Vue from 'vue';
import Virtual from './virtual';
import { Item, Slot } from './item';
import { VirtualProps } from './props';

export default {
  props: VirtualProps,

  data: () => ({
    range: null
  }),

  watch: {
    'dataSources.length'() {
      this.virtual.updateParam('uniqueIds', this.getUniqueIdFromDataSources());
      this.virtual.handleDataSourcesChange();
    },

    keeps(newValue) {
      this.virtual.updateParam('keeps', newValue);
      this.virtual.handleSlotSizeChange();
    },

    start(newValue) {
      this.scrollToIndex(newValue);
    },

    offset(newValue) {
      this.scrollToOffset(newValue);
    }
  },

  // set back offset when awake from keep-alive
  activated() {
    this.scrollToOffset(this.virtual.offset);
  },

  mounted() {
    // set position
    if (this.start) {
      this.scrollToIndex(this.start);
    } else if (this.offset) {
      this.scrollToOffset(this.offset);
    }
  },

  beforeDestroy() {
    this.virtual.destroy();
  },

  methods: {
    // get item size by id
    getSize(id) {
      return this.virtual.sizes.get(id);
    },

    // get the total number of stored (rendered) items
    getSizes() {
      return this.virtual.sizes.size;
    },

    // set current scroll position to a expectant offset
    scrollToOffset(offset) {
      const { root } = this.$refs;
      if (root) {
        root.scrollTop = offset;
      }
    },

    // set current scroll position to a expectant index
    scrollToIndex(index) {
      // scroll to bottom
      if (index >= this.dataSources.length - 1) {
        this.scrollToBottom();
      } else {
        const offset = this.virtual.getOffset(index);
        this.scrollToOffset(offset);
      }
    },

    // set current scroll position to bottom
    scrollToBottom() {
      const { shepherd } = this.$refs;
      if (shepherd) {
        const offset = shepherd.offsetTop;
        this.scrollToOffset(offset);

        // check if it's really scrolled to the bottom
        // maybe list doesn't render and calculate to last range
        // so we need retry in next event loop until it really at bottom
        setTimeout(() => {
          if (this.getOffset() + this.getClientSize() < this.getScrollSize()) {
            this.scrollToBottom();
          }
        }, 3);
      }
    },

    // when using page mode we need update slot header size manually
    // taking root offset relative to the browser as slot header size
    updatePageModeFront() {
      const { root } = this.$refs;
      if (root) {
        const rect = root.getBoundingClientRect();
        const { defaultView } = root.ownerDocument;
        const offsetFront = (rect.top + defaultView.pageYOffset);
        this.virtual.updateParam('slotHeaderSize', offsetFront);
      }
    },

    // ----------- public method end -----------

    // event called when slot mounted or size changed
    onSlotResized(type, size, hasInit) {
      if (hasInit) {
        this.virtual.handleSlotSizeChange();
      }
    }
};
