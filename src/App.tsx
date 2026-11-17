import { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { BooksView } from './components/BooksView';
import { DashboardView } from './components/DashboardView';
import { DocsView } from './components/DocsView';
import { LoansView } from './components/LoansView';
import { LoginView } from './components/LoginView';
import { ReportsView } from './components/ReportsView';
import { api, getStoredToken, setStoredToken } from './lib/api';
import type { UserSummary } from './types/library';

type ActiveSection = 'dashboard' | 'livros' | 'emprestimos' | 'relatorios' | 'documentacao';

const SECTION_META: Record<ActiveSection, { title: string; breadcrumb: string }> = {
  dashboard: {
    title: 'Painel Principal',
    breadcrumb: 'Acervo Escolar / Visão Geral',
  },
  livros: {
    title: 'Cadastro e Consulta de Livros',
    breadcrumb: 'Acervo Escolar / Livros',
  },
  emprestimos: {
    title: 'Gestão de Empréstimos',
    breadcrumb: 'Acervo Escolar / Empréstimos',
  },
  relatorios: {
    title: 'Relatórios e Livros Mais Emprestados',
    breadcrumb: 'Acervo Escolar / Relatórios',
  },
  documentacao: {
    title: 'Documentação Técnica e Entregas',
    breadcrumb: 'Acervo Escolar / Documentação',
  },
};

export default function App() {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setCheckingSession(false);
      return;
    }

    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => {
        setStoredToken(null);
        setUser(null);
      })
      .finally(() => setCheckingSession(false));
  }, []);

  function handleLoginSuccess(token: string, loggedUser: UserSummary) {
    setStoredToken(token);
    setUser(loggedUser);
    setActiveSection('dashboard');
  }

  function handleLogout() {
    setStoredToken(null);
    setUser(null);
    setMobileMenuOpen(false);
  }

  function navigateTo(section: ActiveSection) {
    setActiveSection(section);
    setMobileMenuOpen(false);
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-500">Carregando sistema...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const navItems: Array<{
    id: ActiveSection;
    label: string;
    icon: typeof LayoutDashboard;
  }> = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'livros', label: 'Livros', icon: BookOpen },
    { id: 'emprestimos', label: 'Empréstimos', icon: ArrowLeftRight },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
    { id: 'documentacao', label: 'Documentação', icon: FileText },
  ];

  const currentMeta = SECTION_META[activeSection];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200">
            <span className="text-base font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
              Acervo Escolar
            </span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Fechar menu"
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav aria-label="Menu Principal" className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Account & Sair */}
        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="px-2">
            <div className="text-sm font-medium text-slate-900 truncate">{user.nome}</div>
            <div className="text-xs font-mono text-slate-500 truncate">{user.email}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-slate-500 truncate">
              {currentMeta.breadcrumb}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activeSection !== 'emprestimos' ? (
              <button
                type="button"
                onClick={() => navigateTo('emprestimos')}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Novo Empréstimo
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigateTo('livros')}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Consultar Acervo
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 text-balance">
              {currentMeta.title}
            </h1>
          </div>

          {activeSection === 'dashboard' && <DashboardView onNavigate={navigateTo} />}
          {activeSection === 'livros' && <BooksView />}
          {activeSection === 'emprestimos' && <LoansView />}
          {activeSection === 'relatorios' && <ReportsView />}
          {activeSection === 'documentacao' && <DocsView />}
        </main>
      </div>
    </div>
  );
}
