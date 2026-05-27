import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const envLocalPath = path.join(process.cwd(), '.env.local');

try {
  if (fs.existsSync(configPath)) {
    const rawData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(rawData);

    let envContent = '';
    if (config.apiKey) envContent += `VITE_FIREBASE_API_KEY="${config.apiKey}"\n`;
    if (config.authDomain) envContent += `VITE_FIREBASE_AUTH_DOMAIN="${config.authDomain}"\n`;
    if (config.projectId) envContent += `VITE_FIREBASE_PROJECT_ID="${config.projectId}"\n`;
    if (config.storageBucket) envContent += `VITE_FIREBASE_STORAGE_BUCKET="${config.storageBucket}"\n`;
    if (config.messagingSenderId) envContent += `VITE_FIREBASE_MESSAGING_SENDER_ID="${config.messagingSenderId}"\n`;
    if (config.appId) envContent += `VITE_FIREBASE_APP_ID="${config.appId}"\n`;
    if (config.measurementId) envContent += `VITE_FIREBASE_MEASUREMENT_ID="${config.measurementId}"\n`;

    fs.writeFileSync(envLocalPath, envContent, 'utf8');
    console.log('Successfully generated .env.local from firebase-applet-config.json');
  } else {
    console.log('firebase-applet-config.json not found. Skipping auto-generation of .env.local.');
  }
} catch (error) {
  console.error('Error in setup-envs.js:', error);
}
