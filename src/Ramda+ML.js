import fs from "fs-extra"; // Pour lire les fichiers JSON
import * as R from "ramda";
import { DecisionTreeClassifier } from "ml-cart"; // Arbre de décision
import { RandomForestClassifier } from "../lib/ml/RandomForestClassifier.js"; // random forest n'a pas de module directement

const SEUIL_MIN_OCCURRENCES = 12; // On garde uniquement les parties du corps et espèces fréquentes
// sinon en dessous de 12 parties retrouvées les modèles mémorisent

// Chargement des fichiers JSON
const mesures = fs.readJsonSync("../data/measurement.json")["records"]; // Mesures physiques des parties du corps
const specimens = fs.readJsonSync("../data/specimens.json")["records"]; // description contenant partie du corps, espèce, et période

// Fonction utilitaire pour mélanger un tableau (algorithme de Fisher–Yates)
// Trouvée en ligne car Ramda ne propose pas de shuffle de ce qu'on a vu
const melanger = tableau => {
    const copie = [...tableau];
    for (let i = copie.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copie[i], copie[j]] = [copie[j], copie[i]];
    }
    return copie;
};

// Encodeur pour transformer des valeurs textuelles en indices numériques
// R.uniq retire les doublons, R.sortBy(R.identity) trie alphabétiquement les valeurs uniques
const Encodeur = valeurs => {
    const dictionnaire = R.pipe(
        R.uniq,             // Supprime les doublons
        R.sortBy(R.identity) // Trie les valeurs par ordre alphabétique ou numérique
    )(valeurs);

    return {
        encoder: val => {
            const index = dictionnaire.indexOf(val);
            if (index === -1) {
                console.warn(`Valeur inconnue ignorée : "${val}"`);
                return -1;
            }
            return index;
        },
        decoder: i => dictionnaire[i],
        tous: dictionnaire
    };
};

// Dictionnaire d’accès par identifiant de spécimen
const specimenParId = R.indexBy(R.prop("oid"), specimens);

// On regroupe les mesures par identifiant de spécimen
const mesuresParSpecimen = R.groupBy(R.prop("sid"), mesures);

// On transforme les mesures en objets { typeMesure: valeur }
const caracteristiquesParId = R.map(
    listeMesures =>
        listeMesures.reduce((acc, mesure) => {
            const valeur = parseFloat(mesure.mva);
            if (!isNaN(valeur)) {
                acc[mesure.mty] = valeur; // Exemple : acc["length"] = 200
            }
            return acc;
        }, {}),
    mesuresParSpecimen
);

// Pour test : affichage de la partie du corps d’un spécimen donné
console.log("Exemple SMP pour spm:80267 :", specimenParId["spm:80267"]?.smp);

// Construction du jeu de données brut (x = caractéristiques, y = espèce)
const DatasetBrut = Object.entries(caracteristiquesParId).map(([sid, features]) => {
    const specimen = specimenParId[sid];
    if (!specimen) return null;
    if (
        features.length === undefined &&
        features.circumference === undefined &&
        features.width === undefined
    ) return null;
    if (specimen.eag === undefined || specimen.lag === undefined) return null;

    const partieCorps = specimen.smp?.toLowerCase() || "";

    const xBrut = [
        features.length || 0,
        features.circumference || 0,
        features.width || 0,
        partieCorps,       // Partie anatomique (ex : skull, femur...)
        specimen.eag,      // Early Age directement depuis specimens.json
        specimen.lag       // Late Age directement depuis specimens.json
    ];

    const espece = specimen.tna;
    if (!espece || typeof espece !== "string" || espece.trim() === "") return null;
    if (xBrut.includes(undefined) || xBrut.includes(null)) return null;

    return { x: xBrut, y: espece };
});

const DatasetPlein = DatasetBrut.filter(Boolean); // On enlève les entrées nulles (null ou undefined)

// On garde uniquement les parties du corps les plus fréquentes
const occurencesSMP = R.countBy(d => d.x[3], DatasetPlein);
const partiesFrequentielles = Object.entries(occurencesSMP)
    .filter(([_, nb]) => nb >= SEUIL_MIN_OCCURRENCES)
    .map(([smp]) => smp);

// Et pareil pour les espèces
const occurencesEspeces = R.countBy(d => d.y, DatasetPlein);
const especesFrequentielles = Object.entries(occurencesEspeces)
    .filter(([_, nb]) => nb >= SEUIL_MIN_OCCURRENCES)
    .map(([nom]) => nom);

// On filtre pour ne garder que les entrées fréquentes
const DatasetFiltre = DatasetPlein.filter(d =>
    partiesFrequentielles.includes(d.x[3]) &&
    especesFrequentielles.includes(d.y)
);

// On encode les parties du corps et les espèces
const encodeurParties = Encodeur(DatasetFiltre.map(d => d.x[3]));
const encodeurEspeces = Encodeur(DatasetFiltre.map(d => d.y));

// Données finales encodées en numérique pour l'entraînement IA
const donneesEncodees = DatasetFiltre.map(d => {
    const partieEnc = encodeurParties.encoder(d.x[3]);
    const especeEnc = encodeurEspeces.encoder(d.y);
    if (partieEnc === -1 || especeEnc === -1) return null;

    return {
        x: [d.x[0], d.x[1], d.x[2], partieEnc, d.x[4], d.x[5]],
        y: especeEnc
    };
}).filter(Boolean); // Encore une fois, on nettoie les données potentiellement nulles

const X = donneesEncodees.map(d => d.x);
const y = donneesEncodees.map(d => d.y);

console.log(`Taille finale du set d'apprentissage : ${X.length}`);

// On mélange aléatoirement les indices pour la séparation train/test
const total = X.length;
const melangeIndices = melanger(R.range(0, total));
const tailleTrain = Math.floor(0.7 * total);
const indicesTrain = melangeIndices.slice(0, tailleTrain);
const indicesTest = melangeIndices.slice(tailleTrain);

// Séparation effective des données
const extraire = (tableau, indices) => indices.map(i => tableau[i]);
const X_train = extraire(X, indicesTrain);
const y_train = extraire(y, indicesTrain);
const X_test = extraire(X, indicesTest);
const y_test = extraire(y, indicesTest);

// Entraînement du modèle arbre de décision
const arbre = new DecisionTreeClassifier();
arbre.train(X_train, y_train);

// Entraînement du modèle forêt aléatoire
const foret = new RandomForestClassifier({
    nEstimators: 20,
    useSampleBagging: false // si on laisse le oob score actif ça bug, c'est une bonne métrique pourtant
});
foret.train(X_train, y_train);

// Fonction pour évaluer la précision d’un modèle
// Ici on implémente manuellement l'accuracy car les bibliothèques utilisées
// n'intègrent pas directement accuracy_score ou courbe ROC.
// on aurait pu aller plus loin sur ce point, ce serait un axe d'amélioration possible.
const precision = (modele, X, y) => {
    const prediction = modele.predict(X);
    const corrects = prediction.filter((p, i) => p === y[i]).length;
    return (corrects / y.length * 100).toFixed(2);
};

// Évaluation des modèles sur entraînement et test
const precisionTrainArbre = precision(arbre, X_train, y_train);
const precisionTestArbre = precision(arbre, X_test, y_test);
const precisionTrainForet = precision(foret, X_train, y_train);
const precisionTestForet = precision(foret, X_test, y_test);

// Affichage des résultats
console.log("\n--- Arbre de Décision ---");
console.log(`Précision entraînement : ${precisionTrainArbre} %`);
console.log(`Précision test         : ${precisionTestArbre} %`);
if (precisionTrainArbre - precisionTestArbre > 10)
    console.log("Surapprentissage probable (Arbre)");

console.log("\n--- Forêt Aléatoire ---");
console.log(`Précision entraînement : ${precisionTrainForet} %`);
console.log(`Précision test         : ${precisionTestForet} %`);
if (precisionTrainForet - precisionTestForet > 10)
    console.log("Surapprentissage probable (Forêt)");

// Test de prédiction sur un exemple simulé
const exemple = [
    523,                                // longueur
    170,                                // circonférence
    0,                                  // largeur
    encodeurParties.encoder("femur"),  // partie du corps encodée
    152.21,                             // Early Age
    149.2                               // Late Age
];

const predictionArbre = encodeurEspeces.decoder(arbre.predict([exemple])[0]);
const predictionForet = encodeurEspeces.decoder(foret.predict([exemple])[0]);

// Statistiques globales pour le résumé
const totalMesures = R.length(mesures);
const totalSpecimens = R.length(specimens);

const groupesParEspece = R.groupBy(R.prop("tna"), specimens);
const comptageParEspece = R.map(R.length, groupesParEspece);
const especesTriees = R.pipe(
    R.toPairs,                      // Transforme un objet en tableau de paires clé-valeur
    R.sort(R.descend(R.prop(1)))   // Trie par nombre décroissant d’occurrences
)(comptageParEspece);

// Affichage final
const main = () => {
    console.log(`\nNombre total de mesures : ${totalMesures}`);
    console.log(`Nombre total de parties de corps : ${totalSpecimens}`);

    console.log("\nEspèces triées par fréquence (≥ 12 parties) :");
    especesTriees.forEach(([espece, nb]) => {
        if (nb >= 12) {
            console.log(`- ${espece} : ${nb} parties`);
        }
    });

    console.log("\nExemple de ligne encodée :");
    console.log(exemple);
    console.log("\nPrédiction Arbre de Décision :", predictionArbre);
    console.log("Prédiction Forêt Aléatoire   :", predictionForet);
};

main();
