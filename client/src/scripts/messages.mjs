import { Blowfish } from 'https://unpkg.com/egoroof-blowfish@4.0.1/dist/blowfish.mjs';
import { getSharedSecret } from './storage.js';

export function storeMessage(chatId, message) {
  // Armazena a mensagem na memória local ou no banco de dados
  let messages = JSON.parse(localStorage.getItem(`messages_${chatId}`)) || [];
  messages.push(message);
  localStorage.setItem(`messages_${chatId}`, JSON.stringify(messages));
}

export function getMessages(chatId) {
  // Retorna as mensagens armazenadas para um chat específico
  return JSON.parse(localStorage.getItem(`messages_${chatId}`)) || [];
}

export function displayMessage(sender, msg, type, messagesDiv) {
  const chatSecret = type === "friend"
    ? getSharedSecret(sender)  // Considerando que o chat é com um amigo
    : getGroupData().find((g) => g.groupId === sender).groupSecret; // Considerando que é um grupo

  const bf = new Blowfish(chatSecret, Blowfish.MODE.ECB, Blowfish.PADDING.NULL);
  const decryptedMessage = bf.decode(msg, Blowfish.TYPE.STRING);

  const messageDiv = document.createElement("div");
  messageDiv.className = "message";
  messageDiv.textContent = `${sender}: ${decryptedMessage}`;
  messagesDiv.appendChild(messageDiv);
}
