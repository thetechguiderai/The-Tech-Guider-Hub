'use strict';

/**
 * Owner access code tools.
 *
 *  npm run setup          Ask for a 10-digit code and store ONLY its hash.
 *  npm run owner:hash <code>  Print the scrypt hash for a code (for .env).
 *  npm run owner:change   Replace the stored owner code (asks for new one).
 */

const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');
const { db } = require('../db');
const { hashOwnerCode } = require('../security');

const rl = readline.createInterface({ input, output });

async function ask(prompt, validate) {
  const answer = (await rl.question(prompt)).trim();
  if (!validate(answer)) {
    console.error('Invalid input. It must be exactly 10 digits (0-9).');
    return ask(prompt, validate);
  }
  return answer;
}

function isValidCode(code) {
  return /^\d{10}$/.test(code);
}

async function storeCode(code, mode) {
  const hash = hashOwnerCode(code);
  const row = db.prepare('SELECT id FROM owners ORDER BY id LIMIT 1').get();
  if (row) {
    db.prepare('UPDATE owners SET code_hash = ? WHERE id = ?').run(hash, row.id);
    console.log('Owner access code updated. The previous code has been invalidated.');
  } else {
    db.prepare('INSERT INTO owners (code_hash) VALUES (?)').run(hash);
    console.log('Owner access code set.');
  }
  if (mode === 'init') {
    console.log('Only the hash is stored. The plain code is never kept by this tool.');
  }
}

(async () => {
  const [action, argCode] = process.argv.slice(2);
  try {
    if (action === 'hash') {
      const code = argCode || (await ask('Enter the 10-digit access code: ', isValidCode));
      console.log(hashOwnerCode(code));
    } else if (action === 'init' || action === 'change') {
      const code = await ask('Enter the new 10-digit owner access code: ', isValidCode);
      const confirm = await ask('Confirm the 10-digit owner access code: ', (v) => v === code);
      if (!confirm) {
        console.error('Codes did not match. Nothing was changed.');
        process.exit(1);
      }
      await storeCode(code, action);
    } else {
      console.log('Usage:');
      console.log('  npm run setup            Set the initial owner access code');
      console.log('  npm run owner:change     Replace the owner access code');
      console.log('  npm run owner:hash 1234567890   Print a code hash for .env');
    }
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
})();