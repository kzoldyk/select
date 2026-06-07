# Pending Todos

- [ ] Wire `Cmd+Shift+Enter` end-to-end so selected SQL from the editor is passed through `QueryEditor` into `App.runQuery(sqlOverride)`.
- [ ] Add a real query history view or remove the remaining history persistence/backend plumbing if the feature is intentionally out of scope.
- [ ] Decide whether the toolbar environment badge should stay heuristic or be replaced with an explicit environment setting from stored connections.
- [ ] Review the read-only SQL validator so it does not become overly strict on future SQL features or identifiers.
- [ ] Re-run build and tests after the last editor shortcut changes to confirm there are no type or runtime regressions.
