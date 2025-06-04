import fs from 'fs';

const corrections = {
    fibual: 'fibula',
    radi: 'radius',
    redius: 'radius',
    femora: 'femur',
    scapulacoracoid: 'scapula',
    scapulocodacoid: 'scapula',
    scapulocoracoid: 'scapula',
    'juvenile coracoid': 'coracoid',
    'juvenile humerus': 'humerus',
    'juvenile radius': 'radius',
    'juvenile scapula': 'scapula',
    'juvenile skull': 'skull',
    'proximal femur': 'femur',
    metatarsus: 'metatarsal',
};

const nettoyerOs = (os) => {
    if (!os) return os;
    const osNettoye = os.toLowerCase().trim();
    return corrections[osNettoye] || osNettoye;
};

const pathJson = '../data/specimens.json';

if (!fs.existsSync(pathJson)) {
    console.error(`Fichier non trouvé : ${pathJson}`);
    process.exit(1);
}

const rawData = fs.readFileSync(pathJson, 'utf8');
const data = JSON.parse(rawData);

data.records = data.records.map(record => ({
    ...record,
    smp: nettoyerOs(record.smp),
}));

fs.writeFileSync(pathJson, JSON.stringify(data, null, 2), 'utf8');

console.log(`Fichier ${pathJson} réécrit avec les noms d’os corrigés.`);
