# Meu Cantinho

Projeto pessoal, mobile-first, feito com HTML, CSS e JavaScript.

## Recursos atuais

- Dashboard
- Check-in diário
- Hábitos personalizados
- Contador de sequência
- Diário
- Metas com progresso
- Contadores personalizados
- Estatísticas dos últimos 7 dias
- Exportação/importação de backup em JSON
- PWA
- Service Worker para funcionamento offline depois do primeiro carregamento

## Privacidade

Nesta primeira versão, os dados ficam no `localStorage` do navegador/dispositivo.

Isso significa:

- o GitHub não recebe seus dados do aplicativo;
- os dados não sincronizam automaticamente entre celular e PC;
- apagar os dados do navegador pode apagar os dados locais;
- use a opção de exportar backup para criar uma cópia.

Não coloque senhas, tokens, chaves de API ou dados muito sensíveis em arquivos públicos.

## Testar

Para testar o visual, você pode abrir o `index.html`.

Para testar o PWA e o Service Worker corretamente, use um servidor local, como a extensão Live Server do VS Code, e abra o endereço `http://localhost:...`.

## Estrutura

- `index.html` - estrutura
- `style.css` - aparência
- `script.js` - lógica e armazenamento
- `manifest.json` - configuração PWA
- `sw.js` - cache/offline
- `icon.svg` / `icon-192.png` / `icon-512.png` - ícones

## Próxima evolução

Uma futura versão pode ter login e um banco de dados privado para sincronizar os mesmos dados entre celular e computador.
