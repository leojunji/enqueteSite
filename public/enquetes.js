document.addEventListener("DOMContentLoaded", () => {
  const optionsContainer = document.getElementById("optionsContainer");
  const adicionarOpcao = document.getElementById("adicionarOpcao");
  const removerOpcao = document.getElementById("removerOpcao");

  let optionCount = 3;

  adicionarOpcao.addEventListener("click", () => {
    optionCount++;
    const newOptionDiv = document.createElement("div");
    newOptionDiv.classList.add("form-group");
    newOptionDiv.innerHTML = `
      <label for="opcao${optionCount}">Opção ${optionCount}:</label>
      <input type="text" id="opcao${optionCount}" name="opcao${optionCount}" placeholder="Descreva a opção" required>
    `;
    optionsContainer.appendChild(newOptionDiv);
  });

  removerOpcao.addEventListener("click", () => {
    if (optionCount > 3) {
      optionsContainer.removeChild(optionsContainer.lastChild);
      optionCount--;
    }
  });

  document
    .getElementById("enqueteForm")
    .addEventListener("submit", async (event) => {
      event.preventDefault();

      try {
        const titulo = document.getElementById("titulo").value.trim();
        let dataInicio = document.getElementById("dataInicio").value;
        let dataFim = document.getElementById("dataFim").value;

        const formatarData = (data) => {
          const d = new Date(data);
          return d.toISOString();
        };

        const dataInicioFormatada = formatarData(dataInicio);
        const dataFimFormatada = formatarData(dataFim);

        if (!titulo || !dataInicio || !dataFim) {
          alert("Preencha todos os campos obrigatórios.");
          return;
        }

        const dataInicioObj = new Date(dataInicio);
        const dataFimObj = new Date(dataFim);
        if (isNaN(dataInicioObj.getTime()) || isNaN(dataFimObj.getTime())) {
          alert("Datas inválidas. Por favor, insira datas válidas.");
          return;
        }

        if (dataFimObj < dataInicioObj) {
          [dataInicio, dataFim] = [dataFim, dataInicio];
          alert(
            "As datas foram trocadas para manter a lógica de início e fim."
          );
        }

        const opcoes = [];
        for (let i = 1; i <= optionCount; i++) {
          const opcao = document.getElementById(`opcao${i}`).value.trim();
          if (opcao) opcoes.push(opcao);
        }

        if (opcoes.length === 0) {
          alert("Adicione pelo menos uma opção.");
          return;
        }

        const data = { titulo, dataInicio, dataFim, opcoes };

        const response = await fetch("/criarEnquete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`Erro na resposta do servidor: ${response.status}`);
        }

        const result = await response.json();
        alert("Enquete salva com sucesso!");

        document.getElementById("enqueteForm").reset();
        while (optionsContainer.children.length > 3) {
          optionsContainer.removeChild(optionsContainer.lastChild);
        }
        optionCount = 3;
      } catch (error) {
        console.error("Erro ao salvar a enquete:", {
          mensagem: error.message || "Erro desconhecido",
          stack: error.stack || "Sem detalhes disponíveis",
          detalhe: error,
        });

        alert(
          "Ocorreu um erro ao salvar a enquete. Tente novamente mais tarde."
        );
      }
    });
});
