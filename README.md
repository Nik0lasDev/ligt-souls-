<div align="center">

# 🌿 LIGHT SOULS
### INFINITE WORLD

**Um protótipo de exploração 3D com terreno procedural e um mundo que cresce conforme você caminha.**

[![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-f7df1e?style=for-the-badge&logo=javascript&logoColor=111)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Three.js](https://img.shields.io/badge/Three.js-3D_ENGINE-black?style=for-the-badge&logo=threedotjs)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-DEV_SERVER-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Status](https://img.shields.io/badge/STATUS-EARLY_PROTOTYPE-d4f477?style=for-the-badge)](#-estado-do-projeto)

</div>

---

## ✨ Sobre o projeto

**Light Souls — Infinite World** é o começo de um jogo 3D de exploração em terceira pessoa. O terreno é construído em setores procedurais ao redor do jogador: quando ele avança, novas áreas aparecem e as mais distantes são liberadas da memória.

O objetivo desta primeira versão é estabelecer uma base jogável, leve e fácil de expandir.

### 🎮 Recursos atuais

- 🌍 **Terreno procedural:** relevo contínuo gerado por funções determinísticas de ruído.
- ♾️ **Exploração sem bordas definidas:** setores são carregados e descarregados dinamicamente.
- 🚶 **Personagem em terceira pessoa:** modelo inicial construído com geometria 3D, caminhada e corrida animadas.
- 🦘 **Pulo com gravidade:** movimento vertical e retorno ao terreno.
- 🎥 **Câmera acompanhando o jogador:** arraste o mouse para mudar o ângulo.
- 🌲 **Vegetação procedural:** árvores e vegetação distribuídas por setor com uma semente estável.
- 🌤️ **Atmosfera:** iluminação, céu, neblina, sombras e interface minimalista.
- 📱 **Base responsiva:** interface adaptável e controles de toque experimentais.

> **Nota:** “infinito” descreve a geração contínua de setores durante a exploração. O protótipo ainda não possui otimização de streaming em segundo plano, salvamento, combate ou colisões físicas completas com árvores.

## 🚀 Como executar

Você precisa de uma versão recente do [Node.js](https://nodejs.org/) e do npm.

### 1. Clone o repositório

```bash
git clone https://github.com/Nik0lasDev/ligt-souls-.git
cd ligt-souls-
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Abra no navegador o endereço local exibido pelo Vite, normalmente `http://localhost:5173`.

### 4. Gere a versão de produção

```bash
npm run build
npm run preview
```

Os arquivos otimizados serão gerados na pasta `dist/`.

## 🕹️ Controles

| Ação | Teclado / mouse | Toque |
|---|---|---|
| Mover | `W` `A` `S` `D` ou setas | Analógico virtual |
| Correr | `Shift` | Botão `↗` |
| Pular | `Espaço` | Botão `↑` |
| Girar a câmera | Arraste o mouse | Gesto de dois dedos (experimental) |

Clique em **Entrar no mundo** para começar.

## 🧱 Estrutura do projeto

```text
ligt-souls-/
├── index.html       # Interface inicial e HUD
├── src/
│   ├── main.js      # Cena 3D, jogador, câmera e geração procedural
│   └── style.css    # Interface responsiva e estilos
├── package.json     # Dependências e scripts
├── .gitignore
└── README.md
```

## ⚙️ Tecnologias

- **Three.js** — renderização 3D via WebGL.
- **JavaScript ES Modules** — lógica do jogo organizada em módulos.
- **Vite** — servidor local rápido e build de produção.
- **CSS responsivo** — HUD e controles para diferentes tamanhos de tela.

## 🗺️ Próximas etapas

- [ ] Colisões consistentes com árvores, pedras e outros objetos.
- [ ] Melhorar o modelo do personagem e adicionar animações de idle, corrida e salto.
- [ ] Adicionar biomas, rios, rochas e variação de vegetação.
- [ ] Otimizar a geração dos setores e o uso de memória em dispositivos móveis.
- [ ] Adicionar áudio ambiente, efeitos e opções gráficas.
- [ ] Salvar configurações e progresso localmente.
- [ ] Adicionar testes e integração contínua para o build.

## 📌 Estado do projeto

Este projeto está em **fase inicial de prototipagem**. A prioridade é construir uma base estável para movimentação, câmera e geração procedural antes de adicionar sistemas maiores.

## 📄 Licença

Nenhuma licença foi definida ainda. Até que uma licença seja adicionada ao repositório, todos os direitos permanecem reservados.

---

<div align="center">

Feito para explorar, experimentar e crescer.  
**LIGHT SOULS · INFINITE WORLD**

</div>