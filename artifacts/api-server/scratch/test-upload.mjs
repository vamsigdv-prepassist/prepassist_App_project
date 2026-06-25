import fs from 'fs';

async function main() {
  const inputPath = '/Users/praneeth/Downloads/1_CURRENT_AFFAIRS_JANUARY_2025 - converted.pdf';
  console.log(`Reading ${inputPath}...`);
  const pdfBytes = fs.readFileSync(inputPath);
  console.log(`Original Size: ${(pdfBytes.length / 1024 / 1024).toFixed(2)} MB`);

  // 1. Upload to file.io
  const formData = new FormData();
  formData.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'document.pdf');

  console.log('Uploading to temporary public URL...');
  const uploadRes = await fetch('https://file.io', {
    method: 'POST',
    body: formData,
  });
  const uploadData = await uploadRes.json();
  const pdfUrl = uploadData.link;
  console.log('Public URL:', pdfUrl);

  if (!pdfUrl) {
    throw new Error('Failed to upload to file.io');
  }

  // 2. Call local API Server with the URL
  console.log('Calling API Server to process PDF via URL...');
  const apiRes = await fetch('http://localhost:5001/quiz/process-pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ pdfUrl, language: 'English' })
  });

  console.log(`API Status: ${apiRes.status}`);
  const apiText = await apiRes.text();
  console.log('API Response Snippet:', apiText.substring(0, 500));
}

main().catch(console.error);
