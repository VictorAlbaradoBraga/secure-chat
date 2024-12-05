// friendGroupActions.js

import { storeUserData, getUserData } from './storage.js';
import { addFriendToUI, addGroupToUI } from './ui.js';

// Função para enviar solicitação de amizade
export function sendFriendRequest(socket, me, toUsername) {
  socket.emit("send friend request", { from: me.username, to: toUsername });
}

// Função para aceitar solicitação de amizade
export function acceptFriendRequest(socket, me, data) {
  const accept = confirm(`User ${data.from} sent you a friend request. Accept?`);
  if (accept) {
    socket.emit("accept friend request", { from: me.username, to: data.from });
  }
}

// Função para adicionar amigo à UI
export function addFriendToUI(friend) {
  const usersDiv = document.getElementById('users');
  const friendElement = document.createElement('div');
  friendElement.className = "user-link";
  friendElement.textContent = friend.username;
  friendElement.onclick = () => openChat(friend.username, "friend");
  usersDiv.appendChild(friendElement);
}

// Função para criar grupo
export function createGroup(socket, groupName, memberUsernames) {
  socket.emit("create group", { groupName, members: memberUsernames });
}

// Função para adicionar grupo à UI
export function addGroupToUI(group) {
  const groupsDiv = document.getElementById('groups');
  const groupElement = document.createElement('div');
  groupElement.className = "group-item";
  groupElement.textContent = group.name;
  groupElement.onclick = () => openChat(group.id, "group");
  groupsDiv.appendChild(groupElement);
}
