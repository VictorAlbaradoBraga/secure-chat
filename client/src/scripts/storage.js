export function storeUserData(userId, data) {
    // Armazena dados do usuário
    let usersData = JSON.parse(localStorage.getItem('usersData')) || {};
    usersData[userId] = data;
    localStorage.setItem('usersData', JSON.stringify(usersData));
  }
  
  export function getUserData(userId) {
    // Retorna dados do usuário
    const usersData = JSON.parse(localStorage.getItem('usersData')) || {};
    return usersData[userId] || null;
  }
  
  export function storeSharedSecret(userId, secret) {
    // Armazena segredo compartilhado com o usuário
    let sharedSecrets = JSON.parse(localStorage.getItem('sharedSecrets')) || {};
    sharedSecrets[userId] = secret;
    localStorage.setItem('sharedSecrets', JSON.stringify(sharedSecrets));
  }
  
  export function getSharedSecret(userId) {
    // Retorna segredo compartilhado com o usuário
    const sharedSecrets = JSON.parse(localStorage.getItem('sharedSecrets')) || {};
    return sharedSecrets[userId] || null;
  }
  