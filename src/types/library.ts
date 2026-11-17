export interface UserSummary {
  id_usuario: number;
  nome: string;
  email: string;
}

export interface Book {
  id_livro: number;
  titulo: string;
  autor: string;
  categoria: string;
  quantidade: number;
}

export type LoanStatus = 'ATIVO' | 'DEVOLVIDO';

export interface LoanRecord {
  id_emprestimo: number;
  data_emprestimo: string;
  data_prevista_devolucao: string;
  data_devolucao: string | null;
  status: LoanStatus;
  id_usuario: number;
  id_livro: number;
  usuario_nome: string;
  usuario_email: string;
  livro_titulo: string;
  livro_autor: string;
  livro_categoria: string;
  livro_quantidade_atual: number;
}

export interface MostBorrowedBook {
  id_livro: number;
  titulo: string;
  autor: string;
  categoria: string;
  quantidade_disponivel: number;
  total_emprestimos: number;
  emprestimos_ativos: number;
  emprestimos_devolvidos: number;
}

export interface DashboardData {
  totalLivros: number;
  totalExemplares: number;
  emprestimosAtivos: number;
  totalUsuarios: number;
  emprestimosAtrasados: number;
  livrosMaisEmprestados: MostBorrowedBook[];
  emprestimosRecentes: LoanRecord[];
}
