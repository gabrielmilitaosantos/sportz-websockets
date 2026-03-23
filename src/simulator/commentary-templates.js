// Defines different templates for each sport
export const footballTemplates = [
  {
    eventType: "pass",
    weight: 30, // 30% probability of this event show up.
    messages: [
      "A crisp passing move through midfield.",
      "Ball recycled across the back line.",
      "Quick exchange on the wing.",
      "Simple pass to maintain possession.",
      "Diagonal ball switches the play.",
    ],
  },
  {
    eventType: "shot",
    weight: 15,
    messages: [
      "A low drive is pushed away by the keeper.",
      "Thunderous strike from distance!",
      "Shot deflected wide for a corner.",
      "Speculative effort from range.",
      "Curling effort towards the far post.",
    ],
  },
  {
    eventType: "save",
    weight: 10,
    messages: [
      "Goalkeeper makes a strong save at the near post.",
      "Brilliant reflex stop!",
      "Keeper dives full stretch to deny the striker.",
      "Comfortable save for the goalkeeper.",
      "Fingertip save keeps it out!",
    ],
  },
  {
    eventType: "goal",
    weight: 5,
    messages: [
      "Goal! A composed finish from close range.",
      "What a strike! Back of the net!",
      "Clinical finish! The crowd erupts!",
      "Brilliant goal! Unstoppable!",
      "Tap in at the back post!",
    ],
    scoreDelta: { home: 0, away: 0 }, // Will be set dynamically
  },
  {
    eventType: "foul",
    weight: 12,
    messages: [
      "Late challenge stops the counter.",
      "Foul given for a push.",
      "Clumsy challenge in midfield.",
      "Free kick awarded for obstruction.",
      "Pulled back by the shirt.",
    ],
  },
  {
    eventType: "yellow_card",
    weight: 6,
    messages: [
      "Booked for a rash tackle.",
      "Yellow card for dissent.",
      "Cautioned for time-wasting.",
      "Card shown for persistent fouling.",
      "Booked for simulation.",
    ],
  },
  {
    eventType: "corner",
    weight: 10,
    messages: [
      "Corner kick swung into the box.",
      "Short corner routine.",
      "Whipped in towards the penalty spot.",
      "Corner cleared at the near post.",
      "Dangerous corner delivery.",
    ],
  },
  {
    eventType: "throw_in",
    weight: 8,
    messages: [
      "Long throw into the danger zone.",
      "Quick throw taken.",
      "Throw-in deep in opposition territory.",
      "Throw returned to the keeper.",
    ],
  },
  {
    eventType: "substitution",
    weight: 3,
    messages: [
      "Fresh legs coming on to change the tempo.",
      "Tactical substitution made.",
      "Change forced by injury.",
      "New energy injected into the team.",
    ],
  },
  {
    eventType: "offside",
    weight: 8,
    messages: [
      "Flag up for offside.",
      "Caught in an offside position.",
      "Close offside call.",
      "Linesman raises the flag.",
    ],
  },
];

export const cricketTemplates = [
  {
    eventType: "dot_ball",
    weight: 40,
    messages: [
      "Defended solidly back to the bowler.",
      "Beats the bat! Close call.",
      "Left alone outside off stump.",
      "Watchful leave by the batsman.",
    ],
  },
  {
    eventType: "single",
    weight: 25,
    messages: [
      "Pushed into the gap for a single.",
      "Quick single taken.",
      "Worked away for one.",
      "Easy single to rotate the strike.",
    ],
    scoreDelta: { home: 0, away: 0 }, // 1 run - Resolve by defaulting in getScoreValue
  },
  {
    eventType: "boundary",
    weight: 10,
    messages: [
      "Glorious cover drive! Four runs!",
      "Pulled away to the boundary!",
      "Edged through the slips for four.",
      "Perfectly timed shot races away.",
    ],
    scoreDelta: { home: 0, away: 0 },
  },
  {
    eventType: "six",
    weight: 5,
    messages: [
      "Massive six! Out of the ground!",
      "Launched high into the stands!",
      "Maximum! What a strike!",
      "Incredible power! Six runs!",
    ],
    scoreDelta: { home: 0, away: 0 },
  },
  {
    eventType: "wicket",
    weight: 8,
    messages: [
      "Wicket! Clean bowled!",
      "Caught behind! Appeal upheld!",
      "LBW! The finger goes up!",
      "Stumps shattered!",
      "Brilliant catch in the deep!",
    ],
  },
  {
    eventType: "wide",
    weight: 7,
    messages: [
      "Wide called by the umpire.",
      "Down the leg side, wide.",
      "Strays too far outside off.",
    ],
    scoreDelta: { home: 0, away: 0 }, // 1 run - resolve by default
  },
  {
    eventType: "no_ball",
    weight: 3,
    messages: ["No ball! Free hit coming up.", "Front foot overstepped."],
    scoreDelta: { home: 0, away: 0 },
  },
];

export const basketballTemplates = [
  {
    eventType: "pass",
    weight: 30,
    messages: [
      "Quick pass around the perimeter.",
      "Assist sets up the play.",
      "Ball movement opens up the defense.",
    ],
  },
  {
    eventType: "two_pointer",
    weight: 20,
    messages: [
      "Mid-range jumper is good!",
      "Layup converted!",
      "Floater in the lane!",
      "And-one opportunity!",
    ],
    scoreDelta: { home: 0, away: 0 },
  },
  {
    eventType: "three_pointer",
    weight: 10,
    messages: [
      "From downtown! Three-pointer!",
      "Corner three splashes in!",
      "Long-range bomb connects!",
    ],
    scoreDelta: { home: 0, away: 0 },
  },
  {
    eventType: "rebound",
    weight: 15,
    messages: [
      "Defensive rebound secured.",
      "Offensive board! Second chance.",
      "Strong rebound in traffic.",
    ],
  },
  {
    eventType: "steal",
    weight: 8,
    messages: [
      "Steal! Fast break opportunity!",
      "Picked off the pass!",
      "Quick hands force the turnover.",
    ],
  },
  {
    eventType: "block",
    weight: 6,
    messages: [
      "Blocked at the rim!",
      "Rejection! Sent back!",
      "Defensive stop with the block.",
    ],
  },
  {
    eventType: "foul",
    weight: 8,
    messages: [
      "Foul called on the drive.",
      "Shooting foul, two free throws.",
      "Reach-in foul.",
    ],
  },
  {
    eventType: "timeout",
    weight: 3,
    messages: ["Timeout called by the coach.", "Strategic timeout."],
  },
];

// Get templates for a specific sport
export function getTemplatesForSport(sport) {
  const normalized = sport.toLowerCase();

  switch (normalized) {
    case "football":
    case "soccer":
      return footballTemplates;
    case "cricket":
      return cricketTemplates;
    case "basketball":
      return basketballTemplates;
    default:
      console.warn(
        `[Templates] Unknown sport "${sport}", defaulting to football`,
      );
      return footballTemplates; // Default fallback
  }
}

// Select a random event based on weighted probabilities
export function selectRandomEvent(templates) {
  const totalWeight = templates.reduce((sum, t) => sum + t.weight, 0);
  let random = Math.random() * totalWeight;

  for (const template of templates) {
    random -= template.weight;
    if (random <= 0) {
      return template;
    }
  }

  return templates[0]; // Fallback
}

// Generate a random message from a template
export function getRandomMessage(template) {
  const messages = template.messages;
  return messages[Math.floor(Math.random() * messages.length)];
}
