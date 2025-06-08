import fs from 'fs-extra';
import * as R from 'ramda';
import promptSync from 'prompt-sync';
const prompt = promptSync();


// Chargement des données
import { measurements, occurrences, specimens } from './data.js';

// Imports des sous-programmes
import { MenuStatsGenerales } from "./Statistiques.js";
 import { machineLearning } from "./MethodeML.js";
import {DetectionEspece} from "./DetectionEspeceParFossile.js";
import { arbrePhylogenetique, runClassificationEtEnrichissement } from './CreationArbre.js';


function afficherMenu() {
    console.log("1. Menu des statistiques générales");
    console.log("2. Remplir le dossier sur les espèces");
    console.log("3. Voir des prédictions d'especes par machine learning");
    console.log("4. Identifier le taxon d'un fossile que vous avez trouvé");
    console.log("5. Quitter");
}

const main = async () => {
    let sortir = false;

    console.log(
        "\t\t\t\t\t     ___________________________\n" +
        "\t\t\t\t\t    /________________________  /\n" +
        "\t\t\t\t\t   //                        //\n" +
        "\t\t\t\t\t  //   Ramda Etude Fossiles //\n" +
        "\t\t\t\t\t //________________________//\n" +
        "\t\t\t\t\t/__________________________/"
    );

    while (!sortir) {
        afficherMenu();
        const choix = prompt("Entrez votre choix (1-5) : ");

        switch (choix) {
            case "1":
                MenuStatsGenerales();
                break;
            case "2":
                await runClassificationEtEnrichissement();
                break;
            case "3":
                machineLearning();
                break;
            case "4":

                DetectionEspece();
                break;
            case "5":
                console.log("Fin du programme\n");
                sortir = true;
                break;
            default:
                console.log("Choix invalide\n");
        }
    }
};

main();
