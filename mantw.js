#!/usr/bin/env node

const vfile = require('to-vfile');
const unified = require('unified');
const markdown = require('remark-parse');
const man = require('remark-man');
const {exec, spawn} = require('child_process');
const fs = require('fs');

const bookSrcDirectory = fs.readFileSync(fs.realpathSync(__dirname) + '/book-src-directory-path.txt', 'utf8').split('\n')[0];

function main () {
  if (process.argv.length < 3) return showUsage();

  const shouldListMatchingFiles = process.argv.indexOf('-l') > -1;
  if (shouldListMatchingFiles) process.argv.splice(process.argv.indexOf('-l'), 1);

  const searchTerm = process.argv.slice(2).join(' ');

  const shouldSearch = process.argv.indexOf('-r') < 0;
  if (!shouldSearch) process.argv.splice(process.argv.indexOf('-r'), 1);

  if (!shouldSearch) {
    const filename = process.argv[process.argv.length - 1];
    if (!filename) return showUsage();

    return showManPageForFile(filename);
  }

  searchForTerm(searchTerm, shouldListMatchingFiles, filename => {
    if (filename) showManPageForFile(filename);
  });
}

function searchForTerm(searchTerm, shouldListMatchingFiles, cb) {
  exec(`grep -irE '${searchTerm.replace(' ', '|')}' ${bookSrcDirectory}/*.md`, {maxBuffer: 1024 * 1024 * 500}, (err, stdout) => {
    if (err) {
      console.log(`No results for "${searchTerm}"`);
      return;
    }

    const outputLines = stdout.split('\n');
    const occurrenceCounts = outputLines.reduce((acc, line) => {
      const filename = line.split(':')[0];

      return {
        ...acc,
        [filename]: acc[filename] ? acc[filename] + 1 : 1
      };
    }, {});

    if (shouldListMatchingFiles) {
      const files = Object.keys(occurrenceCounts);
      files.sort((a, b) => occurrenceCounts[a] < occurrenceCounts[b] ? 1 : -1);
      files.forEach(file => console.log(file + ': ', occurrenceCounts[file]));
      return;
    }

    let maxCount = 0, maxFilename;
    Object.keys(occurrenceCounts).forEach(filename => {
      if (maxCount < occurrenceCounts[filename]) {
        maxCount = occurrenceCounts[filename];
        maxFilename = filename;
      }
    });

    return cb(maxFilename);
  });
}

async function showManPageForFile (filename) {
  let manFile;

  await unified()
    .use(markdown)
    .use(man)
    .process(vfile.readSync(filename), function(err, file) {
      if (err) throw err;
      file.extname = '.1';
      vfile.writeSync({...file, dirname: '/tmp'});
      manFile = '/tmp/' + file.basename;
    });

  spawn('man', [manFile], { stdio: ['ignore', 1, 2] });
}

function showUsage () {
  const usage = [
    '',
    'Usage:  mantw [-l|-r] <search term>',
    '',
    'Search the Tailwind docs and show the top result as a man page',
    '',
    '`mantw -l <search term>` lists all the files matching <search term>', 'with the number of occurrences',
    '',
    '`mantw -r <filename>` shows the man page for a specific page. (Use', ' the results from mantw -l to get a filename)'
  ].join('\n');

  console.log(usage);
}

main();
