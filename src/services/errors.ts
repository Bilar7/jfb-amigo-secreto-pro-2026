/** Converte erros do Firebase em mensagens claras em português. */
export function friendlyError(e: unknown): string {
  const code = String((e as { code?: string })?.code || '');
  const msg = String((e as { message?: string })?.message || '');
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'Este email ou número já tem conta. Use "Entrar".',
    'auth/invalid-email': 'O email ou número introduzido não é válido.',
    'auth/weak-password': 'A palavra-passe é fraca. Use pelo menos 6 caracteres.',
    'auth/missing-password': 'Introduza a palavra-passe.',
    'auth/invalid-credential': 'Dados de acesso incorretos. Confirme o email/número e a palavra-passe.',
    'auth/wrong-password': 'Palavra-passe incorreta.',
    'auth/user-not-found': 'Não existe conta com estes dados.',
    'auth/too-many-requests': 'Demasiadas tentativas. Aguarde um pouco e tente de novo.',
    'auth/network-request-failed': 'Sem ligação à internet. Verifique a rede e tente de novo.',
    'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de terminar.',
    'auth/cancelled-popup-request': 'A janela do Google foi fechada antes de terminar.',
    'auth/operation-not-allowed': 'Este método de entrada ainda não está ativo no Firebase (Authentication → Sign-in method).',
    'auth/unauthorized-domain': 'Este endereço ainda não está autorizado no Firebase (Authentication → Settings → Authorized domains).',
    'permission-denied': 'Sem permissão. Confirme que as regras novas do Firestore (firestore.rules) foram publicadas.',
    unavailable: 'Sem ligação ao servidor. A tentar de novo quando a rede voltar.',
  };
  if (map[code]) return map[code];
  if (msg.includes('Missing or insufficient permissions')) return map['permission-denied'];
  return msg || 'Ocorreu um erro inesperado. Tente de novo.';
}
