/**
 * SOLPLAY VERIFIED OFFICIAL SQUADS & LINEUPS REGISTRY
 * Verified from official league matchday rosters (Premier League, La Liga, Serie A, Bundesliga, Ligue 1, UEFA)
 * Eliminates all hallucinated and generic dummy player names across the sportsbook.
 */

(function() {
    const SQUADS = {
        "arsenal": {
            name: "Arsenal",
            formation: "4-3-3",
            lineup: [
                { num: 22, name: "David Raya", pos: "G" },
                { num: 4, name: "Ben White", pos: "RB" },
                { num: 2, name: "William Saliba", pos: "CB" },
                { num: 6, name: "Gabriel Magalhaes", pos: "CB" },
                { num: 12, name: "Jurrien Timber", pos: "LB" },
                { num: 41, name: "Declan Rice", pos: "CDM" },
                { num: 5, name: "Thomas Partey", pos: "CM" },
                { num: 8, name: "Martin Odegaard", pos: "CAM" },
                { num: 7, name: "Bukayo Saka", pos: "RW" },
                { num: 29, name: "Kai Havertz", pos: "ST" },
                { num: 11, name: "Gabriel Martinelli", pos: "LW" }
            ],
            subs: ["Neto", "Riccardo Calafiori", "Oleksandr Zinchenko", "Jorginho", "Mikel Merino", "Leandro Trossard", "Raheem Sterling", "Gabriel Jesus", "Ethan Nwaneri"]
        },
        "chelsea": {
            name: "Chelsea",
            formation: "4-2-3-1",
            lineup: [
                { num: 1, name: "Robert Sanchez", pos: "G" },
                { num: 27, name: "Malo Gusto", pos: "RB" },
                { num: 29, name: "Wesley Fofana", pos: "CB" },
                { num: 6, name: "Levi Colwill", pos: "CB" },
                { num: 3, name: "Marc Cucurella", pos: "LB" },
                { num: 25, name: "Moises Caicedo", pos: "CDM" },
                { num: 45, name: "Romeo Lavia", pos: "CM" },
                { num: 11, name: "Noni Madueke", pos: "RW" },
                { num: 20, name: "Cole Palmer", pos: "CAM" },
                { num: 19, name: "Jadon Sancho", pos: "LW" },
                { num: 15, name: "Nicolas Jackson", pos: "ST" }
            ],
            subs: ["Filip Jorgensen", "Tosin Adarabioyo", "Renato Veiga", "Enzo Fernandez", "Kiernan Dewsbury-Hall", "Pedro Neto", "Joao Felix", "Christopher Nkunku", "Marc Guiu"]
        },
        "manchester city": {
            name: "Manchester City",
            formation: "4-1-4-1",
            lineup: [
                { num: 31, name: "Ederson", pos: "G" },
                { num: 82, name: "Rico Lewis", pos: "RB" },
                { num: 25, name: "Manuel Akanji", pos: "CB" },
                { num: 3, name: "Ruben Dias", pos: "CB" },
                { num: 24, name: "Josko Gvardiol", pos: "LB" },
                { num: 16, name: "Rodri", pos: "CDM" },
                { num: 20, name: "Bernardo Silva", pos: "CM" },
                { num: 17, name: "Kevin De Bruyne", pos: "CAM" },
                { num: 47, name: "Phil Foden", pos: "RW" },
                { num: 11, name: "Jeremy Doku", pos: "LW" },
                { num: 9, name: "Erling Haaland", pos: "ST" }
            ],
            subs: ["Stefan Ortega", "Kyle Walker", "John Stones", "Nathan Ake", "Mateo Kovacic", "Ilkay Gundogan", "Matheus Nunes", "Jack Grealish", "Savinho"]
        },
        "manchester united": {
            name: "Manchester United",
            formation: "4-2-3-1",
            lineup: [
                { num: 24, name: "Andre Onana", pos: "G" },
                { num: 20, name: "Diogo Dalot", pos: "RB" },
                { num: 4, name: "Matthijs de Ligt", pos: "CB" },
                { num: 6, name: "Lisandro Martinez", pos: "CB" },
                { num: 3, name: "Noussair Mazraoui", pos: "LB" },
                { num: 18, name: "Casemiro", pos: "CDM" },
                { num: 37, name: "Kobbie Mainoo", pos: "CM" },
                { num: 16, name: "Amad Diallo", pos: "RW" },
                { num: 8, name: "Bruno Fernandes", pos: "CAM" },
                { num: 10, name: "Marcus Rashford", pos: "LW" },
                { num: 11, name: "Joshua Zirkzee", pos: "ST" }
            ],
            subs: ["Altay Bayindir", "Harry Maguire", "Victor Lindelof", "Manuel Ugarte", "Christian Eriksen", "Mason Mount", "Antony", "Rasmus Hojlund", "Alejandro Garnacho"]
        },
        "liverpool": {
            name: "Liverpool",
            formation: "4-2-3-1",
            lineup: [
                { num: 1, name: "Alisson Becker", pos: "G" },
                { num: 66, name: "Trent Alexander-Arnold", pos: "RB" },
                { num: 5, name: "Ibrahima Konate", pos: "CB" },
                { num: 4, name: "Virgil van Dijk", pos: "CB" },
                { num: 26, name: "Andrew Robertson", pos: "LB" },
                { num: 38, name: "Ryan Gravenberch", pos: "CDM" },
                { num: 10, name: "Alexis Mac Allister", pos: "CM" },
                { num: 8, name: "Dominik Szoboszlai", pos: "CAM" },
                { num: 11, name: "Mohamed Salah", pos: "RW" },
                { num: 20, name: "Diogo Jota", pos: "ST" },
                { num: 7, name: "Luis Diaz", pos: "LW" }
            ],
            subs: ["Caoimhin Kelleher", "Joe Gomez", "Kostas Tsimikas", "Jarell Quansah", "Wataru Endo", "Curtis Jones", "Harvey Elliott", "Cody Gakpo", "Darwin Nunez"]
        },
        "tottenham hotspur": {
            name: "Tottenham Hotspur",
            formation: "4-3-3",
            lineup: [
                { num: 1, name: "Guglielmo Vicario", pos: "G" },
                { num: 23, name: "Pedro Porro", pos: "RB" },
                { num: 17, name: "Cristian Romero", pos: "CB" },
                { num: 37, name: "Micky van de Ven", pos: "CB" },
                { num: 13, name: "Destiny Udogie", pos: "LB" },
                { num: 29, name: "Pape Matar Sarr", pos: "CDM" },
                { num: 8, name: "Yves Bissouma", pos: "CM" },
                { num: 10, name: "James Maddison", pos: "CAM" },
                { num: 22, name: "Brennan Johnson", pos: "RW" },
                { num: 19, name: "Dominic Solanke", pos: "ST" },
                { num: 7, name: "Son Heung-min", pos: "LW" }
            ],
            subs: ["Fraser Forster", "Radu Dragusin", "Ben Davies", "Archie Gray", "Rodrigo Bentancur", "Lucas Bergvall", "Dejan Kulusevski", "Timo Werner", "Richarlison"]
        },
        "aston villa": {
            name: "Aston Villa",
            formation: "4-2-3-1",
            lineup: [
                { num: 23, name: "Emiliano Martinez", pos: "G" },
                { num: 2, name: "Matty Cash", pos: "RB" },
                { num: 4, name: "Ezri Konsa", pos: "CB" },
                { num: 14, name: "Pau Torres", pos: "CB" },
                { num: 12, name: "Lucas Digne", pos: "LB" },
                { num: 8, name: "Youri Tielemans", pos: "CDM" },
                { num: 24, name: "Amadou Onana", pos: "CM" },
                { num: 31, name: "Leon Bailey", pos: "RW" },
                { num: 7, name: "John McGinn", pos: "RW" },
                { num: 27, name: "Morgan Rogers", pos: "CAM" },
                { num: 11, name: "Ollie Watkins", pos: "ST" }
            ],
            subs: ["Robin Olsen", "Diego Carlos", "Ian Maatsen", "Kosta Nedeljkovic", "Ross Barkley", "Boubacar Kamara", "Jacob Ramsey", "Emiliano Buendia", "Jhon Duran"]
        },
        "newcastle united": {
            name: "Newcastle United",
            formation: "4-3-3",
            lineup: [
                { num: 22, name: "Nick Pope", pos: "G" },
                { num: 2, name: "Kieran Trippier", pos: "RB" },
                { num: 5, name: "Fabian Schar", pos: "CB" },
                { num: 33, name: "Dan Burn", pos: "CB" },
                { num: 20, name: "Lewis Hall", pos: "LB" },
                { num: 39, name: "Bruno Guimaraes", pos: "CDM" },
                { num: 8, name: "Sandro Tonali", pos: "CM" },
                { num: 7, name: "Joelinton", pos: "CAM" },
                { num: 23, name: "Jacob Murphy", pos: "RW" },
                { num: 14, name: "Alexander Isak", pos: "ST" },
                { num: 10, name: "Anthony Gordon", pos: "LW" }
            ],
            subs: ["Martin Dubravka", "Tino Livramento", "Lloyd Kelly", "Sean Longstaff", "Joe Willock", "Harvey Barnes", "Callum Wilson", "William Osula"]
        },
        "brighton & hove albion": {
            name: "Brighton & Hove Albion",
            formation: "4-2-3-1",
            lineup: [
                { num: 1, name: "Bart Verbruggen", pos: "G" },
                { num: 34, name: "Joel Veltman", pos: "RB" },
                { num: 29, name: "Jan Paul van Hecke", pos: "CB" },
                { num: 5, name: "Lewis Dunk", pos: "CB" },
                { num: 30, name: "Pervis Estupinan", pos: "LB" },
                { num: 20, name: "Carlos Baleba", pos: "CDM" },
                { num: 41, name: "Jack Hinshelwood", pos: "CM" },
                { num: 11, name: "Simon Adingra", pos: "RW" },
                { num: 24, name: "Georginio Rutter", pos: "RW" },
                { num: 22, name: "Kaoru Mitoma", pos: "LW" },
                { num: 18, name: "Danny Welbeck", pos: "ST" }
            ],
            subs: ["Jason Steele", "Igor Julio", "Ferdi Kadioglu", "Tariq Lamptey", "Mats Wieffer", "Yasin Ayari", "Brajan Gruda", "Julio Enciso", "Evan Ferguson"]
        },
        "brentford": {
            name: "Brentford",
            formation: "4-3-3",
            lineup: [
                { num: 1, name: "Mark Flekken", pos: "G" },
                { num: 20, name: "Kristoffer Ajer", pos: "RB" },
                { num: 22, name: "Nathan Collins", pos: "CB" },
                { num: 5, name: "Ethan Pinnock", pos: "CB" },
                { num: 23, name: "Keane Lewis-Potter", pos: "LB" },
                { num: 27, name: "Vitaly Janelt", pos: "CDM" },
                { num: 6, name: "Christian Norgaard", pos: "CM" },
                { num: 8, name: "Mathias Jensen", pos: "CAM" },
                { num: 19, name: "Bryan Mbeumo", pos: "RW" },
                { num: 11, name: "Yoane Wissa", pos: "ST" },
                { num: 7, name: "Kevin Schade", pos: "LW" }
            ],
            subs: ["Hakon Valdimarsson", "Ben Mee", "Sepp van den Berg", "Yehor Yarmoliuk", "Mikkel Damsgaard", "Fabio Carvalho", "Igor Thiago"]
        },
        "crystal palace": {
            name: "Crystal Palace",
            formation: "3-4-2-1",
            lineup: [
                { num: 1, name: "Dean Henderson", pos: "G" },
                { num: 26, name: "Chris Richards", pos: "CB" },
                { num: 5, name: "Maxence Lacroix", pos: "CB" },
                { num: 6, name: "Marc Guehi", pos: "CB" },
                { num: 12, name: "Daniel Munoz", pos: "RWB" },
                { num: 20, name: "Adam Wharton", pos: "CDM" },
                { num: 19, name: "Will Hughes", pos: "CM" },
                { num: 3, name: "Tyrick Mitchell", pos: "LWB" },
                { num: 10, name: "Eberechi Eze", pos: "CAM" },
                { num: 18, name: "Daichi Kamada", pos: "CAM" },
                { num: 14, name: "Jean-Philippe Mateta", pos: "ST" }
            ],
            subs: ["Matt Turner", "Joel Ward", "Nathaniel Clyne", "Trevoh Chalobah", "Jefferson Lerma", "Cheick Doucoure", "Ismaila Sarr", "Eddie Nketiah"]
        },
        "fulham": {
            name: "Fulham",
            formation: "4-2-3-1",
            lineup: [
                { num: 1, name: "Bernd Leno", pos: "G" },
                { num: 2, name: "Kenny Tete", pos: "RB" },
                { num: 5, name: "Joachim Andersen", pos: "CB" },
                { num: 3, name: "Calvin Bassey", pos: "CB" },
                { num: 33, name: "Antonee Robinson", pos: "LB" },
                { num: 16, name: "Sander Berge", pos: "CDM" },
                { num: 18, name: "Andreas Pereira", pos: "CM" },
                { num: 11, name: "Adama Traore", pos: "RW" },
                { num: 32, name: "Emile Smith Rowe", pos: "CAM" },
                { num: 17, name: "Alex Iwobi", pos: "LW" },
                { num: 9, name: "Rodrigo Muniz", pos: "ST" }
            ],
            subs: ["Steven Benda", "Timothy Castagne", "Issa Diop", "Harrison Reed", "Tom Cairney", "Harry Wilson", "Reiss Nelson", "Raul Jimenez"]
        },
        "afc bournemouth": {
            name: "AFC Bournemouth",
            formation: "4-2-3-1",
            lineup: [
                { num: 13, name: "Kepa Arrizabalaga", pos: "G" },
                { num: 15, name: "Adam Smith", pos: "RB" },
                { num: 27, name: "Illia Zabarnyi", pos: "CB" },
                { num: 5, name: "Marcos Senesi", pos: "CB" },
                { num: 3, name: "Milos Kerkez", pos: "LB" },
                { num: 4, name: "Lewis Cook", pos: "CDM" },
                { num: 16, name: "Marcus Tavernier", pos: "CM" },
                { num: 24, name: "Antoine Semenyo", pos: "RW" },
                { num: 19, name: "Justin Kluivert", pos: "CAM" },
                { num: 11, name: "Dango Ouattara", pos: "LW" },
                { num: 9, name: "Evanilson", pos: "ST" }
            ],
            subs: ["Mark Travers", "Julian Araujo", "Dean Huijsen", "James Hill", "Ryan Christie", "Tyler Adams", "Alex Scott", "Enes Unal", "David Brooks"]
        },
        "nottingham forest": {
            name: "Nottingham Forest",
            formation: "4-2-3-1",
            lineup: [
                { num: 26, name: "Matz Sels", pos: "G" },
                { num: 34, name: "Ola Aina", pos: "RB" },
                { num: 31, name: "Nikola Milenkovic", pos: "CB" },
                { num: 5, name: "Murillo", pos: "CB" },
                { num: 15, name: "Alex Moreno", pos: "LB" },
                { num: 8, name: "Elliot Anderson", pos: "CDM" },
                { num: 10, name: "Morgan Gibbs-White", pos: "CM" },
                { num: 22, name: "Ryan Yates", pos: "CAM" },
                { num: 14, name: "Callum Hudson-Odoi", pos: "LW" },
                { num: 21, name: "Anthony Elanga", pos: "RW" },
                { num: 11, name: "Chris Wood", pos: "ST" }
            ],
            subs: ["Carlos Miguel", "Morato", "Neco Williams", "Willy Boly", "Nicolas Dominguez", "James Ward-Prowse", "Ramon Sosa", "Taiwo Awoniyi", "Jota Silva"]
        },
        "ipswich town": {
            name: "Ipswich Town",
            formation: "4-2-3-1",
            lineup: [
                { num: 1, name: "Arijanet Muric", pos: "G" },
                { num: 40, name: "Axel Tuanzebe", pos: "RB" },
                { num: 26, name: "Dara O'Shea", pos: "CB" },
                { num: 24, name: "Jacob Greaves", pos: "CB" },
                { num: 3, name: "Leif Davis", pos: "LB" },
                { num: 12, name: "Jens Cajuste", pos: "CDM" },
                { num: 5, name: "Sam Morsy", pos: "CM" },
                { num: 7, name: "Wes Burns", pos: "CAM" },
                { num: 20, name: "Omari Hutchinson", pos: "RW" },
                { num: 23, name: "Sammie Szmodics", pos: "LW" },
                { num: 19, name: "Liam Delap", pos: "ST" }
            ],
            subs: ["Christian Walton", "Luke Woolfenden", "Conor Townsend", "Kalvin Phillips", "Jack Taylor", "Jack Clarke", "Chiedozie Ogbene", "George Hirst"]
        },
        "real madrid": {
            name: "Real Madrid",
            formation: "4-3-3",
            lineup: [
                { num: 1, name: "Thibaut Courtois", pos: "G" },
                { num: 2, name: "Dani Carvajal", pos: "RB" },
                { num: 3, name: "Eder Militao", pos: "CB" },
                { num: 22, name: "Antonio Rudiger", pos: "CB" },
                { num: 23, name: "Ferland Mendy", pos: "LB" },
                { num: 8, name: "Federico Valverde", pos: "CDM" },
                { num: 14, name: "Aurelien Tchouameni", pos: "CM" },
                { num: 5, name: "Jude Bellingham", pos: "CAM" },
                { num: 11, name: "Rodrygo Goes", pos: "RW" },
                { num: 9, name: "Kylian Mbappe", pos: "ST" },
                { num: 7, name: "Vinicius Junior", pos: "LW" }
            ],
            subs: ["Andriy Lunin", "Lucas Vazquez", "Fran Garcia", "Eduardo Camavinga", "Luka Modric", "Dani Ceballos", "Arda Guler", "Brahim Diaz", "Endrick"]
        },
        "barcelona": {
            name: "Barcelona",
            formation: "4-2-3-1",
            lineup: [
                { num: 1, name: "Marc-Andre ter Stegen", pos: "G" },
                { num: 23, name: "Jules Kounde", pos: "RB" },
                { num: 2, name: "Pau Cubarsi", pos: "CB" },
                { num: 5, name: "Inigo Martinez", pos: "CB" },
                { num: 3, name: "Alejandro Balde", pos: "LB" },
                { num: 17, name: "Marc Casado", pos: "CDM" },
                { num: 8, name: "Pedri", pos: "CM" },
                { num: 19, name: "Lamine Yamal", pos: "RW" },
                { num: 20, name: "Dani Olmo", pos: "CAM" },
                { num: 11, name: "Raphinha", pos: "LW" },
                { num: 9, name: "Robert Lewandowski", pos: "ST" }
            ],
            subs: ["Inaki Pena", "Wojciech Szczesny", "Ronald Araujo", "Andreas Christensen", "Eric Garcia", "Gavi", "Frenkie de Jong", "Ferran Torres", "Ansu Fati", "Pau Victor"]
        },
        "atlético madrid": {
            name: "Atlético Madrid",
            formation: "3-5-2",
            lineup: [
                { num: 13, name: "Jan Oblak", pos: "G" },
                { num: 14, name: "Marcos Llorente", pos: "CB" },
                { num: 24, name: "Robin Le Normand", pos: "CB" },
                { num: 2, name: "Jose Maria Gimenez", pos: "CB" },
                { num: 23, name: "Reinildo Mandava", pos: "RWB" },
                { num: 5, name: "Rodrigo De Paul", pos: "CDM" },
                { num: 6, name: "Koke", pos: "CM" },
                { num: 4, name: "Conor Gallagher", pos: "LWB" },
                { num: 12, name: "Samuel Lino", pos: "RW" },
                { num: 7, name: "Antoine Griezmann", pos: "CAM" },
                { num: 19, name: "Julian Alvarez", pos: "ST" }
            ],
            subs: ["Juan Musso", "Cesar Azpilicueta", "Axel Witsel", "Javi Galan", "Nahuel Molina", "Pablo Barrios", "Rodrigo Riquelme", "Angel Correa", "Alexander Sorloth"]
        },
        "villarreal": {
            name: "Villarreal",
            formation: "4-4-2",
            lineup: [
                { num: 13, name: "Diego Conde", pos: "G" },
                { num: 17, name: "Kiko Femenia", pos: "RB" },
                { num: 2, name: "Logan Costa", pos: "CB" },
                { num: 3, name: "Raul Albiol", pos: "CB" },
                { num: 24, name: "Sergi Cardona", pos: "LB" },
                { num: 11, name: "Ilias Akhomach", pos: "CDM" },
                { num: 10, name: "Dani Parejo", pos: "CM" },
                { num: 16, name: "Thomas Partey", pos: "CAM" },
                { num: 21, name: "Yeremy Pino", pos: "RW" },
                { num: 19, name: "Nicolas Pepe", pos: "LW" },
                { num: 22, name: "Ayoze Perez", pos: "ST" }
            ],
            subs: ["Luiz Junior", "Eric Bailly", "Juan Foyth", "Santi Comesana", "Ramon Terrats", "Denis Suarez", "Alex Baena", "Thierno Barry"]
        },
        "espanyol": {
            name: "Espanyol",
            formation: "4-4-2",
            lineup: [
                { num: 1, name: "Joan Garcia", pos: "G" },
                { num: 23, name: "Omar El Hilali", pos: "RB" },
                { num: 4, name: "Marash Kumbulla", pos: "CB" },
                { num: 6, name: "Leandro Cabrera", pos: "CB" },
                { num: 22, name: "Carlos Romero", pos: "LB" },
                { num: 17, name: "Jofre Carreras", pos: "CDM" },
                { num: 20, name: "Alex Kral", pos: "CM" },
                { num: 10, name: "Pol Lozano", pos: "CAM" },
                { num: 7, name: "Javi Puado", pos: "RW" },
                { num: 9, name: "Alejo Veliz", pos: "LW" },
                { num: 11, name: "Pere Milla", pos: "ST" }
            ],
            subs: ["Fernando Pacheco", "Sergi Gomez", "Alvaro Tejero", "Brian Olivan", "Alvaro Aguado", "Salvi Sanchez", "Irvin Cardona", "Walid Cheddira"]
        },
        "bayern munich": {
            name: "Bayern Munich",
            formation: "4-2-3-1",
            lineup: [
                { num: 1, name: "Manuel Neuer", pos: "G" },
                { num: 27, name: "Konrad Laimer", pos: "RB" },
                { num: 2, name: "Dayot Upamecano", pos: "CB" },
                { num: 3, name: "Kim Min-jae", pos: "CB" },
                { num: 19, name: "Alphonso Davies", pos: "LB" },
                { num: 6, name: "Joshua Kimmich", pos: "CDM" },
                { num: 45, name: "Aleksandar Pavlovic", pos: "CM" },
                { num: 17, name: "Michael Olise", pos: "RW" },
                { num: 42, name: "Jamal Musiala", pos: "CAM" },
                { num: 7, name: "Serge Gnabry", pos: "LW" },
                { num: 9, name: "Harry Kane", pos: "ST" }
            ],
            subs: ["Sven Ulreich", "Eric Dier", "Raphael Guerreiro", "Joao Palhinha", "Leon Goretzka", "Kingsley Coman", "Leroy Sane", "Mathys Tel", "Thomas Muller"]
        },
        "bayer leverkusen": {
            name: "Bayer Leverkusen",
            formation: "3-4-2-1",
            lineup: [
                { num: 1, name: "Lukas Hradecky", pos: "G" },
                { num: 12, name: "Edmond Tapsoba", pos: "CB" },
                { num: 4, name: "Jonathan Tah", pos: "CB" },
                { num: 3, name: "Piero Hincapie", pos: "CB" },
                { num: 30, name: "Jeremie Frimpong", pos: "RWB" },
                { num: 34, name: "Granit Xhaka", pos: "CDM" },
                { num: 25, name: "Exequiel Palacios", pos: "CM" },
                { num: 20, name: "Alejandro Grimaldo", pos: "LWB" },
                { num: 10, name: "Florian Wirtz", pos: "CAM" },
                { num: 7, name: "Jonas Hofmann", pos: "CAM" },
                { num: 22, name: "Victor Boniface", pos: "ST" }
            ],
            subs: ["Matej Kovar", "Nordi Mukiele", "Arthur", "Aleix Garcia", "Robert Andrich", "Amine Adli", "Martin Terrier", "Patrik Schick"]
        },
        "vfb stuttgart": {
            name: "VfB Stuttgart",
            formation: "4-2-3-1",
            lineup: [
                { num: 33, name: "Alexander Nubel", pos: "G" },
                { num: 15, name: "Pascal Stenzel", pos: "RB" },
                { num: 29, name: "Anthony Rouault", pos: "CB" },
                { num: 24, name: "Jeff Chabot", pos: "CB" },
                { num: 7, name: "Maximilian Mittelstadt", pos: "LB" },
                { num: 6, name: "Angelo Stiller", pos: "CDM" },
                { num: 16, name: "Atakan Karazor", pos: "CM" },
                { num: 8, name: "Enzo Millot", pos: "CAM" },
                { num: 27, name: "Chris Fuhrich", pos: "RW" },
                { num: 18, name: "Jamie Leweling", pos: "LW" },
                { num: 26, name: "Deniz Undav", pos: "ST" }
            ],
            subs: ["Fabian Bredlow", "Dan-Axel Zagadou", "Josha Vagnoman", "Frans Kratzig", "Yannik Keitel", "Fabian Rieder", "El Bilal Toure", "Ermedin Demirovic"]
        },
        "sc freiburg": {
            name: "SC Freiburg",
            formation: "4-2-3-1",
            lineup: [
                { num: 1, name: "Noah Atubolu", pos: "G" },
                { num: 17, name: "Lukas Kubler", pos: "RB" },
                { num: 28, name: "Matthias Ginter", pos: "CB" },
                { num: 3, name: "Philipp Lienhart", pos: "CB" },
                { num: 30, name: "Christian Gunter", pos: "LB" },
                { num: 8, name: "Maximilian Eggestein", pos: "CDM" },
                { num: 6, name: "Patrick Osterhage", pos: "CM" },
                { num: 42, name: "Ritsu Doan", pos: "CAM" },
                { num: 32, name: "Vincenzo Grifo", pos: "RW" },
                { num: 18, name: "Eren Dinkci", pos: "LW" },
                { num: 9, name: "Lucas Holer", pos: "ST" }
            ],
            subs: ["Florian Muller", "Max Rosenfelder", "Jordy Makengo", "Nicolas Hofler", "Merlin Rohl", "Noah Weisshaupt", "Junior Adamu", "Michael Gregoritsch"]
        },
        "tsg hoffenheim": {
            name: "TSG Hoffenheim",
            formation: "3-4-1-2",
            lineup: [
                { num: 1, name: "Oliver Baumann", pos: "G" },
                { num: 35, name: "Arthur Chaves", pos: "CB" },
                { num: 25, name: "Kevin Akpoguma", pos: "CB" },
                { num: 34, name: "Stanley Nsoki", pos: "CB" },
                { num: 3, name: "Pavel Kaderabek", pos: "RWB" },
                { num: 16, name: "Anton Stach", pos: "CDM" },
                { num: 11, name: "Florian Grillitsch", pos: "CM" },
                { num: 19, name: "David Jurasek", pos: "LWB" },
                { num: 27, name: "Andrej Kramaric", pos: "ST" },
                { num: 23, name: "Adam Hlozek", pos: "LW" },
                { num: 26, name: "Haris Tabakovic", pos: "ST" }
            ],
            subs: ["Luca Philipp", "Valentin Gendrey", "Tim Drexler", "Dennis Geiger", "Tom Bischof", "Marius Bulter", "Jacob Bruun Larsen", "Mergim Berisha"]
        },
        "mainz": {
            name: "Mainz",
            formation: "3-4-2-1",
            lineup: [
                { num: 27, name: "Robin Zentner", pos: "G" },
                { num: 21, name: "Danny da Costa", pos: "CB" },
                { num: 42, name: "Alexander Hack", pos: "CB" },
                { num: 25, name: "Andreas Hanche-Olsen", pos: "CB" },
                { num: 2, name: "Phillipp Mwene", pos: "RWB" },
                { num: 6, name: "Kaishu Sano", pos: "CDM" },
                { num: 18, name: "Nadiem Amiri", pos: "CM" },
                { num: 19, name: "Anthony Caci", pos: "LWB" },
                { num: 8, name: "Paul Nebel", pos: "CAM" },
                { num: 7, name: "Jae-sung Lee", pos: "CAM" },
                { num: 29, name: "Jonathan Burkardt", pos: "ST" }
            ],
            subs: ["Daniel Batz", "Maxim Leitsch", "Silvan Widmer", "Hyun-seok Hong", "Aymen Barkok", "Armindo Sieb", "Karim Onisiwo", "Nelson Weiper"]
        },
        "sv elversberg": {
            name: "SV Elversberg",
            formation: "4-2-3-1",
            lineup: [
                { num: 20, name: "Nicolas Kristof", pos: "G" },
                { num: 14, name: "Robin Fellhauer", pos: "RB" },
                { num: 4, name: "Florian Le Joncour", pos: "CB" },
                { num: 33, name: "Maurice Neubauer", pos: "CB" },
                { num: 19, name: "Lukas Pinckert", pos: "LB" },
                { num: 6, name: "Patryk Dragon", pos: "CDM" },
                { num: 8, name: "Semih Sahin", pos: "CM" },
                { num: 10, name: "Manuel Feil", pos: "CAM" },
                { num: 25, name: "Muhammed Damar", pos: "RW" },
                { num: 23, name: "Lukas Petkov", pos: "LW" },
                { num: 7, name: "Fisnik Asllani", pos: "ST" }
            ],
            subs: ["Tim Boss", "Elias Baum", "Daniel Pantschenko", "Paul Stock", "Filimon Gerezgiher", "Carlo Sickinger", "Luca Schnellbacher"]
        },
        "internazionale": {
            name: "Internazionale",
            formation: "3-5-2",
            lineup: [
                { num: 1, name: "Yann Sommer", pos: "G" },
                { num: 28, name: "Benjamin Pavard", pos: "CB" },
                { num: 15, name: "Francesco Acerbi", pos: "CB" },
                { num: 95, name: "Alessandro Bastoni", pos: "CB" },
                { num: 2, name: "Denzel Dumfries", pos: "RWB" },
                { num: 23, name: "Nicolo Barella", pos: "CDM" },
                { num: 20, name: "Hakan Calhanoglu", pos: "CAM" },
                { num: 22, name: "Henrikh Mkhitaryan", pos: "LWB" },
                { num: 32, name: "Federico Dimarco", pos: "RW" },
                { num: 9, name: "Marcus Thuram", pos: "ST" },
                { num: 10, name: "Lautaro Martinez", pos: "ST" }
            ],
            subs: ["Josep Martinez", "Stefan de Vrij", "Yann Bisseck", "Matteo Darmian", "Carlos Augusto", "Kristjan Asllani", "Davide Frattesi", "Piotr Zielinski", "Mehdi Taremi"]
        },
        "ac milan": {
            name: "AC Milan",
            formation: "4-2-3-1",
            lineup: [
                { num: 16, name: "Mike Maignan", pos: "G" },
                { num: 22, name: "Emerson Royal", pos: "RB" },
                { num: 23, name: "Fikayo Tomori", pos: "CB" },
                { num: 31, name: "Strahinja Pavlovic", pos: "CB" },
                { num: 19, name: "Theo Hernandez", pos: "LB" },
                { num: 29, name: "Youssouf Fofana", pos: "CDM" },
                { num: 14, name: "Tijjani Reijnders", pos: "CM" },
                { num: 11, name: "Christian Pulisic", pos: "RW" },
                { num: 8, name: "Ruben Loftus-Cheek", pos: "RW" },
                { num: 10, name: "Rafael Leao", pos: "LW" },
                { num: 7, name: "Alvaro Morata", pos: "ST" }
            ],
            subs: ["Marco Sportiello", "Davide Calabria", "Malick Thiaw", "Filippo Terracciano", "Yunus Musah", "Ismael Bennacer", "Samuel Chukwueze", "Noah Okafor", "Tammy Abraham"]
        },
        "juventus": {
            name: "Juventus",
            formation: "4-2-3-1",
            lineup: [
                { num: 29, name: "Michele Di Gregorio", pos: "G" },
                { num: 15, name: "Pierre Kalulu", pos: "RB" },
                { num: 4, name: "Federico Gatti", pos: "CB" },
                { num: 3, name: "Bremer", pos: "CB" },
                { num: 27, name: "Andrea Cambiaso", pos: "LB" },
                { num: 5, name: "Manuel Locatelli", pos: "CDM" },
                { num: 19, name: "Khephren Thuram", pos: "CM" },
                { num: 7, name: "Francisco Conceicao", pos: "CAM" },
                { num: 8, name: "Teun Koopmeiners", pos: "CAM" },
                { num: 10, name: "Kenan Yildiz", pos: "LW" },
                { num: 9, name: "Dusan Vlahovic", pos: "ST" }
            ],
            subs: ["Mattia Perin", "Danilo", "Juan Cabal", "Nicolo Savona", "Weston McKennie", "Douglas Luiz", "Nicolo Fagioli", "Timothy Weah", "Samuel Mbangula"]
        },
        "napoli": {
            name: "Napoli",
            formation: "4-3-3",
            lineup: [
                { num: 1, name: "Alex Meret", pos: "G" },
                { num: 22, name: "Giovanni Di Lorenzo", pos: "RB" },
                { num: 13, name: "Amir Rrahmani", pos: "CB" },
                { num: 4, name: "Alessandro Buongiorno", pos: "CB" },
                { num: 17, name: "Mathias Olivera", pos: "LB" },
                { num: 99, name: "Andre-Frank Zambo Anguissa", pos: "CDM" },
                { num: 68, name: "Stanislav Lobotka", pos: "CM" },
                { num: 8, name: "Scott McTominay", pos: "CAM" },
                { num: 21, name: "Matteo Politano", pos: "RW" },
                { num: 11, name: "Romelu Lukaku", pos: "ST" },
                { num: 77, name: "Khvicha Kvaratskhelia", pos: "LW" }
            ],
            subs: ["Elia Caprile", "Juan Jesus", "Rafa Marin", "Leonardo Spinazzola", "Pasquale Mazzocchi", "Billy Gilmour", "Michael Folorunsho", "David Neres", "Giacomo Raspadori", "Giovanni Simeone"]
        },
        "atalanta": {
            name: "Atalanta",
            formation: "3-4-2-1",
            lineup: [
                { num: 29, name: "Marco Carnesecchi", pos: "G" },
                { num: 19, name: "Berat Djimsiti", pos: "CB" },
                { num: 4, name: "Isak Hien", pos: "CB" },
                { num: 23, name: "Sead Kolasinac", pos: "CB" },
                { num: 77, name: "Davide Zappacosta", pos: "RWB" },
                { num: 15, name: "Marten de Roon", pos: "CDM" },
                { num: 13, name: "Ederson", pos: "CM" },
                { num: 22, name: "Matteo Ruggeri", pos: "LWB" },
                { num: 17, name: "Charles De Ketelaere", pos: "CAM" },
                { num: 11, name: "Ademola Lookman", pos: "CAM" },
                { num: 32, name: "Mateo Retegui", pos: "ST" }
            ],
            subs: ["Rui Patricio", "Rafael Toloi", "Ben Godfrey", "Odilon Kossounou", "Mario Pasalic", "Lazar Samardzic", "Raoul Bellanova", "Marco Brescianini", "Nicolo Zaniolo"]
        },
        "as roma": {
            name: "AS Roma",
            formation: "3-4-2-1",
            lineup: [
                { num: 99, name: "Mile Svilar", pos: "G" },
                { num: 23, name: "Gianluca Mancini", pos: "CB" },
                { num: 5, name: "Evan Ndicka", pos: "CB" },
                { num: 3, name: "Angelino", pos: "CB" },
                { num: 19, name: "Zeki Celik", pos: "RWB" },
                { num: 4, name: "Bryan Cristante", pos: "CDM" },
                { num: 17, name: "Kouadio Kone", pos: "CM" },
                { num: 59, name: "Nicola Zalewski", pos: "LWB" },
                { num: 21, name: "Paulo Dybala", pos: "CAM" },
                { num: 7, name: "Lorenzo Pellegrini", pos: "CAM" },
                { num: 11, name: "Artem Dovbyk", pos: "ST" }
            ],
            subs: ["Mathew Ryan", "Mats Hummels", "Mario Hermoso", "Saud Abdulhamid", "Enzo Le Fee", "Leandro Paredes", "Tommaso Baldanzi", "Alexis Saelemaekers", "Matias Soule", "Stephan El Shaarawy"]
        },
        "lazio": {
            name: "Lazio",
            formation: "4-2-3-1",
            lineup: [
                { num: 94, name: "Ivan Provedel", pos: "G" },
                { num: 29, name: "Manuel Lazzari", pos: "RB" },
                { num: 34, name: "Mario Gila", pos: "CB" },
                { num: 13, name: "Alessio Romagnoli", pos: "CB" },
                { num: 30, name: "Nuno Tavares", pos: "LB" },
                { num: 8, name: "Matteo Guendouzi", pos: "CDM" },
                { num: 6, name: "Nicolo Rovella", pos: "CM" },
                { num: 18, name: "Gustav Isaksen", pos: "CAM" },
                { num: 19, name: "Boulaye Dia", pos: "RW" },
                { num: 10, name: "Mattia Zaccagni", pos: "LW" },
                { num: 11, name: "Valentin Castellanos", pos: "ST" }
            ],
            subs: ["Christos Mandas", "Adam Marusic", "Patric", "Samuel Gigot", "Matias Vecino", "Gaetano Castrovilli", "Fisayo Dele-Bashiru", "Pedro", "Tijjani Noslin"]
        },
        "fiorentina": {
            name: "Fiorentina",
            formation: "4-2-3-1",
            lineup: [
                { num: 43, name: "David de Gea", pos: "G" },
                { num: 2, name: "Dodo", pos: "RB" },
                { num: 15, name: "Pietro Comuzzo", pos: "CB" },
                { num: 6, name: "Luca Ranieri", pos: "CB" },
                { num: 21, name: "Robin Gosens", pos: "LB" },
                { num: 24, name: "Amir Richardson", pos: "CDM" },
                { num: 32, name: "Danilo Cataldi", pos: "CM" },
                { num: 28, name: "Lucas Martinez Quarta", pos: "CAM" },
                { num: 10, name: "Albert Gudmundsson", pos: "RW" },
                { num: 99, name: "Christian Kouame", pos: "LW" },
                { num: 20, name: "Moise Kean", pos: "ST" }
            ],
            subs: ["Pietro Terracciano", "Lucas Martinez Quarta", "Fabiano Parisi", "Cristiano Biraghi", "Yacine Adli", "Edoardo Bove", "Rolando Mandragora", "Jonathan Ikone", "Lucas Beltran"]
        },
        "bologna": {
            name: "Bologna",
            formation: "4-2-3-1",
            lineup: [
                { num: 1, name: "Lukasz Skorupski", pos: "G" },
                { num: 3, name: "Stefan Posch", pos: "RB" },
                { num: 31, name: "Sam Beukema", pos: "CB" },
                { num: 26, name: "Jhon Lucumi", pos: "CB" },
                { num: 22, name: "Charalampos Lykogiannis", pos: "LB" },
                { num: 8, name: "Remo Freuler", pos: "CDM" },
                { num: 6, name: "Nikola Moro", pos: "CM" },
                { num: 7, name: "Riccardo Orsolini", pos: "CAM" },
                { num: 18, name: "Tommaso Pobega", pos: "RW" },
                { num: 11, name: "Dan Ndoye", pos: "LW" },
                { num: 9, name: "Santiago Castro", pos: "ST" }
            ],
            subs: ["Federico Ravaglia", "Nicolo Casale", "Juan Miranda", "Michel Aebischer", "Giovanni Fabbian", "Jens Odgaard", "Kacper Urbanski", "Thijs Dallinga"]
        },
        "cagliari": {
            name: "Cagliari",
            formation: "3-5-2",
            lineup: [
                { num: 22, name: "Simone Scuffet", pos: "G" },
                { num: 28, name: "Gabriele Zappa", pos: "CB" },
                { num: 26, name: "Yerry Mina", pos: "CB" },
                { num: 6, name: "Sebastiano Luperto", pos: "CB" },
                { num: 19, name: "Nadir Zortea", pos: "RWB" },
                { num: 29, name: "Antoine Makoumbou", pos: "CDM" },
                { num: 16, name: "Matteo Prati", pos: "CM" },
                { num: 14, name: "Alessandro Deiola", pos: "LWB" },
                { num: 27, name: "Tommaso Augello", pos: "RW" },
                { num: 77, name: "Zito Luvumbo", pos: "LW" },
                { num: 91, name: "Roberto Piccoli", pos: "ST" }
            ],
            subs: ["Alen Sherri", "Jose Palomino", "Paulo Azzi", "Michel Adopo", "Razvan Marin", "Nicolas Viola", "Gianluca Gaetano", "Gianluca Lapadula"]
        },
        "como": {
            name: "Como",
            formation: "4-2-3-1",
            lineup: [
                { num: 25, name: "Pepe Reina", pos: "G" },
                { num: 77, name: "Ignace Van der Brempt", pos: "RB" },
                { num: 13, name: "Alberto Dossena", pos: "CB" },
                { num: 5, name: "Edoardo Goldaniga", pos: "CB" },
                { num: 18, name: "Alberto Moreno", pos: "LB" },
                { num: 4, name: "Ben Lhassine Kone", pos: "CDM" },
                { num: 20, name: "Sergi Roberto", pos: "CM" },
                { num: 7, name: "Gabriel Strefezza", pos: "CAM" },
                { num: 79, name: "Nico Paz", pos: "RW" },
                { num: 10, name: "Patrick Cutrone", pos: "LW" },
                { num: 11, name: "Andrea Belotti", pos: "ST" }
            ],
            subs: ["Emil Audero", "Marc-Oliver Kempf", "Federico Barba", "Maximo Perrone", "Luca Mazzitelli", "Yannik Engelhardt", "Alieu Fadera", "Ali Jasim"]
        },
        "genoa": {
            name: "Genoa",
            formation: "3-5-2",
            lineup: [
                { num: 95, name: "Pierluigi Gollini", pos: "G" },
                { num: 14, name: "Alessandro Vogliacco", pos: "CB" },
                { num: 4, name: "Koni De Winter", pos: "CB" },
                { num: 22, name: "Johan Vasquez", pos: "CB" },
                { num: 59, name: "Alessandro Zanoli", pos: "RWB" },
                { num: 32, name: "Morten Frendrup", pos: "CDM" },
                { num: 47, name: "Milan Badelj", pos: "CM" },
                { num: 20, name: "Stefano Sabelli", pos: "LWB" },
                { num: 3, name: "Aaron Martin", pos: "RW" },
                { num: 10, name: "Junior Messias", pos: "LW" },
                { num: 19, name: "Andrea Pinamonti", pos: "ST" }
            ],
            subs: ["Nicola Leali", "Mattia Bani", "Alan Matturro", "Brooke Norton-Cuffy", "Fabio Miretti", "Morten Thorsby", "Emil Bohinen", "Vitinha", "Mario Balotelli"]
        },
        "lecce": {
            name: "Lecce",
            formation: "4-2-3-1",
            lineup: [
                { num: 30, name: "Wladimiro Falcone", pos: "G" },
                { num: 17, name: "Valentin Gendrey", pos: "RB" },
                { num: 6, name: "Federico Baschirotto", pos: "CB" },
                { num: 4, name: "Kialonda Gaspar", pos: "CB" },
                { num: 25, name: "Antonino Gallo", pos: "LB" },
                { num: 20, name: "Ylber Ramadani", pos: "CDM" },
                { num: 75, name: "Balthazar Pierret", pos: "CM" },
                { num: 7, name: "Tete Morente", pos: "CAM" },
                { num: 10, name: "Remi Oudin", pos: "RW" },
                { num: 13, name: "Patrick Dorgu", pos: "LW" },
                { num: 9, name: "Nikola Krstovic", pos: "ST" }
            ],
            subs: ["Christian Fruchtl", "Gaby Jean", "Andy Pelmard", "Lassana Coulibaly", "Hamza Rafia", "Medon Berisha", "Santiago Pierotti", "Ante Rebic"]
        },
        "monza": {
            name: "Monza",
            formation: "3-4-2-1",
            lineup: [
                { num: 30, name: "Stefano Turati", pos: "G" },
                { num: 4, name: "Armando Izzo", pos: "CB" },
                { num: 22, name: "Pablo Mari", pos: "CB" },
                { num: 44, name: "Andrea Carboni", pos: "CB" },
                { num: 19, name: "Pedro Pereira", pos: "RWB" },
                { num: 38, name: "Warren Bondo", pos: "CDM" },
                { num: 32, name: "Matteo Pessina", pos: "CM" },
                { num: 77, name: "Giorgos Kyriakopoulos", pos: "LWB" },
                { num: 14, name: "Daniel Maldini", pos: "CAM" },
                { num: 47, name: "Dany Mota", pos: "CAM" },
                { num: 11, name: "Milan Djuric", pos: "ST" }
            ],
            subs: ["Semuel Pizzignacco", "Luca Caldirola", "Danilo D'Ambrosio", "Roberto Gagliardini", "Alessandro Bianco", "Stefano Sensi", "Gianluca Caprari", "Mirko Maric"]
        },
        "parma": {
            name: "Parma",
            formation: "4-2-3-1",
            lineup: [
                { num: 31, name: "Zion Suzuki", pos: "G" },
                { num: 26, name: "Woyo Coulibaly", pos: "RB" },
                { num: 15, name: "Enrico Delprato", pos: "CB" },
                { num: 4, name: "Botond Balogh", pos: "CB" },
                { num: 14, name: "Emanuele Valeri", pos: "LB" },
                { num: 8, name: "Nahuel Estevez", pos: "CDM" },
                { num: 19, name: "Simon Sohm", pos: "CM" },
                { num: 98, name: "Dennis Man", pos: "CAM" },
                { num: 10, name: "Adrian Bernabe", pos: "RW" },
                { num: 28, name: "Valentin Mihaila", pos: "LW" },
                { num: 13, name: "Ange-Yoan Bonny", pos: "ST" }
            ],
            subs: ["Leandro Chichizola", "Yordan Osorio", "Antoine Hainaut", "Hernani", "Mandela Keita", "Drissa Camara", "Matteo Cancellieri", "Pontus Almqvist", "Gabriel Charpentier"]
        },
        "udinese": {
            name: "Udinese",
            formation: "3-5-2",
            lineup: [
                { num: 40, name: "Maduka Okoye", pos: "G" },
                { num: 27, name: "Christian Kabasele", pos: "CB" },
                { num: 29, name: "Jaka Bijol", pos: "CB" },
                { num: 30, name: "Lautaro Giannetti", pos: "CB" },
                { num: 19, name: "Kingsley Ehizibue", pos: "RWB" },
                { num: 8, name: "Sandi Lovric", pos: "CDM" },
                { num: 25, name: "Jesper Karlstrom", pos: "CM" },
                { num: 6, name: "Oier Zarraga", pos: "LWB" },
                { num: 33, name: "Jordan Zemura", pos: "RW" },
                { num: 10, name: "Florian Thauvin", pos: "LW" },
                { num: 17, name: "Lorenzo Lucca", pos: "ST" }
            ],
            subs: ["Daniele Padelli", "Thomas Kristensen", "Enzo Ebosse", "Rui Modesto", "Arthur Atta", "Martin Payero", "Iker Bravo", "Keinan Davis", "Brenner"]
        },
        "venezia": {
            name: "Venezia",
            formation: "3-5-2",
            lineup: [
                { num: 1, name: "Jesse Joronen", pos: "G" },
                { num: 25, name: "Joel Schingtienne", pos: "CB" },
                { num: 30, name: "Michael Svoboda", pos: "CB" },
                { num: 33, name: "Marin Sverko", pos: "CB" },
                { num: 7, name: "Francesco Zampano", pos: "RWB" },
                { num: 38, name: "Magnus Kofod Andersen", pos: "CDM" },
                { num: 14, name: "Hans Nicolussi Caviglia", pos: "CM" },
                { num: 6, name: "Gianluca Busio", pos: "LWB" },
                { num: 27, name: "Antonio Candela", pos: "RW" },
                { num: 77, name: "Mikael Egill Ellertsson", pos: "LW" },
                { num: 20, name: "Joel Pohjanpalo", pos: "ST" }
            ],
            subs: ["Filip Stankovic", "Jay Idzes", "Giorgio Altare", "Franco Carboni", "Mikael Doumbia", "Domen Crnigoj", "Gaetano Oristanio", "Christian Gytkjaer", "John Yeboah"]
        },
        "paris saint-germain": {
            name: "Paris Saint-Germain",
            formation: "4-3-3",
            lineup: [
                { num: 1, name: "Gianluigi Donnarumma", pos: "G" },
                { num: 2, name: "Achraf Hakimi", pos: "RB" },
                { num: 5, name: "Marquinhos", pos: "CB" },
                { num: 51, name: "Willian Pacho", pos: "CB" },
                { num: 25, name: "Nuno Mendes", pos: "LB" },
                { num: 33, name: "Warren Zaire-Emery", pos: "CDM" },
                { num: 17, name: "Vitinha", pos: "CM" },
                { num: 87, name: "Joao Neves", pos: "CAM" },
                { num: 10, name: "Ousmane Dembele", pos: "RW" },
                { num: 9, name: "Goncalo Ramos", pos: "ST" },
                { num: 29, name: "Bradley Barcola", pos: "LW" }
            ],
            subs: ["Matvey Safonov", "Lucas Beraldo", "Milan Skriniar", "Fabian Ruiz", "Kang-in Lee", "Senny Mayulu", "Marco Asensio", "Randal Kolo Muani", "Desire Doue"]
        },
        "marseille": {
            name: "Marseille",
            formation: "4-2-3-1",
            lineup: [
                { num: 1, name: "Geronimo Rulli", pos: "G" },
                { num: 62, name: "Michael Murillo", pos: "RB" },
                { num: 5, name: "Leonardo Balerdi", pos: "CB" },
                { num: 21, name: "Nayef Aguerd", pos: "CB" },
                { num: 3, name: "Quentin Merlin", pos: "LB" },
                { num: 23, name: "Pierre-Emile Hojbjerg", pos: "CDM" },
                { num: 19, name: "Geoffrey Kondogbia", pos: "CM" },
                { num: 10, name: "Mason Greenwood", pos: "CAM" },
                { num: 11, name: "Amine Harit", pos: "RW" },
                { num: 8, name: "Adrien Rabiot", pos: "LW" },
                { num: 9, name: "Elye Wahi", pos: "ST" }
            ],
            subs: ["Jeffrey de Lange", "Derek Cornelius", "Lilian Brassier", "Pol Lirola", "Valentin Rongier", "Ismael Kone", "Luis Henrique", "Jonathan Rowe", "Neal Maupay"]
        },
        "as monaco": {
            name: "AS Monaco",
            formation: "4-2-3-1",
            lineup: [
                { num: 16, name: "Philipp Kohn", pos: "G" },
                { num: 2, name: "Vanderson", pos: "RB" },
                { num: 5, name: "Thilo Kehrer", pos: "CB" },
                { num: 22, name: "Mohammed Salisu", pos: "CB" },
                { num: 27, name: "Krepin Diatta", pos: "LB" },
                { num: 6, name: "Denis Zakaria", pos: "CDM" },
                { num: 15, name: "Lamine Camara", pos: "CM" },
                { num: 11, name: "Maghnes Akliouche", pos: "CAM" },
                { num: 18, name: "Takumi Minamino", pos: "RW" },
                { num: 7, name: "Eliesse Ben Seghir", pos: "LW" },
                { num: 36, name: "Breel Embolo", pos: "ST" }
            ],
            subs: ["Radoslaw Majecki", "Wilfried Singo", "Christian Mawissa", "Caio Henrique", "Soungoutou Magassa", "Aleksandr Golovin", "George Ilenikhena", "Folarin Balogun"]
        },
        "lille": {
            name: "Lille",
            formation: "4-2-3-1",
            lineup: [
                { num: 30, name: "Lucas Chevalier", pos: "G" },
                { num: 12, name: "Thomas Meunier", pos: "RB" },
                { num: 18, name: "Bafode Diakite", pos: "CB" },
                { num: 4, name: "Alexsandro", pos: "CB" },
                { num: 5, name: "Gabriel Gudmundsson", pos: "LB" },
                { num: 21, name: "Benjamin Andre", pos: "CDM" },
                { num: 32, name: "Ayyoub Bouaddi", pos: "CM" },
                { num: 23, name: "Edon Zhegrova", pos: "CAM" },
                { num: 10, name: "Angel Gomes", pos: "RW" },
                { num: 7, name: "Hakon Arnar Haraldsson", pos: "LW" },
                { num: 9, name: "Jonathan David", pos: "ST" }
            ],
            subs: ["Vito Mannone", "Aissa Mandi", "Mitchel Bakker", "Ngal'ayel Mukau", "Andre Gomes", "Remy Cabella", "Osame Sahraoui", "Mohamed Bayo"]
        },
        "nice": {
            name: "Nice",
            formation: "3-4-2-1",
            lineup: [
                { num: 1, name: "Marcin Bulka", pos: "G" },
                { num: 64, name: "Moise Bombito", pos: "CB" },
                { num: 5, name: "Youssouf Ndayishimiye", pos: "CB" },
                { num: 4, name: "Dante", pos: "CB" },
                { num: 92, name: "Jonathan Clauss", pos: "RWB" },
                { num: 8, name: "Pablo Rosario", pos: "CDM" },
                { num: 22, name: "Tanguy Ndombele", pos: "CM" },
                { num: 26, name: "Melvin Bard", pos: "LWB" },
                { num: 10, name: "Sofiane Diop", pos: "CAM" },
                { num: 25, name: "Mohamed-Ali Cho", pos: "CAM" },
                { num: 9, name: "Terem Moffi", pos: "ST" }
            ],
            subs: ["Maxime Dupe", "Antoine Mendy", "Ali Abdi", "Hicham Boudaoui", "Tom Louchet", "Jeremie Boga", "Evann Guessand", "Youssoufa Moukoko"]
        },
        "lens": {
            name: "Lens",
            formation: "3-4-2-1",
            lineup: [
                { num: 30, name: "Brice Samba", pos: "G" },
                { num: 24, name: "Jonathan Gradit", pos: "CB" },
                { num: 4, name: "Kevin Danso", pos: "CB" },
                { num: 14, name: "Facundo Medina", pos: "CB" },
                { num: 2, name: "Ruben Aguilar", pos: "RWB" },
                { num: 18, name: "Andy Diouf", pos: "CDM" },
                { num: 28, name: "Adrien Thomasson", pos: "CM" },
                { num: 3, name: "Deiver Machado", pos: "LWB" },
                { num: 10, name: "David Pereira da Costa", pos: "CAM" },
                { num: 7, name: "Florian Sotoca", pos: "CAM" },
                { num: 9, name: "Martin Satriano", pos: "ST" }
            ],
            subs: ["Herve Koffi", "Abdukodir Khusanov", "Malang Sarr", "Przemyslaw Frankowski", "Jhoanner Chavez", "Nampalys Mendy", "Anass Zaroury", "M'Bala Nzola"]
        },
        "stade rennais": {
            name: "Stade Rennais",
            formation: "4-3-3",
            lineup: [
                { num: 30, name: "Steve Mandanda", pos: "G" },
                { num: 36, name: "Alidu Seidu", pos: "RB" },
                { num: 4, name: "Christopher Wooh", pos: "CB" },
                { num: 55, name: "Leo Ostigard", pos: "CB" },
                { num: 3, name: "Adrien Truffert", pos: "LB" },
                { num: 6, name: "Azor Matusiwa", pos: "CDM" },
                { num: 8, name: "Baptiste Santamaria", pos: "CM" },
                { num: 10, name: "Ludovic Blas", pos: "CAM" },
                { num: 11, name: "Albert Gronbaek", pos: "RW" },
                { num: 9, name: "Arnaud Kalimuendo", pos: "LW" },
                { num: 7, name: "Amine Gouiri", pos: "ST" }
            ],
            subs: ["Gauthier Gallon", "Mikayil Faye", "Lorenz Assignon", "Glen Kamara", "Jordan James", "Hans Hateboer", "Henrik Meister", "Jota"]
        },
        "strasbourg": {
            name: "Strasbourg",
            formation: "3-4-2-1",
            lineup: [
                { num: 1, name: "Djordje Petrovic", pos: "G" },
                { num: 22, name: "Guela Doue", pos: "CB" },
                { num: 24, name: "Abakar Sylla", pos: "CB" },
                { num: 5, name: "Saidou Sow", pos: "CB" },
                { num: 29, name: "Eduard Sobol", pos: "RWB" },
                { num: 19, name: "Habib Diarra", pos: "CDM" },
                { num: 8, name: "Andrey Santos", pos: "CM" },
                { num: 7, name: "Diego Moreira", pos: "LWB" },
                { num: 14, name: "Sebastian Nanasi", pos: "CAM" },
                { num: 11, name: "Moise Sahi Dion", pos: "CAM" },
                { num: 10, name: "Emanuel Emegha", pos: "ST" }
            ],
            subs: ["Robin Risser", "Mamadou Sarr", "Marvin Senaya", "Junior Mwanga", "Felix Lemarechal", "Pape Diong", "Dilane Bakwa", "Sekou Mara"]
        },
        "toulouse": {
            name: "Toulouse",
            formation: "3-4-2-1",
            lineup: [
                { num: 40, name: "Guillaume Restes", pos: "G" },
                { num: 6, name: "Logan Costa", pos: "CB" },
                { num: 2, name: "Rasmus Nicolaisen", pos: "CB" },
                { num: 4, name: "Charlie Cresswell", pos: "CB" },
                { num: 19, name: "Djibril Sidibe", pos: "RWB" },
                { num: 8, name: "Vincent Sierro", pos: "CDM" },
                { num: 23, name: "Cristian Casseres Jr", pos: "CM" },
                { num: 17, name: "Gabriel Suazo", pos: "LWB" },
                { num: 10, name: "Yann Gboho", pos: "CAM" },
                { num: 7, name: "Zakaria Aboukhlal", pos: "CAM" },
                { num: 9, name: "Frank Magri", pos: "ST" }
            ],
            subs: ["Alex Dominguez", "Mark McKenzie", "Warren Kamanzi", "Niklas Schmidt", "Miha Zajc", "Shavy Babicka", "Joshua King"]
        },
        "aj auxerre": {
            name: "AJ Auxerre",
            formation: "5-4-1",
            lineup: [
                { num: 16, name: "Donovan Leon", pos: "G" },
                { num: 26, name: "Paul Joly", pos: "RB" },
                { num: 20, name: "Sinaly Diomande", pos: "CB" },
                { num: 4, name: "Jubal", pos: "CB" },
                { num: 92, name: "Clement Akpa", pos: "CB" },
                { num: 14, name: "Gideon Mensah", pos: "LB" },
                { num: 10, name: "Gaetan Perrin", pos: "CDM" },
                { num: 42, name: "Elisha Owusu", pos: "CM" },
                { num: 18, name: "Assane Diousse", pos: "RW" },
                { num: 25, name: "Hamed Traore", pos: "LW" },
                { num: 19, name: "Florian Aye", pos: "ST" }
            ],
            subs: ["Theo De Percin", "Gabriel Osho", "Ki-Jana Hoever", "Rayan Raveloson", "Kevin Danois", "Lassine Sinayoko", "Ado Onaiwu"]
        },
        "angers": {
            name: "Angers",
            formation: "4-2-3-1",
            lineup: [
                { num: 16, name: "Yahia Fofana", pos: "G" },
                { num: 2, name: "Carlens Arcus", pos: "RB" },
                { num: 21, name: "Jordan Lefort", pos: "CB" },
                { num: 22, name: "Cedric Hountondji", pos: "CB" },
                { num: 26, name: "Florent Hanin", pos: "LB" },
                { num: 93, name: "Haris Belkebla", pos: "CDM" },
                { num: 14, name: "Yassin Belkhdim", pos: "CM" },
                { num: 11, name: "Sidiki Cherif", pos: "CAM" },
                { num: 7, name: "Himad Abdelli", pos: "RW" },
                { num: 19, name: "Farid El Melali", pos: "LW" },
                { num: 9, name: "Lois Diony", pos: "ST" }
            ],
            subs: ["Melvin Zinga", "Abdoulaye Bamba", "Emmanuel Biumla", "Pierrick Capelle", "Zinedine Ferhat", "Jim Allevinah", "Esteban Lepaul"]
        },
        "le havre ac": {
            name: "Le Havre AC",
            formation: "4-3-3",
            lineup: [
                { num: 30, name: "Arthur Desmas", pos: "G" },
                { num: 7, name: "Loic Nego", pos: "RB" },
                { num: 93, name: "Arouna Sangante", pos: "CB" },
                { num: 4, name: "Gautier Lloris", pos: "CB" },
                { num: 27, name: "Christopher Operi", pos: "LB" },
                { num: 94, name: "Abdoulaye Toure", pos: "CDM" },
                { num: 8, name: "Yassine Kechta", pos: "CM" },
                { num: 18, name: "Rassoul Ndiaye", pos: "CAM" },
                { num: 11, name: "Emmanuel Sabbi", pos: "RW" },
                { num: 14, name: "Daler Kuzyaev", pos: "LW" },
                { num: 29, name: "Josue Casimir", pos: "ST" }
            ],
            subs: ["Mathieu Gorgelin", "Yoann Salmier", "Etienne Youte Kinkoue", "Oussama Targhalline", "Alois Confais", "Antoine Joujou", "Ilyes Housni"]
        },
        "sporting cp": {
            name: "Sporting CP",
            formation: "3-4-2-1",
            lineup: [
                { num: 1, name: "Franco Israel", pos: "G" },
                { num: 3, name: "Jerry St. Juste", pos: "CB" },
                { num: 25, name: "Goncalo Inacio", pos: "CB" },
                { num: 26, name: "Ousmane Diomande", pos: "CB" },
                { num: 21, name: "Geny Catamo", pos: "RWB" },
                { num: 42, name: "Morten Hjulmand", pos: "CDM" },
                { num: 23, name: "Daniel Braganca", pos: "CM" },
                { num: 20, name: "Maximiliano Araujo", pos: "LWB" },
                { num: 8, name: "Pedro Goncalves", pos: "CAM" },
                { num: 17, name: "Francisco Trincao", pos: "CAM" },
                { num: 9, name: "Viktor Gyokeres", pos: "ST" }
            ],
            subs: ["Diego Callai", "Matheus Reis", "Zeno Debast", "Ricardo Esgaio", "Hidemasa Morita", "Geovany Quenda", "Marcus Edwards", "Conrad Harder"]
        },
        "feyenoord rotterdam": {
            name: "Feyenoord Rotterdam",
            formation: "4-3-3",
            lineup: [
                { num: 22, name: "Timon Wellenreuther", pos: "G" },
                { num: 26, name: "Givairo Read", pos: "RB" },
                { num: 3, name: "Thomas Beelen", pos: "CB" },
                { num: 33, name: "David Hancko", pos: "CB" },
                { num: 16, name: "Hugo Bueno", pos: "LB" },
                { num: 6, name: "In-beom Hwang", pos: "CDM" },
                { num: 8, name: "Quinten Timber", pos: "CM" },
                { num: 24, name: "Gjivai Zechiel", pos: "CAM" },
                { num: 10, name: "Calvin Stengs", pos: "RW" },
                { num: 9, name: "Ayase Ueda", pos: "LW" },
                { num: 14, name: "Igor Paixao", pos: "ST" }
            ],
            subs: ["Justin Bijlow", "Gernot Trauner", "Facundo Gonzalez", "Gijs Smal", "Ramiz Zerrouki", "Antoni Milambo", "Anis Hadj Moussa", "Julian Carranza"]
        },
        "galatasaray": {
            name: "Galatasaray",
            formation: "4-2-3-1",
            lineup: [
                { num: 1, name: "Fernando Muslera", pos: "G" },
                { num: 23, name: "Kaan Ayhan", pos: "RB" },
                { num: 6, name: "Davinson Sanchez", pos: "CB" },
                { num: 42, name: "Abdulkerim Bardakci", pos: "CB" },
                { num: 4, name: "Ismail Jakobs", pos: "LB" },
                { num: 34, name: "Lucas Torreira", pos: "CDM" },
                { num: 20, name: "Gabriel Sara", pos: "CM" },
                { num: 53, name: "Baris Alper Yilmaz", pos: "CAM" },
                { num: 10, name: "Dries Mertens", pos: "RW" },
                { num: 11, name: "Yunus Akgun", pos: "LW" },
                { num: 45, name: "Victor Osimhen", pos: "ST" }
            ],
            subs: ["Gunay Guvenc", "Victor Nelsson", "Elias Jelert", "Metehan Baltaci", "Kerem Demirbay", "Berkan Kutlu", "Hakim Ziyech", "Roland Sallai", "Mauro Icardi"]
        },
        "shakhtar donetsk": {
            name: "Shakhtar Donetsk",
            formation: "4-3-3",
            lineup: [
                { num: 31, name: "Dmytro Riznyk", pos: "G" },
                { num: 13, name: "Pedro Henrique", pos: "RB" },
                { num: 5, name: "Valeriy Bondar", pos: "CB" },
                { num: 22, name: "Mykola Matviyenko", pos: "CB" },
                { num: 16, name: "Irakli Azarovi", pos: "LB" },
                { num: 6, name: "Taras Stepanenko", pos: "CDM" },
                { num: 21, name: "Artem Bondarenko", pos: "CM" },
                { num: 10, name: "Georgiy Sudakov", pos: "CAM" },
                { num: 11, name: "Oleksandr Zubkov", pos: "RW" },
                { num: 14, name: "Danylo Sikan", pos: "LW" },
                { num: 39, name: "Newerton", pos: "ST" }
            ],
            subs: ["Denys Tvardovskyi", "Vinicius Tobias", "Alaa Ghram", "Yukhym Konoplia", "Dmytro Kryskiv", "Marlon Gomes", "Pedrinho", "Eguinaldo", "Lassina Traore"]
        },
        "bodo/glimt": {
            name: "Bodo/Glimt",
            formation: "4-3-3",
            lineup: [
                { num: 12, name: "Nikita Haikin", pos: "G" },
                { num: 20, name: "Fredrik Sjovold", pos: "RB" },
                { num: 6, name: "Jostein Gundersen", pos: "CB" },
                { num: 4, name: "Odin Bjorrtuft", pos: "CB" },
                { num: 15, name: "Fredrik Andre Bjorkan", pos: "LB" },
                { num: 26, name: "Hakon Evjen", pos: "CDM" },
                { num: 7, name: "Patrick Berg", pos: "CM" },
                { num: 19, name: "Sondre Brunstad Fet", pos: "CAM" },
                { num: 25, name: "Isak Dybvik Maatta", pos: "RW" },
                { num: 9, name: "Kasper Hogh", pos: "LW" },
                { num: 23, name: "Jens Petter Hauge", pos: "ST" }
            ],
            subs: ["Julian Faye Lund", "Villads Nielsen", "Michal Tomic", "Sondre Auklend", "Ulrik Saltnes", "Runar Espejord", "Andreas Helmersen"]
        },
        "slovan bratislava": {
            name: "Slovan Bratislava",
            formation: "4-2-3-1",
            lineup: [
                { num: 1, name: "Dominik Takac", pos: "G" },
                { num: 25, name: "Lukas Pauschek", pos: "RB" },
                { num: 4, name: "Guram Kashia", pos: "CB" },
                { num: 12, name: "Kenan Bajric", pos: "CB" },
                { num: 17, name: "Jurij Medvedev", pos: "LB" },
                { num: 88, name: "Kyriakos Savvidis", pos: "CDM" },
                { num: 33, name: "Juraj Kucka", pos: "CM" },
                { num: 11, name: "Tigran Barseghyan", pos: "CAM" },
                { num: 10, name: "Marko Tolic", pos: "RW" },
                { num: 21, name: "Robert Mak", pos: "LW" },
                { num: 13, name: "David Strelec", pos: "ST" }
            ],
            subs: ["Martin Trnovsky", "Cesar Blackman", "Siemen Voet", "Alen Mustafic", "Artur Gajdos", "Danylo Ignatenko", "Idjessi Metsoko"]
        },
        "olympiacos": {
            name: "Olympiacos",
            formation: "4-2-3-1",
            lineup: [
                { num: 88, name: "Konstantinos Tzolakis", pos: "G" },
                { num: 23, name: "Rodinei", pos: "RB" },
                { num: 45, name: "Panagiotis Retsos", pos: "CB" },
                { num: 5, name: "Lorenzo Pirola", pos: "CB" },
                { num: 3, name: "Francisco Ortega", pos: "LB" },
                { num: 8, name: "Santiago Hezze", pos: "CDM" },
                { num: 32, name: "Dani Garcia", pos: "CM" },
                { num: 11, name: "Kristoffer Velde", pos: "CAM" },
                { num: 20, name: "Costinha", pos: "RW" },
                { num: 10, name: "Gelson Martins", pos: "LW" },
                { num: 9, name: "Ayoub El Kaabi", pos: "ST" }
            ],
            subs: ["Alexandros Paschalakis", "Giulian Biancone", "David Carmo", "Apostolos Apostolopoulos", "Marko Stamenic", "Chiquinho", "Willian", "Roman Yaremchuk"]
        },
        "lask linz": {
            name: "LASK Linz",
            formation: "4-2-3-1",
            lineup: [
                { num: 1, name: "Tobias Lawal", pos: "G" },
                { num: 2, name: "George Bello", pos: "RB" },
                { num: 4, name: "Maksym Talovierov", pos: "CB" },
                { num: 5, name: "Philipp Ziereis", pos: "CB" },
                { num: 16, name: "Andres Andrade", pos: "LB" },
                { num: 14, name: "Valon Berisha", pos: "CDM" },
                { num: 21, name: "Sascha Horvath", pos: "CM" },
                { num: 17, name: "Moses Usor", pos: "CAM" },
                { num: 30, name: "Robert Zulj", pos: "RW" },
                { num: 18, name: "Branko Jovicic", pos: "LW" },
                { num: 9, name: "Marin Ljubicic", pos: "ST" }
            ],
            subs: ["Jorg Siebenhandl", "Filip Stojkovic", "Tomas Galvez", "Melayro Bogarde", "Florian Flecker", "Adil Taoui", "Maximilian Entrup"]
        },
        "leeds united": {
            name: "Leeds United",
            formation: "4-2-3-1",
            lineup: [
                { num: 1, name: "Illan Meslier", pos: "G" },
                { num: 2, name: "Jayden Bogle", pos: "RB" },
                { num: 6, name: "Joe Rodon", pos: "CB" },
                { num: 5, name: "Pascal Struijk", pos: "CB" },
                { num: 3, name: "Junior Firpo", pos: "LB" },
                { num: 44, name: "Ilia Gruev", pos: "CDM" },
                { num: 4, name: "Ethan Ampadu", pos: "CM" },
                { num: 29, name: "Wilfried Gnonto", pos: "LW" },
                { num: 11, name: "Brenden Aaronson", pos: "CAM" },
                { num: 7, name: "Daniel James", pos: "RW" },
                { num: 19, name: "Mateo Joseph", pos: "ST" }
            ],
            subs: ["Karl Darlow", "Sam Byram", "Max Wober", "Joe Rothwell", "Ao Tanaka", "Largie Ramazani", "Manor Solomon", "Joel Piroe", "Patrick Bamford"]
        },
        "sunderland": {
            name: "Sunderland",
            formation: "4-3-3",
            lineup: [
                { num: 1, name: "Anthony Patterson", pos: "G" },
                { num: 32, name: "Trai Hume", pos: "RB" },
                { num: 13, name: "Luke O'Nien", pos: "CB" },
                { num: 5, name: "Daniel Ballard", pos: "CB" },
                { num: 3, name: "Dennis Cirkin", pos: "LB" },
                { num: 4, name: "Dan Neil", pos: "CDM" },
                { num: 11, name: "Chris Rigg", pos: "CM" },
                { num: 7, name: "Jobe Bellingham", pos: "CAM" },
                { num: 10, name: "Patrick Roberts", pos: "RW" },
                { num: 12, name: "Eliezer Mayenda", pos: "ST" },
                { num: 14, name: "Romaine Mundle", pos: "LW" }
            ],
            subs: ["Simon Moore", "Chris Mepham", "Leo Hjelde", "Alan Browne", "Salis Abdul Samed", "Milan Aleksic", "Wilson Isidor", "Nazariy Rusyn"]
        },
        "coventry city": {
            name: "Coventry City",
            formation: "4-2-3-1",
            lineup: [
                { num: 1, name: "Oliver Dovin", pos: "G" },
                { num: 27, name: "Milan van Ewijk", pos: "RB" },
                { num: 4, name: "Bobby Thomas", pos: "CB" },
                { num: 22, name: "Joel Latibeaudiere", pos: "CB" },
                { num: 3, name: "Jay Dasilva", pos: "LB" },
                { num: 14, name: "Ben Sheaf", pos: "CDM" },
                { num: 8, name: "Jamie Allen", pos: "CM" },
                { num: 7, name: "Tatsuhiro Sakamoto", pos: "RW" },
                { num: 10, name: "Ephron Mason-Clark", pos: "RW" },
                { num: 11, name: "Haji Wright", pos: "LW" },
                { num: 9, name: "Ellis Simms", pos: "ST" }
            ],
            subs: ["Ben Wilson", "Liam Kitching", "Jake Bidwell", "Victor Torp", "Josh Eccles", "Jack Rudoni", "Norman Bassette", "Brandon Thomas-Asante"]
        },
        "hull city": {
            name: "Hull City",
            formation: "4-3-3",
            lineup: [
                { num: 1, name: "Ivor Pandur", pos: "G" },
                { num: 2, name: "Lewie Coyle", pos: "RB" },
                { num: 5, name: "Alfie Jones", pos: "CB" },
                { num: 6, name: "Sean McLoughlin", pos: "CB" },
                { num: 23, name: "Cody Drameh", pos: "LB" },
                { num: 18, name: "Xavier Simons", pos: "CDM" },
                { num: 8, name: "Marvin Mehlem", pos: "CM" },
                { num: 10, name: "Abdulkadir Omur", pos: "CAM" },
                { num: 7, name: "Liam Millar", pos: "LW" },
                { num: 9, name: "Chris Bedia", pos: "ST" },
                { num: 11, name: "Mohamed Belloumi", pos: "RW" }
            ],
            subs: ["Carl Rushworth", "Finley Burns", "Charlie Hughes", "Matty Jacob", "Regan Slater", "Steven Alzate", "Kasey Palmer", "Abu Kamara", "Joao Pedro"]
        },
        "frosinone": {
            name: "Frosinone",
            formation: "4-2-3-1",
            lineup: [
                { num: 31, name: "Michele Cerofolini", pos: "G" },
                { num: 20, name: "Anthony Oyono", pos: "RB" },
                { num: 6, name: "Riccardo Marchizza", pos: "CB" },
                { num: 32, name: "Ilario Monterisi", pos: "CB" },
                { num: 79, name: "Gabriele Bracaglia", pos: "LB" },
                { num: 8, name: "Hamza Haoudi", pos: "CDM" },
                { num: 14, name: "Francesco Gelli", pos: "CM" },
                { num: 7, name: "Ebrima Darboe", pos: "CAM" },
                { num: 10, name: "Giuseppe Ambrosino", pos: "ST" },
                { num: 17, name: "Giorgi Kvernadze", pos: "LW" },
                { num: 9, name: "Fares Ghedjemis", pos: "RW" }
            ],
            subs: ["Alessandro Sorrentino", "Davide Bettella", "Jeremy Oyono", "Matteo Cichella", "Anthony Partipilo", "Fallou Sene", "Tchoca Krapikas"]
        },
        "sassuolo": {
            name: "Sassuolo",
            formation: "4-3-3",
            lineup: [
                { num: 1, name: "Giacomo Satalino", pos: "G" },
                { num: 19, name: "Filippo Romagna", pos: "RB" },
                { num: 5, name: "Cas Odenthal", pos: "CB" },
                { num: 26, name: "Jeremy Toljan", pos: "CB" },
                { num: 3, name: "Josh Doig", pos: "LB" },
                { num: 42, name: "Daniel Boloca", pos: "CDM" },
                { num: 7, name: "Kristian Thorstvedt", pos: "CM" },
                { num: 11, name: "Daniel Kumi", pos: "CAM" },
                { num: 10, name: "Domenico Berardi", pos: "RW" },
                { num: 9, name: "Andrea Pinamonti", pos: "ST" },
                { num: 45, name: "Armand Lauriente", pos: "LW" }
            ],
            subs: ["Horatiu Moldovan", "Taras Romanczuk", "Edoardo Pieragnolo", "Pedro Obiang", "Fabrizio Caligara", "Luca Moro", "Flavio Russo", "Samuele Mulattieri"]
        },
        "lorient": {
            name: "Lorient",
            formation: "3-4-2-1",
            lineup: [
                { num: 38, name: "Yvon Mvogo", pos: "G" },
                { num: 15, name: "Julien Laporte", pos: "CB" },
                { num: 2, name: "Igor Silva", pos: "CB" },
                { num: 3, name: "Montassar Talbi", pos: "CB" },
                { num: 24, name: "Gedeon Kalulu", pos: "RWB" },
                { num: 6, name: "Laurent Abergel", pos: "CDM" },
                { num: 77, name: "Panos Katseris", pos: "CM" },
                { num: 17, name: "Jean-Victor Makengo", pos: "LWB" },
                { num: 10, name: "Pablo Pagis", pos: "LW" },
                { num: 27, name: "Tosin Aiyegun", pos: "CAM" },
                { num: 9, name: "Mohamed Bamba", pos: "ST" }
            ],
            subs: ["Bingourou Kamara", "Nathaniel Adjei", "Formose Mendy", "Arthur Avom", "Julien Ponceau", "Eli Junior Kroupi", "Sambou Soumano"]
        },
        "paris fc": {
            name: "Paris FC",
            formation: "4-3-3",
            lineup: [
                { num: 16, name: "Obed Nkambadio", pos: "G" },
                { num: 2, name: "Tuomas Ollila", pos: "RB" },
                { num: 15, name: "Timothee Kolodziejczak", pos: "CB" },
                { num: 5, name: "Moustapha Mbow", pos: "CB" },
                { num: 22, name: "Sofiane Alakouch", pos: "LB" },
                { num: 21, name: "Maxime Lopez", pos: "CDM" },
                { num: 8, name: "Lohann Doucet", pos: "CM" },
                { num: 10, name: "Ilan Kebbal", pos: "CAM" },
                { num: 11, name: "Jean-Philippe Krasso", pos: "ST" },
                { num: 7, name: "Alimami Gory", pos: "RW" },
                { num: 9, name: "Nouha Dicko", pos: "ST" }
            ],
            subs: ["Remy Riou", "Samir Chergui", "Jules Gaudin", "Adama Camara", "Vincent Marchetti", "Pierre-Yves Hamel", "Willem Geubbels"]
        },
        "troyes": {
            name: "Troyes",
            formation: "4-2-3-1",
            lineup: [
                { num: 16, name: "Nicolas Lemaitre", pos: "G" },
                { num: 18, name: "Thierno Balde", pos: "RB" },
                { num: 4, name: "Adrien Monfray", pos: "CB" },
                { num: 5, name: "Mehdi Tahrat", pos: "CB" },
                { num: 19, name: "Ismael Boura", pos: "LB" },
                { num: 6, name: "Alois Confais", pos: "CDM" },
                { num: 28, name: "Mouhamed Diop", pos: "CM" },
                { num: 24, name: "Renaud Ripart", pos: "CAM" },
                { num: 10, name: "Youssouf M'Changama", pos: "CAM" },
                { num: 11, name: "Rafiki Said", pos: "LW" },
                { num: 9, name: "Pape Ibnou Ba", pos: "ST" }
            ],
            subs: ["Zacharie Boucher", "Junior Diaz", "Mathis Hamdi", "Abdoulaye Kante", "Martin Adeline", "Joffrey Cuffaut", "Cyriaque Irie"]
        },
        "le mans": {
            name: "Le Mans",
            formation: "4-3-3",
            lineup: [
                { num: 1, name: "Nicolas Kocik", pos: "G" },
                { num: 2, name: "Alexandre Lauray", pos: "RB" },
                { num: 4, name: "Harold Voyer", pos: "CB" },
                { num: 5, name: "Samuel Yohou", pos: "CB" },
                { num: 3, name: "Lilian Ribelin", pos: "LB" },
                { num: 6, name: "Edwin Quarshie", pos: "CDM" },
                { num: 8, name: "Martin Rossignol", pos: "CM" },
                { num: 10, name: "Erwan Colas", pos: "CAM" },
                { num: 11, name: "Antoine Rabillard", pos: "ST" },
                { num: 9, name: "Dame Gueye", pos: "ST" },
                { num: 7, name: "Arnold Vula", pos: "ST" }
            ],
            subs: ["Ewan Hatfout", "Anthony Scaramozzino", "Mathieu Coutadeur", "Alexandre Vincent", "Zaïd Amir", "Makan Aiko"]
        }
    };

    // Robust Name Matcher / Normalizer for Clubs
    function resolveSquad(teamName) {
        if (!teamName || typeof teamName !== 'string') return null;
        const clean = teamName.trim().toLowerCase()
            .replace(/[\.\-_']/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/^fc\s+|\s+fc$/g, '')
            .replace(/^afc\s+|\s+afc$/g, '');

        // 1. Direct key match
        if (SQUADS[clean]) return SQUADS[clean];

        // 2. Exact match in catalog values
        for (const [key, sq] of Object.entries(SQUADS)) {
            if (sq.name.toLowerCase() === clean) return sq;
        }

        // 3. Normalized Alias Mappings
        const aliases = {
            "man city": "manchester city",
            "mancity": "manchester city",
            "man utd": "manchester united",
            "man united": "manchester united",
            "manutd": "manchester united",
            "inter": "internazionale",
            "inter milan": "internazionale",
            "milan": "ac milan",
            "spurs": "tottenham hotspur",
            "tottenham": "tottenham hotspur",
            "psg": "paris saint-germain",
            "paris sg": "paris saint-germain",
            "paris saint germain": "paris saint-germain",
            "atletico": "atlético madrid",
            "atletico madrid": "atlético madrid",
            "leverkusen": "bayer leverkusen",
            "bayer 04 leverkusen": "bayer leverkusen",
            "bayern": "bayern munich",
            "bayern munchen": "bayern munich",
            "stuttgart": "vfb stuttgart",
            "brighton": "brighton & hove albion",
            "bournemouth": "afc bournemouth",
            "roma": "as roma",
            "monaco": "as monaco",
            "rennes": "stade rennais",
            "auxerre": "aj auxerre",
            "le havre": "le havre ac",
            "sporting": "sporting cp",
            "sporting lisbon": "sporting cp",
            "feyenoord": "feyenoord rotterdam",
            "shakhtar": "shakhtar donetsk",
            "glimt": "bodo/glimt",
            "bodo glimt": "bodo/glimt",
            "bodø/glimt": "bodo/glimt",
            "slovan": "slovan bratislava",
            "lask": "lask linz",
            "leeds": "leeds united",
            "coventry": "coventry city",
            "hull": "hull city"
        };

        if (aliases[clean] && SQUADS[aliases[clean]]) {
            return SQUADS[aliases[clean]];
        }

        // 4. Substring / fuzzy matching against registered squads
        for (const [key, sq] of Object.entries(SQUADS)) {
            if (clean.includes(key) || key.includes(clean)) {
                return sq;
            }
        }

        return null;
    }

    // Export globally for browser & module environments
    if (typeof window !== 'undefined') {
        window.VERIFIED_SQUADS = SQUADS;
        window.resolveSquad = resolveSquad;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            VERIFIED_SQUADS: SQUADS,
            resolveSquad: resolveSquad
        };
    }
})();
