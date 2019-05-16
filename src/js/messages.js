import { escape, getPhoto, loadProfile } from './utils';
import store from './store';
import emoji from './emoji';
import getTranslate from './getTranslate';

export function parseConversation(conversation) {
  const isChat = conversation.peer.type == 'chat';
  const isChannel = isChat && conversation.chat_settings.is_group_channel;
  let chatPhoto, chatTitle;

  if(isChat) {
    chatPhoto = getPhoto(conversation.chat_settings.photo);
    chatTitle = escape(conversation.chat_settings.title).replace(/\n/g, ' ');
  }

  return {
    id: conversation.peer.id,
    type: conversation.peer.type,
    channel: isChannel,
    members: isChat ? conversation.chat_settings.members_count : null,
    left: isChat ? conversation.chat_settings.state == 'left' : false,
    owner: isChannel ? conversation.chat_settings.owner_id : conversation.peer.id,
    muted: !!conversation.push_settings,
    unread: conversation.unread_count || 0,
    photo: chatPhoto,
    title: chatTitle,
    canWrite: conversation.can_write,
    last_msg_id: conversation.last_message_id,
    // id последнего прочтенного входящего сообщения
    in_read: conversation.in_read,
    // id последнего прочтенного исходящего сообщения
    out_read: conversation.out_read,
    loaded: true
  }
}

export function parseMessage(message) {
  if(message.geo) {
    message.attachments.push({
      type: 'geo',
      geo: message.geo
    });
  }

  return {
    id: message.id,
    text: escape(message.text).replace(/\n/g, '<br>'),
    from: message.from_id,
    date: message.date,
    out: message.from_id == store.getters['users/user'].id,
    editTime: message.update_time || 0,
    hidden: message.is_hidden,
    action: message.action,
    fwdCount: message.fwd_messages ? message.fwd_messages.length : 0,
    isReplyMsg: !!message.reply_message,
    fwdMessages: message.fwd_messages || [],
    replyMsg: message.reply_message,
    attachments: message.attachments,
    conversation_msg_id: message.conversation_message_id,
    random_id: message.random_id
  };
}

export function getServiceMessage(action, author, isFull) {
  const actID = action.member_id || action.mid;
  const actUser = store.state.profiles[actID] || { id: actID };
  const { id } = store.getters['users/user'];
  const isAuthor = actID == author.id;

  function g(type) {
    const user = type ? actUser : author;

    if(user.id == id) return 0;
    else if(user.sex == 1) return 2;
    else return 1;
  }

  function e(text) {
    return emoji(escape(text)).replace(/<br>/g, ' ');
  }

  function name(type, isAccCase) {
    const user = type ? actUser : author;

    if(user.id == id) return isAccCase ? getTranslate('you2') : getTranslate('you');
    else if(user.name) return user.name;
    else if(user.first_name) {
      if(isAccCase) return `${user.first_name_acc} ${user.last_name_acc}`;
      else return `${user.first_name} ${user.last_name}`;
    } else return loadProfile(user.id), '...';
  }

  switch(action.type) {
    case 'chat_photo_update':
      return getTranslate('im_chat_photo_update', g(0), [name(0)]);
    case 'chat_photo_remove':
      return getTranslate('im_chat_photo_remove', g(0), [name(0)]);
    case 'chat_create':
      return getTranslate('im_chat_create', g(0), [name(0), e(action.text)]);
    case 'chat_title_update':
      return getTranslate('im_chat_title_update', g(0), [name(0), e(action.text)]);
    case 'chat_pin_message':
      return getTranslate('im_chat_pin_message', g(1), [name(1), e(action.message)]);
    case 'chat_unpin_message':
      return getTranslate('im_chat_unpin_message', g(1), [name(1)]);
    case 'chat_invite_user_by_link':
      return getTranslate('im_chat_invite_user_by_link', g(0), [name(0)]);
    case 'chat_invite_user':
      if(isAuthor) return getTranslate('im_chat_returned_user', g(0), [name(0)]);
      else if(isFull) return getTranslate('im_chat_invite_user', g(0), [name(0), name(1, 1)]);
      else return getTranslate('im_chat_invite_user_short', g(1), [name(1, 1)]);
    case 'chat_kick_user':
      if(isAuthor) return getTranslate('im_chat_left_user', g(0), [name(0)]);
      else if(isFull) return getTranslate('im_chat_kick_user', g(0), [name(0), name(1, 1)]);
      else return getTranslate('im_chat_kick_user_short', g(1), [name(1, 1)]);
    default:
      console.warn('[messages] Неизвестное действие:', action.type);
      return action.type;
  }
}
