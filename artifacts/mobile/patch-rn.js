const fs = require('fs');
const path = require('path');

function patchFile(filePath) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    content = content.replace(/#x/g, '_x');
    content = content.replace(/#y/g, '_y');
    content = content.replace(/#width/g, '_width');
    content = content.replace(/#height/g, '_height');
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Patched: ' + filePath);
    }
  }
}

try {
  // Find react-native in node_modules
  const rnDir = path.resolve(__dirname, 'node_modules', 'react-native');
  const domRectRO = path.join(rnDir, 'src', 'private', 'webapis', 'geometry', 'DOMRectReadOnly.js');
  const domRect = path.join(rnDir, 'src', 'private', 'webapis', 'geometry', 'DOMRect.js');

  patchFile(domRectRO);
  patchFile(domRect);
} catch (e) {
  console.error('Failed to patch react-native geometry files:', e);
}
