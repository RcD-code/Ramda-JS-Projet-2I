import fs from "fs-extra";
import * as R from "ramda";


const measurements = fs.readJsonSync("../data/measurement.json");
const occurences = fs.readJsonSync("../data/occurence.json");
const specimens = fs.readJsonSync("../data/specimens.json");


const totalMeasurements = R.length(measurements['records']);
const totalSpecimens = R.length(specimens['records']);
const totalOccurences = R.length(occurences['records']);

const groupedBySpecies = R.groupBy(R.prop('tna'), specimens['records']);
const countBySpecies = R.map(R.length, groupedBySpecies);


const main = () => {
    console.log(`\nNombre total de mesures sur les dinosaures : ${totalMeasurements}`);
    console.log(`\nNombre total d'occurrences enregistrées : ${totalOccurences}`);
    console.log(`\nNombre total de parties du corps enregistrées : ${totalSpecimens}`);
    console.log(`\nNombre d'os retrouvés par espèce : ${countBySpecies}`);
};

main();