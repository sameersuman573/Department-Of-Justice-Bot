// Function to create a prompt template
function createPromptTemplate(template, variables) {
    return function (data) {
        let prompt = template;
        for (const variable of variables) {
            prompt = prompt.replace(`{${variable}}`, data[variable]);
        }
        return prompt;
    };
}

// Define your prompt templates

const divisionsTemplate = createPromptTemplate(
    "Can you provide information about the various divisions of the Department of Justice and their functions?",
    []
);

const judgesVacanciesTemplate = createPromptTemplate(
    "How many judges are currently appointed at the {court_type} and what are the current vacancies?",
    ["court_type"]
);

const pendencyCasesTemplate = createPromptTemplate(
    "What is the current pendency of cases in the National Judicial Data Grid for the {court_type}?",
    ["court_type"]
);

const trafficViolationTemplate = createPromptTemplate(
    "What is the procedure to pay fines for traffic violations in India?",
    []
);

const liveStreamingTemplate = createPromptTemplate(
    "How can I access live streaming of court cases?",
    []
);

const efilingTemplate = createPromptTemplate(
    "Can you provide the steps for {service} in the eFiling and ePay system?",
    ["service"]
);

const fastTrackCourtsTemplate = createPromptTemplate(
    "What are the functions and procedures related to Fast Track Courts in India?",
    []
);

const downloadAppTemplate = createPromptTemplate(
    "How can I download the eCourts Services mobile app?",
    []
);

const teleLawServicesTemplate = createPromptTemplate(
    "What are the steps to avail Tele Law Services offered by the Department of Justice?",
    []
);

const caseStatusTemplate = createPromptTemplate(
    "Can you provide the current status of the case with the case number {case_number}?",
    ["case_number"]
);

// Function to handle user queries
function handleInquiry(userQuery) {
    if (userQuery.includes("divisions of DoJ")) {
        return divisionsTemplate({});
    } else if (userQuery.includes("number of judges")) {
        const courtType = extractCourtType(userQuery); // Function to parse input
        return judgesVacanciesTemplate({ court_type: courtType });
    } else if (userQuery.includes("pendency of cases")) {
        const courtType = extractCourtType(userQuery);
        return pendencyCasesTemplate({ court_type: courtType });
    } else if (userQuery.includes("pay fine")) {
        return trafficViolationTemplate({});
    } else if (userQuery.includes("live streaming")) {
        return liveStreamingTemplate({});
    } else if (userQuery.includes("eFiling") || userQuery.includes("ePay")) {
        const service = extractService(userQuery); // Function to parse input
        return efilingTemplate({ service });
    } else if (userQuery.includes("Fast Track Courts")) {
        return fastTrackCourtsTemplate({});
    } else if (userQuery.includes("download eCourts app")) {
        return downloadAppTemplate({});
    } else if (userQuery.includes("Tele Law Services")) {
        return teleLawServicesTemplate({});
    } else if (userQuery.includes("case status")) {
        const caseNumber = extractCaseNumber(userQuery); // Function to parse input
        return caseStatusTemplate({ case_number: caseNumber });
    } else {
        return "I'm sorry, I didn't understand your request. Can you please provide more details?";
    }
}

// Example helper functions (you'll need to implement the logic based on your requirements)
function extractCourtType(query) {
    // Logic to extract court type from user query
    // Example implementation:
    if (query.includes("Supreme Court")) return "Supreme Court";
    if (query.includes("High Court")) return "High Court";
    return "District & Subordinate Courts";
}

function extractService(query) {
    // Logic to extract service type from user query
    if (query.includes("eFiling")) return "eFiling";
    if (query.includes("ePay")) return "ePay";
    return "";
}

function extractCaseNumber(query) {
    // Logic to extract case number from user query
    // Example implementation:
    const match = query.match(/case number (\d+)/);
    return match ? match[1] : "";
}

// Example usage
const userQuery1 = "What is the number of judges appointed at the Supreme Court?";
console.log(handleInquiry(userQuery1));

const userQuery2 = "How do I pay fine for a traffic violation?";
console.log(handleInquiry(userQuery2));
