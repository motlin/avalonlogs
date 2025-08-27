#!/usr/bin/env node

/**
 * Efficiently fetch new Avalon game logs from Firestore.
 * Only downloads games newer than what we already have locally.
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

const LOGS_DIR = 'logs';
const PROJECT_ID = 'georgyo-avalon';
const COLLECTION = 'logs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 && args[limitIndex + 1] ? parseInt(args[limitIndex + 1]) : null;

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
};

function log(message, color = null) {
  if (color && colors[color]) {
    console.log(`${colors[color]}${message}${colors.reset}`);
  } else {
    console.log(message);
  }
}

async function findLatestLocalGame() {
  try {
    const files = await fs.readdir(LOGS_DIR);

    if (files.length === 0) {
      return { timestamp: null, gameId: null };
    }

    const validFiles = [];
    for (const file of files) {
      if (file.includes('_')) {
        const [timestampPart, gameIdPart] = file.split('_');
        if (timestampPart && gameIdPart) {
          try {
            const timestamp = new Date(timestampPart);
            if (!isNaN(timestamp.getTime())) {
              const gameId = gameIdPart.replace(/\s+$/, '');
              validFiles.push({
                filename: file,
                timestamp,
                gameId
              });
            }
          } catch {
          }
        }
      }
    }

    if (validFiles.length === 0) {
      return { timestamp: null, gameId: null };
    }

    validFiles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const latest = validFiles[validFiles.length - 1];

    return { timestamp: latest.timestamp, gameId: latest.gameId };
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(LOGS_DIR, { recursive: true });
      return { timestamp: null, gameId: null };
    }
    throw error;
  }
}

async function initializeFirebase() {
  const possiblePaths = [
    path.join(process.env.HOME, 'projects/avalon-online/server/georgyo-avalon-firebase-adminsdk-uewf3-bf74e6c4c1.json'),
    './firebase-credentials.json',
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  ].filter(Boolean);

  let serviceAccount = null;
  let credPath = null;

  for (const p of possiblePaths) {
    try {
      const fullPath = path.resolve(p);
      const content = await fs.readFile(fullPath, 'utf8');
      serviceAccount = JSON.parse(content);
      credPath = fullPath;
      break;
    } catch {
    }
  }

  if (!serviceAccount) {
    throw new Error('Could not find Firebase credentials file. Please set GOOGLE_APPLICATION_CREDENTIALS environment variable.');
  }

  log(`Using credentials from: ${credPath}`, 'blue');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
  });

  return admin.firestore();
}

async function fetchNewGameIds(db, latestTimestamp) {
  log('Querying Firestore for new games...', 'blue');

  let query = db.collection(COLLECTION);

  query = query.orderBy('timeCreated', 'asc');

  if (latestTimestamp) {
    query = query.where('timeCreated', '>', latestTimestamp);
    log(`Fetching games after ${latestTimestamp.toISOString()}`);
  } else {
    log('Fetching all games (no local logs found)');
  }

  if (limit) {
    query = query.limit(limit);
    log(`Limiting to ${limit} games`);
  }

  const snapshot = await query.select('timeCreated').get();

  const games = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    const timeCreated = data.timeCreated;

    games.push({
      id: doc.id,
      timestamp: timeCreated ? timeCreated.toDate() : new Date(),
    });
  });

  return games;
}

async function fetchGameData(db, gameId) {
  const doc = await db.collection(COLLECTION).doc(gameId).get();

  if (!doc.exists) {
    return null;
  }

  return doc.data();
}

function convertFirestoreData(data) {
  // Recursively convert Firestore timestamps and references to JSON-friendly format
  if (data === null || data === undefined) {
    return data;
  }

  if (data instanceof admin.firestore.Timestamp) {
    return {
      _seconds: data.seconds,
      _nanoseconds: data.nanoseconds,
    };
  }

  if (data instanceof admin.firestore.DocumentReference) {
    return data.path;
  }

  if (Array.isArray(data)) {
    return data.map(item => convertFirestoreData(item));
  }

  if (typeof data === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = convertFirestoreData(value);
    }
    return result;
  }

  return data;
}

async function saveGameLog(gameId, timestamp, data) {
  // gameId from Firestore is the full document name like "2025-08-27T19:29:11.847Z_FPL"
  // Extract just the 3-letter code
  let code = gameId;
  if (gameId.includes('_')) {
    code = gameId.split('_').pop();
  }

  const isoString = timestamp.toISOString();
  const filename = `${isoString}_${code}`;
  const filepath = path.join(LOGS_DIR, filename);

  const jsonData = convertFirestoreData(data);

  await fs.writeFile(filepath, JSON.stringify(jsonData, null, 2));

  return filename;
}

async function main() {
  try {
    log('Finding latest local game...', 'blue');
    const { timestamp: latestTimestamp, gameId: latestGameId } = await findLatestLocalGame();

    if (latestTimestamp) {
      log(`Latest local game: ${latestGameId} at ${latestTimestamp.toISOString()}`);
    } else {
      log('No local games found');
    }

    const db = await initializeFirebase();

    const newGames = await fetchNewGameIds(db, latestTimestamp);

    if (newGames.length === 0) {
      log('✓ No new games found!', 'green');
      return;
    }

    log(`Found ${newGames.length} new games`, 'green');

    if (dryRun) {
      log('\nDRY RUN - Would download these games:', 'blue');
      const preview = newGames.slice(0, 10);
      for (const game of preview) {
        console.log(`  ${game.id} (${game.timestamp.toISOString()})`);
      }
      if (newGames.length > 10) {
        console.log(`  ... and ${newGames.length - 10} more`);
      }
      return;
    }

    log('\nDownloading game data...', 'blue');
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < newGames.length; i++) {
      const game = newGames[i];
      const progress = `[${i + 1}/${newGames.length}]`;

      try {
        process.stdout.write(`${progress} Downloading ${game.id}...`);

        const data = await fetchGameData(db, game.id);

        if (data) {
          await saveGameLog(game.id, game.timestamp, data);
          console.log(` ✓`);
          successCount++;
        } else {
          console.log(` ✗ No data found`);
          failCount++;
        }
      } catch (error) {
        console.log(` ✗ Error: ${error.message}`);
        failCount++;
      }

      // Small delay to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('\n' + '='.repeat(50));
    log(`Successfully downloaded: ${successCount}`, 'green');
    if (failCount > 0) {
      log(`Failed: ${failCount}`, 'red');
    }
    console.log('='.repeat(50));

  } catch (error) {
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    log(`Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}
