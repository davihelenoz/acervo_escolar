import { useState, type FormEvent } from 'react';
import { BookOpen, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import type { UserSummary } from '../types/library';

interface LoginViewProps {
  onLoginSuccess: (token: string, user: UserSummary) => void;
}

const DEMO_ACCOUNTS = [
  {
    nome: 'Ana Clara Mendes',
    perfil: 'Bibliotecária',
    email: 'ana.mendes@escola.edu.br',
    senha: 'biblioteca123',
  },
  {
    nome: 'Carlos Eduardo Silva',
    perfil: 'Professor',
    email: 'carlos.silva@escola.edu.br',
    senha: 'aluno123',
  },
  {
    nome: 'Mariana Oliveira',
    perfil: 'Aluna',
    email: 'mariana.oliveira@escola.edu.br',
    senha: 'aluno123',
  },
];

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !senha) {
      setErrorMessage('Preencha os campos obrigatórios de E-mail e Senha.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.login(trimmedEmail, senha);
      onLoginSuccess(result.token, result.user);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Não foi possível validar suas credenciais.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClear() {
    setEmail('');
    setSenha('');
    setErrorMessage('');
  }

  function fillAccount(demoEmail: string, demoPassword: string) {
    setEmail(demoEmail);
    setSenha(demoPassword);
    setErrorMessage('');
  }

  return (
    <div className="min-h-screen bg-slate-50 grid grid-cols-1 lg:grid-cols-12 items-stretch">
      {/* Editorial Photo Panel */}
      <div className="hidden lg:block lg:col-span-6 relative overflow-hidden bg-slate-900">
        {!imageFailed ? (
          <img
            src="/src/assets/images/library_reading_room_1794931381413.jpg"
            alt="Interior da biblioteca escolar com estantes de livros e mesas de estudo"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center">
            <BookOpen className="w-20 h-20 text-slate-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-slate-950/20" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <p className="text-xs font-medium tracking-wide text-slate-300 mb-3">
            Gestão Acadêmica · Controle de Acervo
          </p>
          <h1 className="text-3xl font-semibold tracking-tight leading-tight text-balance max-w-md">
            Acervo Escolar
          </h1>
          <p className="mt-3 text-sm text-slate-200 leading-relaxed max-w-md">
            Plataforma integrada para catalogação de exemplares, controle de empréstimos, devoluções automáticas e relatórios gerenciais da biblioteca.
          </p>
        </div>
      </div>

      {/* Authentication Form Panel */}
      <div className="lg:col-span-6 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="flex items-center gap-2.5 text-blue-700 mb-4 lg:hidden">
              <BookOpen className="w-5 h-5" />
              <span className="font-semibold text-base tracking-tight text-slate-900">
                Acervo Escolar
              </span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 text-balance">
              Autenticação do Sistema
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Informe seu e-mail institucional e senha para acessar o painel da biblioteca.
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                E-mail
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@escola.edu.br"
                className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                required
              />
            </div>

            <div>
              <label
                htmlFor="login-senha"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="login-senha"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                {isSubmitting ? 'Verificando...' : 'Entrar'}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Limpar
              </button>
            </div>
          </form>

          {/* Seeded accounts directory for quick evaluation */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs font-medium text-slate-500 mb-3">
              Usuários cadastrados no banco inicial (clique para preencher)
            </p>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillAccount(account.email, account.senha)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-900 truncate">
                      {account.nome} · <span className="text-slate-500 font-normal">{account.perfil}</span>
                    </div>
                    <div className="text-xs font-mono text-slate-500 truncate mt-0.5">
                      {account.email}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-600 shrink-0">
                    {account.senha}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
