
// convertDatesToExtendedJSON.js
// Usage: node convertDatesToExtendedJSON.js original.json output.json

const fs = require('fs');

if (process.argv.length !== 4) {
  console.error('Usage: node convertDatesToExtendedJSON.js input.json output.json');
  process.exit(1);
}

const [inputFile, outputFile] = process.argv.slice(2);

const raw = fs.readFileSync(inputFile);
const data = JSON.parse(raw);

const converted = data.map(entry => {
  const iso = new Date(entry.date).toISOString();
  return {
    ...entry,
    date: { "$date": iso }
  };
});

fs.writeFileSync(outputFile, JSON.stringify(converted, null, 2));
console.log(`Converted ${data.length} records to Extended JSON -> ${outputFile}`);
