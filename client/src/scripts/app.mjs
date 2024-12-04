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

socket.on("user connected", async (data)=>
{
  const userFound = pairedKeys.find((user) => user.id === data.id);
  if(!userFound)
  {
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
    console.log(sharedSecret);

    pairedKeys[pairedKeys.indexOf(userFound)].secret = new Uint8Array(sharedSecret);;
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
  console.log(`user found ${user}`);
  if(user){
    storeMsg(data.sender, data.sender, new Uint8Array(data.msg), user.secret);
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
  let msgSender = sender;
  const bf = new Blowfish(secret, Blowfish.MODE.ECB, Blowfish.PADDING.NULL);

  const messageDiv = document.createElement("div");
  messageDiv.setAttribute("id", "message");
  if(sender === me.username) {
    msgSender = "you";
  }

  const decryptoMessage = bf.decode(msg, Blowfish.TYPE.STRING);
  messageDiv.textContent = `${decryptoMessage} - sender: ${msgSender}`;
  messagesDiv.appendChild(messageDiv);
}

function storeMsg(sender, keyhalf, msg, secret)
{
  const key = `${me.username}_${keyhalf}`;
  const messages = JSON.parse(localStorage.getItem(key)) || [];
  const msg_json_array = JSON.stringify(Array.from(msg));
  const secret_json_array = JSON.stringify(Array.from(secret));
  messages.push({"sender": sender, "msg": msg_json_array, "secret": secret_json_array});
  console.log(messages);
  localStorage.setItem(key, JSON.stringify(messages));
}

function sendMessage()
{
  if(friendId)
  {
      const user = pairedKeys.find((user) => user.id === friendId);
      const bf = new Blowfish(user.secret, Blowfish.MODE.ECB, Blowfish.PADDING.NULL);

      const textbox = document.getElementById("textbox");
      const message = textbox.value;
      const cryptoMessage = bf.encode(message);

      console.log(`sending message to ${user.username} with secret ${user.secret}`);

      storeMsg(me.username, user.username, cryptoMessage, user.secret);
      displayMessage(me.username, cryptoMessage, user.secret);
      socket.emit("send message", {"id": friendId, "sender": me.username, "msg": cryptoMessage});
      textbox.value = '';
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

  console.log(user.username);
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
  const messages = JSON.parse(localStorage.getItem(`${me.username}_${friendUsername}`)) || [];
  messages.forEach(msg => {
    console.log(`messages ${msg.secret}`);
    const decodeMsg = new Uint8Array(JSON.parse(msg.msg));
    const decodeSecret = new Uint8Array(JSON.parse(msg.secret));
    console.log(JSON.parse(msg.secret));
    displayMessage(msg.sender, decodeMsg, decodeSecret);
  });
}

window.sendMessage = sendMessage;
window.selectUser = selectUser;