# Release Process

This project uses [release-please](https://github.com/googleapis/release-please) for automated releases based on Conventional Commits.

## How It Works

1. **Commit Changes** - Use [Conventional Commit](https://www.conventionalcommits.org/) format:
   ```bash
   feat: add new feature
   fix: resolve bug
   docs: update documentation
   ```

2. **Release Please Creates PR** - When commits are pushed to `main`, release-please automatically:
   - Analyzes commit messages
   - Determines version bump (major/minor/patch)
   - Updates `package.json` and `CHANGELOG.md`
   - Creates or updates a Release PR

3. **Review & Merge** - Review the automated Release PR:
   - Check version number is correct
   - Review changelog entries
   - Merge when ready to release

4. **Automated Publishing** - When Release PR is merged:
   - GitHub Release is created automatically
   - VSIX package is compiled and attached to release
   - Extension is published to VS Code Marketplace (for non-prerelease versions)

## Version Bumping Rules

- `feat:` commits → **minor** version bump (0.1.0 → 0.2.0)
- `fix:` commits → **patch** version bump (0.1.0 → 0.1.1)
- `BREAKING CHANGE:` in footer → **major** version bump (0.1.0 → 1.0.0)
- Other types (`docs:`, `chore:`, etc.) → no version bump (included in next release)

## Pre-release Support

The project is configured to create pre-release versions for unstable releases:

1. Pre-release versions will be marked as "Pre-release" on GitHub
2. They will **not** be automatically published to the VS Code Marketplace
3. VSIX files are still attached to the release for manual testing

To publish a pre-release to the marketplace manually:
```bash
npx @vscode/vsce publish --pre-release
```

## Manual Version Override

To force a specific version, include in commit body:
```bash
git commit -m "chore: release 1.0.0" -m "Release-As: 1.0.0"
```

## Checking Release Status

- **Open Release PRs**: Look for PRs with label `autorelease: pending`
- **Published Releases**: Check [GitHub Releases](https://github.com/grigange/copilot-sprint-summary/releases)
- **Marketplace**: Visit [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=grigange.copilot-sprint-summary)

## Troubleshooting

**Release PR not created?**
- Ensure commits follow Conventional Commit format
- Check GitHub Actions logs in the Actions tab
- Verify `GITHUB_TOKEN` has proper permissions

**Marketplace publish failed?**
- Check that `VSCE_PAT` secret is configured
- Verify the token has not expired
- Check CI workflow logs for specific errors

**Version not bumping as expected?**
- Review commit message format
- Check if commits are version-bump eligible types
- Look at release-please PR to see how it interpreted commits
