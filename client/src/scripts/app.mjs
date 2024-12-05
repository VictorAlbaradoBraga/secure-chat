import { Blowfish } from 'https://unpkg.com/egoroof-blowfish@4.0.1/dist/blowfish.mjs';
import { storeUserData, getUserData, storeSharedSecret, getSharedSecret } from './storage.js';
import { storeMessage, getMessages, displayMessage } from './messages.js';
import { storeGroupData, getGroupData, addGroupToUI } from './group.js';
import { handleOfflineMessages } from './offline.js';
import { openAddFriendModal, closeAddFriendModal, openCreateGroupModal, closeCreateGroupModal } from './modal.js';
import { sendFriendRequest, addFriendToUI, createGroup, addGroupToUI } from './friendGroupActions.js';

let me = { id: null, username: sessionStorage.getItem("username") };
let activeChatType = "friend"; // 'friend' or 'group'
let activeChatId = null;
let friendId = null;

const socket = io("/users", {
  auth: {
    username: me.username,
    token: localStorage.getItem("accessToken"),
    refresh: localStorage.getItem("refreshToken"),
  }
});

const usersDiv = document.getElementById("users");
const groupsDiv = document.getElementById("groups");
const messagesDiv = document.getElementById("messages");

// Conexão inicial
socket.on("connect", () => {
  me.id = socket.id;
  document.getElementById("user").textContent = `user name: ${me.username}`;
  loadFriendsAndGroups();
});

// Carregar amigos e grupos salvos
function loadFriendsAndGroups() {
  const friends = getUserData(me.id) || [];
  friends.forEach(addFriendToUI);

  const groups = getGroupData() || [];
  groups.forEach(addGroupToUI);
}

// Receber solicitação de amizade
socket.on("receive friend request", (data) => {
  acceptFriendRequest(socket, me, data);
});

// Amizade aceita
socket.on("friend request accepted", (data) => {
  addFriendToUI({ username: data.from });
  storeUserData(me.id, { username: data.from });
});

// Criar grupo
socket.on("group created", (group) => {
  addGroupToUI(group);
  storeGroupData(group);
});

// Exibir mensagens
function displayMessageHandler(sender, msg, type = "friend") {
  displayMessage(sender, msg, type, messagesDiv);
}

// Enviar mensagem
export function sendMessage() {
  if (activeChatId) {
    const bf = new Blowfish(
      activeChatType === "friend"
        ? getSharedSecret(activeChatId)
        : getGroupData().find((g) => g.groupId === activeChatId).groupSecret,
      Blowfish.MODE.ECB,
      Blowfish.PADDING.NULL
    );

    const textbox = document.getElementById("textbox");
    const message = textbox.value;
    const cryptoMessage = bf.encode(message);

    storeMessage(activeChatId, { sender: me.username, msg: JSON.stringify(Array.from(cryptoMessage)) });
    displayMessageHandler(me.username, cryptoMessage, activeChatType);

    if (activeChatType === "friend") {
      socket.emit("send friend message", { to: activeChatId, msg: cryptoMessage });
    } else {
      socket.emit("send group message", { groupId: activeChatId, msg: cryptoMessage });
    }

    textbox.value = "";
  }
}

// Receber mensagem
socket.on("receive friend message", (data) => {
  if (data.from === activeChatId) {
    displayMessageHandler(data.from, data.msg, "friend");
  }
});

socket.on("receive group message", (data) => {
  if (data.groupId === activeChatId) {
    displayMessageHandler(data.sender, data.msg, "group");
  }
});

// Gerenciar mensagens offline
socket.on("offline messages", (messages) => {
  handleOfflineMessages(messages, activeChatId, displayMessageHandler, storeMessage);
});
