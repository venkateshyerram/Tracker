const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const questions = [
  {
    name: 'REACT_APP_FIREBASE_API_KEY',
    message: 'Enter your Firebase API Key: '
  },
  {
    name: 'REACT_APP_FIREBASE_AUTH_DOMAIN',
    message: 'Enter your Firebase Auth Domain: '
  },
  {
    name: 'REACT_APP_FIREBASE_PROJECT_ID',
    message: 'Enter your Firebase Project ID: '
  },
  {
    name: 'REACT_APP_FIREBASE_STORAGE_BUCKET',
    message: 'Enter your Firebase Storage Bucket: '
  },
  {
    name: 'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    message: 'Enter your Firebase Messaging Sender ID: '
  },
  {
    name: 'REACT_APP_FIREBASE_APP_ID',
    message: 'Enter your Firebase App ID: '
  }
];

const askQuestion = (index) => {
  if (index >= questions.length) {
    rl.close();
    return;
  }

  const question = questions[index];
  rl.question(question.message, (answer) => {
    envContent += `${question.name}=${answer}\n`;
    askQuestion(index + 1);
  });
};

let envContent = '# Firebase Configuration\n';
console.log('Setting up your .env file...');
askQuestion(0);

rl.on('close', () => {
  const envPath = path.join(__dirname, '.env');
  fs.writeFileSync(envPath, envContent);
  console.log('\n.env file has been created successfully!');
  console.log('Please restart your development server for the changes to take effect.');
}); 