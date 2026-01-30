# Guia: Executável e Atualizações Automáticas (GitHub)

Este projeto foi configurado para gerar um instalador Windows oficial (`.exe`) e buscar atualizações automaticamente através do GitHub, mantendo seu código-fonte **privado**.

## 1. Estratégia de Repositórios

Para que o auto-update funcione sem expor seu código privado:
1.  **Código Privado:** Você mantém este código em seu repositório privado normal.
2.  **Releases Públicos:** Crie um novo repositório **Público** no seu GitHub chamado `noroeste-jw-releases`. Este repositório servirá apenas para hospedar os instaladores e o arquivo de controle de versão (`latest.yml`).

## 2. Preparação no GitHub

1.  Crie o repositório **Público** `noroeste-jw-releases`.
2.  Gere um **Token de Acesso Pessoal (PAT)**:
    *   Vá em `Settings` > `Developer settings` > `Personal access tokens` > `Tokens (classic)`.
    *   Clique em `Generate new token`.
    *   Selecione a permissão `repo` (toda a categoria).
    *   **Copie o token gerado** (você não o verá novamente).

## 3. Configuração Local

No arquivo `electron-builder.yml` e `package.json`, substitua `SEU_USUARIO_GITHUB` pelo seu nome de usuário real do GitHub.

Para publicar uma nova versão, você precisa definir o token no seu terminal (PowerShell):
```powershell
$env:GH_TOKEN = "seu_token_aqui"
npm run electron:publish
```

## 4. O que foi alterado

*   **`package.json`**: Adicionada a dependência `electron-updater` e o script `electron:publish`.
*   **`electron-builder.yml`**: Configurado para gerar instalador NSIS completo e apontar para o repositório de updates.
*   **`electron/main.cjs`**: Adicionado o código que verifica por atualizações toda vez que o app abre.
*   **Aparência**: O app agora usará o ícone em `public/icon.png` para o instalador e o atalho no Windows.

## 5. Como lançar uma nova versão

1.  Aumente a versão no `package.json` (ex: de `1.0.0` para `1.0.1`).
2.  Execute o comando de publicação com o seu token.
3.  O `electron-builder` vai compilar o código e subir os arquivos para a aba "Releases" do seu repositório `noroeste-jw-releases`.
4.  Quando os usuários abrirem o app, eles receberão o aviso de nova versão.
