# @getPopsure/conventional-commit

Opinionated conventional commit used at [Feather](https://feather-insurance.com) in respect of [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) and [Linear](https://linear.app).

Part of the [commitizen](https://github.com/commitizen/cz-cli) family. This repo is a fork of the excellent [digitalroute/cz-conventional-changelog-for-jira](https://github.com/digitalroute/cz-conventional-changelog-for-jira).

## Convention

The commit message convention is mostly similar to the one described in [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/). The difference will be that we include any Linear issue ID in the commit description.

```
<type>[optional scope]: <linear id> <description>

[optional body]

[optional footer(s)]
```

### Examples

#### Commit message with a scope and an associated linear id

```
fix(legal-insurance): [CHA-279] Moved checkbox into a separate column
```

## Features

- Works seamlessly with Linear smart commits
- Automatically detects the Linear issue from the branch name
- Automatically detects the commit description from the branch name

## Usage

Add all the changes that you wish to commit (e.g. by using `git add -p`). Then run

```
git commit
```

You should be asked a few questions to interactively format your commit message.

If you're using the default branch formatting form Linear (⇧ + ⌘ + .), the issue number and description will be infered from the branch name (e.g. `vincent/cha-2790-moved-checkbox-into-separate-column` issue: cha-270, description: Moved checkbox into separate column).

![Gif of terminal when using @getpopsure/conventional-commit](https://github.com/getPopsure/conventional-commit/blob/main/images/demo.gif)

## Installation

```bash
yarn add --dev commitizen @getpopsure/conventional-commit
```

and then add the following to package.json:

```json
{
  "config": {
    "commitizen": {
      "path": "./node_modules/@getpopsure/conventional-commit"
    }
  }
}
```
