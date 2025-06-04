// CreationArbre.js
import * as fs from 'fs';
import * as R from 'ramda';
import { specimens, measurements, occurrences } from './data.js';
import promptSync from 'prompt-sync';

const prompt = promptSync();

export const arbrePhylogenetique = {
    name: 'Dinosauria',
    children: [
        {
            name: 'Ornithischia',
            children: [
                {
                    name: 'Thyreophora',
                    children: [
                        { name: 'Stegosauria', children: [] },
                        { name: 'Ankylosauria', children: [] }
                    ]
                },
                {
                    name: 'Cerapoda',
                    children: [
                        {
                            name: 'Marginocephalia',
                            children: [
                                { name: 'Pachycephalosauria', children: [] },
                                { name: 'Ceratopsia', children: [] }
                            ]
                        },
                        {
                            name: 'Ornithopoda',
                            children: [
                                { name: 'Iguanodontia', children: [] }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            name: 'Saurischia',
            children: [
                {
                    name: 'Sauropoda',
                    children: [
                        { name: 'Diplodocoidea', children: [] },
                        { name: 'Macronaria', children: [] }
                    ]
                },
                {
                    name: 'Theropoda',
                    children: [
                        { name: 'Coelophysoidea', children: [] },
                        {
                            name: 'Averostra',
                            children: [
                                { name: 'Ceratosauria', children: [] },
                                {
                                    name: 'Tetanurae',
                                    children: [
                                        { name: 'Megalosauroidea', children: [] },
                                        {
                                            name: 'Avetheropoda',
                                            children: [
                                                { name: 'Allosauroidea', children: [] },
                                                {
                                                    name: 'Coelurosauria',
                                                    children: [
                                                        { name: 'Tyrannosauroidea', children: [] },
                                                        {
                                                            name: 'Maniraptoriformes',
                                                            children: [
                                                                { name: 'Ornithomimosauria', children: [] },
                                                                {
                                                                    name: 'Maniraptora',
                                                                    children: [
                                                                        { name: 'Therizinosauria', children: [] },
                                                                        {
                                                                            name: 'Paraves',
                                                                            children: [
                                                                                { name: 'Avialae', children: [] }
                                                                            ]
                                                                        }
                                                                    ]
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
};

const IMPORTANT_BONES = ['femur', 'fibula', 'humerus', 'pubis', 'radius', 'scapula', 'skull'];

const normalizeId = id => id?.replace(/^[a-z]+:/, '') || '';

const listerTousLesGroupes = (noeud) => {
    const enfants = noeud.children || [];
    return [noeud.name.trim(), ...R.chain(listerTousLesGroupes, enfants)];
};
const tousLesGroupes = listerTousLesGroupes(arbrePhylogenetique);

// Fonction principale
export async function runClassificationEtEnrichissement() {

    const enrichSpecimens = specimens.records.map(spm => {
        const occ = R.find(o => normalizeId(o.oid) === normalizeId(spm.qid), occurrences.records);
        const specimenMeasurements = measurements.records
            .filter(m => normalizeId(m.sid) === normalizeId(spm.oid))
            .map(m => ({
                element: spm.smp?.toLowerCase(),
                value: parseFloat(m.mva)
            }))
            .filter(m => Number.isFinite(m.value));
        return { ...spm, occurrence: occ, measurements: specimenMeasurements };
    });


    const groupedBySpecies = R.groupBy(R.prop('tna'), enrichSpecimens);
    const especeList = R.pipe(R.keys, R.sortBy(R.identity))(groupedBySpecies);

    // Chargement anciennes données si existantes
    let resultat = [];
    if (fs.existsSync('species.json')) {
        resultat = JSON.parse(fs.readFileSync('species.json', 'utf-8'));
    }
    const especesExistantes = new Set(resultat.map(e => e.nom));

    // Classification manuelle + création initiale
    for (const nomEspece of especeList) {
        if (especesExistantes.has(nomEspece)) continue;

        console.log(`\nEspèce : ${nomEspece}`);
        console.log(tousLesGroupes.map((g, i) => `  ${i + 1}. ${g}`).join('    '));

        const choixRaw = prompt("Choisissez le groupe (numéro) ou 'q' pour quitter : ");
        if (choixRaw.toLowerCase() === 'q') {
            console.log("Saisie interrompue.");
            break;
        }
        const choix = parseInt(choixRaw);
        if (isNaN(choix) || choix <= 0 || choix > tousLesGroupes.length) {
            console.log("Choix invalide, on quitte la saisie.");
            break;
        }

        const specimensEspece = groupedBySpecies[nomEspece];
        const age_min = R.pipe(R.map(R.path(['occurrence', 'eag'])), R.filter(Number.isFinite), R.reduce(R.min, Infinity))(specimensEspece);
        const age_max = R.pipe(R.map(R.path(['occurrence', 'lag'])), R.filter(Number.isFinite), R.reduce(R.max, -Infinity))(specimensEspece);

        const os = R.pipe(
            R.chain(R.prop('measurements')),
            R.groupBy(R.prop('element')),
            R.map(R.pipe(R.map(R.prop('value')), R.filter(Number.isFinite), R.mean))
        )(specimensEspece);

        const infos = {
            nom: nomEspece,
            classification: tousLesGroupes[choix - 1],
            nombre_specimens: specimensEspece.length,
            age_min,
            age_max,
            os
        };

        resultat.push(infos);
    }

    fs.writeFileSync('species.json', JSON.stringify(resultat, null, 4), 'utf-8');
    console.log("\nFichier species.json généré !");

    //Completer os
    const reponse = prompt("Souhaitez-vous enrichir les os manquants ? (o/n) : ");
    if (reponse.toLowerCase() === 'o') {
        const toutesLesEspecesConnues = JSON.parse(fs.readFileSync('species.json', 'utf-8'));

        const especesAvecOsConnus = toutesLesEspecesConnues.map(espece => ({
            ...espece,
            os: R.pickBy(Number.isFinite, espece.os)
        }));

        const rechercherVoisins = (classification, bone) =>
            R.pipe(
                R.filter(e => (e.classification.includes(classification) || classification.includes(e.classification)) && Number.isFinite(e.os[bone])),
                R.map(e => e.os[bone])
            )(especesAvecOsConnus);

        const especesAvecOsComplets = toutesLesEspecesConnues.map(espece => {
            const osComplets = R.fromPairs(
                IMPORTANT_BONES.map(bone => {
                    const valeurExistante = espece.os[bone];
                    if (Number.isFinite(valeurExistante)) {
                        return [bone, valeurExistante];
                    }
                    const voisins = rechercherVoisins(espece.classification, bone);
                    const estimation = R.mean(voisins);
                    return [bone, Number.isFinite(estimation) ? estimation : null];
                })
            );
            return { ...espece, os: osComplets };
        });

        fs.writeFileSync('species.json', JSON.stringify(especesAvecOsComplets, null, 4), 'utf-8');
        console.log("\nEnrichissement des os complété !");
    }
}
