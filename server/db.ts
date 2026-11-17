import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'biblioteca.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) {
    return password === storedHash;
  }
  const [salt, keyHex] = parts;
  const keyBuffer = Buffer.from(keyHex, 'hex');
  const derivedBuffer = crypto.scryptSync(password, salt, 64);
  if (keyBuffer.length !== derivedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
}

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS Usuario (
      id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
      nome       TEXT NOT NULL,
      email      TEXT NOT NULL UNIQUE,
      senha      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Livro (
      id_livro   INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo     TEXT NOT NULL,
      autor      TEXT NOT NULL,
      categoria  TEXT NOT NULL,
      quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0)
    );

    CREATE TABLE IF NOT EXISTS Emprestimo (
      id_emprestimo           INTEGER PRIMARY KEY AUTOINCREMENT,
      data_emprestimo         TEXT NOT NULL,
      data_prevista_devolucao TEXT NOT NULL,
      data_devolucao          TEXT NULL,
      status                  TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'DEVOLVIDO')),
      id_usuario              INTEGER NOT NULL,
      id_livro                INTEGER NOT NULL,
      FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE RESTRICT,
      FOREIGN KEY (id_livro)   REFERENCES Livro(id_livro)   ON DELETE RESTRICT
    );
  `);

  const userCountRow = db.prepare('SELECT COUNT(*) as total FROM Usuario').get() as { total: number };
  if (userCountRow.total === 0) {
    const seedTransaction = db.transaction(() => {
      const insertUser = db.prepare(
        'INSERT INTO Usuario (nome, email, senha) VALUES (?, ?, ?)'
      );
      insertUser.run('Ana Clara Mendes', 'ana.mendes@escola.edu.br', hashPassword('biblioteca123'));
      insertUser.run('Carlos Eduardo Silva', 'carlos.silva@escola.edu.br', hashPassword('aluno123'));
      insertUser.run('Mariana Oliveira', 'mariana.oliveira@escola.edu.br', hashPassword('aluno123'));

      const insertBook = db.prepare(
        'INSERT INTO Livro (titulo, autor, categoria, quantidade) VALUES (?, ?, ?, ?)'
      );
      insertBook.run('Dom Casmurro', 'Machado de Assis', 'Literatura Brasileira', 4);
      insertBook.run('Capitães da Areia', 'Jorge Amado', 'Literatura Brasileira', 2);
      insertBook.run('O Pequeno Príncipe', 'Antoine de Saint-Exupéry', 'Ficção Juvenil', 5);
      insertBook.run('Vidas Secas', 'Graciliano Ramos', 'Literatura Brasileira', 0);
      insertBook.run('Código Limpo (Clean Code)', 'Robert C. Martin', 'Tecnologia', 3);

      const insertLoan = db.prepare(`
        INSERT INTO Emprestimo (
          data_emprestimo,
          data_prevista_devolucao,
          data_devolucao,
          status,
          id_usuario,
          id_livro
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertLoan.run('2026-10-10', '2026-10-17', '2026-10-16', 'DEVOLVIDO', 2, 1);
      insertLoan.run('2026-10-18', '2026-10-25', '2026-10-24', 'DEVOLVIDO', 3, 2);
      insertLoan.run('2026-10-28', '2026-11-04', '2026-11-03', 'DEVOLVIDO', 2, 1);
      insertLoan.run('2026-11-10', '2026-11-17', null, 'ATIVO', 3, 4);
      insertLoan.run('2026-11-12', '2026-11-19', null, 'ATIVO', 2, 2);
    });

    seedTransaction();
  }
}

export default db;
