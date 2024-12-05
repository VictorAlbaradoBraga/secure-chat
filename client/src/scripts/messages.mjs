// messages.mjs

// Função para enviar mensagem criptografada
function sendEncryptedMessage(receiverId, message) {
    const friend = pairedKeys.find(user => user.id === receiverId);
    const bf = new Blowfish(friend.secret, Blowfish.MODE.ECB, Blowfish.PADDING.NULL);
  
    const encryptedMessage = bf.encode(message);
    socket.emit("send encrypted message", { id: receiverId, sender: me.id, msg: encryptedMessage });
  }
  
  // Função para receber e descriptografar mensagem
  socket.on("receive encrypted message", (data) => {
    const friend = pairedKeys.find(user => user.id === data.sender);
    const bf = new Blowfish(friend.secret, Blowfish.MODE.ECB, Blowfish.PADDING.NULL);
  
    const decryptedMessage = bf.decode(data.msg, Blowfish.TYPE.STRING);
    displayMessage(decryptedMessage, data.sender);
  });
  