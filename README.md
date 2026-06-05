# Picsou — Front

![Angular](https://img.shields.io/badge/Angular-19-DD0031?logo=angular&logoColor=white)
![Angular Material](https://img.shields.io/badge/Angular%20Material-19-757575?logo=angular&logoColor=white)
![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel&logoColor=white)

Application web de gestion de budget personnel pensée pour les **17–26 ans** : tous tes comptes réunis, les dépenses de coloc réparties en temps réel, et une IA qui t'explique ton mois en français clair.

> Projet final M1 MIAGE — Université Paris Dauphine-PSL, 2026.

## 🔗 Accès

- **Application en ligne** : https://picsou-front.vercel.app
- **Accès démo (jury)** : sur l'écran de connexion, cliquer sur **« Voir la démo »** → connexion automatique à un compte de démonstration pré-peuplé (aucune donnée réelle, aucun identifiant à saisir).
  > ⚠️ Le backend est hébergé sur un plan gratuit (Render) qui se met en veille après inactivité : le **premier** chargement de la démo peut prendre **~1 min** (réveil du serveur).
- **API / backend** : [Picsou_back](https://github.com/matjussu/Picsou_back)

## ✨ Fonctionnalités

- **Dashboard unifié** — solde disponible, projection de fin de mois, anomalies détectées, répartition par catégorie.
- **Transactions** — historique catégorisé, multi-comptes.
- **Coloc en temps réel** — dépenses partagées, répartition automatique, settle-up, synchronisation live (WebSocket / STOMP).
- **Objectifs** — épargne et suivi.
- **Insights IA** — résumé mensuel des dépenses et questions-réponses libres, en français.
- **Open banking (mock)** — agrégation de comptes.
- **Onboarding** et paramètres utilisateur.

## 🛠 Stack

- **Angular 19** + **Angular Material** + **Angular CDK**
- **ApexCharts** (`ng-apexcharts`) pour la visualisation
- **STOMP over SockJS** (`@stomp/stompjs`) pour le temps réel coloc
- **lucide-angular** (icônes) · **RxJS**
- Déploiement **Vercel**

## 🚀 Lancer en local

```bash
npm install
npm start        # ng serve → http://localhost:4200
```

Par défaut, le front consomme l'API de production (`https://picsou-back.onrender.com/api`). Pour cibler un backend local, modifie l'URL de base de l'API dans la configuration d'environnement.

## 📦 Build

```bash
npm run build    # artefacts dans dist/
```

---

*Binôme repo : [Picsou_back](https://github.com/matjussu/Picsou_back) — API Spring Boot.*
