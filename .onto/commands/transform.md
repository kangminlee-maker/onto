<!-- GENERATED from src/core-runtime/cli/command-catalog.ts. Edit catalog or template, then run `npm run generate:catalog`. derive-hash=9f5ae79ff98b43ac7a34f487016d9ba3d17f3a9957c46d8ffff51f9c49eaa43b -->

# Onto Transform

Transforms a built Raw Ontology into the user's desired format. $ARGUMENTS specifies the target file for transform. If not specified, `.onto/builds/{session ID}/raw.yml` is used as the target.

Plugin install resolves via `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}`. Set `ONTO_PLUGIN_DIR` env var when installed in a custom location.

Read `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}/process.md` (common definitions) and
`${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}/.onto/processes/transform.md`, then execute.
