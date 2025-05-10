import fs from "fs-extra";
import * as R from "ramda";

const measurements = fs.readJsonSync("../data/measurement.json");
const occurrences = fs.readJsonSync("../data/occurence.json");
const specimens = fs.readJsonSync("../data/specimens.json");

const countBySpecies = R.pipe(
    R.pluck('tna'),
    R.countBy(R.identity)


);

const countBonesPerSpecies = R.pipe(
    R.groupBy(R.prop('tna')),
    R.map(R.pipe(
        R.countBy(R.prop('smp'))
    ))
);

const speciesCounts = countBySpecies(specimens['records']);

const totalMeasurements = R.length(measurements['records']);
const totalSpecimens = R.length(specimens['records']);
const totalOccurrences = R.length(occurrences['records']);

const main = () => {
    console.log(`\nNombre total de mesures sur les dinosaures : ${totalMeasurements}`);
    console.log(`\nNombre total d'occurrences enregistrées : ${totalOccurrences}`);
    console.log(`\nNombre total de spécimens de dinosaures enregistrés : ${totalSpecimens}`);
    console.log(`\nNombre total d'espèces uniques : ${R.keys(speciesCounts).length}`);
    //console.log(`\nDétail du nombre d'occurrences par espèce :\n`, speciesCounts);

    const bonesPerSpecies = countBonesPerSpecies(specimens['records']);

    console.log(`\nNombre d’os différents par espèce :\n`, bonesPerSpecies);
};

main();
