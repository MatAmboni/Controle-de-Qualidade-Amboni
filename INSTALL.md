# Tutorial de instalação - Amboni ERP

Este tutorial explica como instalar o Amboni ERP em outros computadores Windows.

## 1. Arquivo necessário

Envie para o computador de destino apenas o instalador:

`AmboniERP-0.0.0.exe`

O instalador fica na pasta:

`release-final-fixed\AmboniERP-0.0.0.exe`

Não é necessário enviar o código-fonte, a pasta `node_modules`, o Node.js ou o arquivo `server.ts`.

## 2. Requisitos do computador

- Windows 10 ou Windows 11;
- processador e sistema operacional de 64 bits;
- aproximadamente 300 MB livres para a instalação;
- permissão para instalar aplicativos;
- acesso à internet somente se o aplicativo utilizar serviços externos, como a API do Gemini.

O aplicativo já inclui o Electron, o frontend e o servidor local. Portanto, o usuário não precisa instalar Node.js ou executar comandos no Prompt de Comando.

## 3. Instalação

1. Copie o arquivo `AmboniERP-0.0.0.exe` para o computador.
2. Clique duas vezes no arquivo.
3. Se o Windows mostrar o aviso de segurança, confirme em **Mais informações** e depois em **Executar assim mesmo**, caso o arquivo tenha sido recebido da fonte confiável da empresa.
4. Aguarde o instalador concluir.
5. Abra o **Amboni ERP** pelo atalho criado na área de trabalho ou pelo menu Iniciar.

Na primeira abertura, aguarde alguns segundos para o servidor local iniciar.

## 4. Uso em vários computadores

Cada computador terá uma instalação independente do programa e uma base de dados local.

Por padrão, os dados de cada computador ficam em:

`%APPDATA%\Amboni ERP\db.json`

Isso significa:

- cadastrar ou alterar dados em um computador não altera automaticamente os dados dos outros;
- desinstalar o programa normalmente não deve apagar essa pasta de dados;
- é recomendado fazer backup pelo próprio aplicativo antes de trocar de computador ou reinstalar o sistema.

Se todos os operadores precisarem trabalhar com a mesma base de dados em tempo real, o aplicativo deverá ser adaptado para usar um servidor ou banco de dados compartilhado na rede. A instalação do `.exe` sozinha não sincroniza bases entre computadores diferentes.

## 5. Backup e transferência de dados

Para levar os dados de um computador para outro:

1. Abra o Amboni ERP no computador original.
2. Use a opção de exportar ou fazer backup disponível no aplicativo.
3. Salve o arquivo de backup em um pendrive, pasta compartilhada ou outro local seguro.
4. Instale o Amboni ERP no computador novo.
5. Abra o aplicativo e use a opção de importar ou restaurar backup.
6. Confirme se as categorias e os registros aparecem corretamente.

Não copie o arquivo `db.json` enquanto o aplicativo estiver aberto. Se for necessário copiar esse arquivo manualmente, feche o aplicativo antes.

## 6. Atualização para uma versão nova

Quando uma nova versão for gerada:

1. Feche o Amboni ERP.
2. Execute o novo instalador.
3. Instale no mesmo computador.
4. Abra o aplicativo pelo novo atalho.
5. Verifique os registros e faça um teste de cadastro.

Antes de atualizar, faça um backup. O instalador não deve apagar a base localizada em `%APPDATA%\Amboni ERP`, mas o backup evita perda de dados em caso de falha no computador.

## 7. O aplicativo não abre

Tente nesta ordem:

1. Confirme se o aplicativo não está aberto em segundo plano.
2. Feche o Amboni ERP pelo Gerenciador de Tarefas e tente abrir novamente.
3. Reinicie o computador.
4. Desinstale a versão antiga e instale o instalador mais recente.
5. Confirme se o Windows Defender ou outro antivírus não bloqueou o aplicativo.
6. Se o problema continuar, envie uma captura de tela do erro e informe a versão do Windows.

Use sempre o instalador mais recente fornecido pela equipe. Não execute diretamente arquivos dentro das pastas `win-unpacked` em computadores de produção.

## 8. Onde encontrar o instalador

Depois de gerar uma nova versão, o instalador será criado em uma pasta `release-*` do projeto. O arquivo correto é o que termina em `.exe`, por exemplo:

`AmboniERP-0.0.0.exe`

Para distribuir o programa, copie esse arquivo para um compartilhamento interno ou envie-o por um canal confiável. Não altere o nome ou o conteúdo do arquivo depois de gerado.
