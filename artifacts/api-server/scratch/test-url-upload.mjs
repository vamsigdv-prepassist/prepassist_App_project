import fs from 'fs';
import http from 'http';

async function main() {
  const inputPath = '/Users/praneeth/Downloads/1_CURRENT_AFFAIRS_JANUARY_2025 - converted.pdf';
  console.log(`Reading ${inputPath}...`);
  const pdfBytes = fs.readFileSync(inputPath);
  console.log(`Original Size: ${(pdfBytes.length / 1024 / 1024).toFixed(2)} MB`);
  
  // 1. Start a local static file server
  const server = http.createServer((req, res) => {
    if (req.url === '/document.pdf') {
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBytes.length
      });
      res.end(pdfBytes);
      console.log('Served document.pdf to API Server');
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  
  server.listen(5002, async () => {
    console.log('Local static server running on http://localhost:5002');
    
    try {
      const pdfUrl = 'http://localhost:5002/document.pdf';
      
      // 2. Call local API Server with the URL
      console.log('Calling API Server to process PDF via URL...');
      const apiRes = await fetch('http://localhost:5001/api/quiz/process-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pdfUrl, language: 'English' })
      });
      
      console.log(`API Status: ${apiRes.status}`);
      const apiText = await apiRes.text();
      console.log('API Response Snippet:', apiText.substring(0, 500));
    } catch (err) {
      console.error(err);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

main().catch(console.error);
