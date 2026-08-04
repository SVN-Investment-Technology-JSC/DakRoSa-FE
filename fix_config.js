const fs = require('fs');
const file = 'src/components/feature/tenant/maintenance/workflows-page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace activeNode.config.formFields
content = content.replace(
  "(activeNode.config.formFields as WorkflowFormField[] | undefined)",
  "(activeNode.config?.formFields as WorkflowFormField[] | undefined)"
);

// Search for any other .config.
const matches = content.match(/activeNode\.config\.[a-zA-Z0-9_]+/g);
if (matches) {
  matches.forEach(match => {
    // Only replace if it doesn't already have ?.
    const replaced = match.replace('activeNode.config.', 'activeNode.config?.');
    content = content.replace(match, replaced);
  });
}

// Search for node.config.
const nodeMatches = content.match(/node\.config\.[a-zA-Z0-9_]+/g);
if (nodeMatches) {
  nodeMatches.forEach(match => {
    const replaced = match.replace('node.config.', 'node.config?.');
    content = content.replace(match, replaced);
  });
}

fs.writeFileSync(file, content);
console.log('Fixed optional chaining');
