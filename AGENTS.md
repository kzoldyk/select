# Project Rules & Git Workflow

## Branching & Release Protocol
Always strictly adhere to this git workflow for all tasks in this project:

1. **Always make changes on `dev` branch**:
   - Never write or commit code directly on `main`.
   - Ensure the working branch is `dev` before developing or editing files.

2. **Commit on `dev`**:
   - Run tests and verifications.
   - Commit all changes cleanly on `dev`.
   - Push `dev` to `origin dev`.

3. **Merge into `main`**:
   - Checkout `main` (`git checkout main`).
   - Merge `dev` (`git merge dev`).
   - If releasing a new version, create an annotated tag (`git tag -a vX.Y.Z -m "..."`).

4. **Push both branches**:
   - Push `main` to `origin main` (with `--tags` if a new tag was created).
   - Ensure both `dev` and `main` stay synchronized on remote.
