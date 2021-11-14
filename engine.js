'format cjs';

var wrap = require('word-wrap');
var map = require('lodash.map');
var longest = require('longest');
var rightPad = require('right-pad');
var chalk = require('chalk');
const { execSync } = require('child_process');
const boxen = require('boxen');

var defaults = require('./defaults');
const LimitedInputPrompt = require('./LimitedInputPrompt');
var filter = function(array) {
  return array.filter(function(x) {
    return x;
  });
};

var filterSubject = function(subject) {
  subject = subject.trim();
  while (subject.endsWith('.')) {
    subject = subject.slice(0, subject.length - 1);
  }
  return subject;
};

// This can be any kind of SystemJS compatible module.
// We use Commonjs here, but ES6 or AMD would do just
// fine.
module.exports = function(options) {
  var getFromOptionsOrDefaults = function(key) {
    return options[key] || defaults[key];
  };
  var getLinearIssueLocation = function(
    type,
    scope,
    linearWithDecorators,
    subject
  ) {
    return type + scope + ': ' + linearWithDecorators + subject;
  };
  var types = getFromOptionsOrDefaults('types');

  var length = longest(Object.keys(types)).length + 1;
  var choices = map(types, function(type, key) {
    return {
      name: rightPad(key + ':', length) + ' ' + type.description,
      value: key,
    };
  });

  const minHeaderWidth = getFromOptionsOrDefaults('minHeaderWidth');
  const maxHeaderWidth = getFromOptionsOrDefaults('maxHeaderWidth');

  const branchName = execSync('git rev-parse --abbrev-ref HEAD')
    .toString()
    .trim();
  const linearIssueRegex = /\w+\/(?<linearIssue>[a-z-0-9]{1,10})(?<linearIssueDescription>(-.+))/;
  const matchResult = branchName.match(linearIssueRegex);
  const linearIssue =
    matchResult && matchResult.groups && matchResult.groups.linearIssue;
  const linearIssueDescription =
    matchResult &&
    matchResult.groups &&
    matchResult.groups.linearIssueDescription.replace(/-/g, ' ');

  return {
    // When a user runs `git cz`, prompter will
    // be executed. We pass you cz, which currently
    // is just an instance of inquirer.js. Using
    // this you can ask questions and get answers.
    //
    // The commit callback should be executed when
    // you're ready to send back a commit template
    // to git.
    //
    // By default, we'll de-indent your commit
    // template and will keep empty lines.
    prompter: function(cz, commit, testMode) {
      cz.registerPrompt('limitedInput', LimitedInputPrompt);

      // Let's ask some questions of the user
      // so that we can populate our commit
      // template.
      //
      // See inquirer.js docs for specifics.
      // You can also opt to use another input
      // collection library if you prefer.
      cz.prompt([
        {
          type: 'list',
          name: 'type',
          message: "Select the type of change that you're committing:",
          choices: choices,
          default: options.defaultType,
        },
        {
          type: 'input',
          name: 'linear',
          message: 'Enter Linear issue (e.g. sto-123): (press enter to skip)',
          default: linearIssue || '',
          validate: function(linear) {
            if (!linear) {
              return true;
            }

            return /^(?<!([A-Z0-9]{1,10})-?)[A-Z0-9]+-\d+$/.test(linear);
          },
          filter: function(linear) {
            return linear.toUpperCase();
          },
        },
        {
          type: 'input',
          name: 'scope',
          message:
            'What is the scope of this change (e.g. component or file name): (press enter to skip)',
          default: options.defaultScope,
          filter: function(value) {
            return value.trim().toLowerCase();
          },
        },
        {
          type: 'limitedInput',
          name: 'subject',
          message: 'Write a short, imperative tense description of the change:',
          default: linearIssueDescription || options.defaultSubject,
          maxLength: maxHeaderWidth - (options.exclamationMark ? 1 : 0),
          leadingLabel: answers => {
            const linear = answers.linear ? ` ${answers.linear}` : '';
            let scope = '';

            if (answers.scope && answers.scope !== 'none') {
              scope = `(${answers.scope})`;
            }

            return `${answers.type}${scope}:${linear}`;
          },
          validate: input =>
            input.length >= minHeaderWidth ||
            `The subject must have at least ${minHeaderWidth} characters`,
          filter: function(subject) {
            return filterSubject(subject);
          },
        },
        {
          type: 'input',
          name: 'body',
          message:
            'Provide a longer description of the change: (press enter to skip)\n',
          default: options.defaultBody,
        },
        {
          type: 'confirm',
          name: 'isBreaking',
          message: 'Are there any breaking changes?',
          default: false,
        },
        {
          type: 'confirm',
          name: 'isBreaking',
          message:
            'You do know that this will bump the major version, are you sure?',
          default: false,
          when: function(answers) {
            return answers.isBreaking;
          },
        },
        {
          type: 'input',
          name: 'breaking',
          message: 'Describe the breaking changes:\n',
          when: function(answers) {
            return answers.isBreaking;
          },
        },
        {
          type: 'input',
          name: 'issuesBody',
          default: '-',
          message:
            'If issues are closed, the commit requires a body. Please enter a longer description of the commit itself:\n',
          when: function(answers) {
            return (
              answers.isIssueAffected && !answers.body && !answers.breakingBody
            );
          },
        },
        {
          type: 'input',
          name: 'issues',
          message: 'Add issue references (e.g. "fix #123", "re #123".):\n',
          when: function(answers) {
            return answers.isIssueAffected;
          },
          default: options.defaultIssues ? options.defaultIssues : undefined,
        },
      ]).then(async function(answers) {
        var wrapOptions = {
          trim: true,
          cut: false,
          newline: '\n',
          indent: '',
          width: options.maxLineWidth,
        };

        // parentheses are only needed when a scope is present
        var scope = answers.scope ? '(' + answers.scope + ')' : '';
        const addExclamationMark = options.exclamationMark && answers.breaking;
        scope = addExclamationMark ? scope + '!' : scope;

        // Get Linear issue prepend and append decorators
        var linearWithDecorators = answers.linear
          ? '[' + answers.linear + ']' + ' '
          : '';

        // Hard limit this line in the validate
        const head = getLinearIssueLocation(
          answers.type,
          scope,
          linearWithDecorators,
          answers.subject
        );

        // Wrap these lines at options.maxLineWidth characters
        var body = answers.body ? wrap(answers.body, wrapOptions) : false;

        // Apply breaking change prefix, removing it if already present
        var breaking = answers.breaking ? answers.breaking.trim() : '';
        breaking = breaking
          ? 'BREAKING CHANGE: ' + breaking.replace(/^BREAKING CHANGE: /, '')
          : '';
        breaking = breaking ? wrap(breaking, wrapOptions) : false;

        var issues = answers.issues ? wrap(answers.issues, wrapOptions) : false;

        const fullCommit = filter([head, body, breaking, issues]).join('\n\n');

        if (testMode) {
          return commit(fullCommit);
        }

        console.log();
        console.log(chalk.underline('Commit preview:'));
        console.log(boxen(chalk.green(fullCommit), { padding: 1, margin: 1 }));

        const { doCommit } = await cz.prompt([
          {
            type: 'confirm',
            name: 'doCommit',
            message: 'Are you sure that you want to commit?',
          },
        ]);

        if (doCommit) {
          commit(fullCommit);
        }
      });
    },
  };
};
