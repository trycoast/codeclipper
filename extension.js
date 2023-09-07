const vscode = require("vscode");
const Path = require("path");
const FS = require("fs");
const tree = require("text-treeview");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  let disposable = vscode.commands.registerCommand(
    "copy-code.copy-code",
    async function ({ fsPath }) {
      const stats = FS.statSync(fsPath);
      const isFile = stats.isFile();
      const isDir = stats.isDirectory();

      let markdown = "";

      if (isDir) {
        const dirStructure = getDirStructure(fsPath);
        const filesPaths = parseFilePaths(dirStructure);

        // crate directory layout
        markdown += `\`\`\`
// File layout

${tree(
  [
    {
      text: getCurrentFile(fsPath),
      children: dirStructure,
    },
  ],
  {
    showRootLines: false,
    format(indents, treeNode, node) {
      return `${indents.join("")}${treeNode}${node.text}${
        node.children ? "/" : ""
      }\n`;
    },
  }
)}
\`\`\`

`;

        markdown += (
          await Promise.all(
            filesPaths.map((path) =>
              getFileMarkdown(Path.join(fsPath, path), path)
            )
          )
        ).join("\n");
      } else if (isFile) {
        const name = getCurrentFile(fsPath);
        markdown += await getFileMarkdown(fsPath, name);
      }

      vscode.env.clipboard.writeText(markdown);
      vscode.window.showInformationMessage("Copied code");
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

function getDirStructure(fsPath) {
  return FS.readdirSync(fsPath)
    .filter((file) => !["node_modules", "__pycache__", ".git"].includes(file))
    .map((file) => {
      const abs = Path.join(fsPath, file);
      if (FS.statSync(abs).isDirectory())
        return { text: file, children: getDirStructure(abs) };
      else return file;
    })
    .sort((p) => (typeof p === "string" ? -1 : 1));
}

function parseFilePaths(arr, folderPath = "") {
  return arr
    .map((file) => {
      if (typeof file === "string") return folderPath + file;
      else {
        return parseFilePaths(file.children, folderPath + file.text + "/");
      }
    })
    .flat();
}

async function getFileMarkdown(path, name) {
  try {
    const doc = await vscode.workspace.openTextDocument(path);
    const languageId = doc.languageId;
    const text = doc.getText();
    return `\`\`\`${path.split(".").at(-1)}
${getComment(name, languageId)}
${text}
\`\`\``;
  } catch (e) {
    return;
  }
}

function getCurrentFile(uri) {
  let separator = "/";
  if (process.platform === "win32") separator = "\\";

  return uri.split(separator).at(-1);
}

function getComment(text, languageId) {
  switch (true) {
    case [
      "c",
      "cpp",
      "csharp",
      "dart",
      "elixir",
      "go",
      "java",
      "javascript",
      "kotlin",
      "perl",
      "php",
      "rust",
      "swift",
      "typescript",
    ].includes(languageId):
      return `// ${text}`;

    case [
      "powershell",
      "bat",
      "apacheconf",
      "cmake",
      "dockerfile",
      "fish",
      "ini",
      "lua",
      "makefile",
      "perl",
      "perl6",
      "pig",
      "properties",
      "jade",
      "python",
      "r",
      "ruby",
      "shellscript",
      "sql",
      "yaml",
    ].includes(languageId):
      return `# ${text}`;

    case [
      "html",
      "xml",
      "svg",
      "xsl",
      "xhtml",
      "vue",
      "handlebars",
      "svelte",
    ].includes(languageId):
      return `<!-- ${text} -->`;

    case ["css", "sass", "less"].includes(languageId):
      return `/* ${text} */`;

    default:
      return `// ${text}`;
  }
}

module.exports = {
  activate,
  deactivate,
};
