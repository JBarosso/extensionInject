# 🎨 Injector Pro

> Extension Chrome moderne pour injecter et personnaliser du CSS sur n'importe quel site web avec une interface intuitive et des fonctionnalités avancées.

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## ✨ Fonctionnalités

### 🎯 Édition Visuelle
- **Sélecteur d'éléments interactif** : Cliquez sur n'importe quel élément de la page pour le modifier
- **Éditeur visuel intuitif** : Modifiez les propriétés CSS (couleurs, tailles, espacements) sans écrire de code
- **Drag & Drop** : Repositionnez les éléments directement sur la page avec la souris
- **Conversion automatique** : Transformez vos modifications visuelles en code CSS réutilisable

### 🌐 Gestion Multi-Sites
- **CSS Global** : Appliquez des styles à tous les sites web
- **CSS par Site** : Personnalisez chaque site individuellement
- **Groupes de Variantes** : Créez des groupes de sites partageant la même configuration CSS
- **Activation/Désactivation** : Contrôlez facilement quels styles sont actifs

### 📚 Bibliothèque de Presets
- **Presets prêts à l'emploi** :
  - 📖 **Mode Lecture** : Améliore la lisibilité en centrant le contenu
  - 🍪 **Masquer les cookies** : Cache automatiquement les bandeaux de consentement
  - 🔍 **Augmenter le contraste** : Améliore l'accessibilité visuelle
- **Presets personnalisés** : Créez, éditez et réutilisez vos propres snippets CSS
- **Activation flexible** : Activez les presets globalement ou par site

### 🎨 Interface Moderne
- **Sidepanel intégré** : Interface élégante accessible depuis l'icône de l'extension
- **Mode sombre/clair** : Thème adaptatif pour un confort visuel optimal
- **Auto-sauvegarde** : Tous vos styles sont sauvegardés automatiquement
- **Aperçu en temps réel** : Voyez vos modifications instantanément

## 🚀 Installation

### Depuis le code source

1. **Cloner le repository**
   ```bash
   git clone https://github.com/votre-username/injector-pro.git
   cd injector-pro
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Compiler le projet**
   ```bash
   npm run build
   ```

4. **Charger l'extension dans Chrome**
   - Ouvrez Chrome et allez dans `chrome://extensions/`
   - Activez le **Mode développeur** (en haut à droite)
   - Cliquez sur **Charger l'extension non empaquetée**
   - Sélectionnez le dossier `dist/` du projet

## 📖 Utilisation

### Premiers pas

1. **Ouvrir l'extension** : Cliquez sur l'icône de l'extension dans la barre d'outils Chrome
2. **Choisir un élément** : Cliquez sur le bouton "Choisir un élément" puis sélectionnez un élément sur la page
3. **Modifier visuellement** : Utilisez l'éditeur visuel pour ajuster les propriétés
4. **Sauvegarder** : Vos modifications sont automatiquement sauvegardées et appliquées

### Édition de code CSS

1. Basculez vers l'onglet **"Ce site"** ou **"Global"**
2. Passez en mode **"Code"** (bouton en haut à droite)
3. Écrivez votre CSS personnalisé dans l'éditeur
4. Le CSS est appliqué automatiquement en temps réel

### Utilisation des Presets

1. Ouvrez l'onglet **"Presets"**
2. Activez un preset existant :
   - **Globalement** : Cliquez sur "Activer Global" pour l'appliquer à tous les sites
   - **Par site** : Cliquez sur "Activer Site" pour l'appliquer uniquement au site actuel
3. **Créer un preset** : Cliquez sur "Créer" et remplissez le formulaire
4. **Ajouter au code** : Utilisez "Ajouter au Code" pour insérer le CSS d'un preset dans votre code

### Groupes de Variantes

1. Cliquez sur l'icône 📁 dans la barre de domaine
2. Créez un nouveau groupe de variantes
3. Assignez des sites au groupe
4. Le CSS du groupe sera appliqué à tous les sites du groupe

### Drag & Drop

1. Sélectionnez un élément avec le picker
2. Dans l'éditeur visuel, activez le bouton **"Activer Drag & Drop"**
3. Cliquez et glissez l'élément sur la page pour le repositionner
4. Les coordonnées sont automatiquement mises à jour

## 🛠️ Développement

### Structure du projet

```
extensionInject/
├── src/
│   ├── background/          # Service worker (background script)
│   ├── content/            # Content scripts (injector, picker)
│   ├── sidepanel/          # Interface React (app.tsx, VisualEditor.tsx)
│   ├── types.ts            # Définitions TypeScript
│   └── manifest.json       # Manifest de l'extension
├── dist/                   # Build de production
├── icons/                  # Icônes de l'extension
└── package.json
```

### Scripts disponibles

```bash
# Développement avec hot-reload
npm run dev

# Build de production
npm run build

# Linter
npm run lint

# Preview du build
npm run preview
```

### Technologies utilisées

- **React 19** : Framework UI
- **TypeScript** : Typage statique
- **Vite** : Build tool moderne
- **Tailwind CSS** : Framework CSS utilitaire
- **Chrome Extension Manifest V3** : API moderne des extensions Chrome
- **Lucide React** : Icônes modernes

## 🎯 Cas d'usage

- 🎨 **Personnalisation de sites** : Adaptez l'apparence de vos sites préférés
- ♿ **Accessibilité** : Améliorez le contraste et la lisibilité
- 🧹 **Nettoyage** : Masquez les éléments indésirables (publicités, cookies, etc.)
- 📱 **Responsive** : Testez et ajustez les styles responsive
- 🎓 **Apprentissage** : Expérimentez avec le CSS en temps réel

## 🔧 Configuration

### Permissions requises

- `storage` : Sauvegarde des configurations
- `scripting` : Injection de CSS
- `activeTab` : Accès à l'onglet actif
- `sidePanel` : Affichage du panneau latéral
- `<all_urls>` : Injection sur tous les sites

## 📝 Notes importantes

- ⚠️ **Rafraîchissement** : Si l'extension ne fonctionne pas, rafraîchissez la page
- 💾 **Sauvegarde** : Tous les styles sont sauvegardés localement dans Chrome
- 🔄 **Synchronisation** : Les données ne sont pas synchronisées entre appareils (stockage local uniquement)
- 🎨 **Priorité CSS** : Les styles utilisent `!important` pour garantir leur application

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Fork le projet
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🙏 Remerciements

- [React](https://react.dev/) - Framework UI
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS
- [Lucide](https://lucide.dev/) - Icônes

## 📧 Contact

Pour toute question ou suggestion, n'hésitez pas à ouvrir une [issue](https://github.com/votre-username/injector-pro/issues).

---

⭐ Si ce projet vous est utile, n'hésitez pas à lui donner une étoile !

