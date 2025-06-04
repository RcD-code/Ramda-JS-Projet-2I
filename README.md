# Ramda-JS-Projet-2I
Analyse de données paléontologiques 

Auteurs : Raphaël CRUEYZE
          Gabriel PADRINO

Ce programme a pour but de centraliser les données de la database paleobiodb et de pouvoir prédire l'appartenance d'un fossil de dinosaure inconnu à une espèce.

Ce programme est composé de sept fichier js chacun avec son utilité : 

1. Le main :
   Le main est là pour centraliser les autres fichiers et codes afin de permettre à l'utilisateur de tester nos solutions

2. Statistiques :
   Ce fichier permet d'avoir des informations basiques sur les datasets utilisés telles que les noms des espèces, les données obtenues sur une espèce ou tout simplement es données globales sur l'ensemble du dataset

3. CreationArbre
   Un élément qui manque aux datasets que nous avons est la position de chaque espèce dans l'arbre phylogénétique de la clade Dinosauria (l'arbre de vie et d'évolution des dinosaures). Grace à ce programme, il est possible de completer un fichier json qui facilitera la recherche d'une espece grace à sa position dans l'arbre. De plus nous faisons des prédictions sur la tailles des os que nous n'avons pas

4. MethodeML
     Ce fichier contient un code montrant que nous pouvons prédire l'appartenance d'un spécimen à une espèce grace à un RandomForestClassifier. Cette méthode est limité à des espèces dont nous avons assez de données mais est très précise.

5. DetectionEspeceParFossile
     Ce code demande à l'utilisateur de rentrer les caractéristiques d'un os qu'il a trouvé afin d'essayer de prédire de quelle espèce il appartient. Cette méthode utilise l'arbre phylogénétique des dinosaures pour se débarasser d'un maximum d'espèces afin d'être le plus précis possible.

Malheureusement, n'ayant aucun accès aux coordonnées des sites de fouilles des fossiles, nous sommes limités dans nos prédictions et pouvons parfois nous confondre sur deux dinosaures du même clade.
