import fs from 'fs';
import { PDFDocument } from 'pdf-lib';

async function main() {
  const inputPath = '/Users/praneeth/Downloads/1_CURRENT_AFFAIRS_JANUARY_2025 - converted.pdf';
  console.log(`Reading ${inputPath}...`);
  const pdfBytes = fs.readFileSync(inputPath);
  
  console.log(`Loading PDF (Size: ${(pdfBytes.length / 1024 / 1024).toFixed(2)} MB)...`);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  
  console.log(`Original Pages: ${pdfDoc.getPageCount()}`);
  
  const newPdf = await PDFDocument.create();
  const pagesToCopy = Array.from({ length: Math.min(1, pdfDoc.getPageCount()) }, (_, i) => i);
  const copiedPages = await newPdf.copyPages(pdfDoc, pagesToCopy);
  copiedPages.forEach((p) => newPdf.addPage(p));
  
  console.log('Saving sliced PDF...');
  const slicedBytes = await newPdf.save();
  console.log(`Sliced Size: ${(slicedBytes.length / 1024 / 1024).toFixed(2)} MB`);
  
  const formData = new FormData();
  formData.append('pdf', new Blob([slicedBytes], { type: 'application/pdf' }), 'sliced.pdf');
  
  console.log('Uploading to Vercel API...');
  const res = await fetch('https://prepassist.in/api/quiz/process-pdf', {
    method: 'POST',
    body: formData,
  });
  
  console.log(`Response Status: ${res.status}`);
  const text = await res.text();
  console.log('Response Body Snippet:', text.substring(0, 500));
}

main().catch(console.error);
