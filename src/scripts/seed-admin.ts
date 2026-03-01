import dbConnect from "@/lib/mongodb";
import Question from "@/models/Question";
import Settings from "@/models/Settings";

const hardcodedQuestions = [
    // Easy (1-10)
    { id: 1, text: "What does BDE stand for?", options: ["Business Development Executive", "Business Data Engineer", "Brand Design Expert", "Business Delivery Executive"], correctIndex: 0, difficulty: "Easy" },
    { id: 2, text: "What is the primary goal of a BDE?", options: ["Fixing computers", "Generating revenue and growth", "Writing code", "Designing logos"], correctIndex: 1, difficulty: "Easy" },
    { id: 3, text: "Which department does a BDE usually work closely with?", options: ["Human Resources", "Sales and Marketing", "Legal", "Maintenance"], correctIndex: 1, difficulty: "Easy" },
    { id: 4, text: "What is 'Lead Generation'?", options: ["Creating new products", "Identifying potential customers", "Hiring new employees", "Designing websites"], correctIndex: 1, difficulty: "Easy" },
    { id: 5, text: "What is a 'Cold Call'?", options: ["Calling in the winter", "Calling someone who hasn't expressed interest yet", "Calling a friend", "Calling to report a technical issue"], correctIndex: 1, difficulty: "Easy" },
    { id: 6, text: "What is the 'Sales Funnel'?", options: ["A tool for pouring liquids", "The journey a potential customer takes towards a purchase", "A way to organize files", "A marketing event"], correctIndex: 1, difficulty: "Easy" },
    { id: 7, text: "What does CRM stand for?", options: ["Customer Relationship Management", "Customer Retention Monitor", "Core Revenue Management", "Creative Resource Mapping"], correctIndex: 0, difficulty: "Easy" },
    { id: 8, text: "Which of these is a key skill for a BDE?", options: ["Advanced Calculus", "Active Listening", "Photography", "Cooking"], correctIndex: 1, difficulty: "Easy" },
    { id: 9, text: "What is a 'Prospect'?", options: ["A current customer", "A potential customer who has been qualified", "A former employee", "A competitor"], correctIndex: 1, difficulty: "Easy" },
    { id: 10, text: "What is 'Networking' in a business context?", options: ["Connecting computers together", "Building professional relationships", "Fixing internet problems", "Ordering office supplies"], correctIndex: 1, difficulty: "Easy" },

    // Medium (11-20)
    { id: 11, text: "What is 'B2B' sales?", options: ["Business to Bonus", "Business to Business", "Back to Business", "Buyer to Business"], correctIndex: 1, difficulty: "Medium" },
    { id: 12, text: "What is a 'Value Proposition'?", options: ["The price of a product", "The unique benefit a product provides to customers", "A contract", "A discount offer"], correctIndex: 1, difficulty: "Medium" },
    { id: 13, text: "What does 'Closing a Deal' mean?", options: ["Terminating a contract", "Successfully finalizing a sale", "Ending a meeting", "Going out of business"], correctIndex: 1, difficulty: "Medium" },
    { id: 14, text: "What is 'Inbound Marketing'?", options: ["Calling customers directly", "Attracting customers through content and engagement", "Buying billboard ads", "Sending mass text messages"], correctIndex: 1, difficulty: "Medium" },
    { id: 15, text: "What is a 'KPI'?", options: ["Key Performance Indicator", "Key Profit Increase", "Known Performance Issue", "Key Potential Item"], correctIndex: 0, difficulty: "Medium" },
    { id: 16, text: "What is an 'Objection' in sales?", options: ["A customer agreeing to buy", "A reason or concern raised by a prospect for not buying", "A legal document", "A compliment from a client"], correctIndex: 1, difficulty: "Medium" },
    { id: 17, text: "What is 'Market Research'?", options: ["Selling products at a market", "Gathering info about consumer needs and preferences", "Buying groceries", "Investigating competitors' office space"], correctIndex: 1, difficulty: "Medium" },
    { id: 18, text: "What is 'Up-selling'?", options: ["Selling a product at a loss", "Encouraging a customer to buy a more expensive version of a product", "Selling products online", "Lowering prices"], correctIndex: 1, difficulty: "Medium" },
    { id: 19, text: "What is 'Cross-selling'?", options: ["Selling to a competitor", "Selling a different, related product to an existing customer", "Stopping a sale", "Selling products in bulk"], correctIndex: 1, difficulty: "Medium" },
    { id: 20, text: "What is 'Churn Rate'?", options: ["The rate at which butter is made", "The percentage of customers who stop using a service", "The speed of production", "The rate of new hires"], correctIndex: 1, difficulty: "Medium" },

    // Hard (21-30)
    { id: 21, text: "What is a 'SWOT Analysis'?", options: ["Strengths, Weaknesses, Opportunities, Threats", "Sales, Work, Operations, Tasks", "Success, Wealth, Optimization, Target", "Standard Website Operations Tool"], correctIndex: 0, difficulty: "Hard" },
    { id: 22, text: "What is 'ROI'?", options: ["Returns on Interest", "Return on Investment", "Rate of Income", "Ready of Implementation"], correctIndex: 1, difficulty: "Hard" },
    { id: 23, text: "What is 'SaaS'?", options: ["Sales as a Service", "Software as a Service", "System and Advisory Service", "Secure and Active Server"], correctIndex: 1, difficulty: "Hard" },
    { id: 24, text: "What is a 'Strategic Partnership'?", options: ["A casual lunch meeting", "A long-term agreement between two companies to share resources", "Hiring a consultant", "Buying a competitor"], correctIndex: 1, difficulty: "Hard" },
    { id: 25, text: "What is 'Predictive Modeling' in sales?", options: ["Guessing next year's weather", "Using data and stats to project future sales outcomes", "Designing 3D models of products", "Testing new sales scripts"], correctIndex: 1, difficulty: "Hard" },
    { id: 26, text: "What is the 'Gatekeeper' in sales?", options: ["A security guard", "A person who controls access to a decision-maker", "A software firewall", "The sales manager"], correctIndex: 1, difficulty: "Hard" },
    { id: 27, text: "What is 'A/B Testing' in marketing?", options: ["Testing only two employees", "Comparing two versions of a webpage or email to see which performs better", "A psychological test for buyers", "Grading products"], correctIndex: 1, difficulty: "Hard" },
    { id: 28, text: "What is 'Scalability'?", options: ["The ability to weigh products accurately", "The capacity of a business to grow without being hindered by its structure", "Climbing a mountain", "Reducing the size of a team"], correctIndex: 1, difficulty: "Hard" },
    { id: 29, text: "What is 'Market Penetration'?", options: ["Leaving a market", "The extent to which a product is recognized and bought by customers in a particular market", "Buying market shares", "Opening a store in a new city"], correctIndex: 1, difficulty: "Hard" },
    { id: 30, text: "What is a 'Consensus' in a business meeting?", options: ["A heated argument", "General agreement among all the people involved", "A vote with a clear winner and loser", "A list of tasks"], correctIndex: 1, difficulty: "Hard" }
];

const initialSettings = {
    salaryFixed: "₹5,000",
    salaryIncentive: "₹45,000",
    holidays: [
        { name: "Holidays", date: "2024-03-25" } // Example Holi date
    ],
    interviewSlots: ["11:00", "12:00", "14:00", "15:00"], // Excludes 1-2 PM lunch
    lunchBreak: "13:00",
    minimumScore: 60
};

async function seed() {
    try {
        await dbConnect();

        // Seed Questions
        const qCount = await Question.countDocuments();
        if (qCount === 0) {
            console.log("Seeding questions...");
            await Question.insertMany(hardcodedQuestions.map(q => ({
                text: q.text,
                options: q.options,
                correctIndex: q.correctIndex,
                difficulty: q.difficulty,
                category: "Sales"
            })));
        }

        // Seed Settings
        const sCount = await Settings.countDocuments();
        if (sCount === 0) {
            console.log("Seeding settings...");
            await Settings.create(initialSettings);
        }

        console.log("Seeding completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
}

seed();
