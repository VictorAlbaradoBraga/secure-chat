import { Blowfish } from 'https://unpkg.com/egoroof-blowfish@4.0.1/dist/blowfish.mjs';
import {
  storeUserData,
  getUserData,
  storeMessage,
  getMessages,
  storeSharedSecret,
  getSharedSecret,
  storeGroupData,
  getGroupData,
} from './storage.js';

let me = { id: null, username: sessionStorage.getItem("username") };
let friendId = null;
let activeChatType = "friend"; // 'friend' or 'group'
let activeChatId = null;

const token = localStorage.getItem("accessToken");
console.log("Token no cliente:", token); // Verificando o token

const socket = io("/users", { 
  auth: { 
    username: me.username, 
    token: token 
  } 
});
const usersDiv = document.getElementById("users");
const groupsDiv = document.getElementById("groups");
const messagesDiv = document.getElementById("messages");

// Armazenamento das chaves públicas
const pairedKeys = [];

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

// Enviar solicitação de amizade
export function sendFriendRequest(toUsername) {
  socket.emit("send friend request", { from: me.username, to: toUsername });
}

// Receber solicitação de amizade
socket.on("receive friend request", (data) => {
  const accept = confirm(`User ${data.from} sent you a friend request. Accept?`);
  if (accept) {
    socket.emit("accept friend request", { from: me.username, to: data.from });
  }
});

// Amizade aceita
socket.on("friend request accepted", (data) => {
  addFriendToUI({ username: data.from });
  storeUserData(me.id, { username: data.from });
});

// Criar grupo
export function createGroup(groupName, memberUsernames) {
  socket.emit("create group", { groupName, members: memberUsernames });
}

// Receber grupo criado
socket.on("group created", (group) => {
  addGroupToUI(group);
  storeGroupData(group);
});

// Exibir mensagens
function displayMessage(sender, msg, type = "friend") {
  const chatSecret = type === "friend" 
    ? getSharedSecret(activeChatId)
    : getGroupData().find((g) => g.groupId === activeChatId).groupSecret;

  const bf = new Blowfish(chatSecret, Blowfish.MODE.ECB, Blowfish.PADDING.NULL);
  const decryptedMessage = bf.decode(msg, Blowfish.TYPE.STRING);

  const messageDiv = document.createElement("div");
  messageDiv.className = "message";
  messageDiv.textContent = `${sender}: ${decryptedMessage}`;
  messagesDiv.appendChild(messageDiv);
}

// Adicionar amigo à interface
function addFriendToUI(friend) {
  const friendElement = document.createElement("div");
  friendElement.className = "user-link";
  friendElement.textContent = friend.username;
  friendElement.onclick = () => openChat(friend.username, "friend");
  usersDiv.appendChild(friendElement);
}

// Adicionar grupo à interface
function addGroupToUI(group) {
  const groupElement = document.createElement("div");
  groupElement.className = "group-link";
  groupElement.textContent = group.groupName;
  groupElement.onclick = () => openChat(group.groupId, "group");
  groupsDiv.appendChild(groupElement);
}

// Abrir chat (amigo ou grupo)
function openChat(chatId, type) {
  activeChatId = chatId;
  activeChatType = type;
  messagesDiv.innerHTML = ""; // Limpa mensagens
  const messages = getMessages(chatId) || [];
  messages.forEach((msg) => displayMessage(msg.sender, new Uint8Array(JSON.parse(msg.msg)), type));
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
    displayMessage(me.username, cryptoMessage, activeChatType);

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
    displayMessage(data.from, data.msg, "friend");
  }
});

socket.on("receive group message", (data) => {
  if (data.groupId === activeChatId) {
    displayMessage(data.sender, data.msg, "group");
  }
});

// Novo código de troca de chaves para criptografia ponta a ponta
socket.on("user connected", async (data) => {
  const userFound = pairedKeys.find((user) => user.id === data.id);
  if (!userFound) {
    const newUser = { id: data.id, username: data.username, secret: null, dst: { publicKey: null }, src: { publicKey: null, privateKey: null } };

    const keyPair = await createKeyPair();
    newUser.src.publicKey = keyPair.publicKey;
    newUser.src.privateKey = keyPair.privateKey;
    pairedKeys.push(newUser);

    const jwkPublicKey = await window.crypto.subtle.exportKey("jwk", newUser.src.publicKey);

    socket.emit("notify", { dst: newUser.id, src: me.id, username: me.username, key: jwkPublicKey });
  }
});

socket.on("notify", async (data) => {
  const userFound = pairedKeys.find((user) => user.id === data.src);
  if (!userFound) {
    const newUser = { id: data.src, username: data.username, secret: null, dst: { publicKey: null }, src: { publicKey: null, privateKey: null } };

    const keyPair = await createKeyPair();
    newUser.src.publicKey = keyPair.publicKey;
    newUser.src.privateKey = keyPair.privateKey;

    const publicKey = await window.crypto.subtle.importKey("jwk", data.key, { name: "ECDH", namedCurve: "P-256" }, true, []);

    newUser.dst.publicKey = publicKey;

    const sharedSecret = await createSharedSecret(keyPair.privateKey, publicKey);
    newUser.secret = new Uint8Array(sharedSecret);

    pairedKeys.push(newUser);

    const jwkPublicKey = await window.crypto.subtle.exportKey("jwk", newUser.src.publicKey);

    socket.emit("create secret", { dst: newUser.id, src: me.id, key: jwkPublicKey });
  }
});

socket.on("create secret", async (data) => {
  const userFound = pairedKeys.find((user) => user.id === data.src);
  if (userFound) {
    const publicKey = await window.crypto.subtle.importKey("jwk", data.key, { name: "ECDH", namedCurve: "P-256" }, true, []);
    const privateKey = userFound.src.privateKey;

    const sharedSecret = await createSharedSecret(privateKey, publicKey);

    pairedKeys[pairedKeys.indexOf(userFound)].secret = new Uint8Array(sharedSecret);
  }
});
