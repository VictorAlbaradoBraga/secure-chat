const manager = new Manager("localhost:6969", {"user_name": sessionStorage.getItem("user_name")});
const users = document.getElementById("users");
const usersArr = []
let friendId = null;
const messagesDiv = document.getElementById("messages");

socket.on("connect", ()=>
{
  document.getElementById("user").textContent = `Session Id: ${socket.id}`; 
})

socket.on("user connnected", (data)=>
{
  const user = usersArr.find((userId) => userId === data.id);
  if(!user)
  {
    addUser(data.id);
    usersArr.push(data.id);
    socket.emit("user connected", {"id": socket.id});
  }
});

socket.on("user disconnected", (data)=>
{
  const user = usersArr.find((userId) => userId === data.id);
  if(user) removeUser(user); 
})


socket.on("receive message", (data) => 
{
  storeMsg(data.id, data.id, data.msg)
  if(friendId === data.id) displayMessage(data.id, data.msg)
});

function displayMessage(id, msg)
{
  let sender = id;
  const messageDiv = document.createElement("div");
  messageDiv.setAttribute("id", "message");
  if(sender === socket.id) sender = "you";
  messageDiv.textContent = `${msg} - sender: ${sender}`;
  messagesDiv.appendChild(messageDiv);
}

function sendMessage()
{
  if(friendId)
  {
      textbox = document.getElementById("textbox");
      message = textbox.value;
      storeMsg(friendId, socket.id, message)
      displayMessage(socket.id, message);
      socket.emit("send message", {"id": friendId, "msg": message});
      textbox.value = '';
  }
}

function clearMessages()
{
  const messages = messagesDiv.childNodes;
  messages.forEach(msg => msg.remove());
}

function addUser(id)
{
  const user = document.createElement("a");
  user.setAttribute("href", "#");
  user.setAttribute("id", id);
  user.setAttribute("class", "user-link")
  user.setAttribute("data-user", id);
  user.setAttribute("onclick", `selectUser(this)`);
  user.textContent = `${id}`;
  users.appendChild(user);
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