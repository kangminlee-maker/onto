# Onto Build

Builds an ontology from the analysis target. $ARGUMENTS specifies the target directory/file. If not specified, the entire project is used as the target.

**Domain selection**: Append `@{domain}` to specify a domain, or `@-` for no-domain mode. If omitted, the Domain Selection Flow runs interactively.
Examples: `/onto:build src/ @software-engineering`, `/onto:build @-`

Read `~/.claude/plugins/onto/process.md` (common definitions) and
`~/.claude/plugins/onto/processes/build.md`, then execute.
