import fs from "fs-extra";
import * as R from "ramda";


const measurements = fs.readJsonSync("../data/measurement.json");
const occurences = fs.readJsonSync("../data/occurence.json");
const specimens = fs.readJsonSync("../data/specimens.json");


const totalMeasurements = R.length(measurements['records']);
const totalSpecimens = R.length(specimens['records']);
const totalOccurences = R.length(occurences['records']);

const main = () => {
    console.log(`\nNombre total de mesures sur les dinosaures : ${totalMeasurements}`);
    console.log(`\nNombre total d'occurences enregistré : ${totalOccurences}`);
    console.log(`\nNombre total de specimens de dinosaures enregistré : ${totalSpecimens}`);
};

main();