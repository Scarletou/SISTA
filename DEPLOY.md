# Mettre Sista en ligne (guide pas à pas)

Ce guide est écrit pour Scarlett aujourd'hui, et pour l'équipe interne d'Aino Digital demain.
Compte environ une demi-journée pour tout faire la première fois.

---

## Étape 1 · Tester sur ton ordinateur (30 min)

1. Installe **Node.js 22** (version LTS) depuis nodejs.org.
2. Dézippe le dossier `sista`, ouvre un terminal dedans, puis :

```bash
npm install
npm run setup                     # crée le fichier .env avec les clés secrètes
npm run admin -- add-site UJKZ "Université Joseph Ki-Zerbo" university
npm run admin -- add-user scarlett "Scarlett" admin
npm start
```

3. Ouvre **http://localhost:3000/dev** : tu joues une utilisatrice. Écris `SISTA UJKZ`, puis teste un message de crise.
4. Dans un autre onglet, ouvre **http://localhost:3000/console**, connecte-toi avec le mot de passe affiché à l'étape 2 : l'alerte est là. Réponds-lui, puis clôture le cas.

Tant que WhatsApp n'est pas configuré, rien ne part vers de vrais téléphones.

> ⚠️ **Sauvegarde tout de suite** `SISTA_DATA_KEY` et `SISTA_SECRET` (fichier `.env`) dans un gestionnaire de mots de passe. Sans elles, les données chiffrées sont illisibles.

---

## Étape 2 · Créer le numéro WhatsApp de Sista (chez Meta)

1. Prends un **numéro dédié à Sista** (une nouvelle puce). Il ne doit pas déjà être utilisé dans l'appli WhatsApp.
2. Sur **developers.facebook.com**, crée une app de type *Business*, ajoute le produit **WhatsApp**, et rattache-la au compte Meta Business d'Aino Digital (il faudra le faire vérifier).
3. Ajoute le numéro Sista et note :
   - le **Phone number ID** → `WA_PHONE_ID`
   - le **App secret** (Paramètres de l'app › Général) → `WA_APP_SECRET`
   - un **jeton permanent** créé via un *utilisateur système* dans Business Manager → `WA_TOKEN`
   - le numéro lui-même, chiffres seulement (ex. `22670000000`) → `WA_DISPLAY_NUMBER`
4. Les menus de Meta changent souvent : si un intitulé ne correspond pas, cherche le même terme dans leur documentation « WhatsApp Cloud API ».

### Deux modèles de message à faire approuver
WhatsApp interdit d'écrire librement à quelqu'un plus de 24 h après son dernier message. Fais approuver ces deux modèles (catégorie *Utility*) :

| Nom du modèle | Texte proposé | Variable du `.env` |
|---|---|---|
| `sista_reprise` | « Sista a une réponse pour toi 💛 Réponds à ce message pour la lire. » | `WA_REENGAGE_TEMPLATE` |
| `sista_alerte` | « Nouvelle alerte Sista. Ouvre la console de l'équipe. » | `WA_ALERT_TEMPLATE` |

Mets aussi les numéros WhatsApp de l'équipe d'astreinte dans `SISTA_ONCALL_NUMBERS` (séparés par des virgules) : ils reçoivent l'alerte pour chaque cas urgent.

---

## Étape 3 · Héberger le serveur

Le webhook WhatsApp exige une adresse **https** publique, par exemple `https://sista.ainodigital.bf`.

### Option A · Sur le NAS Synology (données au Burkina)
1. Crée un **dossier partagé chiffré** `sista` sur le NAS, et copies-y le dossier du projet avec ton `.env`.
2. Dans le `.env`, mets `NODE_ENV=production` et `SISTA_PUBLIC_URL=https://sista.ainodigital.bf`.
3. Ouvre **Container Manager › Projet › Créer**, choisis le dossier `sista` : il détecte `docker-compose.yml`. Lance le projet.
4. Dans **Panneau de configuration › Portail de connexion › Proxy inversé**, crée une règle :
   `https://sista.ainodigital.bf` (port 443) → `http://localhost:3000`.
5. Dans **Sécurité › Certificat**, ajoute un certificat **Let's Encrypt** pour ce nom de domaine.
6. Chez ton fournisseur de nom de domaine, fais pointer `sista.ainodigital.bf` vers l'adresse IP publique de ta box, et ouvre le port 443 vers le NAS.

Si ta connexion n'a pas d'IP fixe ou si ouvrir un port est compliqué, utilise **Cloudflare Tunnel** : il donne une adresse https sans ouvrir de port.

### Option B · Sur un serveur loué (VPS)
Sur un VPS Linux avec Docker : copie le dossier, puis `docker compose up -d`, et mets devant un proxy https (Caddy le fait en une ligne : `sista.ainodigital.bf { reverse_proxy localhost:3000 }`). Vérifie avec la psychiatre et ton cadre légal où les données ont le droit d'être hébergées.

### Brancher le webhook
Dans l'app Meta › WhatsApp › Configuration :
- URL de rappel : `https://sista.ainodigital.bf/webhook`
- Jeton de vérification : la valeur `WA_VERIFY_TOKEN` de ton `.env`
- Abonne-toi au champ **messages**.

Envoie « SISTA UJKZ » au numéro Sista depuis ton téléphone : tu dois recevoir l'accueil.

---

## Étape 4 · Créer les comptes et les QR codes

Dans le conteneur (Container Manager › Terminal) ou sur ton ordinateur :

```bash
npm run admin -- add-site LYC-ZINDA "Lycée Zinda" school
npm run admin -- add-user dr-x "Dr X" clinician
npm run admin -- add-user ref-zinda "Mme Y" referent LYC-ZINDA
npm run admin -- add-user zinda "Lycée Zinda" site_viewer LYC-ZINDA
npm run admin -- users
```

| Rôle | Ce qu'il voit |
|---|---|
| `admin` | Tout |
| `clinician` (psychiatre) | Tous les cas, tous les tableaux de bord |
| `referent` | Les cas et le tableau de bord de **son** site uniquement |
| `site_viewer` | Le tableau de bord de **son** site, jamais les cas |

Chaque `add-site` crée l'image `qrcodes/CODE.png`, prête à mettre sur une affiche.
Donne les mots de passe en main propre, jamais par message.

---

## Étape 4 bis · Activer l'écoute par IA (facultatif)

Sans clé, Sista répond uniquement avec les phrases validées. Avec une clé, elle écoute et répond avec ses propres mots, tout en gardant les garde-fous.

1. Crée un compte sur **console.anthropic.com**, ajoute un moyen de paiement, puis crée une **clé d'API** (API Keys › Create Key).
2. Dans le `.env`, ajoute (ou complète) :
   ```
   ANTHROPIC_API_KEY=ta_clé
   SISTA_AI_MODEL=claude-haiku-5-5
   ```
3. Relance Sista : au démarrage, tu dois lire « AI listening mode: on ».

⚠️ En mode IA, le texte des messages (jamais le numéro) est envoyé au fournisseur pour générer la réponse. Avant le pilote : accepter ses conditions de traitement des données, vérifier ses règles pour les services utilisés par des mineures, et mettre à jour la déclaration CIL.

## Étape 5 · Routine

- **Sauvegarde** : le seul fichier à sauvegarder est `data/sista.db` (Hyper Backup chaque nuit). Garde le `.env` à part.
- **Effacement automatique** : les messages des cas clôturés et les numéros inutilisés sont effacés après `SISTA_RETENTION_DAYS` jours (30 par défaut).
- **Mise à jour du code** : remplace les fichiers, puis relance le projet dans Container Manager (ou `docker compose up -d --build`).
- **Avant de lancer avec de vraies personnes** : la psychiatre valide tout le contenu de `content/messages.js` et le protocole `SAFETY.md`.

---

## Pour l'équipe technique (reprise en interne)

```
src/        Moteur de conversation (sans base de données, testable seul)
content/    Messages validés par la psychiatre
app/        Serveur : webhook WhatsApp, base SQLite, console, tableau de bord
scripts/    Outils d'administration (sites, comptes, QR codes)
test/       Tests automatiques : npm test
```

- Node 22, Express, SQLite intégré à Node (`node:sqlite`), aucune base externe.
- Chiffrement AES-256-GCM des numéros et messages (`app/crypto.js`), identifiant utilisateur = HMAC du numéro.
- Toute modification du contenu passe par une relecture clinique.
- `npm test` doit rester vert avant chaque mise en ligne.
