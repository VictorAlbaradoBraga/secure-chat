import { storeGroupData, getGroupData } from './storage.js';

export function storeGroupData(group) {
  // Armazena informações sobre o grupo
  let groups = JSON.parse(localStorage.getItem('groups')) || [];
  groups.push(group);
  localStorage.setItem('groups', JSON.stringify(groups));
}

export function getGroupData() {
  // Retorna dados de grupos armazenados
  return JSON.parse(localStorage.getItem('groups')) || [];
}

export function addGroupToUI(group) {
  const groupElement = document.createElement("div");
  groupElement.className = "group-link";
  groupElement.textContent = group.groupName;
  groupElement.onclick = () => openChat(group.groupId, "group");
  groupsDiv.appendChild(groupElement);
}
