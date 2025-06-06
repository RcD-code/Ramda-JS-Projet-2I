import * as fs from 'fs';
import * as R from 'ramda';
import promptSync from 'prompt-sync';
import { arbrePhylogenetique } from './CreationArbre.js';

const prompt = promptSync();

export function DetectionEspece() {
    // Lecture des données
    const speciesData = JSON.parse(fs.readFileSync('species.json', 'utf-8'));

    // Saisie utilisateur
    const nomOs = prompt('Nom de l’os : ');
    const tailleStr = prompt('Taille de l’os (en cm) : ');
    const taille = parseFloat(tailleStr);
    const choixBinaire = prompt('Type de mesure : 1 pour longueur, 0 pour circonférence : ');
    const typeMesure = choixBinaire === '1' ? 'longueur' : 'circonférence';
    const anneeStr = prompt("Age de l'os : ");
    const annee = parseFloat(anneeStr);

    // Fonction pour trouver le chemin complet dans l'arbre jusqu'à un noeud donné
    const trouverChemin = (noeud, nomRecherche, chemin = []) => {
        if (noeud.name.trim() === nomRecherche.trim()) {
            return [...chemin, noeud.name.trim()];
        }
        if (!noeud.children) return null;
        for (const enfant of noeud.children) {
            const res = trouverChemin(enfant, nomRecherche, [...chemin, noeud.name.trim()]);
            if (res) return res;
        }
        return null;
    };

    // Pré-calculer la classification complète pour chaque espèce
    const speciesWithFullClassification = speciesData.map(espece => {
        const fullClassif = trouverChemin(arbrePhylogenetique, espece.classification);
        if (!fullClassif) {
            console.warn(`Classification complète non trouvée pour ${espece.nom} (${espece.classification})`);
        }
        return { ...espece, fullClassification: fullClassif || [espece.classification] };
    });

    // Choix du groupe cible par navigation
    const choisirGroupe = (noeud) => {
        let courant = noeud;
        let chemin = [courant.name.trim()];

        while (courant.children && courant.children.length > 0) {
            console.log(`\nVous êtes dans : ${courant.name.trim()}`);
            courant.children.forEach((child, i) => {
                console.log(`${i + 1}. ${child.name.trim()}`);
            });
            console.log("0. Arrêter ici");

            const saisie = prompt("Choisissez un sous-groupe : ");
            const choix = parseInt(saisie);
            if (choix === 0 || isNaN(choix)) break;
            const suivant = courant.children[choix - 1];
            if (!suivant) break;

            courant = suivant;
            chemin.push(courant.name.trim());
        }

        return chemin;
    };

    const cheminChoisi = choisirGroupe(arbrePhylogenetique);
    const groupeChoisi = cheminChoisi[cheminChoisi.length - 1];

    // Vérifier si groupeChoisi est ancêtre ou égal dans la classification complète
    const estAncestorOuEgal = (ancestor, descendantPath) => descendantPath.includes(ancestor);

    // Calcul distance taille pour tri
    const distanceTaille = (espece, taille, type) => {
        const min = espece[`${type}_os_min`];
        const max = espece[`${type}_os_max`];
        if (!R.is(Number, min) || !R.is(Number, max)) return Infinity;
        if (taille < min) return min - taille;
        if (taille > max) return taille - max;
        return 0;
    };

    // Filtrer les candidats
    const candidates = R.pipe(
        R.filter(espece => estAncestorOuEgal(groupeChoisi, espece.fullClassification)),
        R.filter(espece => R.is(Number, espece.age_min) && R.is(Number, espece.age_max)),
        R.filter(espece => espece.age_min <= annee && espece.age_max >= annee),
        R.sortBy(espece => distanceTaille(espece, taille, typeMesure))
    )(speciesWithFullClassification);

    if (candidates.length === 0) {
        console.log("\nAucune espèce compatible trouvée avec les critères donnés.");
    } else {
        const top = R.head(candidates);
        console.log("\nEspèce la plus probable :");
        console.log(`Nom : ${top.nom}`);
        console.log(`Classification complète : ${top.fullClassification.join(' > ')}`);
        console.log(`Période : de ${top.age_min} à ${top.age_max} millions d'années`);
        console.log(`${typeMesure} os : ${top[`${typeMesure}_os_min`]} cm à ${top[`${typeMesure}_os_max`]} cm`);
    }
}
