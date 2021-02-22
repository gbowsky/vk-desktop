<template>
  <div
    :class="['context_menu_wrap', { active: menu }]"
    @mousedown="tryCloseMenu"
    @click="tryCloseMenu"
  >
    <component :is="menu.name" v-if="menu" v-bind="menu.data" />
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { capitalize } from 'js/utils';

import PeerContextMenu from './PeerContextMenu.vue';
import MessageContextMenu from './MessageContextMenu.vue';
import AccountContextMenu from './AccountContextMenu.vue';

export default {
  components: {
    PeerContextMenu,
    MessageContextMenu,
    AccountContextMenu
  },

  setup() {
    const menu = ref(null);

    function closeMenu(event) {
      if (event && event.type === 'keydown' && event.code !== 'Escape') {
        return;
      }

      event && event.stopPropagation();
      menu.value = null;
      window.removeEventListener('resize', closeMenu, true);
      window.removeEventListener('keydown', closeMenu, true);
    }

    function tryCloseMenu({ type, target }) {
      if (
        type === 'click' && target.closest('.act_menu_item') ||
        type === 'mousedown' && !target.closest('.context_menu')
      ) {
        closeMenu();
      }
    }

    onMounted(() => {
      window.addEventListener('contextmenu', (event) => {
        const element = event.path.find((el) => el.dataset && el.dataset.contextMenu);

        if (element) {
          menu.value = {
            name: capitalize(element.dataset.contextMenu) + 'ContextMenu',
            data: {
              ...element.dataset,
              event
            }
          };

          onBeforeUnmount(() => {
            closeMenu();
          }, element.__vueParentComponent);

          window.addEventListener('resize', closeMenu, true);
          window.addEventListener('keydown', closeMenu, true);
        }
      });
    });

    return {
      menu,
      tryCloseMenu
    };
  }
};
</script>

<style>
.context_menu_wrap {
  position: absolute;
  top: 0;
  z-index: 4;
  width: 100%;
  height: 100%;
  visibility: hidden;
}

.context_menu_wrap.active {
  visibility: visible;
}
</style>
