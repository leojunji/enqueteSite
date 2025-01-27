import express from "express";
import http from "http";
import mysql from "mysql2";
import cors from "cors";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT"],
  },
});

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "votaquest",
});

db.connect((err) => {
  if (err) throw err;
  console.log("Conectado ao banco de dados MySQL!");
});

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

//realiza o login de um usuáio temporário e armazena no LocalStorage
io.on("connection", (socket) => {
  console.log("Novo usuário conectado!");

  io.emit("newUserConnected");

  socket.on("getEnquetes", () => {
    const sql = `
      SELECT e.id, e.titulo, e.data_inicio, e.data_fim, o.id AS opcao_id, o.descricao_opcao, o.votos
      FROM enquete e
      JOIN opcoes o ON e.id = o.id_enquete
    `;

    db.query(sql, (err, rows) => {
      if (err) {
        console.error("Erro ao buscar enquetes:", err);
        return;
      }

      const enquetes = [];
      rows.forEach((row) => {
        const enquete = enquetes.find((e) => e.id === row.id);
        if (!enquete) {
          enquetes.push({
            id: row.id,
            titulo: row.titulo,
            data_inicio: row.data_inicio,
            data_fim: row.data_fim,
            opcoes: [
              {
                id: row.opcao_id,
                descricao_opcao: row.descricao_opcao,
                votos: row.votos,
              },
            ],
          });
        } else {
          enquete.opcoes.push({
            id: row.opcao_id,
            descricao_opcao: row.descricao_opcao,
            votos: row.votos,
          });
        }
      });

      socket.emit("enquetesData", enquetes);
    });
  });

  socket.on("updateVote", ({ opcaoId, votos }) => {
    const sql = "UPDATE opcoes SET votos = ? WHERE id = ?";

    db.query(sql, [votos, opcaoId], (err) => {
      if (err) {
        console.error("Erro ao atualizar votos:", err);
      } else {
        console.log(`Votos atualizados na opção ${opcaoId}`);

        io.emit("voteUpdated", { opcaoId, votos });
      }
    });
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado!");
  });
});

//pegar as enquetes armazenadas no DB
app.get("/getEnquetes", (req, res) => {
  const sql = `
    SELECT e.id, e.titulo, e.data_inicio, e.data_fim, o.id AS opcao_id, o.descricao_opcao, o.votos
    FROM enquete e
    JOIN opcoes o ON e.id = o.id_enquete
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Erro ao buscar enquetes:", err);
      return res.status(500).json({ error: "Erro ao buscar enquetes" });
    }

    const enquetes = [];
    rows.forEach((row) => {
      const enquete = enquetes.find((e) => e.id === row.id);
      if (!enquete) {
        enquetes.push({
          id: row.id,
          titulo: row.titulo,
          data_inicio: row.data_inicio,
          data_fim: row.data_fim,
          opcoes: [
            {
              id: row.opcao_id,
              descricao_opcao: row.descricao_opcao,
              votos: row.votos,
            },
          ],
        });
      } else {
        enquete.opcoes.push({
          id: row.opcao_id,
          descricao_opcao: row.descricao_opcao,
          votos: row.votos,
        });
      }
    });

    res.json(enquetes);
  });
});

//criar enquete
app.post("/criarEnquete", (req, res) => {
  const { titulo, dataInicio, dataFim, opcoes } = req.body;

  console.log("Dados recebidos:", req.body);

  if (!dataInicio || !dataFim) {
    return res
      .status(400)
      .json({ error: "As datas de início e fim são obrigatórias!" });
  }

  const dataInicioObj = new Date(dataInicio);
  const dataFimObj = new Date(dataFim);

  const dataInicioFormatada = dataInicioObj.toISOString().split("T")[0];
  const dataFimFormatada = dataFimObj.toISOString().split("T")[0];

  if (isNaN(dataInicioObj.getTime()) || isNaN(dataFimObj.getTime())) {
    return res.status(400).json({ error: "Datas inválidas fornecidas!" });
  }

  const insertEnqueteSql = `INSERT INTO enquete (titulo, data_inicio, data_fim) VALUES (?, ?, ?)`;

  db.query(insertEnqueteSql, [titulo, dataInicio, dataFim], (err, result) => {
    if (err) {
      console.error("Erro ao criar enquete:", err);
      return res.status(500).json({ error: "Erro ao criar enquete" });
    }

    const enqueteId = result.insertId; // Pega o ID da enquete recém-criada

    const insertOpcaoSql = `INSERT INTO opcoes (descricao_opcao, id_enquete) VALUES ?`;

    const opcoesValues = opcoes.map((descricao_opcao) => [
      descricao_opcao,
      enqueteId,
    ]);

    db.query(insertOpcaoSql, [opcoesValues], (err) => {
      if (err) {
        console.error("Erro ao criar opções:", err);
        return res.status(500).json({ error: "Erro ao criar opções" });
      }

      res.json({ message: "Enquete criada com sucesso!", enqueteId });
    });
  });
});

//atualizar a enquete via opacao "minhas enquetes"
app.put("/updateEnquete", (req, res) => {
  const { id, titulo, dataInicio, dataFim, opcoes } = req.body;

  const selectEnqueteSql =
    "SELECT data_inicio, data_fim FROM enquete WHERE id = ?";

  db.query(selectEnqueteSql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao consultar a enquete:", err);
      return res.status(500).json({ error: "Erro ao consultar a enquete" });
    }

    const originalDataInicio = results[0].data_inicio;
    const originalDataFim = results[0].data_fim;

    const updateEnqueteSql = `
      UPDATE enquete
      SET titulo = ?, data_inicio = ?, data_fim = ?
      WHERE id = ?
    `;

    console.log(
      "dataOrignalInicio: " +
        originalDataInicio +
        " dataNovaIniico: " +
        dataInicio
    );
    console.log(
      "dataOrignalFim: " + originalDataFim + " dataNovaFim: " + dataFim
    );

    db.query(
      updateEnqueteSql,
      [
        titulo,
        dataInicio !== originalDataInicio ? dataInicio : originalDataInicio,
        dataFim !== originalDataFim ? dataFim : originalDataFim,
        id,
      ],
      (err) => {
        if (err) {
          console.error("Erro ao atualizar enquete:", err);
          return res.status(500).json({ error: "Erro ao atualizar enquete" });
        }

        const deleteOpcoesSql = `DELETE FROM opcoes WHERE id_enquete = ?`;
        db.query(deleteOpcoesSql, [id], (err) => {
          if (err) {
            console.error("Erro ao limpar opções:", err);
            return res.status(500).json({ error: "Erro ao limpar opções" });
          }

          const insertOpcaoSql = `INSERT INTO opcoes (id_enquete, descricao_opcao, votos) VALUES (?, ?, 0)`;
          opcoes.forEach(({ descricao_opcao }) => {
            db.query(insertOpcaoSql, [id, descricao_opcao], (err) => {
              if (err) {
                console.error("Erro ao inserir opção:", err);
              }
            });
          });

          res.json({ message: "Enquete atualizada com sucesso!" });
        });
      }
    );
  });
});

//deletar a enquete via opacao "minhas enquetes"
app.delete("/deleteEnquete/:id", (req, res) => {
  const enqueteId = req.params.id;

  const deleteOpcoesSql = "DELETE FROM opcoes WHERE id_enquete = ?";
  db.query(deleteOpcoesSql, [enqueteId], (err) => {
    if (err) {
      console.error("Erro ao deletar opções:", err);
      return res.status(500).json({ error: "Erro ao deletar opções" });
    }

    const deleteEnqueteSql = "DELETE FROM enquete WHERE id = ?";
    db.query(deleteEnqueteSql, [enqueteId], (err) => {
      if (err) {
        console.error("Erro ao deletar enquete:", err);
        return res.status(500).json({ error: "Erro ao deletar enquete" });
      }

      res.json({ message: "Enquete deletada com sucesso!" });
    });
  });
});

app.use((err, req, res, next) => {
  console.error("Erro geral:", err);
  res.status(500).json({ error: "Erro no servidor" });
});

server.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
