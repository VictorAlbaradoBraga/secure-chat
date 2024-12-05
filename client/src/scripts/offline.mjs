import { storeMessage } from './messages.js';

export function handleOfflineMessages(messages, activeChatId, displayMessage, storeMessage) {
  messages.forEach((msg) => {
    storeMessage(msg.chatId, msg);
    if (msg.chatId === activeChatId) {
      displayMessage(msg.sender, msg.msg);
    }
  });
}
