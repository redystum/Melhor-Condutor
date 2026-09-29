# 🚗 Melhor Condutor

Uma interface web moderna, rápida e responsiva para a realização de testes de código de condução em Portugal, sincronizada em tempo real com a plataforma [Bom Condutor](https://www.bomcondutor.pt).

---

## ⚠️ Aviso Legal & Isenção de Responsabilidade (Disclaimer & Credits)

> **AVISO IMPORTANTE:**
> 
> Este projeto é **independente e não oficial**. O autor e este repositório **NÃO têm qualquer afiliação, parceria, patrocínio ou ligação oficial com a plataforma [Bom Condutor](https://www.bomcondutor.pt)** nem com os seus criadores ou mantenedores.
>
> **Todos os créditos de dados, questões, imagens, ilustrações, explicações, soluções e conteúdos pertencem integralmente ao [Bom Condutor](https://www.bomcondutor.pt).**
>
> Esta aplicação foi desenvolvida exclusivamente para fins educativos, de estudo pessoal e de conveniência de uso pessoal, atuando como um cliente alternativo que interage com a conta pessoal do utilizador. Todo o mérito da criação, manutenção e compilação do banco de questões do código da estrada é do Bom Condutor.

---

## ✨ Funcionalidades

- 🔄 **Sincronização em Tempo Real com o Bom Condutor**:
  - Inicia sessão automaticamente com as tuas credenciais do Bom Condutor.
  - Guarda e sincroniza as respostas e o histórico no teu perfil oficial (Índice Bom Condutor, número de testes, estatísticas).
- 📑 **Todas as Categorias Oficiais**:
  - **B / B1** (Ligeiros)
  - **A** (Motociclos)
  - **A + B** (Ambas as categorias)
  - **AM** (Ciclomotores)
  - **C** (Pesados de Mercadorias)
  - **D** (Pesados de Passageiros)
- 🎯 **Vários Modos de Teste**:
  - **Exame Oficial**: 30 questões simulando o exame do IMT.
  - **Questões Novas**: Questões a que ainda não respondeste.
  - **Testes Temáticos**: Escolha individual ou combinada de temas específicos do código.
  - **Mais Difíceis**: Questões com maior taxa de erro pela comunidade.
  - **Erradas**: Praticar questões que falhaste anteriormente.
- 💡 **Explicações & Resoluções Imediatas**:
  - Desencriptação e visualização das explicações oficiais de cada questão após o teste.
  - Carregamento e leitura dos comentários da comunidade e moderação do Bom Condutor (Disqus) diretamente na aplicação.
- ⚡ **Rápido e Leve (Bun Engine)**:
  - Servidor em TypeScript executado nativamente com [Bun](https://bun.sh/).
  - Proxy e cache local de imagens para carregamento instantâneo.
  - Interface moderna, responsiva para mobile, tablet e desktop.

---

## 🛠️ Tecnologias Utilizadas

- **Runtime & Servidor**: [Bun](https://bun.sh/) + TypeScript
- **Frontend**: HTML5 Semântico, CSS Moderno (Vanilla CSS com Design Tokens e Glassmorphism), JavaScript Moderno
- **Ícones & Tipografia**: FontAwesome 6, Google Fonts (Inter & Outfit)

---

## 🚀 Como Executar

### 1. Pré-requisitos

Certifica-te de que tens o **[Bun](https://bun.sh/)** instalado no teu sistema:

```bash
curl -fsSL https://bun.sh/install | bash
```

### 2. Configurar o Ambiente (`.env`)

Cria ou edita o ficheiro `.env` na raiz do projeto com as tuas credenciais do Bom Condutor:

```env
BC_EMAIL=o_teu_email@exemplo.com
BC_PASSWORD=a_tua_password
PORT=3001
```

> 🔒 **Nota de Segurança**: As credenciais são usadas estritamente pelo teu servidor local para autenticar a sessão junto do Bom Condutor. Nunca partilhes o teu ficheiro `.env` nem o envies para repositórios públicos (já incluído no `.gitignore`).

### 3. Iniciar o Servidor

Para modo de desenvolvimento com recarregamento automático:

```bash
bun dev
```

Ou para produção:

```bash
bun start
```

Abre o teu navegador em: **`http://localhost:3001`** (ou na porta configurada).

---


## 📄 Licença

Distribuído sob a licença MIT. Consulta o ficheiro [LICENSE](LICENSE) para mais detalhes.

Lembrando uma vez mais: todos os direitos e propriedade intelectual dos conteúdos, questões e base de dados rodoviária pertencem à equipa do [Bom Condutor](https://www.bomcondutor.pt).
