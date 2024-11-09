# How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

**Before Submitting A Bug Report**
- Check the documentation for a list of common questions and problems
- Perform a cursory search to see if the bug has already been reported
- Ensure the bug is not due to your local configuration

**How Do I Submit A (Good) Bug Report?**

Bugs are tracked as GitHub issues. Create an issue and provide the following information:

- Use a clear and descriptive title
- Describe the exact steps which reproduce the problem
- Provide specific examples to demonstrate the steps
- Describe the behavior you observed after following the steps
- Explain which behavior you expected to see instead and why
- Include screenshots and animated GIFs if possible
- Include your environment details (OS, Node.js version, etc.)

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion, including completely new features and minor improvements to existing functionality.

**Before Submitting An Enhancement Suggestion**
- Check if there's already a package which provides that enhancement
- Determine which repository the enhancement should be suggested in
- Perform a cursory search to see if the enhancement has already been suggested

**How Do I Submit A (Good) Enhancement Suggestion?**

Enhancement suggestions are tracked as GitHub issues. Create an issue and provide the following information:

- Use a clear and descriptive title
- Provide a step-by-step description of the suggested enhancement
- Provide specific examples to demonstrate the steps
- Describe the current behavior and explain which behavior you expected to see instead
- Explain why this enhancement would be useful
- List some other applications where this enhancement exists, if applicable

### Pull Requests

- Fill in the required template
- Do not include issue numbers in the PR title
- Include screenshots and animated GIFs in your pull request whenever possible
- Follow the JavaScript/Python styleguides
- Document new code based on the Documentation Styleguide
- End all files with a newline
- Avoid platform-dependent code

#### Pull Request Process

1. Update the README.md with details of changes if applicable
2. Update any documentation that might need to reflect the changes
3. The PR will be merged once you have the sign-off of at least one maintainer

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line
- Consider starting the commit message with an applicable emoji:
    - 🎨 `:art:` when improving the format/structure of the code
    - 🐎 `:racehorse:` when improving performance
    - 📝 `:memo:` when writing docs
    - 🐛 `:bug:` when fixing a bug
    - 🔥 `:fire:` when removing code or files
    - ✅ `:white_check_mark:` when adding tests
    - 🔒 `:lock:` when dealing with security
    - ⬆️ `:arrow_up:` when upgrading dependencies
    - ⬇️ `:arrow_down:` when downgrading dependencies

### JavaScript Styleguide

- Use 2 spaces for indentation
- Use single quotes for strings except when avoiding escaping
- No unused variables
- No semicolons
- Space after keywords (if (condition) { ... })
- Space after function name (function name (arg) { ... })
- Always use === instead of ==
- Use arrow functions where possible
- Use destructuring where possible
- Use template literals instead of string concatenation
- Use const for all references; avoid using var
- Use PascalCase for classes and camelCase for functions and variables

### Python Styleguide

- Follow PEP 8
- Use 4 spaces for indentation
- Use snake_case for functions and variables
- Use PascalCase for classes
- Maximum line length of 79 characters for code
- Maximum line length of 72 characters for docstrings/comments
- Use type hints where possible
- Use docstrings for functions and classes

### Documentation Styleguide

- Use [Markdown](https://guides.github.com/features/mastering-markdown/)
- Reference functions with parentheses: `myFunction()`
- Reference classes with brackets: `[MyClass]`
- Use backticks for all code references in headers
- Place code blocks in appropriate language blocks
- Keep line length to 80 characters for documentation
- Use relative links for references within the repository
- Include setup steps in code blocks rather than inline text

## Additional Notes

### Issue and Pull Request Labels

This section lists the labels we use to help us track and manage issues and pull requests.

**Type of Issue and Issue State**

- `enhancement`: Feature requests
- `bug`: Confirmed bugs or reports likely to be bugs
- `question`: Questions that need clarification
- `documentation`: Documentation improvements
- `help-wanted`: Extra attention is needed
- `wontfix`: This will not be worked on
- `good-first-issue`: Good for newcomers

**Pull Request Labels**

- `work-in-progress`: Pull requests which are still being worked on
- `needs-review`: Pull requests which need code review
- `under-review`: Pull requests being reviewed
- `requires-changes`: Pull requests which need to be updated
- `needs-testing`: Pull requests which need manual testing

## Attribution

These contributing guidelines are adapted from the [Atom editor contributing guidelines](https://github.com/atom/atom/blob/master/CONTRIBUTING.md).