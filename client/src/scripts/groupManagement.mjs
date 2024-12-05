// Funções relacionadas à criação de grupos e gerenciamento de mensagens de grupo

let groups = []; // Lista de grupos
let currentGroup = null; // Grupo atual selecionado

// Função para criar um novo grupo
export function createGroup() {
  const groupName = prompt("Digite o nome do grupo:");
  if (!groupName) return alert("O nome do grupo é obrigatório.");

  // Criar lista de amigos (apenas ids de amigos)
  const friends = prompt("Digite os IDs dos amigos separados por vírgula:");
  const friendsList = friends.split(",").map(friendId => friendId.trim());

  // Adicionar o usuário atual à lista de amigos do grupo
  friendsList.push(me.id);

  // Criar novo grupo
  const newGroup = {
    id: `group-${Date.now()}`,
    name: groupName,
    members: friendsList,
    messages: [],
    secretKey: generateSecretKey(friendsList) // Gerar chave secreta para o grupo
  };

  groups.push(newGroup);

  // Adicionar o grupo à interface
  addGroupToSidebar(newGroup);
  alert(`Grupo "${groupName}" criado com sucesso!`);
}

// Função para gerar chave secreta para o grupo com base nos membros
function generateSecretKey(members) {
  // Gerar chave compartilhada para o grupo (simples exemplo com IDs dos membros)
  const key = members.join("-");
  return new TextEncoder().encode(key); // Transforma em Uint8Array
}

// Função para adicionar o grupo à barra lateral
function addGroupToSidebar(group) {
  const groupsDiv = document.getElementById("groups");
  const groupDiv = document.createElement("div");
  groupDiv.classList.add("group");
  groupDiv.textContent = group.name;
  groupDiv.onclick = () => switchToGroup(group.id);
  groupsDiv.appendChild(groupDiv);
}

// Função para alternar para um grupo e exibir suas mensagens
function switchToGroup(groupId) {
  const group = groups.find(g => g.id === groupId);
  if (group) {
    currentGroup = group;
    displayGroupMessages(group);
  }
}

// Função para exibir as mensagens de um grupo
function displayGroupMessages(group) {
  const messagesDiv = document.getElementById("messages");
  messagesDiv.innerHTML = ''; // Limpar mensagens anteriores

  group.messages.forEach(msg => {
    const messageDiv = document.createElement("div");
    messageDiv.textContent = `${msg.sender}: ${msg.text}`;
    messagesDiv.appendChild(messageDiv);
  });
}

// Função para enviar mensagem ao grupo
export function sendGroupMessage() {
  if (currentGroup) {
    const messageText = document.getElementById("textbox").value;
    if (!messageText) return alert("Digite uma mensagem.");

    // Adicionar a mensagem ao grupo
    currentGroup.messages.push({
      sender: me.username,
      text: messageText
    });

    // Exibir a nova mensagem
    displayGroupMessages(currentGroup);

    // Limpar campo de entrada
    document.getElementById("textbox").value = '';

    // Enviar a mensagem para os outros membros do grupo
    socket.emit("send group message", {
      groupId: currentGroup.id,
      message: messageText,
      sender: me.username
    });
  } else {
    alert("Selecione um grupo para enviar a mensagem.");
  }
}

// Função para sair de um grupo
export function leaveGroup() {
  if (!currentGroup) return alert("Selecione um grupo para sair.");

  // Remover o usuário da lista de membros do grupo
  currentGroup.members = currentGroup.members.filter(id => id !== me.id);

  // Alterar a chave secreta para refletir a remoção
  currentGroup.secretKey = generateSecretKey(currentGroup.members);

  // Atualizar interface e estado
  alert(`Você saiu do grupo "${currentGroup.name}".`);
  currentGroup = null; // Limpar o grupo atual
  displayGroupMessages(currentGroup); // Limpar mensagens na interface
}
