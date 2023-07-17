const fs = require('fs');
const path = require('path');

const folderPath = './packages/hardhat/contracts';
const oldString = '@openzeppelin';
const newString = 'node_modules/@openzeppelin';

const replaceInFiles = (folderPath, oldString, newString) => {
    const files = fs.readdirSync(folderPath);
    files.forEach((file) => {
      const filePath = path.join(folderPath, file);
  
      if (fs.statSync(filePath).isFile() && file.endsWith('.sol')) {
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(new RegExp(oldString, 'g'), newString);
        fs.writeFileSync(filePath, content, 'utf8');
      } else if (fs.statSync(filePath).isDirectory()) {
        replaceInFiles(filePath, oldString, newString);
      }
    });
  };
  
replaceInFiles(folderPath, oldString, newString);