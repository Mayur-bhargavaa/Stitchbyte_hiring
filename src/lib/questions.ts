export interface Question {
    id: number;
    question: string;
    options: string[];
    correctIndex: number;
}

export const quizQuestions: Question[] = [
    // --- Cold Calling & Outreach ---
    {
        id: 1,
        question: "What is the primary goal of a cold call?",
        options: [
            "Close the deal immediately",
            "Build rapport and set up a meeting",
            "Leave a voicemail every time",
            "Talk about your product for 10 minutes",
        ],
        correctIndex: 1,
    },
    {
        id: 2,
        question: "A prospect says 'I'm busy right now.' What is the best response?",
        options: [
            "Hang up immediately",
            "Keep talking about your offer",
            "Ask when would be a better time to connect",
            "Send them an email and never follow up",
        ],
        correctIndex: 2,
    },
    {
        id: 3,
        question: "How many follow-ups does it typically take to convert a cold lead?",
        options: ["1-2", "3-4", "5-8", "Only 1 if you're good enough"],
        correctIndex: 2,
    },
    {
        id: 4,
        question: "What is a 'cold email drip sequence'?",
        options: [
            "A single email sent to a prospect",
            "A series of pre-scheduled follow-up emails",
            "Sending the same email repeatedly",
            "An email with no subject line",
        ],
        correctIndex: 1,
    },
    {
        id: 5,
        question: "What time of day is generally best for cold calling B2B prospects?",
        options: [
            "6 AM - 7 AM",
            "10 AM - 12 PM and 2 PM - 4 PM",
            "After 7 PM",
            "During lunch hour only",
        ],
        correctIndex: 1,
    },

    // --- Objection Handling ---
    {
        id: 6,
        question: "A prospect says 'Your price is too high.' What should you do first?",
        options: [
            "Immediately offer a discount",
            "Ask what they're comparing it to and understand their budget",
            "End the call",
            "Agree and apologize",
        ],
        correctIndex: 1,
    },
    {
        id: 7,
        question: "What does 'Feel, Felt, Found' refer to in sales?",
        options: [
            "A CRM framework",
            "An objection handling technique",
            "A negotiation strategy",
            "A cold email template",
        ],
        correctIndex: 1,
    },
    {
        id: 8,
        question: "'We already have a vendor.' Best response?",
        options: [
            "Okay, goodbye",
            "Our product is better than theirs",
            "I understand — many of our current clients said the same before seeing how we add value differently. Can I share one key difference?",
            "Can you give me their contact details?",
        ],
        correctIndex: 2,
    },
    {
        id: 9,
        question: "A prospect goes silent after receiving your proposal. What do you do?",
        options: [
            "Assume they're not interested and move on",
            "Send a polite follow-up with a specific reason to reconnect",
            "Call them 5 times in one day",
            "Post about it on social media",
        ],
        correctIndex: 1,
    },
    {
        id: 10,
        question: "'Send me an email' from a cold call usually means:",
        options: [
            "They are very interested",
            "A polite brush-off — you should try to set a concrete next step instead",
            "You should send a 10-page brochure",
            "The deal is almost closed",
        ],
        correctIndex: 1,
    },

    // --- Lead Generation & Qualification ---
    {
        id: 11,
        question: "What does BANT stand for in lead qualification?",
        options: [
            "Budget, Authority, Need, Timeline",
            "Business, Agenda, Negotiation, Target",
            "Brand, Audience, Network, Technology",
            "Buy, Assign, Notify, Transfer",
        ],
        correctIndex: 0,
    },
    {
        id: 12,
        question: "What is a 'qualified lead'?",
        options: [
            "Anyone who visits your website",
            "A prospect who has the budget, need, authority, and timeline to buy",
            "A person who answered your cold call",
            "Someone with a LinkedIn profile",
        ],
        correctIndex: 1,
    },
    {
        id: 13,
        question: "Which tool is most commonly used for B2B lead research?",
        options: ["Instagram", "LinkedIn Sales Navigator", "TikTok", "Pinterest"],
        correctIndex: 1,
    },
    {
        id: 14,
        question: "What is 'top of funnel' (TOFU) in sales?",
        options: [
            "The final negotiation stage",
            "The awareness/lead generation stage",
            "The onboarding stage",
            "A type of food",
        ],
        correctIndex: 1,
    },
    {
        id: 15,
        question: "What is the difference between an MQL and an SQL?",
        options: [
            "There is no difference",
            "MQL is marketing-qualified, SQL is sales-qualified — SQL is further along",
            "SQL stands for Structured Query Language",
            "MQL is more valuable than SQL",
        ],
        correctIndex: 1,
    },

    // --- Sales Process & Closing ---
    {
        id: 16,
        question: "What is a 'discovery call'?",
        options: [
            "A call to close the deal",
            "An initial conversation to understand the prospect's needs and pain points",
            "A call to complain about competitors",
            "A random call with no agenda",
        ],
        correctIndex: 1,
    },
    {
        id: 17,
        question: "What is 'consultative selling'?",
        options: [
            "Pushing your product aggressively",
            "Understanding client needs and positioning your solution as the answer",
            "Consulting a manager before every call",
            "Selling consulting services only",
        ],
        correctIndex: 1,
    },
    {
        id: 18,
        question: "A trial close is:",
        options: [
            "Asking for the final signature",
            "A question that tests buying readiness, like 'If we handle X, would that work for you?'",
            "Giving a free trial of the product",
            "Closing the deal on the first call always",
        ],
        correctIndex: 1,
    },
    {
        id: 19,
        question: "What is the 'assumptive close'?",
        options: [
            "Assuming the prospect won't buy",
            "Acting as if the prospect has already decided to buy and moving to next steps",
            "Sending the contract without asking",
            "Giving a random discount",
        ],
        correctIndex: 1,
    },
    {
        id: 20,
        question: "What does 'ABC' stand for in sales culture?",
        options: [
            "Always Be Coding",
            "Always Be Closing",
            "Always Be Complaining",
            "Always Be Copying",
        ],
        correctIndex: 1,
    },

    // --- CRM & Pipeline ---
    {
        id: 21,
        question: "What is a CRM?",
        options: [
            "Customer Rejection Manager",
            "Customer Relationship Management — a tool to track leads and deals",
            "Cold Response Mechanism",
            "Corporate Revenue Model",
        ],
        correctIndex: 1,
    },
    {
        id: 22,
        question: "Why is updating your CRM after every interaction important?",
        options: [
            "It's not important",
            "To maintain accurate pipeline data and avoid missed follow-ups",
            "To impress your manager",
            "Only if you feel like it",
        ],
        correctIndex: 1,
    },
    {
        id: 23,
        question: "What is a 'sales pipeline'?",
        options: [
            "A physical pipe in the office",
            "A visual representation of where prospects are in your sales process",
            "A list of rejected leads",
            "The company's water supply system",
        ],
        correctIndex: 1,
    },

    // --- Communication & Negotiation ---
    {
        id: 24,
        question: "Active listening in sales means:",
        options: [
            "Waiting for your turn to speak",
            "Fully concentrating, understanding, and responding thoughtfully to the prospect",
            "Listening to music while on a call",
            "Taking notes without saying anything",
        ],
        correctIndex: 1,
    },
    {
        id: 25,
        question: "In a negotiation, what is your BATNA?",
        options: [
            "Best Alternative To a Negotiated Agreement",
            "Business Approach To New Accounts",
            "Budget Allocation for Target Networks",
            "A type of sales pitch",
        ],
        correctIndex: 0,
    },
    {
        id: 26,
        question: "What is the most important skill for a BDE?",
        options: [
            "Typing speed",
            "Communication and persuasion",
            "Graphic design",
            "Cooking",
        ],
        correctIndex: 1,
    },

    // --- Target & Metric Mindset ---
    {
        id: 27,
        question: "If your monthly target is 10 deals and you've closed 4 by mid-month, what do you do?",
        options: [
            "Relax and wait for deals to come",
            "Increase outreach volume, analyze what's working, and double down",
            "Complain to management about the target",
            "Start looking for a new job",
        ],
        correctIndex: 1,
    },
    {
        id: 28,
        question: "What is a KPI in sales?",
        options: [
            "Key Personal Information",
            "Key Performance Indicator — a metric to measure performance",
            "Known Prospect Index",
            "A type of sales bonus",
        ],
        correctIndex: 1,
    },
    {
        id: 29,
        question: "Your daily calling target is 80 calls. You've made 50 by 3 PM. What's your approach?",
        options: [
            "Stop and go home early",
            "Push through the remaining 30+ calls and try to exceed the target",
            "Fake the remaining call logs",
            "Complain about the target being too high",
        ],
        correctIndex: 1,
    },
    {
        id: 30,
        question: "A client wants a feature your product doesn't have. What do you do?",
        options: [
            "Lie and say you have it",
            "Acknowledge honestly, highlight what you do offer, and note their feedback for the product team",
            "Ignore their request",
            "Tell them to use a competitor",
        ],
        correctIndex: 1,
    },
];
