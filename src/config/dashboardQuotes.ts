// Dashboard Quotes Configuration
// Add more quotes here as needed

export interface Quote {
  text: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

export const dashboardQuotes: Quote[] = [
  // Morning Quotes (5 AM - 12 PM)
  {
    text: "Good morning, {name}! Ready to make today count?",
    timeOfDay: 'morning'
  },
  {
    text: "Rise and shine, {name}! Let's achieve great things today.",
    timeOfDay: 'morning'
  },
  {
    text: "Morning, {name}! Your success story continues today.",
    timeOfDay: 'morning'
  },
  {
    text: "Good morning, {name}! Time to turn those goals into reality.",
    timeOfDay: 'morning'
  },
  {
    text: "Hello {name}, a productive morning leads to a successful day!",
    timeOfDay: 'morning'
  },

  // Afternoon Quotes (12 PM - 5 PM)
  {
    text: "Good afternoon, {name}! Keep up the momentum!",
    timeOfDay: 'afternoon'
  },
  {
    text: "Afternoon, {name}! You're doing great, keep pushing forward.",
    timeOfDay: 'afternoon'
  },
  {
    text: "Hey {name}, halfway through the day and crushing it!",
    timeOfDay: 'afternoon'
  },
  {
    text: "Good afternoon, {name}! Every small win counts.",
    timeOfDay: 'afternoon'
  },
  {
    text: "Hello {name}, the afternoon is perfect for productive wins!",
    timeOfDay: 'afternoon'
  },

  // Evening Quotes (5 PM - 9 PM)
  {
    text: "Good evening, {name}! Time to wrap up and celebrate today's wins.",
    timeOfDay: 'evening'
  },
  {
    text: "Evening, {name}! Reflect on today's achievements and plan for tomorrow.",
    timeOfDay: 'evening'
  },
  {
    text: "Hey {name}, another productive day coming to a close!",
    timeOfDay: 'evening'
  },
  {
    text: "Good evening, {name}! You've made progress today, be proud.",
    timeOfDay: 'evening'
  },
  {
    text: "Hello {name}, finish strong and enjoy your evening!",
    timeOfDay: 'evening'
  },

  // Night Quotes (9 PM - 5 AM)
  {
    text: "Working late, {name}? Your dedication is inspiring!",
    timeOfDay: 'night'
  },
  {
    text: "Good evening, {name}! Remember to rest and recharge.",
    timeOfDay: 'night'
  },
  {
    text: "Hey {name}, burning the midnight oil? Take care of yourself!",
    timeOfDay: 'night'
  },
  {
    text: "Late night hustle, {name}? Your commitment doesn't go unnoticed.",
    timeOfDay: 'night'
  },
  {
    text: "Hello {name}, great work today! Don't forget to get some rest.",
    timeOfDay: 'night'
  },
];

