let enquetes = [];
let currentEnqueteIndex = 0;
let currentVoteIndex = null;
let userVotes = {};
let tempUserId = localStorage.getItem("tempUserId");

if (!tempUserId) {
  tempUserId = "user_" + new Date().getTime();
  localStorage.setItem("tempUserId", tempUserId);
}

console.log("ID do usuário temporário:", tempUserId);

const socket = io("http://localhost:3000");

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.querySelector(".logout-btn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("userVotes");
      localStorage.removeItem("tempUserId");

      tempUserId = "user_" + new Date().getTime();
      localStorage.setItem("tempUserId", tempUserId);

      console.log("Novo ID de usuário temporário:", tempUserId);

      window.location.reload();
    });
  }

  console.log("Novo usuário conectado!");

  socket.emit("getEnquetes");

  socket.on("enquetesData", (data) => {
    console.log("Dados recebidos:", data);
    enquetes = data;
    renderEnquete(currentEnqueteIndex);
  });

  socket.on("voteUpdated", ({ opcaoId, votos }) => {
    const voteElement = document.querySelector(
      `.vote-container[data-opcao-id="${opcaoId}"] .vote-count`
    );
    if (voteElement) {
      voteElement.textContent = votos;
    }
  });

  document.getElementById("arrowRight").addEventListener("click", (event) => {
    event.preventDefault();
    currentEnqueteIndex++;
    if (currentEnqueteIndex >= enquetes.length) {
      currentEnqueteIndex = 0;
    }
    renderEnquete(currentEnqueteIndex);
  });

  document.getElementById("arrowLeft").addEventListener("click", (event) => {
    event.preventDefault();
    currentEnqueteIndex--;
    if (currentEnqueteIndex < 0) {
      currentEnqueteIndex = enquetes.length - 1;
    }
    renderEnquete(currentEnqueteIndex);
  });
});

function renderEnquete(index) {
  if (enquetes.length === 0) {
    return;
  }

  const enquete = enquetes[index];
  const container = document.getElementById("optionsContainer");

  container.innerHTML = "";

  const title = document.querySelector("h1");
  title.textContent = enquete.titulo;

  const dataInicio = new Date(enquete.data_inicio);
  const dataFim = new Date(enquete.data_fim);
  const dataEnquete = document.getElementById("data-enquete");

  dataEnquete.textContent = `Início: ${dataInicio.toLocaleDateString(
    "pt-BR"
  )} | Fim: ${dataFim.toLocaleDateString("pt-BR")}`;

  const currentDate = new Date();

  const currentTimestamp =
    currentDate.getFullYear() * 10000 +
    (currentDate.getMonth() + 1) * 100 +
    currentDate.getDate();

  const dataInicioTimestamp =
    dataInicio.getFullYear() * 10000 +
    (dataInicio.getMonth() + 1) * 100 +
    dataInicio.getDate();
  const dataFimTimestamp =
    dataFim.getFullYear() * 10000 +
    (dataFim.getMonth() + 1) * 100 +
    dataFim.getDate();

  const isActive =
    currentTimestamp >= dataInicioTimestamp &&
    currentTimestamp <= dataFimTimestamp;

  console.log("dataInicio: " + dataInicio);

  console.log("dataFIm: " + dataFim);

  console.log("ativooooooo: " + isActive);

  enquete.opcoes.forEach((opcao, i) => {
    const voteContainer = document.createElement("div");
    voteContainer.classList.add("vote-container");
    voteContainer.setAttribute("data-opcao-id", opcao.id);

    const votarBtn = document.createElement("button");
    votarBtn.classList.add("votar-btn");
    votarBtn.textContent = "Votar";

    const input = document.createElement("input");
    input.classList.add("opcao-input");
    input.type = "text";
    input.value = opcao.descricao_opcao;
    input.disabled = true;

    const voteCount = document.createElement("div");
    voteCount.classList.add("vote-count");
    voteCount.textContent = opcao.votos || 0;

    voteContainer.appendChild(votarBtn);
    voteContainer.appendChild(input);
    voteContainer.appendChild(voteCount);

    container.appendChild(voteContainer);

    const userVote = userVotes[currentEnqueteIndex];

    if (userVote !== undefined && userVote === i) {
      votarBtn.style.backgroundColor = "purple";
      votarBtn.disabled = true;
    } else {
      if (isActive) {
        votarBtn.style.backgroundColor = "green";
        votarBtn.disabled = false;
      } else {
        votarBtn.style.backgroundColor = "lightgreen";
        votarBtn.disabled = true;
        votarBtn.style.opacity = 0.5;
      }
    }

    votarBtn.addEventListener("click", () => {
      const previousVote = userVotes[currentEnqueteIndex];

      if (previousVote !== undefined && previousVote !== i) {
        const previousVoteBtn =
          container.children[previousVote].querySelector("button");
        previousVoteBtn.style.backgroundColor = "green";
        previousVoteBtn.disabled = false;

        const previousVoteOption =
          enquetes[currentEnqueteIndex].opcoes[previousVote];
        if (previousVoteOption.votos > 0) {
          previousVoteOption.votos--;
        }

        socket.emit("updateVote", {
          opcaoId: previousVoteOption.id,
          votos: previousVoteOption.votos,
        });

        const previousVoteCount =
          container.children[previousVote].querySelector(".vote-count");
        previousVoteCount.textContent = previousVoteOption.votos;
      }

      votarBtn.style.backgroundColor = "purple";
      votarBtn.disabled = true;

      const currentOption = enquetes[currentEnqueteIndex].opcoes[i];
      if (currentOption.votos >= 0) {
        currentOption.votos++;
        socket.emit("updateVote", {
          opcaoId: currentOption.id,
          votos: currentOption.votos,
        });

        voteCount.textContent = currentOption.votos;
      }

      userVotes[currentEnqueteIndex] = i;
      localStorage.setItem("userVotes", JSON.stringify(userVotes));
    });
  });

  if (!isActive) {
    const allVoteBtns = document.querySelectorAll(".votar-btn");
    allVoteBtns.forEach((btn) => {
      btn.disabled = true;
      btn.style.backgroundColor = "lightgray";
    });
  }
}

function loadUserVotes() {
  const storedVotes = localStorage.getItem("userVotes");
  if (storedVotes) {
    userVotes = JSON.parse(storedVotes);
  }
}

loadUserVotes();
