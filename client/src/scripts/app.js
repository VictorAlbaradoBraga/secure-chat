let me = {"id": null, "user_name": sessionStorage.getItem("user-name")};
let friendId = null;
let sharedKey = null;

const socket = io("/users", {"auth": {"user_name": me.user_name}});
const usersDiv = document.getElementById("users");
const usersArr = [];
const messagesDiv = document.getElementById("messages");

socket.on("connect", ()=>
{
  me.id = socket.id;
  document.getElementById("user").textContent = `user name: ${me.user_name}`; 
})

socket.on("user connnected", (data)=>
{
  const userFound = usersArr.find((user) => user.id === data.id);
  if(!userFound)
  {
    const newUser = {"id": data.id, "user_name": data.user_name};
    addUser(newUser);
    usersArr.push(newUser);
    socket.emit("user connected", {"id": me.id, "user_name": me.user_name});
  }
});

socket.on("user disconnected", (data)=>
{
  const user = usersArr.find((userId) => userId === data.id);
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

// Listen for shared key
socket.on("shared key", (data) => 
{
  if (!sharedKey) {
    sharedKey = data.key;
    sessionStorage.setItem('sharedKey', sharedKey);  // Save the shared key in sessionStorage
    console.log(`Received shared key: ${sharedKey}`);
  }
});

socket.on("shared key confirmation", (data) => 
{
  if(data.key === sharedKey) {
    console.log(`Keys match! ${sharedKey}`);
  } else {
    console.log(`Keys do not match!`);
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