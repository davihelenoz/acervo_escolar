import crypto from 'node:crypto';
import path from 'node:path';
import express, { NextFunction, Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import db, { initializeDatabase, verifyPassword } from './server/db.ts';
import type { Book, LoanRecord, MostBorrowedBook, UserSummary } from './src/types/library.ts';

initializeDatabase();

const PORT = 3000;
const TOKEN_SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('acervo-escolar-biblioteca-secret-v1').digest('hex');

interface TokenPayload {
  id_usuario: number;
  nome: string;
  email: string;
  exp: number;
}

interface AuthenticatedRequest extends Request {
  authUser?: UserSummary;
}

function signToken(user: UserSummary): string {
  const payload: TokenPayload = {
    ...user,
    exp: Date.now() + 1000 * 60 * 60 * 12,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifyToken(token: string): UserSummary | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(encodedPayload)
    .digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as TokenPayload;
    if (parsed.exp < Date.now()) return null;
    return {
      id_usuario: parsed.id_usuario,
      nome: parsed.nome,
      email: parsed.email,
    };
  } catch {
    return null;
  }
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Sessão não autenticada. Faça login para continuar.' });
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: 'Sessão expirada ou inválida. Entre novamente.' });
    return;
  }
  req.authUser = user;
  next();
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getMostBorrowedBooks(): MostBorrowedBook[] {
  return db
    .prepare(`
      SELECT
        l.id_livro,
        l.titulo,
        l.autor,
        l.categoria,
        l.quantidade AS quantidade_disponivel,
        COUNT(e.id_emprestimo) AS total_emprestimos,
        SUM(CASE WHEN e.status = 'ATIVO' THEN 1 ELSE 0 END) AS emprestimos_ativos,
        SUM(CASE WHEN e.status = 'DEVOLVIDO' THEN 1 ELSE 0 END) AS emprestimos_devolvidos
      FROM Livro l
      LEFT JOIN Emprestimo e ON e.id_livro = l.id_livro
      GROUP BY l.id_livro, l.titulo, l.autor, l.categoria, l.quantidade
      ORDER BY total_emprestimos DESC, l.titulo ASC
    `)
    .all() as MostBorrowedBook[];
}

function getLoans(statusFilter?: string): LoanRecord[] {
  const baseQuery = `
    SELECT
      e.id_emprestimo,
      e.data_emprestimo,
      e.data_prevista_devolucao,
      e.data_devolucao,
      e.status,
      e.id_usuario,
      e.id_livro,
      u.nome AS usuario_nome,
      u.email AS usuario_email,
      l.titulo AS livro_titulo,
      l.autor AS livro_autor,
      l.categoria AS livro_categoria,
      l.quantidade AS livro_quantidade_atual
    FROM Emprestimo e
    INNER JOIN Usuario u ON u.id_usuario = e.id_usuario
    INNER JOIN Livro l ON l.id_livro = e.id_livro
  `;
  if (statusFilter === 'ATIVO' || statusFilter === 'DEVOLVIDO') {
    return db
      .prepare(`${baseQuery} WHERE e.status = ? ORDER BY e.id_emprestimo DESC`)
      .all(statusFilter) as LoanRecord[];
  }
  return db.prepare(`${baseQuery} ORDER BY e.id_emprestimo DESC`).all() as LoanRecord[];
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Authentication endpoints
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';

    if (!email || !senha) {
      res.status(400).json({ error: 'Informe o e-mail e a senha para entrar.' });
      return;
    }

    const userRow = db
      .prepare('SELECT id_usuario, nome, email, senha FROM Usuario WHERE lower(email) = ?')
      .get(email) as { id_usuario: number; nome: string; email: string; senha: string } | undefined;

    if (!userRow || !verifyPassword(senha, userRow.senha)) {
      res.status(401).json({ error: 'E-mail ou senha inválidos. Acesso negado.' });
      return;
    }

    const user: UserSummary = {
      id_usuario: userRow.id_usuario,
      nome: userRow.nome,
      email: userRow.email,
    };
    const token = signToken(user);
    res.json({ token, user });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: req.authUser });
  });

  // Dashboard summary
  app.get('/api/dashboard', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    const booksAgg = db
      .prepare('SELECT COUNT(*) AS totalLivros, COALESCE(SUM(quantidade), 0) AS totalExemplares FROM Livro')
      .get() as { totalLivros: number; totalExemplares: number };

    const activeLoansRow = db
      .prepare("SELECT COUNT(*) AS total FROM Emprestimo WHERE status = 'ATIVO'")
      .get() as { total: number };

    const overdueLoansRow = db
      .prepare("SELECT COUNT(*) AS total FROM Emprestimo WHERE status = 'ATIVO' AND data_prevista_devolucao < ?")
      .get(getTodayIso()) as { total: number };

    const usersRow = db
      .prepare('SELECT COUNT(*) AS total FROM Usuario')
      .get() as { total: number };

    res.json({
      totalLivros: booksAgg.totalLivros,
      totalExemplares: booksAgg.totalExemplares,
      emprestimosAtivos: activeLoansRow.total,
      emprestimosAtrasados: overdueLoansRow.total,
      totalUsuarios: usersRow.total,
      livrosMaisEmprestados: getMostBorrowedBooks().slice(0, 5),
      emprestimosRecentes: getLoans().slice(0, 6),
    });
  });

  // Users (read-only list without passwords)
  app.get('/api/usuarios', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    const users = db
      .prepare('SELECT id_usuario, nome, email FROM Usuario ORDER BY nome ASC')
      .all() as UserSummary[];
    res.json(users);
  });

  // Books CRUD + search
  app.get('/api/livros', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const categoria = typeof req.query.categoria === 'string' ? req.query.categoria.trim() : '';

    let sql = 'SELECT id_livro, titulo, autor, categoria, quantidade FROM Livro WHERE 1=1';
    const params: string[] = [];

    if (query) {
      sql += ' AND (lower(titulo) LIKE ? OR lower(autor) LIKE ? OR lower(categoria) LIKE ?)';
      const likeTerm = `%${query.toLowerCase()}%`;
      params.push(likeTerm, likeTerm, likeTerm);
    }

    if (categoria && categoria !== 'TODAS') {
      sql += ' AND categoria = ?';
      params.push(categoria);
    }

    sql += ' ORDER BY id_livro DESC';
    const books = db.prepare(sql).all(...params) as Book[];
    res.json(books);
  });

  app.post('/api/livros', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const titulo = typeof req.body?.titulo === 'string' ? req.body.titulo.trim() : '';
    const autor = typeof req.body?.autor === 'string' ? req.body.autor.trim() : '';
    const categoria = typeof req.body?.categoria === 'string' ? req.body.categoria.trim() : '';
    const quantidade = Number(req.body?.quantidade);

    if (!titulo || !autor || !categoria) {
      res.status(400).json({ error: 'Preencha todos os campos obrigatórios: Título, Autor e Categoria.' });
      return;
    }

    if (!Number.isInteger(quantidade) || quantidade < 0) {
      res.status(400).json({ error: 'A quantidade disponível deve ser um número inteiro maior ou igual a zero.' });
      return;
    }

    const result = db
      .prepare('INSERT INTO Livro (titulo, autor, categoria, quantidade) VALUES (?, ?, ?, ?)')
      .run(titulo, autor, categoria, quantidade);

    const created = db
      .prepare('SELECT id_livro, titulo, autor, categoria, quantidade FROM Livro WHERE id_livro = ?')
      .get(result.lastInsertRowid) as Book;

    res.status(201).json(created);
  });

  app.put('/api/livros/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Identificador de livro inválido.' });
      return;
    }

    const titulo = typeof req.body?.titulo === 'string' ? req.body.titulo.trim() : '';
    const autor = typeof req.body?.autor === 'string' ? req.body.autor.trim() : '';
    const categoria = typeof req.body?.categoria === 'string' ? req.body.categoria.trim() : '';
    const quantidade = Number(req.body?.quantidade);

    if (!titulo || !autor || !categoria) {
      res.status(400).json({ error: 'Preencha todos os campos obrigatórios: Título, Autor e Categoria.' });
      return;
    }

    if (!Number.isInteger(quantidade) || quantidade < 0) {
      res.status(400).json({ error: 'A quantidade disponível deve ser um número inteiro maior ou igual a zero.' });
      return;
    }

    const existing = db.prepare('SELECT id_livro FROM Livro WHERE id_livro = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: 'Livro não encontrado no acervo.' });
      return;
    }

    db.prepare('UPDATE Livro SET titulo = ?, autor = ?, categoria = ?, quantidade = ? WHERE id_livro = ?').run(
      titulo,
      autor,
      categoria,
      quantidade,
      id
    );

    const updated = db
      .prepare('SELECT id_livro, titulo, autor, categoria, quantidade FROM Livro WHERE id_livro = ?')
      .get(id) as Book;

    res.json(updated);
  });

  app.delete('/api/livros/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Identificador de livro inválido.' });
      return;
    }

    const existing = db.prepare('SELECT id_livro FROM Livro WHERE id_livro = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: 'Livro não encontrado no acervo.' });
      return;
    }

    const activeLoans = db
      .prepare("SELECT COUNT(*) AS total FROM Emprestimo WHERE id_livro = ? AND status = 'ATIVO'")
      .get(id) as { total: number };

    if (activeLoans.total > 0) {
      res.status(409).json({
        error: 'Não é possível excluir este livro porque existem empréstimos ativos vinculados a ele.',
      });
      return;
    }

    const totalLoans = db
      .prepare('SELECT COUNT(*) AS total FROM Emprestimo WHERE id_livro = ?')
      .get(id) as { total: number };

    if (totalLoans.total > 0) {
      res.status(409).json({
        error: 'Este livro possui histórico de empréstimos registrados. Para preservar a auditoria, ajuste a quantidade para 0 em vez de excluir.',
      });
      return;
    }

    db.prepare('DELETE FROM Livro WHERE id_livro = ?').run(id);
    res.json({ deleted: true, id_livro: id });
  });

  // Loans management
  app.get('/api/emprestimos', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
    res.json(getLoans(status));
  });

  app.post('/api/emprestimos', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const idUsuario = Number(req.body?.id_usuario);
    const idLivro = Number(req.body?.id_livro);
    const dataEmprestimo = typeof req.body?.data_emprestimo === 'string' ? req.body.data_emprestimo.trim() : '';
    const dataPrevista =
      typeof req.body?.data_prevista_devolucao === 'string' ? req.body.data_prevista_devolucao.trim() : '';

    if (!Number.isInteger(idUsuario) || idUsuario <= 0 || !Number.isInteger(idLivro) || idLivro <= 0) {
      res.status(400).json({ error: 'Selecione o usuário e o livro para registrar o empréstimo.' });
      return;
    }

    if (!dataEmprestimo || !dataPrevista) {
      res.status(400).json({ error: 'Informe a data do empréstimo e a data prevista para devolução.' });
      return;
    }

    if (dataPrevista < dataEmprestimo) {
      res.status(400).json({ error: 'A data prevista para devolução não pode ser anterior à data do empréstimo.' });
      return;
    }

    try {
      const createdLoanId = db.transaction(() => {
        const userExists = db.prepare('SELECT id_usuario FROM Usuario WHERE id_usuario = ?').get(idUsuario);
        if (!userExists) {
          throw new Error('NOT_FOUND:Usuário selecionado não foi encontrado.');
        }

        const bookRow = db
          .prepare('SELECT id_livro, titulo, quantidade FROM Livro WHERE id_livro = ?')
          .get(idLivro) as { id_livro: number; titulo: string; quantidade: number } | undefined;

        if (!bookRow) {
          throw new Error('NOT_FOUND:Livro selecionado não foi encontrado.');
        }

        if (bookRow.quantidade <= 0) {
          throw new Error(
            `NO_STOCK:Operação bloqueada — o livro "${bookRow.titulo}" está sem estoque disponível no momento.`
          );
        }

        const insertResult = db
          .prepare(`
            INSERT INTO Emprestimo (
              data_emprestimo,
              data_prevista_devolucao,
              data_devolucao,
              status,
              id_usuario,
              id_livro
            ) VALUES (?, ?, NULL, 'ATIVO', ?, ?)
          `)
          .run(dataEmprestimo, dataPrevista, idUsuario, idLivro);

        db.prepare('UPDATE Livro SET quantidade = quantidade - 1 WHERE id_livro = ?').run(idLivro);
        return insertResult.lastInsertRowid;
      })();

      const created = getLoans().find((loan) => loan.id_emprestimo === Number(createdLoanId));
      res.status(201).json(created);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao registrar empréstimo.';
      if (message.startsWith('NO_STOCK:')) {
        res.status(400).json({ error: message.replace('NO_STOCK:', '') });
        return;
      }
      if (message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ error: message.replace('NOT_FOUND:', '') });
        return;
      }
      res.status(500).json({ error: 'Erro interno ao registrar empréstimo.' });
    }
  });

  app.patch('/api/emprestimos/:id/devolver', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const idEmprestimo = Number(req.params.id);
    if (!Number.isInteger(idEmprestimo) || idEmprestimo <= 0) {
      res.status(400).json({ error: 'Identificador de empréstimo inválido.' });
      return;
    }

    const returnDate =
      typeof req.body?.data_devolucao === 'string' && req.body.data_devolucao.trim()
        ? req.body.data_devolucao.trim()
        : getTodayIso();

    try {
      db.transaction(() => {
        const loanRow = db
          .prepare('SELECT id_emprestimo, id_livro, status FROM Emprestimo WHERE id_emprestimo = ?')
          .get(idEmprestimo) as { id_emprestimo: number; id_livro: number; status: string } | undefined;

        if (!loanRow) {
          throw new Error('NOT_FOUND:Empréstimo não encontrado.');
        }

        if (loanRow.status === 'DEVOLVIDO') {
          throw new Error('ALREADY_RETURNED:Este empréstimo já foi devolvido anteriormente.');
        }

        db.prepare("UPDATE Emprestimo SET status = 'DEVOLVIDO', data_devolucao = ? WHERE id_emprestimo = ?").run(
          returnDate,
          idEmprestimo
        );
        db.prepare('UPDATE Livro SET quantidade = quantidade + 1 WHERE id_livro = ?').run(loanRow.id_livro);
      })();

      const updated = getLoans().find((loan) => loan.id_emprestimo === idEmprestimo);
      res.json(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao registrar devolução.';
      if (message.startsWith('NOT_FOUND:')) {
        res.status(404).json({ error: message.replace('NOT_FOUND:', '') });
        return;
      }
      if (message.startsWith('ALREADY_RETURNED:')) {
        res.status(409).json({ error: message.replace('ALREADY_RETURNED:', '') });
        return;
      }
      res.status(500).json({ error: 'Erro interno ao registrar devolução.' });
    }
  });

  // Reports & Extra Challenge: Most Borrowed Books
  app.get('/api/relatorios/mais-emprestados', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      ranking: getMostBorrowedBooks(),
      historico: getLoans(),
    });
  });

  // Mount Vite middleware in dev, or serve built dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Acervo Escolar server running at http://localhost:${PORT}`);
  });
}

startServer();
