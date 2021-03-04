<template>
  <div
    ref="root"
    @scroll.passive="onScroll"
  >
    <div
      class="wrapClass"
      role="group"
      :style="{ padding: `${range.padFront}px 0px ${range.padBehind}px` }"
    >
      <component :is="{ render: RenderList }" />
    </div>

    <div ref="shepherd" style="width: 100%; height: 0px;"></div>
  </div>
</template>

<script>
import { h, ref } from 'vue';
import { VirtualProps } from './props';
import Virtual from './virtual';

import { Item } from './item';

export default {
  props: VirtualProps,

  components: {
    Item
  },

  setup(props, { emit, slots }) {
    let range = null;
    const virtual = new Virtual(
      {
        keeps: props.keeps,
        estimateSize: props.estimateSize,
        buffer: Math.round(props.keeps / 3), // recommend for a third of keeps
        uniqueIds: getUniqueIdsFromDataSources()
      },
      (newRange) => (range && (range.value = newRange))
    );

    range = ref(virtual.getRange());
    const root = ref(null);

    // this.$on('item_resize', (id, size) => {
    //   virtual.saveSize(id, size);
    // });

    function getUniqueIdsFromDataSources() {
      const { dataKey } = props;
      return slots.default().map((dataSource) => (
        typeof dataKey === 'function' ? dataKey(dataSource) : dataSource[dataKey]
      ));
    }

    function onScroll(evt) {
      const offset = getOffset();
      const clientSize = getClientSize();
      const scrollSize = getScrollSize();

      // iOS scroll-spring-back behavior will make direction mistake
      if (offset < 0 || (offset + clientSize > scrollSize + 1) || !scrollSize) {
        return;
      }

      virtual.handleScroll(offset);
    }

    function getOffset() {
      return root.value ? Math.ceil(root.value.scrollTop) : 0;
    }

    function getClientSize() {
      return root.value ? Math.ceil(root.value.clientHeight) : 0;
    }

    function getScrollSize() {
      return root.value ? Math.ceil(root.value.scrollHeight) : 0;
    }

    function RenderList() {
      const children = [];
      const { start, end } = range.value;
      const { dataKey, itemClass, itemTag, itemStyle, extraProps, dataComponent, itemScopedSlots } = props;
      const defaultSlots = slots.default();

      for (let index = start; index <= end; index++) {
        const dataSource = defaultSlots[index];
        const uniqueKey = typeof dataKey === 'function' ? dataKey(dataSource) : dataSource[dataKey];

        children.push(h(Item, {
          props: {
            index,
            tag: itemTag,
            uniqueKey,
            source: dataSource,
            extraProps,
            component: dataComponent,
            scopedSlots: itemScopedSlots
          },
          style: itemStyle,
          class: itemClass
        }));
      }

      return children;
    }

    return {
      virtual,
      range,
      onScroll,
      RenderList
    };
  }
};
</script>

<style>
</style>
