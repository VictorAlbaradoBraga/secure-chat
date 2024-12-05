import { Blowfish } from 'https://unpkg.com/egoroof-blowfish@4.0.1/dist/blowfish.mjs';

let me = {"id": null, "username": sessionStorage.getItem("username")};
let friendId = null;

const socket = io("/users", {"auth": {"username": me.username, "token": localStorage.getItem("accessToken")}});
const usersDiv = document.getElementById("users");
const pairedKeys = [];
const messagesDiv = document.getElementById("messages");

socket.on("connect", ()=>
{
  me.id = socket.id;
  document.getElementById("user").textContent = `user name: ${me.username}`; 
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
    const newUser = {"id": data.id, "username": data.username, "secret": null, dst: {publicKey: null}, src: {publicKey: null, privateKey: null}};

    const keyPair = await createKeyPair();
    newUser.src.publicKey = keyPair.publicKey;
    newUser.src.privateKey = keyPair.privateKey;
    pairedKeys.push(newUser);

    addUser(newUser);

    const jwkPublicKey = await window.crypto.subtle.exportKey("jwk", newUser.src.publicKey)

    socket.emit("notify", {dst: newUser.id, src: me.id, username: me.username, key: jwkPublicKey});
  }
});

socket.on("notify", async (data)=>
{
  const userFound = pairedKeys.find((user) => user.id === data.src);
  if(!userFound)
  {
    const newUser = {"id": data.src, "username": data.username, "secret": null, dst: {publicKey: null}, src: {publicKey: null, privateKey: null}};
    
    const keyPair = await createKeyPair();
    newUser.src.publicKey = keyPair.publicKey;
    newUser.src.privateKey = keyPair.privateKey;

    const publicKey = await window.crypto.subtle.importKey("jwk", data.key, {name: "ECDH", namedCurve: "P-256"}, true, []);

    newUser.dst.publicKey = publicKey;

    const sharedSecret = await createSharedSecret(keyPair.privateKey, publicKey);

    newUser.secret = new Uint8Array(sharedSecret);

    pairedKeys.push(newUser);
    addUser(newUser);

    const jwkPublicKey = await window.crypto.subtle.exportKey("jwk", newUser.src.publicKey)

    socket.emit("create secret", {dst: newUser.id, src: me.id, key: jwkPublicKey});
  }
});

socket.on("create secret", async (data)=>
{
  const userFound = pairedKeys.find((user) => user.id === data.src);
  if(userFound)
  {

    const publicKey = await window.crypto.subtle.importKey("jwk", data.key, {name: "ECDH", namedCurve: "P-256"}, true, []);
    const privateKey = userFound.src.privateKey;

    //public key deve ser um objecto do tipo CryptoKey, mas como está sendo enviado pelo websocket está formatada como um Object comum
    const sharedSecret = await createSharedSecret(privateKey, publicKey);

    console.log("shared key:");
    console.log(new Uint8Array(sharedSecret));

    pairedKeys[pairedKeys.indexOf(userFound)].secret = new Uint8Array(sharedSecret);
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
  const user = pairedKeys.find((user) => user.id === data.id);
  if(user){
    const messageEncoded = new Uint8Array(data.msg);
    storeMsg(data.sender, data.sender, messageEncoded, user.secret);
    if(friendId === data.id) displayMessage(data.sender, data.msg, user.secret);
  }
});

function clearMessages()
{
  // Remove all previous messages before displaying new ones
  const messages = messagesDiv.childNodes;
  Array.from(messages).forEach(msg => msg.remove());
}

function displayMessage(sender, msg, secret)
{
  const bf = new Blowfish(secret, Blowfish.MODE.ECB, Blowfish.PADDING.NULL);
  let senderMsg = sender;

  if(sender === me.id) {
    senderMsg = "you";
  }

  const messageDiv = document.createElement("div");
  messageDiv.setAttribute("id", "message");

  const decryptoMessage = bf.decode(msg, Blowfish.TYPE.STRING);
  messageDiv.textContent = `${decryptoMessage} - sender: ${senderMsg}`;

  messagesDiv.appendChild(messageDiv);
}

function storeMsg(sender, keyhalf, msg, secret)
{
  const key = `${me.username}_${keyhalf}`;
  const messages = JSON.parse(localStorage.getItem(key)) || [];
  const time = new Date(Date.now());
  const msg_json_array = JSON.stringify(Array.from(msg));
  const secret_json_array = JSON.stringify(Array.from(secret));
  messages.push({"sender": sender, "msg": msg_json_array, "secret": secret_json_array});
  localStorage.setItem(key, JSON.stringify(messages));
}

export function sendMessage() {
  if (friendId) {
    // Verifica se são amigos antes de enviar a mensagem
    fetch(`/api/isFriend/${friendId}`, { method: "GET", headers: { "Authorization": `Bearer ${localStorage.getItem("accessToken")}` } })
      .then(response => response.json())
      .then(data => {
        if (data.isFriend) {
          const user = pairedKeys.find((user) => user.id === friendId);
          const bf = new Blowfish(user.secret, Blowfish.MODE.ECB, Blowfish.PADDING.NULL);

          const textbox = document.getElementById("textbox");
          const message = textbox.value;
          const cryptoMessage = bf.encode(message);

          storeMsg(friendId, me.id, cryptoMessage);
          displayMessage(me.id, cryptoMessage);
          socket.emit("send message", { "id": friendId, "sender": me.id, "msg": cryptoMessage });
          textbox.value = '';
        } else {
          alert("Você só pode enviar mensagens para seus amigos!");
        }
      })
      .catch(err => {
        console.log("Erro ao verificar amizade", err);
        alert("Erro ao verificar se são amigos.");
      });
  }
}

function addUser(user)
{
  const userElement = document.createElement("a");
  userElement.setAttribute("href", "#");
  userElement.setAttribute("id", user.id);
  userElement.setAttribute("class", "user-link");
  userElement.setAttribute("data-userid", user.id);
  userElement.setAttribute("data-username", user.username);
  userElement.setAttribute("onclick", "selectUser(this)");

  userElement.textContent = user.username;
  usersDiv.appendChild(userElement);
}

function removeUser(user)
{
  const userElement = document.getElementById(user.id);
  if(userElement) userElement.remove();
}

export function selectUser(element)
{
  clearMessages();
  friendId = element.getAttribute("data-userid");
  const friendUsername = element.getAttribute("data-username");

  const key = `${me.username}_${friendUsername}`;
  const messages = JSON.parse(localStorage.getItem(key)) || [];
  messages.forEach(msg => {
    console.log(msg);
    const messageParsed = new Uint8Array(JSON.parse(msg.msg));
    const secretParsed = new Uint8Array(JSON.parse(msg.secret));
    displayMessage(msg.sender, messageParsed, secretParsed);
  });
}

function addFriend() {
  const friendId = prompt("Digite o ID do amigo:");
  if (friendId) {
    fetch("/api/addFriend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
      },
      body: JSON.stringify({ friendId })
    })
    .then(response => response.json())
    .then(data => {
      alert(data.message);
    })
    .catch(err => {
      console.log("Erro ao adicionar amigo:", err);
      alert("Erro ao adicionar amigo.");
    });
  }
}

window.sendMessage = sendMessage;
window.selectUser = selectUser;
window.addFriend = addFriend;