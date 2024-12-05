let friendRequests = [];  // Lista de solicitações de amizade pendentes

// Função para exibir/ocultar formulários
function showAddFriendForm() {
  hideForm();
  const addFriendForm = document.getElementById('addFriendForm');
  addFriendForm.classList.add('active');
}

function showCreateGroupForm() {
  hideForm();
  const createGroupForm = document.getElementById('createGroupForm');
  createGroupForm.classList.add('active');
  loadFriendsForGroup();
}

function hideForm() {
  const addFriendForm = document.getElementById('addFriendForm');
  const createGroupForm = document.getElementById('createGroupForm');
  addFriendForm.classList.remove('active');
  createGroupForm.classList.remove('active');
}

// Função para pesquisar amigos
function searchFriends() {
  const searchTerm = document.getElementById('searchUsername').value.toLowerCase();
  const friends = getUserData(me.id) || [];
  const results = friends.filter(friend =>
    friend.username.toLowerCase().includes(searchTerm)
  );

  const searchResultsDiv = document.getElementById('searchResults');
  searchResultsDiv.innerHTML = '';  // Limpa resultados anteriores

  results.forEach(friend => {
    const resultDiv = document.createElement('div');
    resultDiv.textContent = friend.username;
    resultDiv.onclick = () => sendFriendRequest(friend.username);
    searchResultsDiv.appendChild(resultDiv);
  });
}

// Função para enviar solicitação de amizade
document.getElementById('addFriendForm').addEventListener('submit', function(event) {
  event.preventDefault();
  const username = document.getElementById('friendUsername').value;
  if (username) {
    sendFriendRequest(username);
    showFeedbackMessage("Solicitação de amizade enviada com sucesso!", "success");
    hideForm();  // Fecha o formulário após enviar a solicitação
  } else {
    showFeedbackMessage("Por favor, insira o nome do usuário.", "error");
  }
});

// Função para enviar solicitação de amizade, offline ou online
function sendFriendRequest(username) {
  // Caso o usuário esteja offline, armazene a solicitação em uma fila local
  if (!navigator.onLine) {
    storeOfflineRequest(username);
  } else {
    socket.emit('send friend request', { from: me.username, to: username });
    alert(`Solicitação de amizade enviada para ${username}`);
  }
}

// Função para armazenar solicitações offline
function storeOfflineRequest(username) {
  const offlineRequests = JSON.parse(localStorage.getItem('offlineRequests') || '[]');
  offlineRequests.push({ from: me.username, to: username });
  localStorage.setItem('offlineRequests', JSON.stringify(offlineRequests));
}

// Função para exibir as solicitações de amizade
function displayFriendRequests() {
  const friendRequestsDiv = document.getElementById('friendRequests');
  friendRequestsDiv.innerHTML = '';  // Limpa as solicitações anteriores

  // Exibe cada solicitação com botões para aceitar ou recusar
  friendRequests.forEach(request => {
    const requestDiv = document.createElement('div');
    requestDiv.className = 'friend-request';
    requestDiv.innerHTML = `
      <p>Usuário: ${request.from}</p>
      <button onclick="openFriendRequestModal('${request.from}')">Abrir Solicitação</button>
    `;
    friendRequestsDiv.appendChild(requestDiv);
  });
}

// Função para abrir o modal de solicitação de amizade
function openFriendRequestModal(username) {
  const modal = document.getElementById('friendRequestModal');
  const modalUsername = document.getElementById('modalUsername');
  modalUsername.textContent = `Você tem uma solicitação de amizade de ${username}`;
  
  // Exibe o modal
  modal.style.display = 'block';

  // Função para aceitar a solicitação
  document.getElementById('acceptBtn').onclick = () => {
    acceptFriendRequest(username);
    modal.style.display = 'none';  // Fecha o modal após aceitar
  };

  // Função para recusar a solicitação
  document.getElementById('declineBtn').onclick = () => {
    declineFriendRequest(username);
    modal.style.display = 'none';  // Fecha o modal após recusar
  };
}

// Função para aceitar a solicitação de amizade
function acceptFriendRequest(username) {
  socket.emit('accept friend request', { from: me.username, to: username });
  alert(`Você agora é amigo de ${username}`);
  loadFriendsAndGroups();  // Atualiza a lista de amigos
}

// Função para recusar a solicitação de amizade
function declineFriendRequest(username) {
  socket.emit('decline friend request', { from: me.username, to: username });
  alert(`Você recusou a solicitação de amizade de ${username}`);
  loadFriendsAndGroups();  // Atualiza a lista de amigos
}

// Carregar amigos e grupos
function loadFriendsAndGroups() {
  const friends = getUserData(me.id) || [];
  friends.forEach(addFriendToUI);

  const groups = getGroupData() || [];
  groups.forEach(addGroupToUI);
}

// Adicionar amigo à interface
function addFriendToUI(friend) {
  const friendElement = document.createElement("div");
  friendElement.className = "user-link";
  friendElement.textContent = friend.username;
  friendElement.onclick = () => openChat(friend.username, "friend");
  usersDiv.appendChild(friendElement);
}

// Carregar as solicitações offline quando o usuário voltar online
window.addEventListener('online', () => {
  const offlineRequests = JSON.parse(localStorage.getItem('offlineRequests') || '[]');
  offlineRequests.forEach(request => {
    socket.emit('send friend request', request);
  });
  localStorage.removeItem('offlineRequests');
});

// Função para mostrar mensagem de feedback
function showFeedbackMessage(message, type) {
  const feedbackMessage = document.getElementById('feedbackMessage');
  feedbackMessage.textContent = message;
  feedbackMessage.style.display = "block";
  feedbackMessage.className = type; // 'success' ou 'error'
  
  // Esconder após 3 segundos
  setTimeout(() => {
    feedbackMessage.style.display = "none";
  }, 3000);
}

// Função para alternar a exibição do formulário de solicitações de amizade
function toggleFriendRequestsForm() {
  const friendRequestsForm = document.getElementById('friendRequestsForm');
  const isVisible = friendRequestsForm.style.display === 'block';
  
  // Alterna a visibilidade do formulário
  friendRequestsForm.style.display = isVisible ? 'none' : 'block';
  
  if (!isVisible) {
    displayFriendRequests();  // Carrega as solicitações de amizade ao exibir o formulário
  }
}

// Função para carregar as solicitações de amizade pendentes
function loadFriendRequests() {
  // Exemplo de como você pode obter as solicitações de amizade
  // Isso pode vir de uma variável global ou de um servidor
  // Aqui, estamos apenas simulando um conjunto de solicitações

  friendRequests = [
    { from: 'jose', to: 'meuUsuario' },
    { from: 'maria', to: 'meuUsuario' },
    { from: 'pedro', to: 'meuUsuario' }
  ];

  displayFriendRequests();  // Exibe as solicitações na UI
}

// Chamando loadFriendRequests para popular as solicitações ao iniciar o chat
loadFriendRequests();
