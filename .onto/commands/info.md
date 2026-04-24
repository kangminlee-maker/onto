<!-- GENERATED from src/core-runtime/cli/command-catalog.ts. Edit catalog or template, then run `npm run generate:catalog`. derive-hash=265765e798aa3571041b64f82a9f4fb9427a9119b42d1660e775edc49a65f2c8 -->

# Onto Info

Reports installation mode (`development` / `project` / `user`), onto home path, project root, catalog version, and runtime signals. Useful for verifying `ONTO_HOME` propagation and detecting multi-install ambiguity before running other commands.

`onto info` is a preboot command — it does not require bootstrap to succeed and does not read `.onto/config.yml`.

Example:

```
$ onto info
installation_mode: development
onto_home: /Users/alice/cowork/onto
project_root: /Users/alice/cowork/onto
catalog_version: 1
...
```
