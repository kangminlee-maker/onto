<!-- GENERATED from src/core-runtime/cli/command-catalog.ts. Edit catalog or template, then run `npm run generate:catalog`. derive-hash=0c0e5b83c0456207b83d8fc62339a8596acc5d28068815ef35bb532bd1399ba3 -->

# Promote Domain (seed → established)

Promotes a seed domain from drafts/ to domains/ for $ARGUMENTS.
$ARGUMENTS specifies the domain name.
Requires all SEED markers to be removed before promotion.

Example: `/onto:learn:promote-domain palantir-foundry`

Plugin install resolves via `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}`. Set `ONTO_PLUGIN_DIR` env var when installed in a custom location.

Read `${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}/process.md` (common definitions) and
`${ONTO_PLUGIN_DIR:-~/.claude/plugins/onto}/.onto/processes/learn/promote-domain.md`, then execute.
