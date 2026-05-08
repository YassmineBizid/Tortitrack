# Module Sortie & Retour PF — BT Food Industry

Application web de gestion des Bons de Livraison (BL) et Bons de Retour (BR) avec reconnaissance IA des produits via photo.

---

## Stack technique

| Composant        | Technologie              |
|------------------|--------------------------|
| Frontend         | React 18 + Vite 5        |
| Base de données  | Supabase (PostgreSQL)    |
| Auth             | Supabase Auth            |
| Storage photos   | Supabase Storage         |
| IA Vision        | Claude Sonnet (Anthropic)|
| Rapport Excel    | SheetJS (xlsx)           |
| Email auto       | Resend API               |
| Design           | SAP Fiori Horizon        |

---

## Installation en 5 étapes

### Étape 1 — Prérequis

```bash
node -v   # >= 18.0
npm -v    # >= 9.0
```

### Étape 2 — Dépendances

```bash
cd btfi-app
npm install
```

### Étape 3 — Configuration Supabase

1. Créer un projet sur **https://supabase.com**
2. Dashboard → **SQL Editor** → exécuter dans l'ordre :
   - `database/01_schema.sql`
   - `database/02_views_rls.sql`
   - `database/03_cron.sql` *(après avoir activé pg_cron)*

3. Récupérer les clés : **Settings → API**

4. Créer le fichier `.env` :

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://VOTRE_PROJET.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### Étape 4 — Déployer les Edge Functions

```bash
# Installer Supabase CLI
npm install -g supabase

# Login
supabase login

# Lier au projet
supabase link --project-ref VOTRE_REF_PROJET

# Déployer les 2 fonctions
supabase functions deploy ai-analyze
supabase functions deploy daily-excel-report

# Définir les secrets (OBLIGATOIRE)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
supabase secrets set REPORT_EMAIL=direction@btfood.tn
supabase secrets set CRON_SECRET=secret_aleatoire_64_caracteres
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### Étape 5 — Lancer l'application

```bash
# Développement
npm run dev
# → http://localhost:3000

# Production
npm run build
# → dossier dist/ à déployer sur votre serveur
```

---

## Créer les utilisateurs

Dans **Supabase Dashboard → Authentication → Users → Invite User** :

| Email                        | Rôle     | Accès                          |
|------------------------------|----------|--------------------------------|
| `operateur@btfood.tn`        | operator | Créer BL/BR, photo IA          |
| `direction@btfood.tn`        | gm       | Dashboard, catalogue, config   |

Après inscription, définir le rôle en SQL :

```sql
UPDATE user_profiles SET role = 'gm'
WHERE id = (SELECT id FROM auth.users WHERE email = 'direction@btfood.tn');
```

---

## Structure des fichiers

```
btfi-app/
├── src/
│   ├── App.jsx              ← Application complète (1775 lignes)
│   └── main.jsx             ← Point d'entrée React
├── supabase/
│   └── functions/
│       ├── ai-analyze/      ← Proxy Anthropic sécurisé
│       └── daily-excel-report/ ← Rapport Excel quotidien
├── database/
│   ├── 01_schema.sql        ← Tables + données initiales
│   ├── 02_views_rls.sql     ← Vues analytiques + sécurité
│   └── 03_cron.sql          ← Planification rapport minuit
├── public/
│   ├── manifest.json        ← PWA (installable sur mobile)
│   └── icon.svg             ← Icône application
├── .env.example             ← Template variables d'environnement
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

---

## Fonctionnalités

### Opérateur
- 📸 **Photo → IA** : 1 photo identifie produit + DLC + DF + lot
- 🚛 **Bon de Livraison** : saisie rapide avec vérification IA
- ↩️ **Bon de Retour** : cause détectée automatiquement par ML
- 📄 **Documents récents** : accès instantané via bouton flottant

### Direction GM
- 📊 **Dashboard** : KPIs, taux retour, performance vendeurs
- 📦 **Catalogue produits** : gérer les articles reconnus par l'IA
- ⚙️ **Configuration** : email, seuils, vendeurs

### Automatique
- 🕛 **Rapport Excel quotidien à minuit** : envoi automatique par email
- 📸 **Photos dans le cloud** : URLs incluses dans Excel
- 🔐 **Clé IA côté serveur** : jamais exposée dans le navigateur

---

## Déploiement production

### Option A — Vercel (recommandé)

```bash
npm install -g vercel
vercel --prod
# → URL publique automatique
```

### Option B — Serveur Nginx (Ubuntu)

```bash
npm run build
sudo cp -r dist/* /var/www/btfi/
```

```nginx
server {
    listen 80;
    server_name sortie-retour.btfood.tn;
    root /var/www/btfi;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
}
```

### Option C — Installation sur mobile (PWA)

Ouvrir l'URL dans Chrome Android →
Menu ⋮ → "Ajouter à l'écran d'accueil" →
L'app s'installe comme une application native.

---

## Support

**BT Food Industry** · MF 1887237 G.A.M 000
16, Rue Annaba – Z.I. Ben Arous 2013 · Tél: 70 026 600
