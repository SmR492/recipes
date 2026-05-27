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
| `smr492/neuro-symbolic-ai-bundle` | `1.0` | `SmR492\NeuroSymbolicAiBundle\NeuroSymbolicAiBundle` | aktiv |

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

### Format (wichtig): modernes Flex-Endpoint-Format, generiert via `flatten.mjs`

> **Empirisch verifiziert (Issue #4):** Das alte flache `{"manifests": {…}}`-Format wird von Flex bei einem **konfigurierten** `extra.symfony.endpoint` **ignoriert** (Flex fällt auf eine auto-generierte Recipe zurück → nur Bundle-Registrierung, keine Config-Dateien). Ein konfigurierter Endpoint verlangt das **moderne** Format.

Die `smr492/<bundle>/<version>/`-Ordner sind die **Quelle**. Der Generator `flatten.mjs` erzeugt daraus die von Flex konsumierten Dateien:

- **`index.json`** — Endpoint-Index: `recipes` (Paket→Versionen) + `_links` (mit `recipe_template_relative`, branch-agnostisch) + `branch` + `is_contrib: false`.
- **`<paket_dotted>.<version>.json`** — Per-Recipe-Manifest **inkl. `files`** (Dateiinhalte als Zeilen-Array) + `ref`.

```bash
node flatten.mjs main      # erzeugt index.json + <paket>.<version>.json aus smr492/*/*/
```

Wichtig für Consumer:
- **`is_contrib: false`** — eigener vertrauter Server; Flex wendet die Recipes ohne `allow-contrib`/Prompt an.
- Recipes matchen nur **getaggte** Releases (z.B. `1.0.0`), **nicht** Dev-Branch-Installs (`dev-…`) — Flex wertet Dev-Versionen kleiner als jede numerische Recipe-Version.

## Neues Recipe hinzufügen

1. Ordner `smr492/<bundle>/<major.minor>/` anlegen.
2. `manifest.json` schreiben:
   - `bundles` → Fully-qualified Bundle-Klasse + Env-Array (`["all"]` oder `["dev","test"]`).
   - `copy-from-recipe` → lokale Pfade (z.B. `config/`) auf Flex-Platzhalter (`%CONFIG_DIR%/`) mappen.
   - Optional `post-install-output` für Next-Steps-Hinweise.
3. Unter `config/packages/<bundle>.yaml` und ggf. `config/routes/<bundle>.yaml` die Host-App-Defaults ablegen.
4. `node flatten.mjs main` ausführen → regeneriert `index.json` + `<paket_dotted>.<version>.json` (nicht von Hand pflegen).
5. Änderungen nach `main` mergen – der GitHub raw-Endpoint ist sofort aktiv. Consumer ziehen die getaggte Release-Version (`composer require smr492/<bundle>:^1.0`).

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
