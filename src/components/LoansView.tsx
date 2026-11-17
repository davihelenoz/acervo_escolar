import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, RotateCcw, Search, ArrowUpRight } from 'lucide-react';
import {
  addDaysIsoDate,
  api,
  formatDatePtBr,
  getTodayIsoDate,
} from '../lib/api';
import type { Book, LoanRecord, UserSummary } from '../types/library';

export function LoansView() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Loan creation form
  const today = getTodayIsoDate();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [dataEmprestimo, setDataEmprestimo] = useState(today);
  const [dataPrevista, setDataPrevista] = useState(addDaysIsoDate(today, 7));

  const [formError, setFormError] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History filters
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ATIVO' | 'DEVOLVIDO'>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [returningId, setReturningId] = useState<number | null>(null);

  async function loadAllData() {
    setLoading(true);
    try {
      const [usersList, booksList, loansList] = await Promise.all([
        api.getUsers(),
        api.getBooks(),
        api.getLoans(),
      ]);
      setUsers(usersList);
      setBooks(booksList);
      setLoans(loansList);

      if (!selectedUserId && usersList.length > 0) {
        setSelectedUserId(String(usersList[0].id_usuario));
      }
      if (!selectedBookId && booksList.length > 0) {
        setSelectedBookId(String(booksList[0].id_livro));
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao carregar dados de empréstimos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllData();
  }, []);

  const selectedBook = useMemo(
    () => books.find((b) => String(b.id_livro) === selectedBookId) ?? null,
    [books, selectedBookId]
  );

  const filteredLoans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return loans.filter((loan) => {
      if (statusFilter !== 'TODOS' && loan.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        loan.livro_titulo.toLowerCase().includes(q) ||
        loan.usuario_nome.toLowerCase().includes(q) ||
        loan.usuario_email.toLowerCase().includes(q)
      );
    });
  }, [loans, statusFilter, searchQuery]);

  async function handleCreateLoan(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    setFeedbackMessage('');

    const idUsuario = Number(selectedUserId);
    const idLivro = Number(selectedBookId);

    if (!idUsuario || !idLivro) {
      setFormError('Selecione o usuário e o livro para registrar o empréstimo.');
      return;
    }

    if (!dataEmprestimo || !dataPrevista) {
      setFormError('Informe a data do empréstimo e a data prevista para devolução.');
      return;
    }

    if (dataPrevista < dataEmprestimo) {
      setFormError('A data prevista para devolução não pode ser anterior à data do empréstimo.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await api.createLoan({
        id_usuario: idUsuario,
        id_livro: idLivro,
        data_emprestimo: dataEmprestimo,
        data_prevista_devolucao: dataPrevista,
      });
      setFeedbackMessage(
        `Empréstimo #${created.id_emprestimo} registrado para ${created.usuario_nome}. O estoque de "${created.livro_titulo}" foi atualizado automaticamente.`
      );
      await loadAllData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao registrar empréstimo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReturnLoan(loan: LoanRecord) {
    setReturningId(loan.id_emprestimo);
    setFormError('');
    setFeedbackMessage('');
    try {
      await api.returnLoan(loan.id_emprestimo, getTodayIsoDate());
      setFeedbackMessage(
        `Devolução do livro "${loan.livro_titulo}" registrada. 1 exemplar foi retornado ao estoque.`
      );
      await loadAllData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao registrar devolução.');
    } finally {
      setReturningId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Form: Registrar Empréstimo */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="pb-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">
            Registrar novo empréstimo
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Livros sem estoque disponível têm o empréstimo bloqueado automaticamente. A quantidade é atualizada no ato do registro.
          </p>
        </div>

        {formError && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
            <span>{formError}</span>
          </div>
        )}

        {feedbackMessage && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2.5 p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        <form onSubmit={handleCreateLoan} noValidate className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4">
            <label htmlFor="loan-user" className="block text-xs font-medium text-slate-700 mb-1.5">
              Usuário *
            </label>
            <select
              id="loan-user"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              required
            >
              <option value="">Selecione um usuário</option>
              {users.map((u) => (
                <option key={u.id_usuario} value={u.id_usuario}>
                  {u.nome} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label htmlFor="loan-book" className="block text-xs font-medium text-slate-700 mb-1.5">
              Livro *
            </label>
            <select
              id="loan-book"
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              required
            >
              <option value="">Selecione um livro</option>
              {books.map((b) => (
                <option key={b.id_livro} value={b.id_livro}>
                  {b.titulo} — {b.quantidade > 0 ? `${b.quantidade} disponível(is)` : 'Sem estoque (0)'}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="loan-date" className="block text-xs font-medium text-slate-700 mb-1.5">
              Data do empréstimo *
            </label>
            <input
              id="loan-date"
              type="date"
              value={dataEmprestimo}
              onChange={(e) => setDataEmprestimo(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="loan-due" className="block text-xs font-medium text-slate-700 mb-1.5">
              Devolução prevista *
            </label>
            <input
              id="loan-due"
              type="date"
              value={dataPrevista}
              onChange={(e) => setDataPrevista(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              required
            />
          </div>

          <div className="md:col-span-12 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-600">
              {selectedBook ? (
                selectedBook.quantidade > 0 ? (
                  <span>
                    Estoque atual de <strong className="font-medium text-slate-900">{selectedBook.titulo}</strong>:{' '}
                    <span className="font-mono tabular-nums text-emerald-700 font-medium">
                      {selectedBook.quantidade} unidade(s)
                    </span>
                  </span>
                ) : (
                  <span className="text-red-700 font-medium">
                    Atenção: "{selectedBook.titulo}" está com estoque zerado (0 unidades) — o empréstimo será bloqueado.
                  </span>
                )
              ) : (
                <span>Selecione um exemplar para verificar o estoque.</span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg whitespace-nowrap shrink-0"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>{isSubmitting ? 'Registrando...' : 'Registrar empréstimo'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Histórico de Empréstimos */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Histórico de empréstimos e devoluções
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              {filteredLoans.length} {filteredLoans.length === 1 ? 'registro exibido' : 'registros exibidos'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Segmented filter */}
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
              {(['TODOS', 'ATIVO', 'DEVOLVIDO'] as const).map((status) => {
                const label =
                  status === 'TODOS' ? 'Todos' : status === 'ATIVO' ? 'Ativos' : 'Devolvidos';
                const active = statusFilter === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
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
                placeholder="Filtrar por livro ou usuário..."
                className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="h-10 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              Nenhum empréstimo encontrado para este filtro.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Ajuste o filtro de status ou registre um novo empréstimo acima.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Livro</th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Empréstimo</th>
                  <th className="py-3 px-4">Previsão</th>
                  <th className="py-3 px-4">Devolução</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredLoans.map((loan) => {
                  const isOverdue =
                    loan.status === 'ATIVO' && loan.data_prevista_devolucao < today;
                  return (
                    <tr key={loan.id_emprestimo} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-slate-500 tabular-nums">
                        #{String(loan.id_emprestimo).padStart(3, '0')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{loan.livro_titulo}</div>
                        <div className="text-xs text-slate-500">{loan.livro_autor}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-900">{loan.usuario_nome}</div>
                        <div className="text-xs text-slate-500 font-mono">{loan.usuario_email}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {formatDatePtBr(loan.data_emprestimo)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {formatDatePtBr(loan.data_prevista_devolucao)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {formatDatePtBr(loan.data_devolucao)}
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
                            onClick={() => handleReturnLoan(loan)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>
                              {returningId === loan.id_emprestimo
                                ? 'Processando...'
                                : 'Registrar devolução'}
                            </span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Concluído</span>
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
  );
}
