// Armazenamento de dados do usuário
export function storeUserData(userId, userData) {
    const data = JSON.stringify(userData);
    localStorage.setItem(`user:${userId}`, data);
}
  
export function getUserData(userId) {
    const data = localStorage.getItem(`user:${userId}`);
    return data ? JSON.parse(data) : null;
}
  
// Armazenamento de mensagens criptografadas
export function storeMessage(userId, messageData) {
    const messages = JSON.parse(localStorage.getItem(userId)) || [];
    messages.push(messageData);
    localStorage.setItem(userId, JSON.stringify(messages));
}
  
export function getMessages(userId) {
    const messages = localStorage.getItem(userId);
    return messages ? JSON.parse(messages) : [];
}
  
// Armazenamento de chaves compartilhadas
export function storeSharedSecret(userId, secretKey) {
    localStorage.setItem(`secret:${userId}`, JSON.stringify(secretKey));
}
  
export function getSharedSecret(userId) {
    const secret = localStorage.getItem(`secret:${userId}`);
    return secret ? new Uint8Array(JSON.parse(secret)) : null;
}
  
// Armazenamento de amigos
export function storeFriends(friendsList) {
    localStorage.setItem('friends', JSON.stringify(friendsList));
}
  
export function getFriends() {
    const friends = localStorage.getItem('friends');
    return friends ? JSON.parse(friends) : [];
}
  
// Armazenamento de grupos
export function storeGroups(groupsList) {
    localStorage.setItem('groups', JSON.stringify(groupsList));
}
  
export function getGroups() {
    const groups = localStorage.getItem('groups');
    return groups ? JSON.parse(groups) : [];
}
