const firstNames = [
  "James",
  "John",
  "Robert",
  "Michael",
  "David",
  "William",
  "Richard",
  "Carlos",
  "Luis",
  "Marco",
  "Antonio",
  "Diego",
  "Fernando",
  "Pierre",
  "André",
  "Jean",
  "Lucas",
  "Gabriel",
  "Mohamed",
  "Ahmed",
  "Ali",
  "Omar",
  "Hassan",
  "Kenji",
  "Hiroshi",
  "Yuki",
  "Takeshi",
  "Ivan",
  "Dmitri",
  "Alexei",
  "Sergei",
  "Erik",
  "Lars",
  "Anders",
  "Magnus",
];

const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Silva",
  "Santos",
  "Oliveira",
  "Costa",
  "Fernandez",
  "Torres",
  "Müller",
  "Schmidt",
  "Fischer",
  "Weber",
  "Meyer",
  "Rossi",
  "Russo",
  "Ferrari",
  "Esposito",
  "Bianchi",
  "Dubois",
  "Martin",
  "Bernard",
  "Moreau",
  "Laurent",
  "Petrov",
  "Ivanov",
  "Volkov",
  "Sokolov",
  "Andersson",
  "Johansson",
  "Karlsson",
  "Nilsson",
  "Kim",
  "Lee",
  "Park",
  "Choi",
  "Yamamoto",
  "Tanaka",
  "Suzuki",
  "Watanabe",
];

export function generatePlayerName() {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
}

// Generate a squad of player names (with no duplicates)
export function generateSquad(size = 20) {
  const maxPossible = firstNames.length * lastNames.length;
  if (size > maxPossible) {
    throw new Error(
      `Cannot generate ${size} unique names (max: ${maxPossible})`,
    );
  }
  const squad = new Set();

  while (squad.size < size) {
    squad.add(generatePlayerName());
  }

  return Array.from(squad);
}

// Get a random player from a squad
export function getRandomPlayer(squad) {
  return squad[Math.floor(Math.random() * squad.length)];
}
