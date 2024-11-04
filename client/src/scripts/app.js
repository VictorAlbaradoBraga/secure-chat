const socket = io("/users");
const users = document.getElementById("users");
const usersArr = []
let friendId = null;

socket.on("user connnected", (data)=>
{
  const user = usersArr.find((userId) => userId == data.id);
  if(!user)
  {
    addUser(data.id);
    usersArr.push(data.id);
    socket.emit("user connected", {"id": socket.id});
  }
});


socket.on("receive message", (data) => 
{
  displayMessage(data.msg, data.id);
});

function displayMessage(msg, sender)
{
  const messages = document.getElementById("messages");
  const messageDiv = document.createElement("div");
  messageDiv.setAttribute("id", "message");
  messageDiv.textContent = `${msg} - Sender: ${sender}`;
  messages.appendChild(messageDiv);
}

// Send messages to the server
function sendMessage()
{
  if(friendId)
  {
      textbox = document.getElementById("textbox");
      message = textbox.value;
      displayMessage(message, "you");
      console.log(friendId);
      socket.emit("send message", {"id": friendId, "msg": message});
      textbox.value = '';
  }
}

function addUser(userId)
{
  console.log(`user ${userId} logged in`)
  user = document.createElement("a");
  user.setAttribute("href", "#");
  user.setAttribute("class", "user-link")
  user.setAttribute("data-user", userId);
  user.setAttribute("onclick", `selectUser(this)`);
  user.textContent = `${userId}`;
  users.appendChild(user);
}

function selectUser(element)
{
  friendId = element.getAttribute("data-user");
}