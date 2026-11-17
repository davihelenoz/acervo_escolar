import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, RotateCcw, Search } from 'lucide-react';
import { api, formatDatePtBr, getTodayIsoDate } from '../lib/api';
import type { LoanRecord } from '../types/library';

interface ReturnsViewProps {
  onGoToLoans?: () => void;
}

export function ReturnsView({ onGoToLoans }: ReturnsViewProps) {
  const [activeLoans, setActiveLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const today = getTodayIsoDate();
  const [returnDate, setReturnDate] = useState(today);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'NO_PRAZO' | 'ATRASADO'>('TODOS');
  const [returningId, setReturningId] = useState<number | null>(null);

  async function loadActiveLoans() {
    setLoading(true);
    setError('');
    try {
      const list = await api.getLoans('ATIVO');
      setActiveLoans(list);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao carregar os livros em movimento.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActiveLoans();
  }, []);

  const overdueCount = useMemo(
    () => activeLoans.filter((loan) => loan.data_prevista_devolucao < today).length,
    [activeLoans, today]
  );

  const filteredLoans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeLoans.filter((loan) => {
      const isOverdue = loan.data_prevista_devolucao < today;
      if (statusFilter === 'ATRASADO' && !isOverdue) return false;
      if (statusFilter === 'NO_PRAZO' && isOverdue) return false;
      if (!q) return true;
      return (
        loan.livro_titulo.toLowerCase().includes(q) ||
        loan.livro_autor.toLowerCase().includes(q) ||
        loan.usuario_nome.toLowerCase().includes(q) ||
        loan.usuario_email.toLowerCase().includes(q) ||
        String(loan.id_emprestimo).includes(q)
      );
    });
  }, [activeLoans, searchQuery, statusFilter, today]);

  async function handleConfirmReturn(loan: LoanRecord) {
    setError('');
    setFeedbackMessage('');

    if (!returnDate) {
      setError('Informe a data da devolução antes de confirmar.');
      return;
    }

    if (returnDate < loan.data_emprestimo) {
      setError(
        `A data da devolução (${formatDatePtBr(returnDate)}) não pode ser anterior à data do empréstimo (${formatDatePtBr(loan.data_emprestimo)}).`
      );
      return;
    }

    setReturningId(loan.id_emprestimo);
    try {
      await api.returnLoan(loan.id_emprestimo, returnDate);
      setFeedbackMessage(
        `Devolução registrada: "${loan.livro_titulo}" devolvido por ${loan.usuario_nome} em ${formatDatePtBr(returnDate)}. Estoque atualizado automaticamente.`
      );
      await loadActiveLoans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar devolução.');
    } finally {
      setReturningId(null);
    }
  }

  return (
    <section
      aria-label="Registro de Devoluções"
      className="bg-white border border-slate-200 rounded-lg overflow-hidden"
    >
      {/* Header & Return Date Control */}
      <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Livros em movimento para devolução
          </h2>
          <p className="text-xs text-slate-500 mt-1 tabular-nums flex flex-wrap items-center gap-2">
            <span>
              {activeLoans.length}{' '}
              {activeLoans.length === 1 ? 'exemplar em movimento' : 'exemplares em movimento'}
            </span>
            <span aria-hidden="true">·</span>
            <span className={overdueCount > 0 ? 'text-red-700 font-medium' : 'text-slate-500'}>
              {overdueCount} {overdueCount === 1 ? 'em atraso' : 'em atraso'}
            </span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <div>
            <label
              htmlFor="return-date-input"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Data da devolução
            </label>
            <input
              id="return-date-input"
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg self-start">
          {(
            [
              ['TODOS', 'Todos em movimento'],
              ['NO_PRAZO', 'No prazo'],
              ['ATRASADO', 'Em atraso'],
            ] as const
          ).map(([key, label]) => {
            const active = statusFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar livro, leitor ou ID..."
            className="w-full md:w-72 pl-9 pr-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          />
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div
          role="alert"
          className="mx-6 mt-5 flex items-start gap-2.5 p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
          <span>{error}</span>
        </div>
      )}

      {feedbackMessage && (
        <div
          role="status"
          className="mx-6 mt-5 flex items-start gap-2.5 p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Active Circulation Table */}
      {loading ? (
        <div className="p-6 space-y-3">
          {[1, 2, 3].map((row) => (
            <div key={row} className="h-12 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      ) : filteredLoans.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-sm font-medium text-slate-700">
            {activeLoans.length === 0
              ? 'Nenhum livro em movimento no momento.'
              : 'Nenhum empréstimo ativo corresponde aos filtros aplicados.'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {activeLoans.length === 0
              ? 'Todos os exemplares emprestados já foram devolvidos ao acervo.'
              : 'Limpe a pesquisa ou altere o filtro de situação para visualizar outros itens.'}
          </p>
          {activeLoans.length === 0 && onGoToLoans && (
            <button
              type="button"
              onClick={onGoToLoans}
              className="mt-4 px-4 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap"
            >
              Ir para Empréstimos
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Livro em movimento</th>
                <th className="py-3 px-4">Leitor responsável</th>
                <th className="py-3 px-4">Retirada</th>
                <th className="py-3 px-4">Previsão</th>
                <th className="py-3 px-4">Situação</th>
                <th className="py-3 px-4 text-right">Devolução</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredLoans.map((loan) => {
                const isOverdue = loan.data_prevista_devolucao < today;
                const isProcessing = returningId === loan.id_emprestimo;
                return (
                  <tr
                    key={loan.id_emprestimo}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      #{String(loan.id_emprestimo).padStart(3, '0')}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900">{loan.livro_titulo}</div>
                      <div className="text-xs text-slate-500">
                        {loan.livro_autor} · {loan.livro_categoria}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-900">{loan.usuario_nome}</div>
                      <div className="text-xs font-mono text-slate-500">{loan.usuario_email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {formatDatePtBr(loan.data_emprestimo)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {formatDatePtBr(loan.data_prevista_devolucao)}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium whitespace-nowrap">
                      {isOverdue ? (
                        <span className="text-red-700">Em atraso</span>
                      ) : (
                        <span className="text-amber-700">Em movimento</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleConfirmReturn(loan)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>
                          {isProcessing ? 'Registrando...' : 'Registrar devolução'}
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
