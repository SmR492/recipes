# smr492/recipes

Privater Symfony Flex Recipe-Server für `smr492/*`-Bundles. Stellt Flex-Recipes bereit, damit ein `composer require smr492/<bundle>` automatisch Bundle-Registrierung, Konfigurationsdateien und Routen in der Host-App ablegt.

## Endpoint für Consumer

In der `composer.json` der Host-App (z.B. CarClubManager, api-base, Auftrags-Cockpit):

```json
{
    "extra": {
        "symfony": {
            "endpoint": [
                "https://raw.githubusercontent.com/SmR492/recipes/main/index.json",
                "flex://defaults"
            ]
        }
    }
}
```

Flex zieht den `index.json` direkt vom GitHub-Raw-Endpoint und fällt für alle nicht gelisteten Pakete auf den offiziellen Flex-Endpoint zurück.

> Hinweis: Bei **Composer path-repositories** (lokale `../auth-bundle`-Pfade) wendet Flex **keine** Custom-Recipes an – siehe `traces/anti-patterns/flex-local-recipe-assumption.md` im `projects`-Wiki. In dem Fall die Dateien aus `smr492/<bundle>/<version>/` **manuell** in die Host-App kopieren.
>
> Der `https://api.github.com/repos/.../contents/...`-Endpoint funktioniert **nicht** — er liefert JSON mit base64-encoded Inhalt statt der rohen Datei. Immer `raw.githubusercontent.com` verwenden.

## Aktueller Katalog

| Paket | Recipe-Version | Host-App-Bundle-Klasse | Status |
|---|---|---|---|
| `smr492/auth-bundle` | `1.0` | `Smr492\AuthBundle\Smr492AuthBundle` | aktiv |

## Struktur

```
recipes/
├── index.json                           Manifest-Index (Flex liest das)
├── README.md
└── smr492/
    └── <bundle>/
        └── <major.minor>/
            ├── manifest.json            Zeigt auf bundles/, copy-from-recipe/, post-install-output/
            ├── config/
            │   ├── packages/<bundle>.yaml
            │   └── routes/<bundle>.yaml
            └── post-install.txt         (optional) Hinweise an den Anwender
```

Ein Recipe-Tree wird über `manifest.json` referenziert; die Felder sind mit dem offiziellen Flex-Schema identisch:

```json
{
    "bundles": {
        "Vendor\\Bundle\\VendorBundle": ["all"]
    },
    "copy-from-recipe": {
        "config/": "%CONFIG_DIR%/"
    },
    "post-install-output": [
        "Next steps:",
        "  * Review config/packages/<bundle>.yaml"
    ]
}
```

Die Einträge im Top-Level-`index.json` verknüpfen Paketnamen mit einer Recipe-Version:

```json
{
    "manifests": {
        "smr492/auth-bundle": {
            "manifest": { "bundles": {...}, "copy-from-recipe": {...} },
            "origin": "smr492/auth-bundle:1.0@github.com/smr492/recipes"
        }
    }
}
```

## Neues Recipe hinzufügen

1. Ordner `smr492/<bundle>/<major.minor>/` anlegen.
2. `manifest.json` schreiben:
   - `bundles` → Fully-qualified Bundle-Klasse + Env-Array (`["all"]` oder `["dev","test"]`).
   - `copy-from-recipe` → lokale Pfade (z.B. `config/`) auf Flex-Platzhalter (`%CONFIG_DIR%/`) mappen.
   - Optional `post-install-output` für Next-Steps-Hinweise.
3. Unter `config/packages/<bundle>.yaml` und ggf. `config/routes/<bundle>.yaml` die Host-App-Defaults ablegen.
4. Top-Level `index.json` ergänzen:
   ```json
   "smr492/<bundle>": {
       "manifest": { "bundles": { "Vendor\\Bundle\\VendorBundle": ["all"] }, "copy-from-recipe": { "config/": "%CONFIG_DIR%/" } },
       "origin": "smr492/<bundle>:<version>@github.com/smr492/recipes"
   }
   ```
5. Änderungen nach `main` mergen – der GitHub raw-Endpoint ist sofort aktiv.

## Versionsstrategie

- Major-Version des Bundles = eigener Recipe-Ordner (`auth-bundle/1.0`, später `auth-bundle/2.0`).
- Breaking Changes an der Host-Contract-Fläche (z.B. neue Pflichtfelder am `User`-Entity) rechtfertigen einen neuen Recipe-Ordner.
- Minor-Updates innerhalb der selben Major-Linie überschreiben den bestehenden Ordner.

## Voraussetzungen der bestehenden Recipes

### `smr492/auth-bundle` 1.0

Die Host-App muss ein `User`-Entity bereitstellen, das `SmR492\AuthBundle\Contract\AuthUserInterface` implementiert. Die Entity muss mindestens diese Felder tragen:

- `id`, `email` (unique), `username` (unique), `password`, `roles`
- `isVerified`, `isLocked`, `lastLoginAt`, `failedLoginAttempts`
- `preferredLocale`, `timezone`, `notifyOnLogin`

Siehe `projects/wiki/decisions/auth-bundle-architecture.md` für das vollständige Interface.

## Referenzen

- Projekt-Dokumentation: [`projects/wiki/projects/recipes.md`](https://github.com/SmR492/projects/blob/main/wiki/projects/recipes.md)
- Symfony Flex Docs: https://symfony.com/doc/current/setup/flex.html
- Flex Recipe-Repository (upstream): https://github.com/symfony/recipes
