<template>
  <ContextMenu :event="event">
    <div v-if="settings.devShowPeerId" class="act_menu_item">
      <Icon name="bug" color="var(--icon-dark-gray)" class="act_menu_icon" />
      <div class="act_menu_data">peer_id: {{ peerId }}</div>
    </div>

    <div
      v-if="settings.pinnedPeers.length < 5 || isPinnedPeer"
      class="act_menu_item"
      @click="togglePinPeer"
    >
      <Icon
        :name="isPinnedPeer ? 'unpin' : 'pin'"
        color="var(--icon-dark-gray)"
        class="act_menu_icon"
      />
      <div class="act_menu_data">{{ l('im_toggle_pin_peer', isPinnedPeer) }}</div>
    </div>

    <div v-if="peer.unread" class="act_menu_item" @click="markAsRead">
      <img src="assets/show.svg" class="act_menu_icon">
      <div class="act_menu_data">{{ l('im_mark_messages_as_read') }}</div>
    </div>

    <div class="act_menu_item" @click="toggleNotifications">
      <Icon
        :name="peer.muted ? 'volume_active' : 'volume_muted'"
        color="var(--icon-dark-gray)"
        class="act_menu_icon"
      />
      <div class="act_menu_data">{{ l('im_toggle_notifications', !peer.muted) }}</div>
    </div>

    <div v-if="!peer.channel" class="act_menu_item" @click="clearHistory">
      <img src="assets/trash.svg" class="act_menu_icon">
      <div class="act_menu_data">{{ l('im_clear_history') }}</div>
    </div>

    <div v-if="peerId > 2e9" class="act_menu_item" @click="leftFromChat">
      <template v-if="peer.left">
        <img src="assets/forward.svg" class="act_menu_icon">
        <div class="act_menu_data">{{ l('im_toggle_left_state', peer.channel ? 3 : 2) }}</div>
      </template>
      <template v-else>
        <Icon
          name="close"
          color="var(--icon-dark-gray)"
          class="act_menu_icon act_menu_close_icon"
        />
        <div class="act_menu_data">{{ l('im_toggle_left_state', peer.channel ? 1 : 0) }}</div>
      </template>
    </div>
  </ContextMenu>
</template>

<script>
import { reactive, computed, toRefs } from 'vue';
import { eventBus } from 'js/utils';
import { openModal } from 'js/modals';
import vkapi from 'js/vkapi';
import store from 'js/store';

import ContextMenu from './ContextMenu.vue';
import Icon from '../UI/Icon.vue';

export default {
  props: ['event', 'peerId'],

  components: {
    ContextMenu,
    Icon
  },

  setup(props) {
    const peer_id = +props.peerId;

    const state = reactive({
      settings: computed(() => store.getters['settings/settings']),
      peer: computed(() => store.state.messages.conversations[peer_id].peer),
      isPinnedPeer: computed(() => state.settings.pinnedPeers.includes(peer_id))
    });

    function togglePinPeer() {
      const peers = state.settings.pinnedPeers.slice();

      if (state.isPinnedPeer) {
        peers.splice(peers.indexOf(peer_id), 1);
      } else {
        peers.push(peer_id);
      }

      store.commit('settings/updateUserSettings', {
        pinnedPeers: peers
      });

      vkapi('storage.set', {
        key: 'pinnedPeers',
        value: peers.join()
      });
    }

    function markAsRead() {
      vkapi('messages.markAsRead', {
        peer_id
      });
    }

    function toggleNotifications() {
      vkapi('account.setSilenceMode', {
        peer_id,
        time: state.peer.muted ? 0 : -1
      });
    }

    function clearHistory() {
      openModal('clear-history', {
        peer_id
      });
    }

    function leftFromChat() {
      if (state.peer.channel) {
        eventBus.emit('messages:event', 'changeLoadedState', {
          peer_id: this.peerId,
          loadedUp: !this.peer.left,
          loadedDown: !this.peer.left
        });
      }

      vkapi(state.peer.left ? 'messages.addChatUser' : 'messages.removeChatUser', {
        chat_id: peer_id - 2e9,
        user_id: store.state.users.activeUser
      });
    }

    return {
      ...toRefs(state),

      togglePinPeer,
      markAsRead,
      toggleNotifications,
      clearHistory,
      leftFromChat
    };
  }
};
</script>