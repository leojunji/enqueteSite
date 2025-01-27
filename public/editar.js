document.addEventListener("DOMContentLoaded", () => {
  const optionsContainer = document.getElementById("optionsContainer");
  const anteriorBtn = document.getElementById("anterior");
  const proximoBtn = document.getElementById("proximo");
  const form = document.getElementById("enqueteForm");
  const adicionarOpcaoBtn = document.getElementById("adicionarOpcao");
  const removerOpcaoBtn = document.getElementById("removerOpcao");
  const deletarBtn = document.getElementById("deletar");

  let enquetes = [];
  let currentEnqueteIndex = 0;

  async function loadEnquetes() {
    try {
      const response = await fetch("/getEnquetes");
      if (!response.ok) throw new Error("Erro ao carregar enquetes");

      enquetes = await response.json();
      if (enquetes.length === 0) {
        alert("Não há enquetes disponíveis para editar.");
      } else {
        showEnquete(enquetes[currentEnqueteIndex]);
      }
    } catch (error) {
      console.error(error);
    }
  }

  function showEnquete(enquete) {
    document.getElementById("titulo").value = enquete.titulo;

    const dataInicioObj = new Date(enquete.data_inicio);
    const dataFimObj = new Date(enquete.data_fim);

    document.getElementById("dataInicio").value = dataInicioObj
      .toISOString()
      .slice(0, 16);
    document.getElementById("dataFim").value = dataFimObj
      .toISOString()
      .slice(0, 16);

    optionsContainer.innerHTML = "";
    enquete.opcoes.forEach((opcao, index) => {
      const div = document.createElement("div");
      div.classList.add("form-group");
      div.innerHTML = `
        <label for="opcao${index + 1}">Opção ${index + 1}:</label>
        <input type="text" id="opcao${index + 1}" name="opcao${
        index + 1
      }" value="${opcao.descricao_opcao}" required />
      `;
      optionsContainer.appendChild(div);
    });
  }

  proximoBtn.addEventListener("click", () => {
    if (currentEnqueteIndex < enquetes.length - 1) {
      currentEnqueteIndex++;
      showEnquete(enquetes[currentEnqueteIndex]);
    }
  });

  anteriorBtn.addEventListener("click", () => {
    if (currentEnqueteIndex > 0) {
      currentEnqueteIndex--;
      showEnquete(enquetes[currentEnqueteIndex]);
    }
  });

  adicionarOpcaoBtn.addEventListener("click", () => {
    const index = optionsContainer.children.length + 1;
    const div = document.createElement("div");
    div.classList.add("form-group");
    div.innerHTML = `
      <label for="opcao${index}">Opção ${index}:</label>
      <input type="text" id="opcao${index}" name="opcao${index}" required />
    `;
    optionsContainer.appendChild(div);
  });

  removerOpcaoBtn.addEventListener("click", () => {
    const lastOption = optionsContainer.lastElementChild;
    if (lastOption) {
      optionsContainer.removeChild(lastOption);
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const dataInicio = document.getElementById("dataInicio").value;
    const dataFim = document.getElementById("dataFim").value;

    const updatedEnquete = {
      ...enquetes[currentEnqueteIndex],
      titulo: document.getElementById("titulo").value,
      dataInicio: dataInicio,
      dataFim: dataFim,
      opcoes: Array.from(optionsContainer.children).map((child, index) => ({
        descricao_opcao: child.querySelector(`#opcao${index + 1}`).value,
      })),
    };

    try {
      const response = await fetch("/updateEnquete", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedEnquete),
      });

      if (!response.ok) throw new Error("Erro ao atualizar enquete");

      alert("Enquete atualizada com sucesso!");
    } catch (error) {
      console.error(error);
    }
  });

  deletarBtn.addEventListener("click", async () => {
    const enqueteId = enquetes[currentEnqueteIndex].id;

    try {
      const response = await fetch(`/deleteEnquete/${enqueteId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erro ao deletar enquete");

      alert("Enquete deletada com sucesso!");
      enquetes.splice(currentEnqueteIndex, 1);
      currentEnqueteIndex = Math.max(currentEnqueteIndex - 1, 0);

      if (enquetes.length > 0) {
        showEnquete(enquetes[currentEnqueteIndex]);
      } else {
        optionsContainer.innerHTML = "";
        document.getElementById("titulo").value = "";
        document.getElementById("dataInicio").value = "";
        document.getElementById("dataFim").value = "";
        alert("Não há mais enquetes disponíveis.");
      }
    } catch (error) {
      console.error(error);
    }
  });

  loadEnquetes();
});
