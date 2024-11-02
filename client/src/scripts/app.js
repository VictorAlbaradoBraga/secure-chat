const socket = io();

socket.on('message', (msg) => {
  displayMessage(msg, 'other');
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
  textbox = document.getElementById("textbox");
  message = textbox.value;
  displayMessage(message, "you");
  socket.emit("message", message);
  textbox.value = '';
}