# Pixel Pulse

Tableau de bord néon pour Pixel 7.

## Fonctions

- Batterie (niveau, température, santé, historique sur 24 h), stockage et réseau
- Grand ménage : fichiers lourds, anciens ou en double, avec aperçu avant suppression
- Test de latence et de débit
- Widget d'écran d'accueil
- Raccourcis vers les réglages et quatre jeux de couleurs

## Installer l'application

Ouvre la page **Releases** sur le téléphone, télécharge `pixel-pulse.apk` et ouvre-le.
Chaque compilation essaie d'abord l'application sur un émulateur Android.

## Signature personnelle

Dans **Settings → Secrets and variables → Actions**, créer deux secrets :
`KEYSTORE_BASE64` et `KEYSTORE_PASSWORD`. La compilation suivante utilise alors cette clé
(il faut désinstaller une fois l'ancienne application). Ne jamais ajouter la clé au dépôt.
