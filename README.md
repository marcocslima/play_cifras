<div align="center">

# 🎸 Play Cifras

**Seu leitor de cifras com andamento preciso, autenticação e autorização completa.**

Trabalha com arquivos LRC contendo cifras e letras sincronizadas simultaneamente, além de rolagem mãos-livres por webcam!

</div>

---

### Funcionalidades

- 🎵 **Catálogo de Cifras**: Visualize cifras sincronizadas no formato LRC
- 🔐 **Autenticação com Google**: Login seguro via Firebase Auth com Google Provider
- 👥 **Sistema de Roles**: Administradores e usuários comuns com permissões diferenciadas
- 🛡️ **Painel Admin**: Gerenciamento de cifras e promoção/rebaixamento de usuários
- 📋 **Playlists**: Crie e gerencie suas playlists pessoais de cifras (requer login)
- 💬 **Comentários**: Comente nas cifras e interaja com outros músicos (requer login)
- 📱 **Responsivo**: Interface adaptada para desktop e mobile
- 🎥 **FaceScroll**: Rolagem mãos-livres por webcam com detecção facial

---

### Pré-requisitos

- Node.js (v18+)
- Conta no [Firebase Console](https://console.firebase.google.com/)

---

### Configuração do Firebase

#### 1. Criar Projeto no Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto (ou use um existente)
3. Ative o **Firestore Database** (modo de produção)
4. Ative o **Firebase Authentication**

#### 2. Habilitar Google Provider no Authentication

1. No Firebase Console, vá em **Authentication** → **Sign-in method**
2. Clique em **Google** na lista de provedores
3. **Ative** o provedor Google
4. Configure o email de suporte do projeto
5. Salve as alterações

#### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com as credenciais do Firebase:

```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
VITE_FIREBASE_MEASUREMENT_ID=seu_measurement_id
```

> Essas credenciais estão disponíveis em: Firebase Console → Configurações do projeto → Geral → Seus apps → Config

#### 4. Aplicar Regras do Firestore

As regras de segurança estão definidas no arquivo `firestore.rules`. Para aplicá-las:

**Opção A — Via Firebase Console (manual):**

1. Acesse o Firebase Console → **Firestore Database** → **Regras**
2. Copie todo o conteúdo do arquivo `firestore.rules`
3. Cole no editor de regras do console
4. Clique em **Publicar**

**Opção B — Via Firebase CLI (automatizado):**

```bash
# Instale o Firebase CLI se ainda não tiver
npm install -g firebase-tools

# Faça login
firebase login

# Inicialize o projeto (selecione Firestore)
firebase init firestore

# Aplique as regras
firebase deploy --only firestore:rules
```

#### 5. Configurar o Primeiro Administrador

Quando o primeiro usuário faz login, ele é criado com role `user`. Para promovê-lo a admin:

**Opção A — Via Firebase Console:**

1. Acesse **Firestore Database** → Coleção `users`
2. Encontre o documento do usuário desejado
3. Altere o campo `role` de `"user"` para `"admin"`

**Opção B — Após o primeiro admin configurado:**

1. Faça login no app com a conta de admin
2. Acesse o **Painel Admin** → aba **Usuários**
3. Use o botão "Promover" para tornar outros usuários admin

---

### Instalação e Execução Local

```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev

# Build para produção
npm run build
```

---

### Fluxo de Autenticação e Autorização

```
┌─────────────────────────────────────────────────────────┐
│                   USUÁRIO NÃO LOGADO                     │
│  • Pode visualizar todas as cifras do catálogo           │
│  • Pode abrir e ler cifras                               │
│  • NÃO pode comentar, criar playlists ou gerenciar       │
│  • Vê botão "Login com Google" no header                 │
└───────────────────────┬─────────────────────────────────┘
                        │ Login com Google
                        ▼
┌─────────────────────────────────────────────────────────┐
│              PRIMEIRO LOGIN (novo usuário)                │
│  1. Firebase Auth autentica via Google                   │
│  2. App cria documento na coleção 'users' do Firestore   │
│     { uid, email, displayName, photoURL, role: 'user' }  │
│  3. Usuário é redirecionado como 'user' comum            │
└───────────────────────┬─────────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
┌──────────────────────┐   ┌──────────────────────────┐
│   ROLE: user         │   │   ROLE: admin            │
│                      │   │                          │
│ • Visualizar cifras  │   │ • Tudo que user pode     │
│ • Criar playlists    │   │ • Criar/editar/excluir   │
│ • Comentar cifras    │   │   cifras                 │
│ • Editar/excluir     │   │ • Acessar Painel Admin   │
│   próprios           │   │ • Promover/rebaixar      │
│   comentários        │   │   usuários               │
│ • NÃO pode acessar   │   │ • Badge "Admin" visível  │
│   painel admin       │   │                          │
└──────────────────────┘   └──────────────────────────┘
```

---

### Regras do Firestore — Resumo

| Coleção      | Leitura                        | Escrita                                         |
|-------------|--------------------------------|-------------------------------------------------|
| `songs`     | ✅ Todos (público)              | 🔒 Apenas admins                                |
| `users`     | 🔑 Próprio documento ou admin  | 🔑 Próprio (sem alterar role) / Admin (tudo)     |
| `playlists` | 🔑 Apenas dono                 | 🔑 Apenas dono                                  |
| `comments`  | ✅ Todos (público)              | 🔑 Criar: logado / Editar/Excluir: apenas dono  |

---

### Estrutura do Projeto

```
src/
├── App.tsx                          # App principal com rotas
├── firebase.ts                      # Configuração do Firebase
├── types.ts                         # Tipos TypeScript
├── contexts/
│   └── AuthContext.tsx               # Context de autenticação e roles
├── components/
│   ├── AdminPanel.tsx                # Painel admin (cifras + usuários)
│   ├── SongForm.tsx                  # Formulário de cifra
│   ├── SongViewer.tsx                # Visualizador de cifra
│   ├── auth/
│   │   ├── LoginButton.tsx           # Botão de login com Google
│   │   ├── UserMenu.tsx              # Menu do usuário logado
│   │   └── ProtectedRoute.tsx        # Guard de rotas protegidas
│   ├── admin/
│   │   └── UserManagement.tsx        # Gerenciamento de usuários
│   ├── playlists/
│   │   └── PlaylistManager.tsx       # Sistema de playlists
│   └── comments/
│       └── CommentSection.tsx        # Sistema de comentários
├── data/
│   └── songs.ts                      # Cifras preset
└── utils/
    └── lrcParser.ts                  # Parser de arquivos LRC
```

---

### Tecnologias

- **React 19** + TypeScript
- **Firebase** (Auth + Firestore)
- **Tailwind CSS 4**
- **Vite**
- **Lucide Icons**
- **Motion** (Framer Motion)
- **React Router DOM**

---

### Licença

Play Cifras © 2026 — Feito para músicos 🎸
