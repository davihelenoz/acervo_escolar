import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { api, formatDatePtBr, getTodayIsoDate } from '../lib/api';
import type { LoanRecord, MostBorrowedBook } from '../types/library';

export function ReportsView() {
  const [ranking, setRanking] = useState<MostBorrowedBook[]>([]);
  const [historico, setHistorico] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportFilter, setReportFilter] = useState<'TODOS' | 'ATIVO' | 'DEVOLVIDO' | 'ATRASADO'>('TODOS');

  async function loadReports() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getReports();
      setRanking(data.ranking);
      setHistorico(data.historico);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar relatórios.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  const today = getTodayIsoDate();

  const filteredHistory = useMemo(() => {
    return historico.filter((loan) => {
      if (reportFilter === 'TODOS') return true;
      if (reportFilter === 'ATIVO') return loan.status === 'ATIVO';
      if (reportFilter === 'DEVOLVIDO') return loan.status === 'DEVOLVIDO';
      return loan.status === 'ATIVO' && loan.data_prevista_devolucao < today;
    });
  }, [historico, reportFilter, today]);

  function exportCsv() {
    const header = [
      'ID Emprestimo',
      'Livro',
      'Autor',
      'Usuario',
      'E-mail',
      'Data Emprestimo',
      'Previsao Devolucao',
      'Data Devolucao',
      'Status',
    ];
    const rows = filteredHistory.map((item) => [
      String(item.id_emprestimo),
      `"${item.livro_titulo.replace(/"/g, '""')}"`,
      `"${item.livro_autor.replace(/"/g, '""')}"`,
      `"${item.usuario_nome.replace(/"/g, '""')}"`,
      item.usuario_email,
      item.data_emprestimo,
      item.data_prevista_devolucao,
      item.data_devolucao ?? '',
      item.status,
    ]);
    const csvContent = '\uFEFF' + [header.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_emprestimos_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-72 bg-white border border-slate-200 rounded-lg animate-pulse" />
        <div className="h-72 bg-white border border-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white border border-red-200 rounded-lg text-sm text-red-800 flex items-center justify-between">
        <span>{error}</span>
        <button
          type="button"
          onClick={loadReports}
          className="px-4 py-2 text-xs font-medium bg-red-50 hover:bg-red-100 rounded-md whitespace-nowrap"
        >
          Recarregar
        </button>
      </div>
    );
  }

  const maxLoans = Math.max(1, ...ranking.map((r) => r.total_emprestimos));

  return (
    <div className="space-y-8">
      {/* Extra Challenge: Most Borrowed Books Report */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Livros mais emprestados da biblioteca
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranking consolidado de circulação por título (histórico completo de empréstimos ativos e devolvidos)
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {ranking.reduce((acc, item) => acc + item.total_emprestimos, 0)} empréstimos totais
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                <th className="py-3 px-4">Posição</th>
                <th className="py-3 px-4">Título e Autor</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4 w-56">Proporção</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Ativos</th>
                <th className="py-3 px-4 text-right">Devolvidos</th>
                <th className="py-3 px-4 text-right">Estoque</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {ranking.map((book, idx) => {
                const percent = Math.round((book.total_emprestimos / maxLoans) * 100);
                return (
                  <tr key={book.id_livro} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700 tabular-nums">
                      {idx + 1}º
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{book.titulo}</div>
                      <div className="text-xs text-slate-500">{book.autor}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{book.categoria}</td>
                    <td className="py-3 px-4">
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-700 rounded-full"
                          style={{ width: `${book.total_emprestimos > 0 ? Math.max(percent, 6) : 0}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {book.total_emprestimos}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-700 tabular-nums">
                      {book.emprestimos_ativos}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 tabular-nums">
                      {book.emprestimos_devolvidos}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700 tabular-nums">
                      {book.quantidade_disponivel}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* General Loans Report with CSV Export */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Relatório detalhado de empréstimos
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              {filteredHistory.length} registros selecionados para exibição ou exportação
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
              {(['TODOS', 'ATIVO', 'DEVOLVIDO', 'ATRASADO'] as const).map((status) => {
                const labels: Record<typeof status, string> = {
                  TODOS: 'Todos',
                  ATIVO: 'Ativos',
                  DEVOLVIDO: 'Devolvidos',
                  ATRASADO: 'Atrasados',
                };
                const active = reportFilter === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setReportFilter(status)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {labels[status]}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Livro</th>
                <th className="py-3 px-4">Leitor</th>
                <th className="py-3 px-4">Data Empréstimo</th>
                <th className="py-3 px-4">Previsão</th>
                <th className="py-3 px-4">Devolução</th>
                <th className="py-3 px-4">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-slate-500">
                    Nenhum registro encontrado para este filtro.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => {
                  const isOverdue =
                    item.status === 'ATIVO' && item.data_prevista_devolucao < today;
                  return (
                    <tr key={item.id_emprestimo} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-slate-500 tabular-nums">
                        #{String(item.id_emprestimo).padStart(3, '0')}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {item.livro_titulo}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{item.usuario_nome}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums">
                        {formatDatePtBr(item.data_emprestimo)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums">
                        {formatDatePtBr(item.data_prevista_devolucao)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums">
                        {formatDatePtBr(item.data_devolucao)}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium">
                        {item.status === 'DEVOLVIDO' ? (
                          <span className="text-emerald-700">Devolvido</span>
                        ) : isOverdue ? (
                          <span className="text-red-700">Em atraso</span>
                        ) : (
                          <span className="text-amber-700">Ativo</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
