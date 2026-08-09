# COOP'APPLI — MVP 30 Jours

SaaS de gestion de cotisations et caisses communes. Monorepo avec deux projets indépendants :

```
coopappli/
├── backend/    → API NestJS + Prisma + PostgreSQL
└── frontend/   → Next.js 14 (App Router) + Tailwind CSS
```

## 1. Backend (API)

```bash
cd backend
npm install
cp .env.example .env
# Éditez .env : renseignez DATABASE_URL (Neon ou Supabase) et un JWT_SECRET fort

npx prisma generate
npx prisma migrate dev --name init   # crée les tables dans votre base
npm run start:dev                     # démarre sur http://localhost:3001
```

**Routes principales de l'API :**

| Méthode | Route | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Créer un compte administrateur | Non |
| POST | `/auth/login` | Se connecter, retourne un JWT | Non |
| GET | `/auth/me` | Utilisateur courant | Oui |
| GET/POST | `/groups` | Lister / créer un groupe | Oui |
| GET/PATCH/DELETE | `/groups/:id` | Détail / modifier / supprimer un groupe | Oui |
| GET/POST | `/groups/:id/members` | Lister / ajouter un membre | Oui |
| DELETE | `/groups/:id/members/:memberId` | Retirer un membre | Oui |
| GET/POST | `/groups/:id/contributions` | Journal / enregistrer un versement | Oui |
| DELETE | `/groups/:id/contributions/:contributionId` | Supprimer un versement | Oui |

Toutes les routes protégées vérifient que le groupe appartient bien à l'utilisateur authentifié (isolation stricte des données, cf. section 4 du cahier des charges).

## 2. Frontend (interface web)

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Éditez .env.local : NEXT_PUBLIC_API_URL doit pointer vers votre backend

npm run dev   # démarre sur http://localhost:3000
```

**Écrans livrés :**
- `/login`, `/register` — Authentification
- `/dashboard` — Liste des groupes, création de groupe, barre de progression
- `/groups/[id]` — Détail d'un groupe : membres, statut (à jour / en retard), saisie de versement, journal d'historique

## 3. Déploiement en production

Conforme à la stack validée dans le cahier des charges (section 3.1 et Phase 3 du planning) :

1. **Base de données** : créez un projet sur [Neon](https://neon.tech) ou [Supabase](https://supabase.com), copiez la `connection string` dans `DATABASE_URL`.
2. **Backend** : déployez le dossier `backend/` sur [Render](https://render.com) ou [Railway](https://railway.app).
   - Build command : `npm install && npx prisma generate && npm run build`
   - Start command : `npx prisma migrate deploy && npm run start:prod`
   - Variables d'environnement : `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, `PORT`
3. **Frontend** : déployez le dossier `frontend/` sur [Vercel](https://vercel.com).
   - Root directory : `frontend`
   - Variable d'environnement : `NEXT_PUBLIC_API_URL` = URL publique de votre backend

## 4. Prochaines étapes hors MVP (rappel des exclusions du cahier des charges)

Ces points sont volontairement exclus du MVP et pourront être ajoutés en v2 :
- Intégration des paiements automatiques (Wave, Orange Money, Stripe)
- Relances automatisées par SMS/WhatsApp
- Export de rapports PDF/Excel
- Rôles et permissions multiples par groupe
