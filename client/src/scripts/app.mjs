//import { Blowfish } from 'https://localhost:6969/blowfish.mjs';

let me = {"id": null, "user_name": sessionStorage.getItem("user-name")};
let friendId = null;

const socket = io("/users", {"auth": {"user_name": me.user_name}});
const usersDiv = document.getElementById("users");
const pairedKeys = [];
const messagesDiv = document.getElementById("messages");

socket.on("connect", ()=>
{
  me.id = socket.id;
  document.getElementById("user").textContent = `user name: ${me.user_name}`; 
})


/*
  ciclo de troca de chaves: novo usuário conecta e envia user connected para todos os usuários->
  usuários conectados enviam notify para o novo usuário contendo a chave pública ->
  novo usuário é notificado cria sua própria chave pública e envia para os outros usuários com o evento create secret ->
  agora todos os usuários devem possuir uma chave secreta única para cada usuário conectado.
*/

socket.on("user connected", async (data)=>
{
  const userFound = pairedKeys.find((user) => user.id === data.id);
  if(!userFound)
  {
    //              id e usuar name do usuário conectado;   segredo compartilhado apenas entre dst e src -> dst outro usuário src o próprio usuário
    const newUser = {"id": data.id, "user_name": data.user_name, "secret": null, dst: {publicKey: null}, src: {publicKey: null, privateKey: null}};

    const keyPair = await createKeyPair();
    newUser.src.publicKey = keyPair.publicKey;
    newUser.src.privateKey = keyPair.privateKey;
    pairedKeys.push(newUser);

    addUser(newUser);

    socket.emit("notify", {dst: newUser.id, src: me.id, user_name: me.user_name, key: keyPair.publicKey});
  }
});

socket.on("notify", async (data)=>
{
  const userFound = pairedKeys.find((user) => user.id === data.src);
  if(!userFound)
  {
    const newUser = {"id": data.src, "user_name": data.user_name, "secret": null, dst: {publicKey: data.key}, src: {publicKey: null, privateKey: null}};
    
    const keyPair = await createKeyPair();
    newUser.src.publicKey = keyPair.publicKey;
    newUser.src.privateKey = keyPair.privateKey;
    pairedKeys.push(newUser);
    
    addUser(newUser);

    const sharedSecret = await createSharedSecret(keyPair.privateKey, newUser.src.publicKey);

    console.log("shared key:");
    console.log(sharedSecret);

    const publicKey = await window.crypto.subtle.exportKey("spki", newUser.src.publicKey)

    socket.emit("create secret", {dst: newUser.id, src: me.id, key: publicKey});
  }
});

socket.on("create secret", async (data)=>
{
  const userFound = pairedKeys.find((user) => user.id === data.src);
  if(userFound)
  {
    const publicKey = data.key;
    const privateKey = userFound.src.privateKey;

    //public key deve ser um objecto do tipo CryptoKey, mas como está sendo enviado pelo websocket está formatada como um Object comum
    const sharedSecret = await createSharedSecret(privateKey, publicKey);

    console.log("shared key:");
    console.log(sharedSecret);

    userFound.secret = sharedSecret;
  } 
})

// creates keypair [privateKey, publicKey] and sends publicKey to the new user
async function createKeyPair() {
  const algorithm = { name: "ECDH", namedCurve: "P-256" };
  const keyPair = await window.crypto.subtle.generateKey(algorithm, true, ["deriveKey", "deriveBits"]);
  return keyPair;
}

//recieves publicKey from new user and calculates sharedSecrete from it;
async function createSharedSecret(privateKey, publicKey){
  console.log("create shared key")
  const sharedSecret = await window.crypto.subtle.deriveBits(
    {"name": "ECDH", "public": publicKey},
    privateKey,
    256  // Number of bits of the derived secret
  );

  return sharedSecret;
}

socket.on("user disconnected", (data)=>
{
  const user = pairedKeys.find((user) => user.id === data.id);
  if(user) removeUser(user); 
})

socket.on("receive message", (data) => 
{
  // Store and display message only if it matches the shared key
  if(data.key === sharedKey) {
    storeMsg(data.id, data.sender, data.msg);
    if(friendId === data.id) displayMessage(data.sender, data.msg);
  }
});

function displayMessage(sender, msg)
{
  const messageDiv = document.createElement("div");
  messageDiv.setAttribute("id", "message");
  if(sender === me.id) sender = "you";
  messageDiv.textContent = `${msg} - sender: ${sender}`;
  messagesDiv.appendChild(messageDiv);
}

function sendMessage()
{
  if(friendId)
  {
      const textbox = document.getElementById("textbox");
      const message = textbox.value;
      storeMsg(friendId, me.id, message);
      displayMessage(me.id, message);
      socket.emit("send message", {"id": friendId, "sender": me.user_name, "msg": message, "key": sharedKey});
      textbox.value = '';
  }
}

function clearMessages()
{
  // Remove all previous messages before displaying new ones
  const messages = messagesDiv.childNodes;
  messages.forEach(msg => msg.remove());
}

function addUser(user)
{
  const userElement = document.createElement("a");
  userElement.setAttribute("href", "#");
  userElement.setAttribute("id", user.id);
  userElement.setAttribute("class", "user-link")
  userElement.setAttribute("data-user", user.id);
  userElement.setAttribute("onclick", "selectUser(this)");
  userElement.textContent = user.user_name;
  usersDiv.appendChild(userElement);
}

function removeUser(user)
{
  const userElement = document.getElementById(user.id);
  if(userElement) userElement.remove();
}

function selectUser(element)
{
  // Check if the same user is clicked again
  const newFriendId = element.getAttribute("data-user");

  if(friendId === newFriendId) {
    return; // Do nothing if the same user is clicked
  }

  friendId = newFriendId;
  clearMessages(); // Clear old messages before displaying new ones

  const messages = JSON.parse(sessionStorage.getItem(getMessagesKey(friendId))) || [];
  messages.forEach(msg => displayMessage(msg.sender, msg.msg));

  // Notify both users that they're paired and share the key
  socket.emit("user pair connected", {user1: me.id, user2: friendId});
}

function storeMsg(id, sender, msg)
{
  const key = getMessagesKey(id);
  const messages = JSON.parse(sessionStorage.getItem(key)) || [];
  messages.push({"sender": sender, "msg": msg});
  sessionStorage.setItem(key, JSON.stringify(messages));
}

function getMessagesKey(id)
{
  // Generate a unique key based on both user IDs and shared key
  return `${Math.min(me.id, id)}_${Math.max(me.id, id)}_${sharedKey}`;
}