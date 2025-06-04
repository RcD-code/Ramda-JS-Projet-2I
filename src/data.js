import fs from 'fs-extra';

export const measurements = fs.readJsonSync('../data/measurement.json');
export const occurrences = fs.readJsonSync('../data/occurence.json');
export const specimens = fs.readJsonSync('../data/specimens.json');