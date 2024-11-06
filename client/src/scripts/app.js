let me = {"id": null, "user_name": sessionStorage.getItem("user-name")};
let friendId = null;

const socket = io("/users", {"auth": {"user_name": me.user_name}});
const usersDiv = document.getElementById("users");
const usersArr = [];
const messagesDiv = document.getElementById("messages");

socket.on("connect", ()=>
{
  me.id = socket.id
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
  storeMsg(data.id, data.sender, data.msg)
  if(friendId === data.id) displayMessage(data.sender, data.msg)
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
      textbox = document.getElementById("textbox");
      message = textbox.value;
      storeMsg(friendId, me.id, message)
      displayMessage(me.id, message);
      socket.emit("send message", {"id": friendId, "sender": me.user_name, "msg": message});
      textbox.value = '';
  }
}

function clearMessages()
{
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
  userElement.setAttribute("onclick", `selectUser(this)`);
  userElement.textContent = `${user.user_name}`;
  usersDiv.appendChild(userElement);
}

function removeUser(id)
{
  const user = document.getElementById(id);
  user.remove();
}

//TODO(Felipe): this is saving messages in sessionStorage, change it to localStorage later or sql server
function storeMsg(id, sender, msg)
{
  console.log(`id:${id}\nsender:${sender}\nmsg:${msg}`);
  const messages = JSON.parse(sessionStorage.getItem(id)) || [];
  const time = new Date(Date.now());
  messages.push({"sender": sender, "msg": msg, "date": time.toLocaleString()});
  sessionStorage.setItem(id, JSON.stringify(messages));
}

function selectUser(element)
{
  friendId = element.getAttribute("data-user");
  clearMessages();
  const messages = JSON.parse(sessionStorage.getItem(friendId)) || [];
  messages.forEach(msg => displayMessage(msg.sender, msg.msg));
}