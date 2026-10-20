# 🎁 Bilar Amigo Secreto (v3)

App mobile (PWA) de Amigo Secreto para **qualquer ocasião** — amigos, família, empresa, aniversários, fim de ano, festas ou uma ocasião escrita pelo organizador.
Bilar DigitalTech Solutions · React + Vite + Firebase (projeto `jfb-amigo-secreto-pro-2026`).

## O que tem
- Ecrã de boas-vindas, entrar (email **ou número de telefone**, Google, "Lembrar-me"), criar conta (Pessoal / Empresa / Grupo).
- Início com os meus grupos, criar grupo (cartaz, ocasião, local, regras, data de revelação e entrega, limite e orçamento) e entrar com código/link.
- Cada pessoa só vê os grupos que criou ou para onde foi convidada.
- O organizador pode editar os dados do grupo; as alterações ficam sincronizadas em tempo real para todos os membros.
- Participantes podem sair; o organizador pode remover participantes, adicionar contas existentes por email e transferir a organização para outro membro antes de sair.
- Sorteio (mínimo 3): o organizador pode sortear antes do limite; o sorteio automático aguarda que o grupo fique completo. Entradas após o sorteio ficam incluídas quando o organizador o refizer.
- Notificações personalizadas para os membros quando o sorteio é feito ou refeito.
- Revelação privada com suspense sonoro e animação de celebração, além da contagem decrescente até ao dia do evento.
- Chat em tempo real: chat do grupo (todos veem), conversas privadas (só os dois) e conversa secreta anónima com o amigo secreto. Texto, emojis, fotos, câmara, ficheiros (até 700 KB) e notas de voz, com ✓✓ de lida.
- Lista de desejos com categorias, foto, preço e link da loja.
- Perfil: conta, notificações, privacidade, ajuda.

## ⚠️ Passo obrigatório: publicar as regras novas do Firestore
O chat foi refeito com uma estrutura nova. **Sem este passo o chat não funciona.** As regras também permitem a edição dos dados pelo organizador, a entrada/remoção de participantes, a transferência da organização e a invalidação do sorteio quando a lista de membros muda.
Sempre que `firestore.rules` for alterado, publique novamente o ficheiro atualizado no Firebase Console.
Firebase Console → projeto `jfb-amigo-secreto-pro-2026` → **Firestore Database → Regras** → apagar tudo, colar o conteúdo de `firestore.rules` → **Publicar**.

Confirme também em **Authentication → Sign-in method** que *Email/Palavra-passe* e *Google* estão ativos,
e em **Authentication → Settings → Authorized domains** que o seu `utilizador.github.io` está na lista.

## Publicar no GitHub Pages
Substitua os ficheiros do repositório por estes (mantendo a pasta `.github`) e faça push para `main`:
```bash
git add -A
git commit -m "Bilar Amigo Secreto v3"
git push
```
O GitHub Actions compila e publica sozinho (Settings → Pages → Source: GitHub Actions).
Quem já tinha a app instalada recebe a versão nova ao reabrir (pode ser preciso fechar e abrir 2 vezes).

## Abrir sem instalar nada (Live Server)
A pasta **`site/`** já está compilada. No VS Code: botão direito em `site/index.html` → **Open with Live Server**.
(O `index.html` da raiz é o código-fonte: só funciona com `npm run dev`.)

## Desenvolvimento
```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build
```
`src/dev-main.tsx` arranca a app com dados locais de teste (sem Firebase) — não entra na versão publicada.

## Notas
- Contas criadas com número de telefone não recebem email de recuperação da palavra-passe.
- Fotos são comprimidas automaticamente; outros ficheiros têm limite de 700 KB (não é preciso o Storage pago).
- O organizador corre o sorteio no seu aparelho; a app nunca lhe mostra o resultado dos outros.
- Grupos antigos continuam visíveis; as mensagens do chat antigo não são migradas.
