# Changelog — Abyss Web (PWA)

## [Unreleased]

### Adicionado
- **Sugestões**: fórum comunitário acessível pelo Perfil → botão "Sugestões". Permite criar sugestões com título e descrição, adicionar reações com emojis, comentar e navegar para o perfil de outros usuários diretamente dos comentários.
- **Reportar Bug**: formulário de reporte de bugs acessível pelo Perfil → botão "Reportar bug", ao lado do botão de Sugestões. Suporta categorias (Interface, Performance, Conteúdo, Login, Outro), título e descrição.

### Corrigido
- **Releases — scroll**: o scroll passou a ser exclusivo da lista de comentários; o texto do changelog agora tem tamanho estático e exibe todo o conteúdo sem overflow.
- **Releases — avatares**: foto de perfil dos usuários agora aparece ao lado de cada comentário em uma release.
- **Releases — navegação de perfil**: clicar no nome de um usuário nos comentários de uma release redireciona para o perfil dele.
- **Navegação — perfil de outros usuários**: corrigido bug em que clicar no perfil de um amigo dentro da tela de Amigos não navegava corretamente (formato `profile:id` não era interpretado pelo handler do App).
