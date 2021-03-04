/**
 * props declaration for default, item and slot component
 */

export const VirtualProps = {
  dataKey: {
    type: [String, Function],
    required: true
  },
  dataSources: {
    type: Array,
    required: true
  },
  dataComponent: {
    type: [Object, Function],
    required: true
  },

  keeps: {
    type: Number,
    default: 30
  },
  extraProps: {
    type: Object
  },
  estimateSize: {
    type: Number,
    default: 50
  },

  start: {
    type: Number,
    default: 0
  },
  offset: {
    type: Number,
    default: 0
  },
  topThreshold: {
    type: Number,
    default: 0
  },
  bottomThreshold: {
    type: Number,
    default: 0
  },
  itemTag: {
    type: String,
    default: 'div'
  },
  itemClass: {
    type: String,
    default: ''
  },
  itemStyle: {
    type: Object
  },
  itemScopedSlots: {
    type: Object
  }
};

export const ItemProps = {
  index: {
    type: Number
  },
  source: {
    type: Object
  },
  component: {
    type: [Object, Function]
  },
  uniqueKey: {
    type: [String, Number]
  },
  extraProps: {
    type: Object
  },
  scopedSlots: {
    type: Object
  }
};

export const SlotProps = {
  uniqueKey: {
    type: String
  }
};
