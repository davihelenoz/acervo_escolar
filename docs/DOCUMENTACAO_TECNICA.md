# Documentação Técnica — Sistema de Biblioteca Escolar (Acervo Escolar)

## 1. Lista de Requisitos Funcionais

| Código | Requisito Funcional | Descrição |
| --- | --- | --- |
| RF01 | Autenticação de usuários | O sistema deve permitir o login mediante e-mail e senha cadastrados, validando campos obrigatórios e exibindo mensagem de erro para credenciais inválidas. |
| RF02 | Painel principal (Dashboard) | O sistema deve exibir indicadores consolidados: quantidade de livros cadastrados, empréstimos ativos e usuários registrados. |
| RF03 | Cadastro de livros | O sistema deve permitir cadastrar novos livros informando título, autor, categoria e quantidade disponível maior ou igual a zero. |
| RF04 | Consulta e pesquisa de livros | O sistema deve permitir pesquisar livros por título, autor ou categoria em tempo real. |
| RF05 | Edição de livros | O sistema deve permitir alterar os dados e o estoque de livros existentes, mantendo a regra de quantidade >= 0. |
| RF06 | Exclusão de livros | O sistema deve permitir excluir livros do acervo, bloqueando a exclusão caso existam empréstimos ativos vinculados ao exemplar. |
| RF07 | Registro de empréstimos | O sistema deve permitir registrar empréstimos selecionando usuário, livro, data de empréstimo e data prevista para devolução. |
| RF08 | Controle automático de estoque | O sistema deve impedir empréstimos de livros com quantidade disponível igual a zero e decrementar/incrementar o estoque automaticamente ao emprestar e devolver. |
| RF09 | Registro de devoluções e histórico | O sistema deve permitir registrar a devolução de empréstimos ativos e consultar o histórico completo de empréstimos. |
| RF10 | Relatórios e ranking de acervo | O sistema deve gerar relatórios de empréstimos (com exportação CSV) e apresentar o ranking dos livros mais emprestados da biblioteca. |

## 2. Diagrama Entidade-Relacionamento (DER)

- **Usuario** (`id_usuario` PK, `nome`, `email`, `senha`) — `1 : N` — **Emprestimo**
- **Livro** (`id_livro` PK, `titulo`, `autor`, `categoria`, `quantidade`) — `1 : N` — **Emprestimo**
- **Emprestimo** (`id_emprestimo` PK, `data_emprestimo`, `data_prevista_devolucao`, `data_devolucao`, `id_usuario` FK, `id_livro` FK)

## 3. Script SQL

Ver arquivo `database/biblioteca_escolar.sql`.

## 4. Casos de Teste de Software

| ID | Cenário | Pré-condição | Resultado Esperado |
| --- | --- | --- | --- |
| CT01 | Login válido | Usuário cadastrado (`ana.mendes@escola.edu.br` / `biblioteca123`) | Acesso liberado ao painel principal |
| CT02 | Login inválido | E-mail ou senha incorretos | Acesso negado e mensagem de erro exibida |
| CT03 | Cadastro de livro válido | Usuário autenticado; quantidade >= 0 | Livro salvo no banco e exibido na listagem |
| CT04 | Empréstimo com estoque | Livro com `quantidade >= 1` | Empréstimo registrado e estoque decrementado em 1 |
| CT05 | Empréstimo sem estoque | Livro com `quantidade = 0` (`Vidas Secas`) | Operação bloqueada com mensagem de estoque indisponível |
| CT06 | Registro de devolução | Empréstimo ativo | `data_devolucao` preenchida e estoque incrementado em 1 |
| CT07 | Quantidade negativa no cadastro | Usuário tenta salvar livro com `quantidade = -1` | Validação bloqueia o envio |

## 5. Requisitos de Infraestrutura

- **Hardware**: Processador Dual Core ou superior, 4 GB RAM, 20 GB armazenamento.
- **Software**: Navegador Web moderno, Banco de Dados Relacional (MySQL, PostgreSQL ou SQLite embarcado), Servidor Web Node.js/Express.
- **Rede**: Acesso à Internet e/ou rede local (LAN) da escola.
