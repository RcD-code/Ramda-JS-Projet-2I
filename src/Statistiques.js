import * as R from 'ramda';
import promptSync from 'prompt-sync';
const prompt = promptSync();

import { measurements, occurrences, specimens } from './data.js';


const normalizeId = id => (typeof id === 'string' ? id.trim().toLowerCase() : '');


const enrichSpecimens = specimens.records.map(spm => {
    const qidNormalized = normalizeId(spm.qid);
    const occurrence = R.find(o => normalizeId(o.oid) === qidNormalized, occurrences.records);
    const specimenMeasurements = R.filter(R.propEq('sid', spm.oid), measurements.records);
    return {
        ...spm,
        occurrence,
        measurements: specimenMeasurements,
    };
});


const tousOs = R.pipe(
    R.map(R.prop('smp')),
    R.filter(os => typeof os === 'string' && os.trim() !== ''),
    R.map(os => os.trim().toLowerCase())
)(enrichSpecimens);


const compteurOs = R.countBy(R.identity, tousOs);


const compteurTrie = R.pipe(
    R.toPairs,
    R.sortBy(R.head)
)(compteurOs);


const listeTousOs = R.pipe(
    R.uniq,
    R.sortBy(R.identity)
)(tousOs);


const groupedBySpecies = R.groupBy(R.prop('tna'), enrichSpecimens);

const totalSpecimens = R.length(specimens.records);
const totalMeasurements = R.length(measurements.records);
const totalOccurrences = R.length(occurrences.records);

const specimenCountBySpecies = R.map(R.length, groupedBySpecies);

const boneTypesBySpecies = R.map(
    R.pipe(R.map(R.prop('smp')), R.uniq, R.length),
    groupedBySpecies
);

const avgLengthBySpecies = R.map(specimens =>
        R.pipe(
            R.chain(R.prop('measurements')),
            R.filter(R.propEq('mty', 'length')),
            R.map(m => parseFloat(m.mva)),
            lengths => lengths.length > 0 ? R.mean(lengths).toFixed(3) : 'N/A'
        )(specimens),
    groupedBySpecies
);

const isValidNumber = n => typeof n === 'number' && !isNaN(n);

const minFossilAgeBySpecies = R.map(specimens => {
    const ages = specimens
        .map(s => s.occurrence?.lag)
        .filter(isValidNumber);
    return ages.length > 0 ? Math.min(...ages).toFixed(1) + ' Ma' : 'N/A';
}, groupedBySpecies);

const maxFossilAgeBySpecies = R.map(specimens => {
    const ages = specimens
        .map(s => s.occurrence?.eag)
        .filter(isValidNumber);
    return ages.length > 0 ? Math.max(...ages).toFixed(1) + ' Ma' : 'N/A';
}, groupedBySpecies);

// Fonctions d'affichage

const afficherListeEspeces = () => {
    console.log('\n===== Liste des Espèces =====');

    R.pipe(
        R.keys,
        R.sortBy(R.identity),
        R.addIndex(R.map)((nom, i) => `${i + 1}. ${nom}`),
        R.splitEvery(5),
        R.forEach(ligne => console.log(ligne.join(' | ')))
    )(groupedBySpecies);
};

const afficherInfosEspece = () => {
    const saisie = prompt("Entrez le nom exact de l'espèce : ");
    const nomEspece = R.trim(saisie);

    const estPresente = R.has(nomEspece, groupedBySpecies);

    R.ifElse(
        R.identity,
        () => {
            const osTrouves = R.pipe(
                R.map(R.prop('smp')),
                R.uniq,
                R.sortBy(R.identity)
            )(groupedBySpecies[nomEspece]);

            console.log(`\n===== Données pour l'espèce : ${nomEspece} =====`);
            R.forEach(({ label, valeur }) =>
                console.log(`- ${label} : ${valeur}`), [
                { label: "Nombre de spécimens", valeur: specimenCountBySpecies[nomEspece] },
                { label: "Nombre de types d'os différents", valeur: boneTypesBySpecies[nomEspece] },
                { label: "Âge Max du fossile", valeur: maxFossilAgeBySpecies[nomEspece] },
                { label: "Âge Min du fossile", valeur: minFossilAgeBySpecies[nomEspece] },
                { label: "Os trouvés", valeur: osTrouves.join(', ') }
            ]);
        },
        () => console.log("\nEspèce introuvable. Veuillez vérifier l'orthographe.\n")
    )(estPresente);
};

const donneesGlobales = () => {
    console.log('\n===== Données Globales =====');
    console.log(`Total de spécimens : ${totalSpecimens}`);
    console.log(`Total de mesures   : ${totalMeasurements}`);
    console.log(`Total d’occurrences : ${totalOccurrences}`);
    console.log(`Nombre d'espèces uniques : ${R.keys(groupedBySpecies).length}`);
};

// Menu principal de statistiques
export function MenuStatsGenerales() {
    let sortir = false;

    while (!sortir) {
        console.log('\n===== Statistiques Générales =====');
        console.log("1. Voir les données globales");
        console.log("2. Voir les différentes espèces");
        console.log("3. Voir les données d'une espèce");
        console.log("4. Voir la liste de types d'os");
        console.log("5. Retourner au menu principal");

        const choix = prompt("Entrez votre choix (1-5) : ");

        switch (choix) {
            case "1":
                donneesGlobales();
                break;
            case "2":
                afficherListeEspeces();
                break;
            case "3":
                afficherInfosEspece();
                break;
            case "4":
                console.log("Liste complète de tous les os trouvés :");
                console.log(listeTousOs.join(', '));
                console.log('\nNombre d\'apparitions par os :');
                compteurTrie.forEach(([os, count]) => {
                    console.log(`${os} : ${count}`);
                });
                break;
            case "5":
                sortir = true;
                break;
            default:
                console.log("Choix invalide\n");
        }
    }
}
