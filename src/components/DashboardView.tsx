import { useEffect, useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { api, formatDatePtBr, getTodayIsoDate } from '../lib/api';
import type { DashboardData } from '../types/library';

interface DashboardViewProps {
  onNavigate: (tab: 'livros' | 'emprestimos' | 'relatorios') => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [returningId, setReturningId] = useState<number | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError('');
    try {
      const response = await api.getDashboard();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar indicadores.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleQuickReturn(idEmprestimo: number) {
    setReturningId(idEmprestimo);
    try {
      await api.returnLoan(idEmprestimo, getTodayIsoDate());
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar devolução.');
    } finally {
      setReturningId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 bg-white border border-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 h-72 bg-white border border-slate-200 rounded-lg animate-pulse" />
          <div className="lg:col-span-7 h-72 bg-white border border-slate-200 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-white border border-red-200 rounded-lg text-sm text-red-800 flex items-center justify-between gap-4">
        <span>{error || 'Não foi possível carregar os dados do painel.'}</span>
        <button
          type="button"
          onClick={loadDashboard}
          className="px-4 py-2 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-800 rounded-md whitespace-nowrap shrink-0"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const maxLoans = Math.max(
    1,
    ...data.livrosMaisEmprestados.map((book) => book.total_emprestimos)
  );
  const today = getTodayIsoDate();

  return (
    <div className="space-y-8">
      {/* KPI Strip: Livros cadastrados, Empréstimos ativos, Usuários */}
      <section aria-label="Indicadores da Biblioteca" className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-slate-600">Livros cadastrados</span>
            <button
              type="button"
              onClick={() => onNavigate('livros')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
            >
              Gerenciar
            </button>
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 font-mono tabular-nums">
            {data.totalLivros}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {data.totalExemplares} exemplares disponíveis no acervo
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-slate-600">Empréstimos ativos</span>
            <button
              type="button"
              onClick={() => onNavigate('emprestimos')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
            >
              Registrar
            </button>
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 font-mono tabular-nums">
            {data.emprestimosAtivos}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {data.emprestimosAtrasados > 0
              ? `${data.emprestimosAtrasados} com devolução em atraso`
              : 'Nenhum empréstimo em atraso'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-slate-600">Usuários cadastrados</span>
            <span className="text-xs text-slate-500">Leitores e equipe</span>
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 font-mono tabular-nums">
            {data.totalUsuarios}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Contas habilitadas para empréstimo escolar
          </p>
        </div>
      </section>

      {/* Main Content Split: Ranking + Recent Loans */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Livros Mais Emprestados Preview */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Livros mais emprestados
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ranking histórico de circulação do acervo
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('relatorios')}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
            >
              <span>Relatórios</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {data.livrosMaisEmprestados.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Nenhum livro cadastrado ainda.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {data.livrosMaisEmprestados.map((book, index) => {
                const widthPercent = Math.round((book.total_emprestimos / maxLoans) * 100);
                return (
                  <div key={book.id_livro} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs font-mono text-slate-400 mr-2 tabular-nums">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="text-sm font-medium text-slate-900 truncate">
                          {book.titulo}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-medium text-slate-700 tabular-nums shrink-0">
                        {book.total_emprestimos} {book.total_emprestimos === 1 ? 'empréstimo' : 'empréstimos'}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-700 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(widthPercent, book.total_emprestimos > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{book.autor}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{book.quantidade_disponivel} em estoque</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Loans Table */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Movimentações recentes
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Últimos empréstimos e devoluções registrados
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('emprestimos')}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
            >
              <span>Ver histórico</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {data.emprestimosRecentes.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Nenhum empréstimo registrado até o momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                    <th className="py-2.5 px-4">Livro</th>
                    <th className="py-2.5 px-4">Usuário</th>
                    <th className="py-2.5 px-4">Previsão</th>
                    <th className="py-2.5 px-4">Situação</th>
                    <th className="py-2.5 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {data.emprestimosRecentes.map((loan) => {
                    const isOverdue =
                      loan.status === 'ATIVO' && loan.data_prevista_devolucao < today;
                    return (
                      <tr key={loan.id_emprestimo} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-900 max-w-[180px] truncate">
                          {loan.livro_titulo}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-[150px] truncate">
                          {loan.usuario_nome}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          {formatDatePtBr(loan.data_prevista_devolucao)}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium whitespace-nowrap">
                          {loan.status === 'DEVOLVIDO' ? (
                            <span className="text-emerald-700">Devolvido</span>
                          ) : isOverdue ? (
                            <span className="text-red-700">Em atraso</span>
                          ) : (
                            <span className="text-amber-700">Em aberto</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {loan.status === 'ATIVO' ? (
                            <button
                              type="button"
                              disabled={returningId === loan.id_emprestimo}
                              onClick={() => handleQuickReturn(loan.id_emprestimo)}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900 disabled:opacity-50 whitespace-nowrap"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{returningId === loan.id_emprestimo ? 'Salvando...' : 'Devolver'}</span>
                            </button>
                          ) : (
                            <span className="text-xs font-mono text-slate-400 tabular-nums">
                              {formatDatePtBr(loan.data_devolucao)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
