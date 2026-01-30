# Guia: Executável e Atualizações Automáticas (GitHub)

Este projeto foi configurado para gerar um instalador Windows oficial (`.exe`) e buscar atualizações automaticamente através do GitHub, mantendo seu código-fonte **privado**.

## 1. Estratégia de Repositórios

Para que o auto-update funcione sem expor seu código privado:

1. **Código Privado:** Você mantém este código em seu repositório privado normal.
2. **Releases Públicos:** O repositório **Público** `noroeste-jw-releases` hospeda os instaladores e o arquivo de controle de versão (`latest.yml`).

## 2. Preparação no GitHub

1. Repositório Público: `https://github.com/LaGiGa/noroeste-jw-releases`.
2. **Token de Acesso Pessoal (PAT)**:
    * Necessário para publicar. Deve ter a permissão `repo`.
    * No PowerShell, o token deve ser definido como variável de ambiente antes do comando de publicação.

## 3. Comandos de Atualização (Resumo)

Para realizar uma atualização completa do sistema, siga estes passos no terminal:

### Passo 1: Salvar e Enviar Código

```powershell
git add .
git commit -m "descrição das melhorias"
git push origin main
```

### Passo 2: Incrementar Versão

Edite o arquivo `package.json` e altere o campo `"version"`.

* Exemplo: de `"1.0.9"` para `"1.1.0"`.

### Passo 3: Criar Tag de Versão

```powershell
git add package.json
git commit -m "chore: bump version to 1.1.0"
git tag v1.1.0
git push origin main --tags
```

### Passo 4: Publicar Novo Executável

```powershell
# Defina seu Token (apenas uma vez por sessão)
$env:GH_TOKEN = ""

# Compilar e subir para o GitHub Releases
npm run electron:publish
```

## 4. O que acontece após a publicação?

* O `electron-builder` compila o código, gera o instalador e sobe para a aba "Releases" do repositório `noroeste-jw-releases`.
* **Auto-Update:** Quando os usuários abrirem o aplicativo instalado, o sistema detectará a nova tag no GitHub e baixará a atualização em segundo plano.
* **Próxima Inicialização:** Na próxima vez que o usuário abrir o app, a nova versão será instalada automaticamente.

## 5. Informações Importantes (Última Atualização)

* **Versão Atual:** 1.1.0
* **Ambiente Dev:** O modo desenvolvimento (`npm run electron:dev`) agora utiliza uma pasta de dados isolada (`noroeste-dev`) para não conflitar com a versão instalada.
* **Sincronização Nuvem:** Os botões de sincronização com Supabase estão disponíveis apenas no modo de desenvolvimento por segurança.
* **Persistência:** Melhorias na lógica de importação garantem que os dados não sejam perdidos ao alternar entre ambientes.
