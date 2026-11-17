import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Pencil, Plus, Search, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import type { Book } from '../types/library';

const SUGGESTED_CATEGORIES = [
  'Literatura Brasileira',
  'Ficção Juvenil',
  'Tecnologia',
  'Ciências',
  'História',
  'Matemática',
];

export function BooksView() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODAS');

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [titulo, setTitulo] = useState('');
  const [autor, setAutor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [formError, setFormError] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Inline delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function loadBooks(q = searchTerm, cat = selectedCategory) {
    setLoading(true);
    try {
      const list = await api.getBooks(q, cat);
      setBooks(list);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao consultar livros.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBooks();
  }, []);

  const categories = useMemo(() => {
    const unique = new Set<string>(SUGGESTED_CATEGORIES);
    books.forEach((b) => unique.add(b.categoria));
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [books]);

  function resetForm() {
    setEditingId(null);
    setTitulo('');
    setAutor('');
    setCategoria('');
    setQuantidade('1');
    setFormError('');
  }

  function startEdit(book: Book) {
    setEditingId(book.id_livro);
    setTitulo(book.titulo);
    setAutor(book.autor);
    setCategoria(book.categoria);
    setQuantidade(String(book.quantidade));
    setFormError('');
    setFeedbackMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    setFeedbackMessage('');

    const trimmedTitle = titulo.trim();
    const trimmedAuthor = autor.trim();
    const trimmedCategory = categoria.trim();
    const parsedQty = Number(quantidade);

    if (!trimmedTitle || !trimmedAuthor || !trimmedCategory || quantidade.trim() === '') {
      setFormError('Todos os campos são obrigatórios: Título, Autor, Categoria e Quantidade.');
      return;
    }

    if (!Number.isInteger(parsedQty) || parsedQty < 0) {
      setFormError('A quantidade disponível deve ser um número inteiro maior ou igual a zero.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingId !== null) {
        await api.updateBook(editingId, {
          titulo: trimmedTitle,
          autor: trimmedAuthor,
          categoria: trimmedCategory,
          quantidade: parsedQty,
        });
        setFeedbackMessage(`Livro "${trimmedTitle}" atualizado com sucesso.`);
      } else {
        await api.createBook({
          titulo: trimmedTitle,
          autor: trimmedAuthor,
          categoria: trimmedCategory,
          quantidade: parsedQty,
        });
        setFeedbackMessage(`Livro "${trimmedTitle}" cadastrado no acervo.`);
      }
      resetForm();
      await loadBooks();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar livro.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(idLivro: number) {
    setDeletingId(idLivro);
    setFormError('');
    setFeedbackMessage('');
    try {
      await api.deleteBook(idLivro);
      setConfirmDeleteId(null);
      if (editingId === idLivro) {
        resetForm();
      }
      setFeedbackMessage('Livro removido do acervo.');
      await loadBooks();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível excluir o livro.');
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  }

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    loadBooks(searchTerm, selectedCategory);
  }

  return (
    <div className="space-y-8">
      {/* Form Section: Cadastrar / Alterar Livro */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {editingId !== null ? `Alterar livro #${editingId}` : 'Cadastrar novo livro'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Preencha os dados bibliográficos e informe a quantidade de exemplares disponíveis.
            </p>
          </div>
          {editingId !== null && (
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap shrink-0"
            >
              Cancelar edição
            </button>
          )}
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

        <form onSubmit={handleSubmit} noValidate className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-4">
            <label htmlFor="book-title" className="block text-xs font-medium text-slate-700 mb-1.5">
              Título *
            </label>
            <input
              id="book-title"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Grande Sertão: Veredas"
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              required
            />
          </div>

          <div className="lg:col-span-3">
            <label htmlFor="book-author" className="block text-xs font-medium text-slate-700 mb-1.5">
              Autor *
            </label>
            <input
              id="book-author"
              type="text"
              value={autor}
              onChange={(e) => setAutor(e.target.value)}
              placeholder="Ex.: João Guimarães Rosa"
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              required
            />
          </div>

          <div className="lg:col-span-3">
            <label htmlFor="book-category" className="block text-xs font-medium text-slate-700 mb-1.5">
              Categoria *
            </label>
            <input
              id="book-category"
              type="text"
              list="book-categories-list"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ex.: Literatura Brasileira"
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              required
            />
            <datalist id="book-categories-list">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          <div className="lg:col-span-2">
            <label htmlFor="book-qty" className="block text-xs font-medium text-slate-700 mb-1.5">
              Quantidade *
            </label>
            <input
              id="book-qty"
              type="number"
              min={0}
              step={1}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              required
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-12 flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap shrink-0"
            >
              Limpar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>
                {isSaving
                  ? 'Salvando...'
                  : editingId !== null
                  ? 'Salvar alterações'
                  : 'Cadastrar livro'}
              </span>
            </button>
          </div>
        </form>
      </section>

      {/* Search & Catalog Table */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Catálogo do acervo
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              {books.length} {books.length === 1 ? 'título encontrado' : 'títulos encontrados'}
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchTerm(val);
                  loadBooks(val, selectedCategory);
                }}
                placeholder="Pesquisar título, autor ou categoria..."
                className="w-full sm:w-72 pl-9 pr-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>

            <select
              aria-label="Filtrar por categoria"
              value={selectedCategory}
              onChange={(e) => {
                const cat = e.target.value;
                setSelectedCategory(cat);
                loadBooks(searchTerm, cat);
              }}
              className="px-3 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="TODAS">Todas as categorias</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </form>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="h-10 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              Nenhum livro corresponde aos critérios de pesquisa.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Limpe os filtros ou cadastre um novo título no formulário acima.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Título</th>
                  <th className="py-3 px-4">Autor</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-right">Quantidade</th>
                  <th className="py-3 px-4">Disponibilidade</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {books.map((book) => (
                  <tr key={book.id_livro} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 tabular-nums">
                      #{String(book.id_livro).padStart(3, '0')}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {book.titulo}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {book.autor}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {book.categoria}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-900 tabular-nums">
                      {book.quantidade}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium whitespace-nowrap">
                      {book.quantidade > 0 ? (
                        <span className="text-emerald-700">Disponível</span>
                      ) : (
                        <span className="text-red-700">Sem estoque</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {confirmDeleteId === book.id_livro ? (
                        <span className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={deletingId === book.id_livro}
                            onClick={() => handleDelete(book.id_livro)}
                            className="px-2.5 py-1 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded whitespace-nowrap"
                          >
                            {deletingId === book.id_livro ? 'Excluindo...' : 'Confirmar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
                          >
                            Cancelar
                          </button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(book)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Alterar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(book.id_livro)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-900 whitespace-nowrap"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
