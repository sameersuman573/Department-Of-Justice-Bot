import fetch from 'node-fetch';

async function query(data) {
    const response = await fetch(
        "https://api-inference.huggingface.co/models/gpt2",
        {
            headers: {
                "Authorization": "Bearer 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", // Replace with your actual Hugging Face API key
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify(data),
        }
    );

    const result = await response.json();
    return result;
}

// Example input for the GPT-2 model
query({"inputs": "Once upon a time, in a land far away,"})
    .then((response) => {
        console.log(JSON.stringify(response));
    })
    .catch((error) => {
        console.error('Error:', error);
    });
