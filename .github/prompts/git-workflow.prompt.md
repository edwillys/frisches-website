## Git Workflow for Frisches Website

### Git Commands Reference

**Check status and view changes:**
```bash
git status                   # View current status
git diff                     # View unstaged changes
git diff --staged            # View staged changes
```

**Stage files:**
```bash
git add .                    # Stage all changes
git add <file>               # Stage specific file
git add src/components/      # Stage directory
```

**Commit changes with conventional commits:**
```bash
git commit -m "feat: description"      # New feature
git commit -m "fix: description"       # Bug fix
git commit -m "test: description"      # Add/update tests
git commit -m "refactor: description"  # Code refactoring
git commit -m "docs: description"      # Documentation
git commit -m "style: description"     # Formatting, styling
git commit -m "chore: description"     # Build tasks, config
```

**Push and pull:**
```bash
git push origin main         # Push to main branch
git push origin <branch>     # Push to specific branch
git pull origin main         # Pull latest changes
```

**Branching:**
```bash
git checkout -b <branch>     # Create and switch to new branch
git checkout <branch>        # Switch to existing branch
git branch                   # List branches
git branch -d <branch>       # Delete branch
```

**View history:**
```bash
git log --oneline            # Compact log
git log --graph              # Visual branch graph
git log -n 5                 # Last 5 commits
```

**Undo changes:**
```bash
git restore <file>           # Discard changes in working directory
git restore --staged <file>  # Unstage file
git reset HEAD~1             # Undo last commit (keep changes)
```

### Workflow Guidelines

1. **Before starting work:**
   - Pull latest changes: `git pull origin main`
   - Create feature branch: `git checkout -b feature/description`

2. **During development:**
   - Commit frequently with meaningful messages
   - Ensure tests pass before committing
   - Keep commits focused on single changes

3. **Before pushing:**
   - Run tests: `npm run test`
   - Check for errors: `npm run build`
   - Review changes: `git diff`

4. **Code review:**
   - Push branch: `git push origin feature/description`
   - Create pull request for review
   - Address feedback before merging

### Branch Naming Conventions

- `feature/card-animations` - New features
- `fix/menu-card-hover` - Bug fixes
- `test/component-coverage` - Test additions
- `refactor/gsap-composable` - Code improvements
- `docs/readme-update` - Documentation updates

### Commit Message Format

```
<type>: <short description>

[optional body]

[optional footer]
```

**Examples:**
```bash
git commit -m "feat: add card dealing animation with GSAP"
git commit -m "fix: resolve mobile menu card sizing issue"
git commit -m "test: add MenuCard hover interaction tests"
git commit -m "refactor: extract animation logic to composable"
git commit -m "docs: update setup instructions in README"
```

### Important Notes

- **Large files:** Videos (`.mp4`) are gitignored - compress before committing
- **Tests required:** All features must have tests before merging
- **Clean commits:** Avoid committing `node_modules/`, `dist/`, or other build artifacts
- **Branch protection:** Main branch should be protected, require PR reviews
