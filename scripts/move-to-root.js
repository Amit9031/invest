const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..", "..");
const codeDir = path.resolve(__dirname, "..");

console.log(`Root Dir: ${rootDir}`);
console.log(`Code Dir: ${codeDir}`);

function moveFolderRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const items = fs.readdirSync(src);
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);

    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      moveFolderRecursive(srcPath, destPath);
    } else {
      if (item === "README.md" && dest === rootDir) {
        console.log(`Skipping copy of template README.md to preserve assignment README in root.`);
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function run() {
  if (!fs.existsSync(codeDir)) {
    console.error("Code directory does not exist!");
    return;
  }

  const items = fs.readdirSync(codeDir);
  for (const item of items) {
    if (item === "scripts") continue;
    const srcPath = path.join(codeDir, item);
    const destPath = path.join(rootDir, item);

    if (item === "README.md") {
      console.log(`Skipping template README.md to preserve assignment README.`);
      continue;
    }

    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      console.log(`Moving directory: ${item}`);
      moveFolderRecursive(srcPath, destPath);
    } else {
      console.log(`Moving file: ${item}`);
      fs.copyFileSync(srcPath, destPath);
    }
  }

  const scriptsSrc = path.join(codeDir, "scripts");
  const scriptsDest = path.join(rootDir, "scripts");
  console.log("Moving scripts directory...");
  moveFolderRecursive(scriptsSrc, scriptsDest);

  console.log("Files copied to root successfully. Now deleting code/ directory contents...");
  
  function deleteFolderRecursive(dirPath) {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const curPath = path.join(dirPath, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          deleteFolderRecursive(curPath);
        } else {
          try {
            fs.unlinkSync(curPath);
          } catch (e) {
            console.warn(`Could not delete file ${curPath}: ${e.message}`);
          }
        }
      }
      try {
        fs.rmdirSync(dirPath);
      } catch (e) {
        console.warn(`Could not delete directory ${dirPath}: ${e.message}`);
      }
    }
  }

  try {
    const codeItems = fs.readdirSync(codeDir);
    for (const item of codeItems) {
      if (item === "scripts") continue;
      const itemPath = path.join(codeDir, item);
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        deleteFolderRecursive(itemPath);
      } else {
        try {
          fs.unlinkSync(itemPath);
        } catch (e) {
          console.warn(`Could not delete file ${itemPath}: ${e.message}`);
        }
      }
    }
    console.log("Cleanup of code/ directory completed successfully.");
  } catch (err) {
    console.warn("Could not delete code/ directory completely:", err);
  }
}

run();
