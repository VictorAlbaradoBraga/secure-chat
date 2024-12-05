function showLogin() {
  document.getElementById("loginForm").classList.add("active");
  document.getElementById("registerForm").classList.remove("active");
  document.getElementById("loginTab").classList.add("active");
  document.getElementById("registerTab").classList.remove("active");
}

function showRegister() {
  document.getElementById("registerForm").classList.add("active");
  document.getElementById("loginForm").classList.remove("active");
  document.getElementById("registerTab").classList.add("active");
  document.getElementById("loginTab").classList.remove("active");
}

// Função para exibir mensagens de erro ou sucesso
function displayMessage(message, success = true) {
  alert(success ? `Sucesso: ${message}` : `Erro: ${message}`);
}

// Submissão do formulário de login
document.getElementById("loginForm").addEventListener("submit", async function (event) {
  event.preventDefault(); // Impede o envio padrão do formulário
  const username = document.getElementById("loginUsername").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const result = await response.json();
      displayMessage("Login realizado com sucesso!");
      sessionStorage.setItem("username", username);
      localStorage.setItem("accessToken", result.accessToken);

      window.location.href = `/chat/?token=${encodeURIComponent(result.accessToken)}`; // Redireciona para o sistema
    } else {
      displayMessage(result.message || "Erro ao logar", false);
    }
  } catch (error) {
    displayMessage("Erro de conexão com o servidor", false);
  }
});

// Submissão do formulário de registro
document.getElementById("registerForm").addEventListener("submit", async function (event) {
  event.preventDefault(); // Impede o envio padrão do formulário
  const username = document.getElementById("registerUsername").value;
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    displayMessage("As senhas não coincidem", false);
    return;
  }

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    if (response.ok) {
      displayMessage("Registro realizado com sucesso! Faça login.");
      showLogin(); // Alterna para o formulário de login
    } else {
      displayMessage(result.message || "Erro ao registrar", false);
    }
  } catch (error) {
    displayMessage("Erro de conexão com o servidor", false);
  }
});
