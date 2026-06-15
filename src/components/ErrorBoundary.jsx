/* ============================================================================
 * ErrorBoundary — rede de segurança contra exceções de renderização.
 *
 * Sem um boundary, qualquer erro lançado durante o render de QUALQUER componente
 * desmonta a árvore React inteira → tela branca, sem volta, e o usuário perde a
 * sessão. Este boundary captura o erro, mantém o restante do app vivo (Header,
 * Tabs, estado em memória) e oferece recuperação.
 *
 * Uso: envolver áreas de risco (conteúdo das abas, modais pesados). NÃO substitui
 * a correção da causa — é a garantia de que um bug pontual nunca mais derruba tudo
 * nem faz perder dados não exportados.
 * ========================================================================== */

import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { erro: null, info: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    // Log no console para diagnóstico; não relança (manteria a tela branca).
    // eslint-disable-next-line no-console
    console.error('[GeoSPT] Erro capturado pelo ErrorBoundary:', erro, info);
    this.setState({ info });
  }

  reset = () => {
    this.setState({ erro: null, info: null });
    if (typeof this.props.onReset === 'function') this.props.onReset();
  };

  render() {
    if (!this.state.erro) return this.props.children;

    const { erro, info } = this.state;
    const titulo = this.props.titulo || 'Ocorreu um erro nesta tela';
    return (
      <div className="m-4 max-w-3xl mx-auto bg-red-50 border border-red-300 rounded-lg p-4">
        <div className="text-base font-bold text-red-800 mb-1">⚠ {titulo}</div>
        <p className="text-sm text-red-700 mb-2">
          Algo deu errado ao desenhar esta parte do aplicativo. O restante do GeoSPT
          continua funcionando e <strong>seus dados em memória foram preservados</strong> —
          você pode fechar esta mensagem e continuar de onde parou. Se o problema
          persistir, exporte a obra (JSON) para não perder o trabalho.
        </p>
        <div className="flex gap-2 mb-3">
          <button
            onClick={this.reset}
            className="text-sm px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white font-medium"
          >
            ↩ Voltar e continuar
          </button>
        </div>
        <details className="text-xs text-red-600">
          <summary className="cursor-pointer select-none">Detalhes técnicos (para diagnóstico)</summary>
          <pre className="mt-1 whitespace-pre-wrap break-words bg-white/60 rounded p-2 border border-red-200">
            {String(erro && (erro.stack || erro.message || erro))}
            {info && info.componentStack ? '\n' + info.componentStack : ''}
          </pre>
        </details>
      </div>
    );
  }
}
