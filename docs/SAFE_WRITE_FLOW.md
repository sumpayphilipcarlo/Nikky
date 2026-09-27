# Safe repository write workflow

Nikky changes should use a feature branch and pull request instead of repeated direct writes to `main`.

Flow:

1. Create a branch from `main`.
2. Apply one coherent build change.
3. Run validation and CI.
4. Open a pull request.
5. Review checks.
6. Merge only after validation passes.

This reduces accidental direct-main changes and provides an auditable rollback point for the automated build loop.
