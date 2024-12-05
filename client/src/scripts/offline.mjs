// Função para armazenar mensagens offline no localStorage
async function storeOfflineMessage(receiverId, sender, message) {
    const offlineMessages = JSON.parse(localStorage.getItem("offlineMessages")) || {};
    const receiverData = getUserData(receiverId);
    
    if (receiverData && receiverData.secret) {
        const bf = new Blowfish(receiverData.secret, Blowfish.MODE.ECB, Blowfish.PADDING.NULL);
        const encryptedMessage = bf.encode(message);

        if (!offlineMessages[receiverId]) {
            offlineMessages[receiverId] = [];
        }
        offlineMessages[receiverId].push({ sender, message: encryptedMessage });
        localStorage.setItem("offlineMessages", JSON.stringify(offlineMessages));
    }
}
  
// Função para recuperar mensagens offline quando o usuário se reconectar
function retrieveOfflineMessages(receiverId) {
    const offlineMessages = JSON.parse(localStorage.getItem("offlineMessages")) || {};
    const receiverData = getUserData(receiverId);
  
    if (offlineMessages[receiverId]) {
        offlineMessages[receiverId].forEach(msg => {
            const decryptedMessage = decryptMessage(msg.message, receiverData.secret);
            displayMessage(decryptedMessage, msg.sender);
        });
        // Limpar mensagens offline após exibição
        delete offlineMessages[receiverId];
        localStorage.setItem("offlineMessages", JSON.stringify(offlineMessages));
    }
}
  
// Descriptografar mensagem
function decryptMessage(encryptedMessage, secretKey) {
    const bf = new Blowfish(secretKey, Blowfish.MODE.ECB, Blowfish.PADDING.NULL);
    return bf.decode(encryptedMessage, Blowfish.TYPE.STRING);
}
